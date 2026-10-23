import {sourceHref} from './lib/sourceLinks.js';
import {units,events,chishuiSteps,memories,sources} from './data/history.js';
import {orderedLegs,branchLegs,eventById,eventsForUnit,positionOnLeg,unitNameAt} from './marchModel.js';
import {arrangeAtlasLabels,pointLabelOffsets} from './lib/atlasLabels.js';
import {chishuiSequences,chishuiFeint,resolveSceneLine,resolveWaypoint} from './data/routeCorridors.js';
import {displayRoute,detailLevel,screenRouteLength} from './lib/routeGeometry.js';
import {turningPoints} from './data/turningPoints.js';
import {journeyTrailStrokeState} from './lib/journeyTrailModel.js';
import {capSymbol} from './symbols.js';
import {storyById,stories} from './data/stories.js';
import {dayNumber} from './calendarMarch.js';
import {riverLabelCandidates} from './lib/geographyLabels.js';
import {chishuiLessons} from './data/campaigns.js';
import {marchSymbolOffset} from './lib/marchSymbolLayout.js';

const L=window.L;
const ll=p=>[p.lat,p.lon];
const boundsFrom=b=>[[b[1],b[0]],[b[3],b[2]]];
const star='<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:currentColor;stroke:#faf3e5;stroke-width:1.4"><path d="m12 2 2.8 6.2 6.7.7-5 4.6 1.5 6.6-6-3.3-6 3.3 1.5-6.6-5-4.6 6.7-.7Z"/></svg>';
const escapeText=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CorridorLine=L.Polyline;

export class AtlasMap {
  constructor({places,waypoints,geography,profiles,onEvent,onStory,onLocality,onCrossing}) {
    this.places=places;this.waypoints=waypoints;this.profiles=profiles;this.onEvent=onEvent;this.currentVia=[];
    this.modernPlaces=geography.modern.places;this.riverFeatures=geography.modern.rivers.features;this.geometryContexts=new WeakMap();this.geometryCache=new Map();this.legById=new Map();
    this.onStory=onStory;this.onLocality=onLocality;this.onCrossing=onCrossing;this.mosaic=geography.terrain;this.detailTiles=new Map();this.calendarMotions=new Map();this.currentRouteLabels=[];this.drawnVia=new Set();
    this.map=L.map('map',{crs:L.CRS.EPSG4326,zoomControl:false,attributionControl:false,minZoom:4,maxZoom:8.6,zoomSnap:.1,zoomDelta:.5,maxBounds:boundsFrom(this.mosaic.bounds),maxBoundsViscosity:1,preferCanvas:false});
    // Keep Leaflet's drag limits; apply the final boundary synchronously after
    // a pane resize, rather than starting a second automatic pan animation.
    this.map.off('moveend',this.map._panInsideMaxBounds);
    const panes={terrain:180,worldContext:210,geography:240,routes:350,annotations:510};
    for(const [name,z] of Object.entries(panes)){this.map.createPane(name);this.map.getPane(name).style.zIndex=z;}
    this.terrain=L.imageOverlay(this.mosaic.tiles[0].file,boundsFrom(this.mosaic.bounds),{pane:'terrain',opacity:1,className:'regional-relief'}).addTo(this.map);
    for(const tile of this.mosaic.tiles.slice(1))this.detailTiles.set(tile.id,{tile,layer:L.imageOverlay(tile.file,boundsFrom(tile.bounds),{pane:'terrain',opacity:1,zIndex:tile.id.startsWith('focus-')?3:2,className:'regional-relief detail-relief'})});
    this.geography=L.layerGroup().addTo(this.map);this.routes=L.layerGroup().addTo(this.map);this.nodes=L.layerGroup().addTo(this.map);this.labels=L.layerGroup().addTo(this.map);this.contextLabels=L.layerGroup().addTo(this.map);this.profileLayer=L.layerGroup().addTo(this.map);
    L.geoJSON(geography.boundaries,{pane:'geography',interactive:false,style:{color:'#8f9482',weight:.7,opacity:.42,dashArray:'3 5'}}).addTo(this.geography);
    this.baseRivers=L.geoJSON(geography.rivers,{pane:'geography',interactive:false,style:{color:'#7b9ca0',weight:1.15,opacity:.63}}).addTo(this.geography);
    L.geoJSON(geography.lakes,{pane:'geography',interactive:false,style:{color:'#88a2a0',weight:.4,fillColor:'#89a5a2',fillOpacity:.32,opacity:.35}}).addTo(this.geography);
    const canvas=L.canvas({pane:'geography',padding:.2});
    this.worldModern=L.layerGroup();const worldCanvas=L.canvas({pane:'worldContext',padding:.2});
    for(const offset of [-360,0,360]){
      const coordinatesToLatLng=coordinates=>L.latLng(coordinates[1],coordinates[0]+offset);
      L.geoJSON(geography.world.land,{renderer:worldCanvas,pane:'worldContext',coordsToLatLng:coordinatesToLatLng,interactive:false,style:{color:'#a4b5a3',weight:.7,fillColor:'#eef1e5',fillOpacity:1,opacity:.8}}).addTo(this.worldModern);
      L.geoJSON(geography.world.boundaries,{renderer:worldCanvas,pane:'worldContext',coordsToLatLng:coordinatesToLatLng,interactive:false,style:{color:'#aab8a5',weight:.65,opacity:.65}}).addTo(this.worldModern);
    }
    this.modern=L.layerGroup();
    this.urban=L.geoJSON(geography.modern.urban,{renderer:canvas,pane:'geography',interactive:false,style:{stroke:false,fillColor:'#dbd4c6',fillOpacity:.57}}).addTo(this.modern);
    this.roads=L.geoJSON(geography.modern.roads,{renderer:canvas,pane:'geography',interactive:false,style:{color:'#d6b889',weight:1.1,opacity:.65}}).addTo(this.modern);
    L.geoJSON(geography.modern.boundaries,{renderer:canvas,pane:'geography',interactive:false,style:{color:'#9ca999',weight:.9,dashArray:'4 5',opacity:.65}}).addTo(this.modern);
    this.fineRivers=L.geoJSON(geography.modern.rivers,{renderer:canvas,pane:'geography',interactive:false,style:{color:'#6a9ba6',weight:1.1,opacity:.7}});
    this.motion=L.layerGroup().addTo(this.map);
    this.chishuiFeatures=geography.chishui.features;
    this.chishuiRiver=L.geoJSON(geography.chishui,{pane:'geography',interactive:false,style:{color:'#5f8e99',weight:2.4,opacity:.8}});
    for(let lon=95;lon<=115;lon+=5)L.polyline([[22,lon],[39,lon]],{pane:'geography',weight:.5,color:'#8f8e7a',opacity:.18,interactive:false,dashArray:'2 8'}).addTo(this.geography);
    for(let lat=25;lat<=35;lat+=5)L.polyline([[lat,94],[lat,118]],{pane:'geography',weight:.5,color:'#8f8e7a',opacity:.18,interactive:false,dashArray:'2 8'}).addTo(this.geography);
    L.control.zoom({position:'topright'}).addTo(this.map);L.control.scale({position:'bottomleft',imperial:false,maxWidth:85}).addTo(this.map);
    this.map.on('moveend resize',()=>{if(this.state){this.constrainView();this.updateTerrain();this.updateWaterways();this.drawLabels(this.state);}});
    this.map.on('zoomend',()=>{if(this.state&&!this.fitting)this.render(this.state);});
    this.map.getContainer().addEventListener('click',e=>{const target=e.target.closest('[data-popup-event]');if(target){this.map.closePopup();onEvent(target.dataset.popupEvent);}});
  }

  fit(state,animate=false) {
    this.fitting=true;
    this.map.stop();
    this.map.invalidateSize({pan:false});
    const size=this.map.getSize(),b=this.mosaic.bounds;
    this.map.setMinZoom(Math.ceil(Math.log2(Math.max(size.x*360/(512*(b[2]-b[0])),size.y*180/(256*(b[3]-b[1]))))*10)/10);
    const mobile=window.innerWidth<761;
    let bounds,paddingTopLeft=[50,90],paddingBottomRight=[70,mobile?185:60];
    if(state.storyFocus){
      const story=storyById.get(state.storyFocus),event=eventById.get(story.eventId),p=this.places[event.placeId];
      bounds=story.region?boundsFrom(story.region):L.latLngBounds([ll(p)]).pad(.5);
      if(!story.region)bounds=boundsFrom([p.lon-.75,p.lat-.55,p.lon+.75,p.lat+.55]);
      paddingTopLeft=[55,mobile?190:90];paddingBottomRight=[mobile?30:55,mobile?285:70];
    }else if(state.battleFocus){
      const e=eventById.get(state.battleFocus),p=this.places[e.placeId];bounds=boundsFrom([p.lon-1.4,p.lat-.8,p.lon+1.4,p.lat+.8]);
    }else if(state.chapter==='chishui'){
      bounds=state.chishuiView==='compare'?boundsFrom([104.65,27.16,107.20,28.6]):L.latLngBounds(resolveSceneLine(state.step,this.places,this.waypoints).map(ll)).pad(.16);paddingTopLeft=[40,80];paddingBottomRight=[35,mobile?245:55];
    }else if(state.chapter==='terrain'){
      const samples=this.profiles.find(p=>p.id===state.profileId).samples;
      bounds=L.latLngBounds(samples.map(ll)).pad(state.profileId==='jiajin'?.45:.22);
      paddingTopLeft=[70,65];paddingBottomRight=[80,mobile?150:40];
    }else if(state.chapter==='memory'){
      bounds=memories[state.memoryIndex].closing?boundsFrom([98.8,24.7,116.25,38.0]):memories[state.memoryIndex].today?boundsFrom([109.9,25.0,112.1,27.1]):boundsFrom([99.7,29.5,111,38.1]);
      paddingTopLeft=[40,70];paddingBottomRight=[40,mobile?210:55];
    }else if(state.unitId!=='all'){
      const routes=[...orderedLegs(state.unitId,this.places,this.waypoints),...branchLegs(state.unitId,this.places,this.waypoints)];
      bounds=L.latLngBounds(routes.flatMap(route=>route.line.map(ll))).pad(.06);
    }else bounds=boundsFrom([98.8,24.7,116.25,38.0]);
    const dockHeight=parseFloat(getComputedStyle(document.querySelector('#atlas')).getPropertyValue('--dock'))||112;
    const railVisible=!state.panelCollapsed&&!document.querySelector('#atlas').classList.contains('context-open');
    paddingBottomRight[1]=Math.max(paddingBottomRight[1],mobile?(railVisible?document.querySelector('#story-rail').getBoundingClientRect().height+dockHeight+35:dockHeight+35):dockHeight+40);
    this.map.fitBounds(bounds,{paddingTopLeft,paddingBottomRight,animate:animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches,duration:.5,maxZoom:state.chapter==='terrain'?8.6:state.chapter==='memory'?7:8});
    if(!animate)this.constrainView();
    this.fitting=false;
  }

  constrainView(){
    if(this.constraining||!this.map._loaded)return;
    const b=this.mosaic.bounds,v=this.map.getBounds(),margin=720/(512*2**this.map.getZoom());
    let dx=0,dy=0;
    if(v.getEast()>b[2]-margin)dx=b[2]-margin-v.getEast();
    else if(v.getWest()<b[0]+margin)dx=b[0]+margin-v.getWest();
    if(v.getNorth()>b[3]-margin)dy=b[3]-margin-v.getNorth();
    else if(v.getSouth()<b[1]+margin)dy=b[1]+margin-v.getSouth();
    if(!dx&&!dy)return;
    this.constraining=true;const c=this.map.getCenter();
    this.map.panTo([c.lat+dy,c.lng+dx],{animate:false});this.constraining=false;
  }

  fitEventResults(list){
    if(!list.length)return;const points=[...new Set(list.map(e=>e.placeId))].map(id=>ll(this.places[id]));
    const mobile=innerWidth<761,rail=document.querySelector('#story-rail');
    const bounds=L.latLngBounds(points).pad(.14);
    this.map.fitBounds(bounds,{paddingTopLeft:[35,75],paddingBottomRight:[45,mobile?rail.getBoundingClientRect().height+165:155],maxZoom:7.4,animate:false});
    this.constrainView();this.render(this.state);
  }

  render(state,{fit=false}={}) {
    this.state=state;this.currentVia=[];this.currentRouteLabels=[];this.drawnVia.clear();this.routes.clearLayers();this.nodes.clearLayers();this.profileLayer.clearLayers();this.motion.clearLayers();this.legById.clear();
    if(fit)this.fit(state);
    const showTerrain=state.basemap!=='modern';
    this.map.getContainer().dataset.basemap=showTerrain?'terrain':'modern';
    this.map.getContainer().dataset.detail=detailLevel(this.map.getZoom());
    this.terrain.setOpacity(showTerrain?1:0);this.updateTerrain();
    if(showTerrain){this.map.removeLayer(this.worldModern);this.map.removeLayer(this.modern);}
    else{this.worldModern.addTo(this.map);this.modern.addTo(this.map);}
    this.roads.setStyle({opacity:this.map.getZoom()>=6.0?.62:.25,weight:this.map.getZoom()>=7?1.4:.9});
    if(this.map.getZoom()>=5.3||(!showTerrain&&this.map.getZoom()>=5.2))this.fineRivers.addTo(this.map);else this.map.removeLayer(this.fineRivers);
    if(state.chapter==='chishui'){
      this.chishuiRiver.addTo(this.map);this.drawChishui(state);
    }else{
      if(state.chapter==='terrain')this.drawProfile(state);
      else this.drawRoutes(state);
    }
    this.updateWaterways();
    this.drawLabels(state);
    if(this.journey)this.drawJourney();
    if(this.calendarTracks)this.drawCalendar(this.calendarTracks);
    if(state.storyFocus)this.drawStoryFocus(state.storyFocus);
  }

  updateTerrain(){
    const show=this.state?.basemap!=='modern'&&this.map.getZoom()>=this.mosaic.detailMinZoom,visible=this.map.getBounds().pad(.12);
    for(const {tile,layer} of this.detailTiles.values()){
      if(show&&this.map.getZoom()>=(tile.minZoom??this.mosaic.detailMinZoom)&&visible.intersects(boundsFrom(tile.bounds)))layer.addTo(this.map);else this.map.removeLayer(layer);
    }
  }

  updateWaterways(){
    const show=this.state?.chapter==='chishui'||this.map.getZoom()>=6.7&&this.map.getBounds().intersects(this.chishuiRiver.getBounds());
    if(show)this.chishuiRiver.addTo(this.map);else this.map.removeLayer(this.chishuiRiver);
  }

  drawStoryFocus(id){
    const s=storyById.get(id),e=eventById.get(s.eventId),p=s.waypointId?resolveWaypoint(s.waypointId,this.waypoints):this.places[e.placeId];
    // A region story is deliberately labelled at its region, not at an
    // invented pond/campsite; the label's own wording carries that precision.
    const center=s.region?[(s.region[1]+s.region[3])/2,(s.region[0]+s.region[2])/2]:ll(p);
    L.marker(center,{pane:'annotations',icon:L.divIcon({className:'story-map-pin',iconSize:[120,45],iconAnchor:[60,22],html:`<button data-map-story="${s.id}"><span>★</span>${s.title}<small>${s.genre.startsWith('文学')?'文学关联区段':'故事所在区域'}</small></button>`})}).on('click',()=>this.onStory?.(id)).addTo(this.nodes);
  }

  displayLine(line){
    const zoom=this.map.getZoom(),context=this.geometryContexts.get(line)||{};
    const key=JSON.stringify([Math.round(zoom*10),line.map(p=>[p.lon,p.lat]),context]);
    if(!this.geometryCache.has(key))this.geometryCache.set(key,displayRoute(line,zoom,context));
    if(this.geometryCache.size>1600)this.geometryCache.delete(this.geometryCache.keys().next().value);
    return this.geometryCache.get(key);
  }

  addDirection(line,color,weight=1) {
    line=this.displayLine(line);
    if(line.length<2)return;
    const length=screenRouteLength(line.map(p=>this.map.latLngToLayerPoint(ll(p))));
    if(length<40)return;
    const count=Math.min(this.map.getZoom()>=7?7:4,Math.max(1,Math.floor(length/170)));
    for(let i=0;i<count;i++){
      const progress=(i+.57)/count,point=positionOnLeg({line},progress);
      const previous=positionOnLeg({line},Math.max(0,progress-.006)),next=positionOnLeg({line},Math.min(1,progress+.006));
      const a=this.map.latLngToLayerPoint(ll(previous)),b=this.map.latLngToLayerPoint(ll(next));
      if(a.distanceTo(b)<.1)continue;
      const angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI+90;
      L.marker(ll(point),{interactive:false,pane:'annotations',icon:L.divIcon({className:'direction-icon',iconSize:[12,14],iconAnchor:[6,7],html:`<svg style="--color:${color};--angle:${angle}deg;opacity:${weight}" viewBox="0 0 12 14"><path d="m6 1 5 12-5-3-5 3Z"/></svg>`})}).addTo(this.routes);
    }
  }

  addLine(line,color,opacity,weight=2.8,dash=null,casing=true,className=''){
    if(line.every(p=>p.lon===line[0].lon&&p.lat===line[0].lat))return;
    const points=this.displayLine(line).map(ll);
    if(casing)new CorridorLine(points,{pane:'routes',color:'#faf3e6',weight:weight+1.8,opacity:opacity*.85,interactive:false,lineCap:'round',smoothFactor:0,noClip:true}).addTo(this.routes);
    return new CorridorLine(points,{pane:'routes',color,weight,opacity,dashArray:dash,interactive:false,lineCap:'round',lineJoin:'round',smoothFactor:0,noClip:true,className:`route-trace ${className}`}).addTo(this.routes);
  }

  addRouteInteraction(leg,color){
    if(leg.line.every(p=>p.lon===leg.line[0].lon&&p.lat===leg.line[0].lat))return;
    const title=leg.label||`${leg.line[0].name} — ${leg.line.at(-1).name}`;
    const chain=leg.line.map(p=>escapeText(p.name)).join(' → ');
    const sourceLinks=leg.sourceIds.map(id=>{const s=sources.find(source=>source.id===id);return `<a href="${sourceHref(s)}" target="_blank" rel="noopener noreferrer">${id} · ${escapeText(s.publisher.split('（')[0])}</a>`;}).join('<br>');
    const hit=new CorridorLine(this.displayLine(leg.line).map(ll),{pane:'routes',color,weight:14,opacity:0,className:'route-hit',smoothFactor:0,noClip:true,bubblingMouseEvents:false}).addTo(this.routes);
    hit.bindPopup(`<div class="route-popup"><strong>${escapeText(title)}</strong><p>${chain}</p><p>${sourceLinks}</p>${leg.toId?`<button data-popup-event="${leg.toId}">沿这一程读历史 →</button><button data-read-event="${leg.toId}">展开史事与延伸影像 ↗</button>`:''}<button data-route-evidence="${leg.sourceIds.join(',')}">查阅路线依据</button></div>`,{maxWidth:Math.min(315,this.map.getSize().x-80),maxHeight:320,autoPan:false});
    // Large route notes need to fit without pushing a world view past maxBounds.
    // Keep their geographical anchor and flip below it when the top lacks room.
    hit.on('popupopen',event=>{
      const popup=event.popup,element=popup.getElement(),size=this.map.getSize();
      const anchor=this.map.latLngToContainerPoint(popup.getLatLng());
      popup.options.maxHeight=Math.max(100,Math.min(320,Math.floor(Math.max(anchor.y,size.y-anchor.y)-75)));
      popup.options.offset=L.point(0,7);element.classList.remove('route-popup-below');popup.update();
      const rect=element.getBoundingClientRect();
      const below=anchor.y<rect.height+25&&size.y-anchor.y>=rect.height+25;
      const left=Math.max(12,Math.min(size.x-rect.width-12,anchor.x-rect.width/2));
      const offsetX=left-(anchor.x-rect.width/2);
      popup.options.offset=L.point(offsetX,below?rect.height+40:7);
      element.classList.toggle('route-popup-below',below);
      element.querySelector('.leaflet-popup-tip-container').style.left=`${rect.width/2-offsetX}px`;
      popup.update();
    });
    hit.on('mouseover',()=>hit.setStyle({opacity:.12}));hit.on('mouseout',()=>hit.setStyle({opacity:0}));
    const element=hit.getElement();if(element){element.setAttribute('tabindex','0');element.setAttribute('role','button');element.setAttribute('data-route',leg.id);element.setAttribute('aria-label',`行军路段：${title}，查看途经地与史料`);element.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();hit.openPopup();}});}
  }

  drawViaMarkers(points,color){
    const unique=[...new Map(points.map(p=>[p.id,p])).values()];this.currentVia.push(...unique);
    if(this.map.getZoom()<5.6)return;
    for(const p of unique){
      if(this.drawnVia.has(p.id))continue;this.drawnVia.add(p.id);
      L.circleMarker(ll(p),{pane:'annotations',radius:2.4,color,weight:1,fillColor:'#f9f1e2',fillOpacity:.95,interactive:false}).addTo(this.nodes);
      const marker=L.circleMarker(ll(p),{pane:'annotations',radius:8,color,opacity:0,fillOpacity:0,bubblingMouseEvents:false}).addTo(this.nodes);
      const read=()=>this.onLocality?.(p,[...this.legById.values()].filter(leg=>leg.via?.some(point=>point.id===p.id)));marker.on('click',read);
      const element=marker.getElement();if(element){element.setAttribute('data-via-place',p.id);element.setAttribute('role','button');element.setAttribute('tabindex','0');element.setAttribute('aria-label',`途经地：${p.name}，阅读沿途史事`);element.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();read();}});}
    }
  }

  drawRoutes(state){
    const selected=state.eventId?eventById.get(state.eventId):null;
    const focusUnits=state.chapter==='memory'?memories[state.memoryIndex].unitIds:null;
    const order=[...units].sort((a,b)=>(a.id===state.unitId?1:0)-(b.id===state.unitId?1:0));
    const drawn=new Set();
    for(const unit of order){
      const relevant=state.chapter==='memory'?focusUnits.includes(unit.id):(state.unitId==='all'||state.unitId===unit.id);
      const legs=orderedLegs(unit.id,this.places,this.waypoints);
      legs.forEach((leg,i)=>{this.geometryContexts.set(leg.line,{before:legs[i-1]?.line.at(-2),after:legs[i+1]?.line[1]});this.legById.set(leg.id,leg);});
      for(const leg of legs){
        let opacity=relevant?.9:.1;
        let color=unit.color;
        if(state.calendarDay!==null&&state.calendarDay!==undefined){
          const arrived=dayNumber(eventById.get(leg.toId).start)<=state.calendarDay;
          if(!arrived){opacity=relevant?.15:.05;color='#6c7768';}
        }else if(state.follow&&selected){
          const progress=eventsForUnit(unit.id).findIndex(e=>e.id===selected.id);
          const legIndex=legs.findIndex(l=>l.id===leg.id);
          const done=progress>=0?legIndex<progress:eventById.get(leg.toId).end<=selected.start;
          if(!done){opacity=relevant?.16:.055;color='#7d7c6c';}
        }
        if(state.chapter==='memory')opacity=relevant?.55:.1;
        const geometryKey=leg.line.map(p=>`${p.lon},${p.lat}`).join(';');
        const shared=drawn.has(geometryKey)&&state.unitId==='all';
        const active=selected&&leg.toId===selected.id&&relevant;
        if(state.matchedEventIds&&!state.matchedEventIds.includes(leg.fromId)&&!state.matchedEventIds.includes(leg.toId))opacity*=.27;
        const local=this.map.getZoom()>=7;
        this.addLine(leg.line,color,opacity,shared?1.8:active?(local?4.1:3.6):relevant?(local?3.2:2.8):1.5,leg.geometryMeaning==='documented-waypoints'?null:'5 4',!shared,active?'route-selected':'');
        if(relevant)drawn.add(geometryKey);
      if(relevant&&opacity>.3)this.addDirection(leg.line,color,.9);
        if(relevant&&state.chapter==='overview')this.addRouteInteraction(leg,color);
        if(relevant&&this.map.getZoom()>=6.6){
          const name=leg.id==='red1:r1-dadu>r1-luding'?'西岸 · 主力':leg.id==='red2:r2-zhongdian>r24-ganzi-meeting'?'红二军团 · 左纵队':null;
          if(name)this.currentRouteLabels.push({id:leg.id,name,color,line:leg.line,side:leg.fromId==='r1-dadu'?'west':null});
        }
      }
      for(const branch of branchLegs(unit.id,this.places,this.waypoints)){
        this.legById.set(branch.id,branch);
        const future=state.calendarDay!==null&&state.calendarDay!==undefined&&dayNumber(eventById.get(branch.toId).start)>state.calendarDay;
        const opacity=future?.1:relevant?.8:.08,color=future?'#6c7768':unit.color;
        this.addLine(branch.line,color,opacity,relevant?2.2:1.3,null,true);
        if(relevant){if(!future)this.addDirection(branch.line,unit.color,.8);if(state.chapter==='overview')this.addRouteInteraction(branch,unit.color);}
        if(relevant&&this.map.getZoom()>=6.6)this.currentRouteLabels.push({id:branch.id,name:branch.id==='red1-dadu-east'?'东岸 · 红一师、干部团':'红六军团 · 右纵队',color:unit.color,line:branch.line,side:branch.id==='red1-dadu-east'?'east':null});
      }
      if(state.chapter==='overview'&&relevant)this.drawViaMarkers([...legs,...branchLegs(unit.id,this.places,this.waypoints)].flatMap(leg=>leg.via),unit.color);
    }
    const pool=state.chapter==='memory'?events.filter(e=>['r1-wuqi','r4-huining','r2-jiangtai','r25-arrival'].includes(e.id)):eventsForUnit(state.unitId).filter(e=>!state.matchedEventIds||state.matchedEventIds.includes(e.id));
    const grouped=new Map();
    for(const event of pool){if(!grouped.has(event.placeId))grouped.set(event.placeId,[]);grouped.get(event.placeId).push(event);}
    for(const [placeId,group] of grouped){
      const place=this.places[placeId];const active=group.some(e=>e.id===state.eventId);
      const unit=units.find(u=>u.id===group[0].unitIds[0]);
      const meeting=group.some(e=>e.kind==='会师');
      const turning=group.some(e=>turningPoints[e.id]);
      if(!state.matchedEventIds&&this.map.getZoom()<5.5&&!active&&!turning&&!meeting&&!group.some(e=>['出发','抵达'].includes(e.kind)))continue;
      const major=meeting||group.some(e=>['r1-xiangjiang','r1-zunyi','r1-luding','r1-wuqi','r25-sipo'].includes(e.id));
      const marker=major||active?L.marker(ll(place),{pane:'annotations',icon:L.divIcon({className:`historic-emblem ${active?'active':''} ${meeting?'meeting-emblem':''}`,iconSize:[24,30],iconAnchor:[12,23],html:`<span style="--emblem-color:${unit.color}">${meeting?'★':group.some(e=>e.kind==='战斗')?'⚑':'◆'}</span>`})}):L.circleMarker(ll(place),{pane:'annotations',radius:turning?4.2:3.1,color:unit.color,weight:turning?2:1.3,fillColor:'#faf4e8',fillOpacity:1,className:turning?'turning-point':'historical-point'});
      const rows=group.map(e=>`<button class="popup-event" data-popup-event="${e.id}" style="display:block;text-align:left;padding:10px 2px;font:12px/1.6 var(--sans);color:#942f25">${escapeText(e.title)}<span class="popup-army">${e.unitIds.map(id=>unitNameAt(id,e.start)).join(' · ')}</span><small style="font:10px var(--sans);color:#847a68">${e.precision==='month'?e.start.slice(0,7):e.start}${e.end!==e.start&&e.precision!=='month'?' — '+e.end:''}</small></button>`).join('');
      marker.bindPopup(`<div class="place-popup"><small>${meeting?'会师时刻':major?'重要历史节点':'沿途史事'}</small><strong>${escapeText(place.name)}</strong>${rows}<span class="popup-hint">选择史事，展开详细故事 ↗</span></div>`,{closeButton:true,maxWidth:260,maxHeight:Math.max(180,this.map.getSize().y-160),autoPanPaddingTopLeft:[25,70],autoPanPaddingBottomRight:[35,150]}).addTo(this.nodes);
      if(!state.matchedEventIds&&state.calendarDay!==null&&state.calendarDay!==undefined&&!active&&group.every(e=>dayNumber(e.start)>state.calendarDay)){
        if(marker.setOpacity)marker.setOpacity(.22);else marker.setStyle({opacity:.22,fillOpacity:.3});
      }
      const element=marker.getElement();
      if(element){
        element.setAttribute('data-place',placeId);element.setAttribute('role','button');element.setAttribute('tabindex','0');element.setAttribute('aria-label',`历史节点：${place.name}`);
        element.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();marker.openPopup();}});
      }
    }
    if(state.chapter==='memory'){
      const memory=memories[state.memoryIndex],p=this.places[memory.placeId];
      L.marker(ll(p),{interactive:false,pane:'annotations',icon:L.divIcon({className:'place-icon',iconSize:[20,20],iconAnchor:[10,10],html:`<div style="color:#ae3028;transform:scale(1.4)">${star}</div>`})}).addTo(this.nodes);
    }
  }

  drawChishui(state){
    const lines=chishuiSequences.map((_,index)=>resolveSceneLine(index,this.places,this.waypoints));
    lines.forEach((line,index)=>this.geometryContexts.set(line,{before:lines[index-1]?.at(-2),after:lines[index+1]?.[1]}));
    chishuiSequences.forEach((step,index)=>{
      const line=lines[index],active=index===state.step;
      this.legById.set(`chishui-${index}`,{id:`chishui-${index}`,line,via:line.filter(p=>p.id),fromId:index?chishuiSteps[index-1].id:'r1-zunyi',toId:chishuiSteps[index].id,sourceIds:step.sourceIds});
      const color=chishuiLessons[index].color,compare=state.chishuiView==='compare';
      this.addLine(line,active||compare?color:'#8d7f67',active?.95:compare?.74:.14,active?3.5:2.4,null,true,`crossing-route crossing-route-${index} ${active?'route-selected':''}`);
      if(active||compare){
        this.addDirection(line,color,active?1:.62);this.drawViaMarkers(line.filter(p=>p.id),color);
        this.addRouteInteraction({id:`chishui-${index}`,line,label:step.label,geometryMeaning:'documented-waypoints',note:step.note,sourceIds:step.sourceIds,toId:chishuiSteps[index].id},color);
      }
    });
    if(state.step>=2||state.chishuiView==='compare'){
      const line=chishuiFeint.refs.map(id=>resolveWaypoint(id.slice(1),this.waypoints));
      this.legById.set('chishui-feint',{...chishuiFeint,line,via:line,fromId:'r1-cross3',toId:'r1-cross4'});
      this.addLine(line,'#8f7048',.8,2,'5 5');this.addDirection(line,'#8f7048',.8);this.drawViaMarkers(line,'#8f7048');
      this.addRouteInteraction({...chishuiFeint,line,geometryMeaning:'regional-corridor'},'#8f7048');
    }
    if(state.step===1||state.step===3)this.drawViaMarkers([resolveWaypoint('erlang',this.waypoints)],'#5f8e99');
    for(const id of ['zunyi','tucheng','zhaxi','taipingdu','maotai']){
      const p=this.places[id];L.circleMarker(ll(p),{pane:'annotations',radius:4,color:'#8b7860',weight:1.4,fillColor:'#f9f1e3',fillOpacity:1}).addTo(this.nodes);
    }
    for(const [index,step] of chishuiSteps.entries()){
      if(state.chishuiView!=='compare'&&index!==state.step)continue;
      const p=this.places[eventById.get(step.id).placeId],shared=state.chishuiView==='compare'&&(index===1||index===3);
      L.marker(ll(p),{pane:'annotations',zIndexOffset:2400,icon:L.divIcon({className:'place-icon crossing-stop',iconSize:[36,36],iconAnchor:shared?[index===1?49:-13,18]:[18,18],html:`<button data-crossing-stop="${index}" class="crossing-badge ${index===state.step?'active':''}" aria-label="${step.label}，${chishuiLessons[index].short}" style="--stage-color:${chishuiLessons[index].color}">${index+1}</button>`})}).on('click',()=>this.onCrossing?.(index)).addTo(this.nodes);
    }
  }

  drawProfile(state){
    const profile=this.profiles.find(p=>p.id===state.profileId);
    const ids=state.profileId==='jiajin'?['r1-jiajin','r1-dawei']:['r1-grass'];
    for(const leg of orderedLegs('red1',this.places,this.waypoints).filter(l=>ids.includes(l.toId))){
      this.legById.set(leg.id,leg);this.addLine(leg.line,'#ad3829',.86,3.2,'7 3',true,'terrain-history-route');
      this.addDirection(leg.line,'#ad3829',.9);this.drawViaMarkers(leg.line.filter(p=>p.id),'#ad3829');this.addRouteInteraction(leg,'#ad3829');
    }
    L.polyline(profile.samples.map(ll),{pane:'routes',color:'#faf3e6',weight:4.3,opacity:.9,interactive:false}).addTo(this.profileLayer);
    L.polyline(profile.samples.map(ll),{pane:'routes',color:'#4e7c83',weight:2,opacity:.85,dashArray:'3 5',interactive:false}).addTo(this.profileLayer);
    for(const [index,name] of [[0,state.profileId==='jiajin'?'硗碛方向':'毛儿盖方向'],[120,state.profileId==='jiajin'?'达维方向':'若尔盖方向']]){
      const point=profile.samples[index];
      L.marker(ll(point),{interactive:false,pane:'annotations',icon:L.divIcon({className:'place-icon',iconSize:[100,20],iconAnchor:[-10,8],html:`<span class="terrain-ref-label">${name}</span>`})}).addTo(this.profileLayer);
    }
    this.sampleMarker=L.marker(ll(profile.samples[state.sampleIndex]),{interactive:false,pane:'annotations',icon:L.divIcon({className:'place-icon',iconSize:[15,15],iconAnchor:[7,7],html:'<span class="terrain-sample-pin"></span>'})}).addTo(this.profileLayer);
  }

  updateSample(state){
    this.state=state;
    const profile=this.profiles.find(p=>p.id===state.profileId);
    this.sampleMarker?.setLatLng(ll(profile.samples[state.sampleIndex]));
  }

  beginJourney(segment){
    const leg=this.legById.get(segment.id)||segment;
    this.journey={...segment,line:leg.line,progress:0};this.motion.clearLayers();this.drawJourney();
    // The camera changes at segment boundaries, not at every frame.
    const projected=leg.line.map(p=>this.map.latLngToContainerPoint(ll(p))),size=this.map.getSize();
    const mobile=window.innerWidth<761,left=mobile?22:35;
    const bottom=mobile?(this.state.panelCollapsed||document.querySelector('#atlas').classList.contains('context-open')?145:document.querySelector('#story-rail').getBoundingClientRect().height+145):155;
    const moving=leg.line.some(p=>p.lon!==leg.line[0].lon||p.lat!==leg.line[0].lat);
    if(moving&&this.state.follow){
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.map.flyToBounds(L.latLngBounds(leg.line.map(ll)),{paddingTopLeft:[left,100],paddingBottomRight:[70,bottom],maxZoom:7.6,animate:!reduced,duration:1.4});
      return reduced?0:1500;
    }
    return 0;
  }

  drawJourney(){
    const journey=this.journey;if(!journey)return;
    const line=this.legById.get(journey.id)?.line||journey.line;
    const points=this.displayLine(line).map(ll);
    if(points.length<2||points.every(p=>p[0]===points[0][0]&&p[1]===points[0][1])){
      this.motionMarker=L.marker(points[0]||ll(journey.line[0]),{interactive:false,pane:'annotations',icon:this.marchIcon(journey.unitId)}).addTo(this.motion);return;
    }
    this.motionPath=L.polyline(points,{pane:'routes',interactive:false,color:journey.color||'#ae3028',opacity:1,weight:4.6,smoothFactor:0,noClip:true,className:'journey-passed'}).addTo(this.motion);
    this.motionBand=L.polyline(points,{pane:'routes',interactive:false,color:'#fff6d7',opacity:.98,weight:2.2,smoothFactor:0,noClip:true,className:'journey-band'}).addTo(this.motion);
    this.motionMarker=L.marker(points[0],{interactive:false,pane:'annotations',icon:this.marchIcon(journey.unitId)}).addTo(this.motion);
    this.motionLength=this.motionPath.getElement()?.getTotalLength()||0;
    this.updateJourney(journey.progress);
  }

  updateJourney(progress){
    if(!this.journey)return;
    this.journey.progress=progress;
    const path=this.motionPath?.getElement(),band=this.motionBand?.getElement(),length=this.motionLength;
    if(!path||!length||!this.motion.hasLayer(this.motionPath))return;
    const stroke=journeyTrailStrokeState(progress,{behind:.045,ahead:.014});
    path.style.strokeDasharray=`${stroke.travelled.length*length} ${length+1}`;
    if(band){band.style.strokeDasharray=`${stroke.band.length*length} ${length+1}`;band.style.strokeDashoffset=String(-stroke.band.start*length);}
    const p=path.getPointAtLength(progress*length),a=path.getPointAtLength(Math.max(0,progress*length-3)),b=path.getPointAtLength(Math.min(length,progress*length+3));
    this.motionMarker.setLatLng(this.map.layerPointToLatLng(L.point(p.x,p.y)));
    const el=this.motionMarker.getElement();if(el){el.style.setProperty('--heading',`${Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI}deg`);el.style.setProperty('--march-color',this.journey.color||'#ae3028');el.dataset.progress=progress.toFixed(5);}
    this.alignMarchSymbol(this.motionMarker);
  }

  alignMarchSymbol(marker){
    if(this.state?.chapter!=='chishui')return;
    const el=marker.getElement();if(!el)return;
    const origin=this.map.getContainer().getBoundingClientRect(),size=this.map.getSize();
    const obstacles=[...document.querySelectorAll('.crossing-stop,.place-label.major,#playback-dock')].filter(e=>e.checkVisibility()).map(e=>{const r=e.getBoundingClientRect();return {left:r.left-origin.left,right:r.right-origin.left,top:r.top-origin.top,bottom:r.bottom-origin.top};});
    const point=this.map.latLngToContainerPoint(marker.getLatLng()),offset=marchSymbolOffset(point,obstacles,size.x,size.y);
    el.style.setProperty('--symbol-x',offset.x+'px');el.style.setProperty('--symbol-y',offset.y+'px');
    const leader=el.querySelector('.march-leader');leader.style.display=offset.x||offset.y?'block':'none';
    leader.querySelector('path').setAttribute('d',`M21 27 L${21+offset.x} ${27+offset.y}`);
  }

  marchIcon(unitId,waiting=false){
    const label=units.find(u=>u.id===unitId)?.short||'中央红军';
    return L.divIcon({className:`march-marker ${waiting?'march-waiting':''}`,iconSize:[42,52],iconAnchor:[21,25],html:`<svg class="march-leader" aria-hidden="true"><path/></svg><span class="march-cap">${capSymbol}</span><span class="march-ground"></span><b class="march-unit-name">${label}</b>`});
  }

  drawCalendar(tracks){
    this.calendarTracks=tracks;this.calendarMotions.clear();this.motion.clearLayers();
    for(const track of tracks){
      if(!track.leg)continue;
      const line=this.legById.get(track.leg.id)?.line||track.leg.line,points=this.displayLine(line).map(ll);
      let path,band;
      if(points.length>1&&points.some(p=>p[0]!==points[0][0]||p[1]!==points[0][1])){
        path=L.polyline(points,{pane:'routes',interactive:false,color:track.color,opacity:track.started?1:0,weight:4.4,smoothFactor:0,noClip:true,className:'journey-passed'}).addTo(this.motion);
        band=L.polyline(points,{pane:'routes',interactive:false,color:'#fff3cb',opacity:track.started?.95:0,weight:1.8,smoothFactor:0,noClip:true,className:'journey-band'}).addTo(this.motion);
      }
      const marker=L.marker(points[0],{interactive:false,pane:'annotations',opacity:track.started?1:.5,icon:this.marchIcon(track.unitId,!track.started)}).addTo(this.motion);
      const el=marker.getElement();el?.style.setProperty('--march-color',track.color);if(el)el.dataset.army=track.unitId;
      this.calendarMotions.set(track.unitId,{path,band,marker,line,length:path?.getElement()?.getTotalLength()||0,legId:track.leg.id});
    }
    this.updateCalendar(tracks);
  }

  updateCalendar(tracks){
    this.calendarTracks=tracks;
    for(const track of tracks){
      const item=this.calendarMotions.get(track.unitId);if(!item)continue;
      const path=item.path?.getElement(),band=item.band?.getElement(),t=track.progress;
      if(path&&item.length){
        const stroke=journeyTrailStrokeState(t,{behind:.045,ahead:.014});
        path.style.strokeDasharray=`${stroke.travelled.length*item.length} ${item.length+1}`;
        if(band){band.style.strokeDasharray=`${stroke.band.length*item.length} ${item.length+1}`;band.style.strokeDashoffset=String(-stroke.band.start*item.length);}
        const p=path.getPointAtLength(t*item.length);item.marker.setLatLng(this.map.layerPointToLatLng(L.point(p.x,p.y)));
      }else item.marker.setLatLng(ll(positionOnLeg({line:item.line},t)));
      item.marker.setOpacity(track.started?1:.45);
      const el=item.marker.getElement();if(el){el.dataset.progress=t.toFixed(5);el.dataset.status=track.status;el.classList.toggle('march-waiting',!track.started);}
    }
  }

  endJourney(){this.journey=null;this.calendarTracks=null;this.calendarMotions.clear();this.motion.clearLayers();this.motionPath=null;this.motionBand=null;this.motionMarker=null;}

  drawLabels(state){
    this.labels.clearLayers();this.contextLabels.clearLayers();
    if(!state.labels)return;
    let ids;
    if(state.chapter==='chishui')ids=['zunyi','tucheng','zhaxi','taipingdu','maotai'];
    else if(state.chapter==='terrain')ids=state.profileId==='jiajin'?['jiajin','dawei']:['maoergai'];
    else if(state.chapter==='memory')ids=['wuqi','yongping','huining','jiangtaibu',...(memories[state.memoryIndex].today?['xiangjiang']:[])];
    else ids=[...new Set(eventsForUnit(state.unitId).filter(e=>!state.matchedEventIds||state.matchedEventIds.includes(e.id)).map(e=>e.placeId))];
    const majorIds=new Set(['yudu','zunyi','wuqi','liujia','ganzi','huining','jiangtaibu','hejiachong','yongping','xiangjiang']);
    const activeId=state.chapter==='chishui'?eventById.get(chishuiSteps[state.step].id).placeId:state.chapter==='memory'?memories[state.memoryIndex].placeId:eventById.get(state.eventId)?.placeId;
    const width=this.map.getSize().x,height=this.map.getSize().y;
    const zoom=this.map.getZoom(),level=detailLevel(zoom);
    const candidates=ids.map(id=>{
      const p=this.places[id],screen=this.map.latLngToContainerPoint(ll(p));
      const turning=events.some(e=>e.placeId===id&&turningPoints[e.id]);
      const major=majorIds.has(id)||turning,selected=id===activeId;
      const labelWidth=p.name.length*(selected?15:major?14:12)+18;
      const offset=state.chapter==='chishui'?(id==='taipingdu'&&state.chishuiView==='compare'?[-40,-39]:[22,-10]):[18,-10];
      return {id,place:p,major,selected,screen,offset,offsets:pointLabelOffsets(labelWidth,22,offset,selected||major?24:10),priority:selected?100:major?20:2,rect:{left:screen.x+offset[0],right:screen.x+offset[0]+labelWidth,top:screen.y+offset[1],bottom:screen.y+offset[1]+22}};
    });
    for(const p of zoom>=5.6?new Map(this.currentVia.map(p=>[p.id,p])).values():[]){
      const name=p.name.replace(/（.*?）/g,'').replace('一带',''),screen=this.map.latLngToContainerPoint(ll(p));
      if(candidates.some(c=>c.place.name.replace(/（.*?）/g,'').replace('一带','')===name&&Math.hypot(c.screen.x-screen.x,c.screen.y-screen.y)<35))continue;
      const labelWidth=name.length*(level==='local'?11:10)+8;
      candidates.push({id:`via-${p.id}`,place:{...p,name},via:true,screen,offsets:pointLabelOffsets(labelWidth,18),priority:1,rect:{left:screen.x+10,right:screen.x+10+labelWidth,top:screen.y-9,bottom:screen.y+9}});
    }
    for(const f of this.modernPlaces.features){
      const props=f.properties,rank=Number(props.SCALERANK);
      if(rank>(level==='overview'?3:level==='regional'?6:10))continue;
      const [lon,lat]=f.geometry.coordinates,name=props.NAME_ZH||props.NAME;
      if(!name)continue;
      const screen=this.map.latLngToContainerPoint([lat,lon]);
      if(candidates.some(p=>!p.modern&&Math.hypot(p.screen.x-screen.x,p.screen.y-screen.y)<24))continue;
      const labelWidth=(name.length+(state.basemap==='modern'?0:2))*10+8;
      candidates.push({id:`modern-${props.NAME}`,modern:true,place:{name,lon,lat},screen,offsets:pointLabelOffsets(labelWidth,18),priority:.4+(10-rank)/100,rect:{left:screen.x+10,right:screen.x+10+labelWidth,top:screen.y-9,bottom:screen.y+9}});
    }
    candidates.push(...riverLabelCandidates(this.riverFeatures,p=>this.map.latLngToContainerPoint([p[1],p[0]]),zoom,width,height));
    if(this.map.hasLayer(this.chishuiRiver))candidates.push(...riverLabelCandidates(this.chishuiFeatures,p=>this.map.latLngToContainerPoint([p[1],p[0]]),zoom,width,height).map(c=>({...c,priority:8})));
    for(const route of this.currentRouteLabels){
      const point=positionOnLeg({line:this.displayLine(route.line)},.48),screen=this.map.latLngToContainerPoint(ll(point)),labelWidth=route.name.length*10+22;
      const offsets=route.side==='west'?[[-labelWidth-20,-12],[-labelWidth-20,-40],[-labelWidth-20,15]]:route.side==='east'?[[20,-12],[20,-40],[20,15]]:pointLabelOffsets(labelWidth,23,[15,-27]);
      candidates.push({id:`branch-label-${route.id}`,routeLabel:true,place:{...point,name:route.name},color:route.color,screen,offsets,priority:3,rect:{left:screen.x+15,right:screen.x+15+labelWidth,top:screen.y-27,bottom:screen.y-4}});
    }
    if(zoom<6.8)for(const [name,lon,lat] of [['四川',102.7,30.25],['贵州',106.55,26.8],['云南',100.9,25.5],['湖南',111.15,28.1],['江西',115.2,27.8],['湖北',112.4,31.4],['河南',113.6,34.5],['陕西',109.1,34.8],['甘肃',103.8,36.3],['宁夏',106.1,37.5]]){
      const screen=this.map.latLngToContainerPoint([lat,lon]);
      candidates.push({id:`province-${name}`,province:true,place:{name,lon,lat},screen,priority:.05,rect:{left:screen.x-30,right:screen.x+30,top:screen.y-12,bottom:screen.y+14}});
    }
    const visible=candidates.filter(c=>c.screen.x>0&&c.screen.x<width&&c.screen.y>0&&c.screen.y<height);
    const origin=this.map.getContainer().getBoundingClientRect(),reserved=[];
    for(const selector of ['#playback-dock','#map-caption','.north-mark','.story-map-card','.chishui-map-note','.branch-card','#milestone-callout','.leaflet-control-zoom','.leaflet-control-scale']){
      const el=document.querySelector(selector);if(!el||!el.checkVisibility())continue;const r=el.getBoundingClientRect();
      reserved.push({left:r.left-origin.left-4,right:r.right-origin.left+4,top:r.top-origin.top-4,bottom:r.bottom-origin.top+4});
    }
    for(const el of document.querySelectorAll('.crossing-stop,.historic-emblem')){const r=el.getBoundingClientRect();reserved.push({left:r.left-origin.left-2,right:r.right-origin.left+2,top:r.top-origin.top-2,bottom:r.bottom-origin.top+2});}
    if(innerWidth<761){const el=document.querySelector('#story-rail');if(el.checkVisibility()){const r=el.getBoundingClientRect();reserved.push({left:0,right:width,top:r.top-origin.top-8,bottom:r.bottom-origin.top+8});}}
    const accepted=arrangeAtlasLabels(visible,{width,height,reserved,padding:5,limit:innerWidth<761?32:80});
    this.labelLayout=accepted.map(c=>({id:c.id,kind:c.river?'river':c.routeLabel?'branch':c.province?'province':c.modern?'modern':c.via?'via':'history',rect:c.rect,anchor:{lon:c.place.lon,lat:c.place.lat}}));
    for(const c of accepted){
      const color=state.chapter==='chishui'?'#ae3028':units.find(u=>eventsForUnit(u.id).some(e=>e.placeId===c.id))?.color||'#ae3028';
      const text=escapeText(c.place.name),kind=c.river?'river':c.routeLabel?'branch':c.province?'province':c.modern?'modern':c.via?'via':'history';
      const move=`transform:translate(${c.offset[0]}px,${c.offset[1]}px)`;
      if(c.routeLabel){const x=c.offset[0]>0?c.rect.left:c.rect.right,y=(c.rect.top+c.rect.bottom)/2;L.polyline([ll(c.place),this.map.containerPointToLatLng([x,y])],{pane:'annotations',interactive:false,color:c.color,weight:.8,opacity:.55}).addTo(this.labels);}
      const html=c.river?`<span class="river-label" style="--river-angle:${c.angle}deg">${text}</span>`:c.province?`<span class="province-label">${text}</span>`:c.routeLabel?`<span class="route-locality-label" style="--route-color:${c.color};${move}">${text}</span>`:`<span class="place-label ${c.modern?'modern-label':''} ${c.via?'via-label':''} ${c.major?'major':''} ${c.selected?'selected':''}" style="--color:${color};${move}">${c.modern&&state.basemap!=='modern'?'<small>今</small>':''}${text}</span>`;
      L.marker(ll(c.place),{pane:'annotations',interactive:false,icon:L.divIcon({className:`place-icon map-label-${kind}`,iconSize:[1,1],iconAnchor:[0,0],html})}).addTo(this.labels);
    }
  }
}
