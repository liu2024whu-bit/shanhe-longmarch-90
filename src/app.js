import {sources,units,events,places,chishuiSteps,memories} from './data/history.js';
import {initialState,reduceState,eventById,eventsForUnit,dateText,unitNameAt,orderedLegs,branchLegs,legsBetweenEvents} from './marchModel.js';
import {chishuiSequences} from './data/routeCorridors.js';
import {AtlasMap} from './mapView.js';
import {mountSources} from './sourcesView.js';
import {mountPhotos} from './photosView.js';
import {turningPoints,eventPhotoIds,archiveLinks} from './data/turningPoints.js';
import {JourneyPlayer} from './journeyPlayer.js';
import {routeLengthKm} from './lib/geo.js';
import {resolveSceneLine} from './data/routeCorridors.js';
import {stories,storyById,storiesForEvent} from './data/stories.js';
import {storyRail,battleRail,storyMapCard,mountReader,battleIds} from './storyViews.js';
import {CalendarPlayer,calendarStart,calendarEnd,dayNumber,calendarMonth,tracksAtDay} from './calendarMarch.js';
import {chishuiLessons,terrainLessons} from './data/campaigns.js';
import {crossingRail,landscapeRail,eventSearchControls} from './campaignViews.js';
import {filterEvents,eventTimeWindow,hasEventFilters} from './lib/eventSearch.js';
import {captureReadingPosition,restoreReadingPosition} from './lib/readerContinuity.js';
import {terrainPassages,passageAtSample} from './lib/terrainPassages.js';

const $=selector=>document.querySelector(selector);
const icons={play:'<path d="m8 4 12 8-12 8Z"/>',pause:'<path d="M8 5v14 M16 5v14"/>',left:'<path d="m15 5-7 7 7 7"/>',right:'<path d="m9 5 7 7-7 7"/>',pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z M14 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]||''}</svg>`;
let state={...initialState},atlasMap,sourceView,photoView,reader,player,calendarPlayer,calendarLegs={},calendarKey='',photos=[],profiles=[],resolvedPlaces={},waypointReferences={};
const rail=$('#story-rail'),dock=$('#playback-dock'),overlay=$('#scene-overlay');
const contextPanels=[];
let terrainTourFrame=null,terrainTourRunning=false,terrainTourLast=null,terrainTourPosition=0;
const storySearchText=Object.fromEntries(events.map(e=>[e.id,storiesForEvent(e.id).map(s=>s.title).join(' ')]));
const eventResults=()=>filterEvents(eventsForUnit(state.unitId),state,resolvedPlaces,Object.fromEntries(units.map(u=>[u.id,u.name+' '+u.nameHistory])),storySearchText);
const timeWindow=()=>{const w=eventTimeWindow(state);return {...w,start:w.valid?dayNumber(w.from):calendarStart,end:w.valid?dayNumber(w.to):calendarEnd};};

function syncContextDrawer(refit=true){
  if(!calendarMode())$('#army-menu').open=false;
  const active=contextPanels.find(p=>p.menu.open);
  for(const p of contextPanels)p.panel.hidden=p!==active;
  const drawer=$('#context-drawer'),next=active?.menu.id||'',changed=$('#atlas').dataset.drawer!==next;
  drawer.hidden=!active;$('#atlas').dataset.drawer=next;$('#atlas').classList.toggle('context-open',!!active);
  if(active)$('#context-title').textContent=active.title;
  if(changed&&refit)requestAnimationFrame(()=>atlasMap.render(sceneState(),{fit:true}));
}

function sceneState(){
  if(state.chapter==='battles')return state.battleMode==='landscape'?{...state,chapter:'terrain',calendarDay:null}:state.battleMode==='chishui'?{...state,chapter:'chishui',calendarDay:null}:{...state,chapter:'overview',unitId:eventById.get(state.battleId).unitIds[0],eventId:state.battleId,follow:false,battleFocus:state.battleId,calendarDay:null};
  if(state.chapter==='stories'){
    const story=storyById.get(state.storyId),event=eventById.get(story.eventId);
    return {...state,chapter:'overview',unitId:story.unitId||(event.unitIds.length===1?event.unitIds[0]:'all'),eventId:null,follow:false,storyFocus:state.storyId,calendarDay:null};
  }
  if(state.chapter==='overview')return {...state,eventId:state.unitId==='all'&&state.calendarDay!==null?state.milestoneId||state.eventId:state.eventId,matchedEventIds:hasEventFilters(state)?eventResults().map(e=>e.id):null};
  return state;
}
const scene=()=>sceneState().chapter;
const calendarMode=()=>state.chapter==='overview'&&state.unitId==='all';

function frameRailWindow(){
  // The window caption carries the chapter's fixed context in a single row.
  // Dates and army labels attached to individual events stay with those events.
  const kicker=rail.querySelector(':scope > .rail-kicker');
  const label=({overview:'征途史事',battles:'抉择与行动',stories:'沿途记忆',memory:'精神与回响'})[state.chapter];
  let caption=kicker?.textContent.replace(/\s*—\s*/g,'—')||'';
  if(caption.startsWith(label+' · '))caption=caption.slice(label.length+3);
  kicker?.remove();
  rail.insertAdjacentHTML('afterbegin',`<div class="window-bar"><span class="window-caption"><span class="window-star" aria-hidden="true">★</span><span class="window-caption-label">${label}</span><span class="window-caption-text" ${caption?'':'hidden'}></span></span><div><button data-action="expand-panel" aria-label="${state.panelExpanded?'还原史事窗口':'展开史事窗口'}" aria-expanded="${state.panelExpanded}">${state.panelExpanded?'⊡':'⤢'}</button><button data-action="collapse-panel" aria-label="收起史事窗口">−</button></div></div>`);
  rail.querySelector('.window-caption-text').textContent=caption;
}

function frameWindow(){
  frameRailWindow();
  dock.insertAdjacentHTML('beforeend',`<button class="dock-fold" data-action="fold-dock" aria-label="${state.dockCollapsed?'展开时间窗口':'收起时间窗口'}" aria-expanded="${!state.dockCollapsed}">${state.dockCollapsed?'展开时间 ⌃':'收起 ⌄'}</button>`);
}

async function loadJSON(url){const response=await fetch(url);if(!response.ok)throw new Error(`Cannot load ${url}: ${response.status}`);return response.json();}

function sourceButton(ids,label='查看史料出处'){
  return `<button class="source-link" data-sources="${ids.join(',')}">${label} ↗</button>`;
}

function photoCard(id){
  const p=photos.find(p=>p.id===id);if(!p)return '';
  return `<figure class="evidence-photo"><button data-photo="${p.id}" aria-label="查看${p.title}完整照片"><img src="${p.file}" alt="${p.caption}" loading="lazy"><span>查看实景 ↗</span></button><figcaption>${p.title}<small>${p.date} · 摄影 ${p.author}</small></figcaption></figure>`;
}

function eventPhotos(id){
  const preferred=eventPhotoIds[id];return photos.filter(p=>p.id===preferred||p.eventIds.includes(id)).sort((a,b)=>Number(b.id===preferred)-Number(a.id===preferred));
}
function eventPhotoGallery(id){const images=eventPhotos(id);return images.length?`<div class="event-photo-gallery" aria-label="沿线实景">${images.slice(0,3).map(p=>photoCard(p.id)).join('')}</div>`:'';}

function renderUnitSwitcher(){
  $('#unit-switcher').hidden=state.chapter!=='overview';
  $('#unit-switcher').innerHTML=`<button class="unit-button all ${state.unitId==='all'?'active':''}" data-unit="all" aria-pressed="${state.unitId==='all'}">全线总览</button>${units.map(u=>`<button class="unit-button ${state.unitId===u.id?'active':''}" data-unit="${u.id}" aria-pressed="${state.unitId===u.id}" title="${u.subtitle} · ${u.period}" style="--color:${u.color}"><i></i>${u.short}</button>`).join('')}`;
  $('#chapter-context').hidden=state.chapter==='overview';
  $('#route-controls-label').textContent=state.chapter==='overview'?'行军路线':'当前阅读';
  $('#chapter-context').textContent=state.chapter==='battles'?'从战略抉择，到跨越山河':state.chapter==='stories'?'循着一段故事，走近一份信念':'不同来路，共同信念';
  if(state.chapter==='battles')$('#chapter-context').innerHTML=battleTabs(state.battleMode);
  if(state.chapter==='memory')$('#chapter-context').innerHTML='<div class="memory-context-nav"><button data-read-significance>长征的意义 ↗</button><button data-open-films>90周年影像 ↗</button></div>';
}

function battleTabs(mode){return `<div class="battle-chapter-tabs" aria-label="转折与战役专题">${[['turns','转折与战役'],['chishui','四渡赤水'],['landscape','雪山草地']].map(([id,title])=>`<button data-battle-mode="${id}" class="${mode===id?'active':''}" aria-pressed="${mode===id}">${title}</button>`).join('')}</div>`;}

function listRows(list){
  return list.map(e=>`<button class="event-row ${state.eventId===e.id?'active':''} ${turningPoints[e.id]?'is-turning':''}" data-event="${e.id}" style="--unit-color:${units.find(u=>u.id===e.unitIds[0]).color}" aria-pressed="${state.eventId===e.id}"><span class="node-dot"></span><span><span class="event-row-meta"><time>${dateText(e)}</time><span class="event-row-kind">${e.kind}</span></span><strong>${e.title}${turningPoints[e.id]?'<i class="turning-label">转折</i>':''}</strong><span class="row-armies">${e.unitIds.map(id=>`<span class="row-army" style="--army-color:${units.find(u=>u.id===id).color}">${unitNameAt(id,e.start)}</span>`).join('')}</span></span></button>`).join('');
}

function renderOverviewRail(){
  const selected=eventById.get(state.eventId),unit=units.find(u=>u.id===state.unitId),list=eventResults();
  if(selected){
    const p=resolvedPlaces[selected.placeId];
    const turn=turningPoints[selected.id],ids=[...new Set([...selected.sourceIds,...(turn?.extraSources||[])])];
    rail.innerHTML=`<button class="detail-back" data-action="back">${icon('left')}回到${unit?'本路':'征途'}总览</button><div class="detail-scroll"><div class="event-kind">${selected.kind} · ${selected.unitIds.map(id=>unitNameAt(id,selected.start)).join(' / ')}</div><h1 class="event-detail-title">${selected.title}</h1><div class="event-date">${dateText(selected)}</div><p class="event-summary">${selected.summary}</p>${turn?`<section class="turning-story"><h2>${turn.lead}</h2><dl><div><dt>此前</dt><dd>${turn.before}</dd></div><div><dt>${selected.kind==='战斗'?'行动':'转折'}</dt><dd>${turn.decision}</dd></div><div><dt>此后</dt><dd>${turn.after}</dd></div></dl></section>`:''}${photoCard(eventPhotoIds[selected.id])}<div class="event-location">${icon('pin')}<span>${p.today}</span><button data-basemap="modern">对照今地 ↗</button></div>${sourceButton(ids)}<div class="rail-rule" style="margin-top:20px"></div><div class="rail-section"><span>沿着时间，继续阅读</span><span>${list.findIndex(e=>e.id===selected.id)+1} / ${list.length}</span></div><div class="event-list">${listRows(list)}</div></div>`;
  }else{
    rail.innerHTML=`<p class="rail-kicker">${unit?unit.period:'1934 — 1936 · 红军长征'}</p><h1 class="rail-title">${unit?unit.name:'从出发<br>走向<em>会师</em>'}</h1><p class="rail-intro">${unit?unit.intro:'跨江河，越山岭。沿四路红军的来路，读懂每一次转折，走向共同的会师。'}</p><div class="rail-rule"></div><div class="rail-section"><span>${unit?'本路历史节点':'关键历史节点'}</span><span>${list.length} 个事件</span></div><div class="event-list">${listRows(list)}</div><div class="rail-bottom"><p class="rail-guidance">${unit?`<span>${unit.subtitle}</span>`:'<span>循着行军线，展开沿途故事。</span><span>放大地图，走近山川与地点。</span>'}</p><a href="${archiveLinks[0].url}" target="_blank" rel="noopener noreferrer">长征文物 · 国家博物馆 ↗</a></div>`;
  }
  if(selected){
    const oldPhoto=rail.querySelector('.evidence-photo');if(oldPhoto)oldPhoto.outerHTML=eventPhotoGallery(selected.id);else rail.querySelector('.event-location')?.insertAdjacentHTML('beforebegin',eventPhotoGallery(selected.id));
    const summary=rail.querySelector('.event-summary');
    summary?.insertAdjacentHTML('afterend',`<button class="read-story-link event-read-more" data-read-event="${selected.id}">展开完整历史故事 <span>↗</span></button>`);
    const related=storiesForEvent(selected.id);
    if(related.length)rail.querySelector('.event-location')?.insertAdjacentHTML('beforebegin',`<div class="related-story-links">${related.map(s=>`<button data-read-story="${s.id}">${s.title} ↗</button>`).join('')}</div>`);
  }
  if(!selected)rail.querySelector('.rail-bottom')?.insertAdjacentHTML('afterbegin','<div class="overview-learning"><button data-read-significance>长征的意义 ↗</button><button data-open-films>影像长征 ↗</button></div>');
  if(!selected)rail.querySelector('.rail-intro')?.insertAdjacentHTML('afterend',`<button class="overview-open-history" data-action="expand-panel">沿时间读${list.length}个历史节点 <span>展开 ↗</span></button>`);
  if(!selected){rail.querySelector('.rail-rule').insertAdjacentHTML('beforebegin',eventSearchControls(state));updateEventResults(false);}
}

function renderChishuiRail(){
  rail.innerHTML=crossingRail(state);
}

function updateEventResults(redraw=true){
  const results=eventResults(),active=hasEventFilters(state),count=$('#event-result-count');
  $('#atlas').classList.toggle('event-filtering',active);
  if(count)count.textContent=`${results.length} / ${eventsForUnit(state.unitId).length} 个史事`;
  const status=$('#event-filter-status');if(status)status.textContent=active?'已限定范围':'展开筛选';
  const error=$('#event-filter-error');if(error)error.hidden=eventTimeWindow(state).valid;
  const list=rail.querySelector('.event-list');
  if(list)list.innerHTML=results.length?listRows(results):'<div class="event-empty"><span>循着另一条线索，再找一找</span><p>可以试试“遵义”“湘江”或“1935.02”，也可调整时间和地图范围。</p><button data-reset-events>查看全部史事 →</button></div>';
  const heading=rail.querySelector('.rail-section');if(heading){heading.children[0].textContent=active?'筛选出的历史节点':'关键历史节点';heading.children[1].textContent=`${results.length} 个事件`;}
  const open=rail.querySelector('.overview-open-history');if(open)open.innerHTML=`展开${results.length}个历史节点 <span>沿时间阅读 ↗</span>`;
  const fit=rail.querySelector('[data-fit-results]');if(fit)fit.disabled=!results.length;
  if(redraw){atlasMap.render(sceneState());calendarMode()?renderCalendarDock():renderEventDock();dock.insertAdjacentHTML('beforeend',`<button class="dock-fold" data-action="fold-dock" aria-expanded="${!state.dockCollapsed}">${state.dockCollapsed?'展开时间 ⌃':'收起 ⌄'}</button>`);if(calendarMode()&&state.calendarDay!==null)calendarFrame(state.calendarDay);}
}

function applyEventFilters(patch={},boundsOnly=false){
  if(!boundsOnly){player.pause();calendarPlayer.pause();player.reset();atlasMap.endJourney();$('#milestone-callout').hidden=true;}
  state={...state,...patch,...(boundsOnly?{}:{playing:false,eventId:null,milestoneId:null,follow:false})};
  if(state.eventInView){const b=atlasMap.map.getBounds();state={...state,eventBounds:{west:b.getWest(),east:b.getEast(),south:b.getSouth(),north:b.getNorth()}};}
  const window=timeWindow();
  if(!boundsOnly){
    calendarPlayer.setRange(window.start,window.end);
    if(state.eventFrom||state.eventTo||/193[4-6]/.test(state.eventQuery))state={...state,calendarDay:calendarPlayer.day};
    calendarKey='';
  }
  const matches=new Set(eventResults().map(e=>e.id));calendarPlayer.milestones=events.filter(e=>(turningPoints[e.id]||['会师','出发','抵达'].includes(e.kind)||['r1-xiangjiang','r1-lazi'].includes(e.id))&&(!hasEventFilters(state)||matches.has(e.id)));
  for(const [id,value] of [['event-from',state.eventFrom],['event-to',state.eventTo]]){const input=$('#'+id);if(input)input.value=value;}
  const search=$('#event-search');if(search&&search.value!==state.eventQuery)search.value=state.eventQuery;
  const scope=$('#event-in-view');if(scope)scope.checked=state.eventInView;
  rail.querySelectorAll('[data-event-kind]').forEach(button=>{const on=button.dataset.eventKind===state.eventKind;button.classList.toggle('active',on);button.setAttribute('aria-pressed',on);});
  if(!rail.querySelector('#event-search')&&!state.eventId){renderOverviewRail();frameRailWindow();}
  updateEventResults();
}

function resetEventFilters(){applyEventFilters({eventQuery:'',eventFrom:'',eventTo:'',eventKind:'all',eventInView:false,eventBounds:null});}

function stopTerrainTour(){cancelAnimationFrame(terrainTourFrame);terrainTourFrame=null;terrainTourRunning=false;terrainTourLast=null;const button=$('[data-terrain-tour]');if(button){button.textContent='沿剖面走读 ▷';button.setAttribute('aria-pressed','false');}}
function toggleTerrainTour(){
  if(terrainTourRunning){stopTerrainTour();return;}
  terrainTourRunning=true;terrainTourPosition=state.sampleIndex>=120?0:state.sampleIndex;terrainTourLast=null;
  const button=$('[data-terrain-tour]');if(button){button.textContent='暂停走读 Ⅱ';button.setAttribute('aria-pressed','true');}
  const frame=now=>{
    if(!terrainTourRunning||scene()!=='terrain')return;
    const delta=terrainTourLast===null?0:Math.min(80,now-terrainTourLast);terrainTourLast=now;terrainTourPosition=Math.min(120,terrainTourPosition+delta*.012);
    state={...state,sampleIndex:Math.round(terrainTourPosition)};updateSample();
    if(terrainTourPosition>=120){stopTerrainTour();return;}terrainTourFrame=requestAnimationFrame(frame);
  };terrainTourFrame=requestAnimationFrame(frame);
}

function profileInfo(){return profiles.find(p=>p.id===state.profileId);}
function renderTerrainRail(){
  rail.innerHTML=landscapeRail(state,photos,profileInfo());
}

function renderMemoryRail(){
  const m=memories[state.memoryIndex];
  if(m.closing){
    rail.innerHTML=`<p class="rail-kicker">精神与回响 · 终章</p><header class="anniversary-heading"><div class="anniversary-mark"><strong>90</strong><span>长征胜利<br><b>1936—2026</b></span></div><h1 class="rail-title">山河铭记<br>征途<em>向前</em></h1><p>纪念中国工农红军长征胜利90周年</p></header><section class="memory-detail anniversary-reader"><p class="anniversary-lead">${m.summary}</p><div class="anniversary-photos">${m.photoIds.map(photoCard).join('')}</div>${m.sections.map(([title,text],i)=>`<section class="anniversary-section"><small>0${i+1}</small><h2>${title}</h2><p>${text}</p></section>`).join('')}<p class="anniversary-coda">地图在此合卷，精神接续向前。</p><section class="anniversary-meaning"><small>长征留下了什么</small><h2>历史的转折，精神的远征</h2><p>保存革命力量，走向抗日前沿；在实践中寻找道路，在团结与人民的支持中继续前行。九十年后的回望，也是一代人与历史重新相遇。</p><button data-read-significance>展开长征的意义 ↗</button><button data-open-films>从90周年影像继续读 ↗</button></section>${sourceButton(m.sourceIds,'阅读历史与周年资料')}<div class="anniversary-actions"><button data-chapter="overview">重览征途 ↗</button><button data-chapter="stories">沿故事再读 →</button></div></section>`;return;
  }
  rail.innerHTML=`<p class="rail-kicker">会师与回响</p><h1 class="rail-title">不同来路<br>共同<em>信念</em></h1><p class="rail-intro">抵达、会合、继续前进。<br>把会师看清，把记忆接续。</p><div class="memory-tabs">${memories.map((item,i)=>`<button class="memory-tab ${state.memoryIndex===i?'active':''}" data-memory="${i}" aria-pressed="${state.memoryIndex===i}"><span>${item.title}</span><small>${item.date}</small></button>`).join('')}</div><div class="rail-rule" style="margin-top:19px"></div><h2 class="event-detail-title" style="font-size:24px">${m.heading}</h2><p class="event-summary">${m.summary}</p>${sourceButton(m.sourceIds)}<div class="rail-bottom">沿着各路来向，读懂会师时刻。</div>`;
  rail.querySelector('.rail-kicker').textContent='精神与回响 · 信念的接续';
  rail.querySelector('.rail-bottom').innerHTML='<div class="spirit-links"><button data-read-story="half-quilt">军民同心 ↗</button><button data-read-story="luding-bridge">英勇无畏 ↗</button><button data-read-story="half-belt">信念如磐 ↗</button></div>';
  const detail=document.createElement('section');detail.className='memory-detail';
  const title=rail.querySelector('.event-detail-title');
  for(const el of [...rail.children].slice([...rail.children].indexOf(title)))detail.append(el);
  detail.insertAdjacentHTML('afterbegin',`<div class="memory-date">${m.today?'2019.09.12':m.date}</div><div class="memory-unit-tags">${m.unitIds.map(id=>`<span class="row-army" style="--army-color:${units.find(u=>u.id===id).color}">${unitNameAt(id,eventById.get(m.eventId).start)}</span>`).join('')}</div>`);
  if(m.id==='huining')detail.querySelector('.event-summary').insertAdjacentHTML('afterend',photoCard('huining'));
  if(m.id==='jiangtai')detail.querySelector('.event-summary').insertAdjacentHTML('afterend',photoCard('jiangtai'));
  if(m.today)detail.insertAdjacentHTML('beforeend','<p class="memory-reflection">由战场遗址到纪念空间，山河保存记忆，后来者接续信念。</p>');
  rail.append(detail);
}

function renderOverlay(){
  overlay.innerHTML='';
  if(state.chapter==='overview'&&state.unitId==='red2'&&!state.eventId)overlay.innerHTML=`<div class="branch-card"><small class="detail-kicker">中甸 — 甘孜 · 1936</small><h3>两路北上<br>甘孜会合</h3><p><b>红二军团 · 左纵队</b>得荣 → 巴塘 → 白玉</p><p><b>红六军团 · 右纵队</b>乡城 → 稻城 → 理化 → 瞻化</p><button data-sources="H32" class="source-link">分路依据 →</button></div>`;
  if(state.chapter==='stories')overlay.innerHTML=storyMapCard(state.storyId,photos);
  if(state.chapter==='battles'&&state.battleMode==='turns')overlay.innerHTML=`<div class="battle-map-title"><span>★</span><small>${dateText(eventById.get(state.battleId))}</small><strong>${eventById.get(state.battleId).title}</strong></div>`;
}

function renderEventDock(){
  const list=eventResults(),e=eventById.get(state.eventId),index=e?list.findIndex(x=>x.id===e.id):0;
  if(!list.length){dock.innerHTML='<div class="empty-search-dock"><span>调整筛选，继续沿时间读征途。</span><button data-reset-events>回到全线 →</button></div>';return;}
  const day=s=>Date.parse(s+'T00:00:00Z')/86400000,firstDay=day(list[0].start),span=Math.max(1,day(list.at(-1).start)-firstDay);
  dock.innerHTML=`<button class="play-button" data-action="play" aria-label="${state.playing?'暂停事件播放':'按事件顺序播放'}" title="按事件顺序播放">${icon(state.playing?'pause':'play')}</button><div class="dock-caption"><strong>${e?e.start.slice(0,4):'1934—1936'}</strong><small>${e?unitNameAt(e.unitIds[0],e.start):'各路红军 · 征途总览'}</small></div><div class="timeline-body"><div class="timeline-top"><strong>${e?e.title:'循着时间，重走征途'}</strong><div class="timeline-arrow"><button data-action="prev" aria-label="上一个事件">${icon('left')}</button><span>${e?index+1:'—'} / ${list.length}</span><button data-action="next" aria-label="下一个事件">${icon('right')}</button></div><button data-action="follow" aria-pressed="${state.follow}">${state.follow?'查看全线':'随事件阅读'}</button></div><input id="event-range" class="timeline-range" type="range" min="0" max="${list.length-1}" value="${Math.max(0,index)}" aria-label="选择历史事件，按收录顺序排列" aria-valuetext="${e?dateText(e)+'，'+e.title:'征途总览'}"><div class="timeline-bottom"><span>${list[0].start.slice(0,7).replace('-','.')}</span><span>沿 着 时 间 · 走 进 征 途</span><span>${list.at(-1).end.slice(0,7).replace('-','.')}</span></div></div>`;
  const range=$('#event-range');range.min=0;range.max=span;range.value=e?day(e.start)-firstDay:0;range.setAttribute('aria-label','按时间选择历史事件');
  dock.querySelector('[data-action="play"]').disabled=list.length<2;
  if(list.length<2)dock.querySelector('[data-action="play"]').title='找到一个史事，可展开阅读';
  const ticks=document.createElement('div');ticks.className='calendar-ticks';ticks.setAttribute('aria-hidden','true');ticks.innerHTML=list.map(event=>`<i class="${turningPoints[event.id]?'turning-tick':''}" style="left:${(day(event.start)-firstDay)/span*100}%" title="${dateText(event)} · ${event.title}"></i>`).join('');range.after(ticks);
}

function renderCalendarDock(){
  const window=timeWindow(),start=window.start,end=window.end,span=Math.max(1,end-start),matches=eventResults(),ids=new Set(matches.map(e=>e.id));
  const day=Math.max(start,Math.min(end,state.calendarDay??(state.eventId?dayNumber(eventById.get(state.eventId).start):start)));
  dock.innerHTML=`<button class="play-button" data-action="play" aria-label="${state.playing?'暂停各军同步行进':'播放各军同步行进'}">${icon(state.playing?'pause':'play')}</button><div class="dock-caption"><strong id="calendar-date">${state.calendarDay===null?'1934—1936':calendarMonth(day)}</strong><small>各路红军 · 同期进程</small></div><div class="timeline-body"><div class="timeline-top"><strong id="calendar-caption">${state.eventId?eventById.get(state.eventId).title:'循着共同的时间，看见各自的征途'}</strong><div class="calendar-speeds" aria-label="行军播放速度">${[[9,'1×'],[18,'2×'],[36,'4×']].map(([speed,text])=>`<button data-calendar-speed="${speed}" class="${(calendarPlayer?.speed||9)===speed?'active':''}" aria-pressed="${(calendarPlayer?.speed||9)===speed}">${text}</button>`).join('')}</div></div><input class="timeline-range" id="calendar-range" type="range" min="0" max="${calendarEnd-calendarStart}" step="0.1" value="${day-calendarStart}" aria-label="选择各路红军共同的历史时间" aria-valuetext="${calendarMonth(day)}"><div class="calendar-ticks" aria-hidden="true">${events.map(e=>`<i class="${turningPoints[e.id]?'turning-tick':''}" style="left:${(dayNumber(e.start)-calendarStart)/(calendarEnd-calendarStart)*100}%"></i>`).join('')}</div><div class="timeline-bottom"><span>1934.10</span><span>各有来路 · 同向会师</span><span>1936.10</span></div></div>`;
  const range=$('#calendar-range');range.max=end-start;range.value=day-start;range.disabled=!window.valid;
  dock.querySelector('.calendar-ticks').innerHTML=events.filter(e=>dayNumber(e.start)>=start&&dayNumber(e.start)<=end).map(e=>`<i class="${turningPoints[e.id]?'turning-tick':''} ${hasEventFilters(state)&&ids.has(e.id)?'matched-tick':''}" style="left:${(dayNumber(e.start)-start)/span*100}%"></i>`).join('');
  const labels=dock.querySelector('.timeline-bottom');labels.children[0].textContent=window.from.replaceAll('-','.');labels.children[2].textContent=window.to.replaceAll('-','.');
  if(hasEventFilters(state))$('#calendar-caption').textContent=`${matches.length}个史事 · ${window.valid?'在这段时间里，看各军进程':'调整时间，继续阅读'}`;
  dock.querySelector('[data-action="play"]').disabled=!window.valid;
}

function calendarFrame(day){
  state={...state,calendarDay:day};
  const tracks=tracksAtDay(day,calendarLegs),key=tracks.map(t=>`${t.leg.id}:${t.started}:${t.arrived}`).join('|');
  if(key!==calendarKey){calendarKey=key;atlasMap.render(sceneState());atlasMap.drawCalendar(tracks);}else atlasMap.updateCalendar(tracks);
  const date=$('#calendar-date'),range=$('#calendar-range');if(date)date.textContent=calendarMonth(day);if(range){range.value=day-timeWindow().start;range.setAttribute('aria-valuetext',calendarMonth(day));}
  $('#army-progress header b')?.replaceChildren(document.createTextNode(calendarMonth(day)));
  $('#army-status-summary').textContent=`${tracks.filter(t=>t.started&&!t.arrived).length}军行进`;
  for(const t of tracks){
    const row=$(`[data-progress-army="${t.unitId}"]`);if(!row)continue;
    row.querySelector('strong').textContent=t.name;
    const e=eventById.get(t.eventId),next=eventById.get(t.toId);
    row.querySelector('small').textContent=t.status;
    row.querySelector('p').textContent=!t.started?`${dateText(e)} · ${e.title}`:t.arrived?e.title:`${resolvedPlaces[e.placeId].name} → ${next?resolvedPlaces[next.placeId].name:''}`;
    row.querySelector('i').style.width=`${!t.started?0:t.arrived?100:Math.max(2,(eventsForUnit(t.unitId).findIndex(e=>e.id===t.eventId)+t.progress)/(eventsForUnit(t.unitId).length-1)*100)}%`;
    row.classList.toggle('waiting',!t.started);row.dataset.status=t.status;
  }
  const e=eventById.get(state.milestoneId),callout=$('#milestone-callout');
  if(e&&day-dayNumber(e.start)>3){callout.hidden=true;state={...state,milestoneId:null};}
}

function renderArmyProgress(){
  const element=$('#army-progress');$('#army-menu').hidden=!calendarMode();
  const day=state.calendarDay??calendarStart,tracks=tracksAtDay(day,calendarLegs);
  element.innerHTML=`<header><span>各军同期进程</span><b>${calendarMonth(day)}</b></header><div class="army-progress-rows">${tracks.map(t=>`<div data-progress-army="${t.unitId}" style="--army-color:${t.color}"><span class="army-lane-star">★</span><strong>${t.name}</strong><small>${t.status}</small><p>${eventById.get(t.eventId).title}</p><div class="army-lane-track"><i style="width:${t.progress*100}%"></i></div></div>`).join('')}</div>`;
  $('#army-status-summary').textContent=`${tracks.filter(t=>t.started&&!t.arrived).length}军行进`;
  if(state.calendarDay!==null&&calendarMode())calendarFrame(state.calendarDay);
}

function renderStoryDock(){
  const s=storyById.get(state.storyId),i=stories.indexOf(s);
  dock.innerHTML=`<div class="story-dock-caption"><small>沿途记忆 <span>${String(i+1).padStart(2,'0')} / ${stories.length}</span></small><strong>${s.title}</strong></div><div class="story-chain" aria-label="串联征途故事">${stories.map((story,index)=>`<button data-story="${story.id}" class="${s.id===story.id?'active':''}" aria-label="${index+1}，${story.title}" title="${story.title}"><i></i><span>${String(index+1).padStart(2,'0')}</span></button>`).join('')}</div><div class="story-chain-actions"><button class="chain-prev" data-story="${stories[(i+stories.length-1)%stories.length].id}" aria-label="上一篇故事">←</button><button class="chain-next" data-story="${stories[(i+1)%stories.length].id}">下一段故事 →</button></div>`;
  requestAnimationFrame(()=>{const chain=dock.querySelector('.story-chain'),active=chain?.querySelector('.active');if(chain&&active&&chain.scrollWidth>chain.clientWidth)chain.scrollLeft=Math.max(0,active.offsetLeft-chain.offsetLeft-chain.clientWidth/2+active.clientWidth/2);});
}

function renderChishuiDock(){
  const e=eventById.get(chishuiSteps[state.step].id);
  dock.innerHTML=`<button class="play-button" data-action="play" aria-label="${state.playing?'暂停四渡赤水演示':'播放四渡赤水演示'}">${icon(state.playing?'pause':'play')}</button><div class="dock-caption"><strong>1935</strong><small>${chishuiSteps[state.step].direction}</small></div><div class="timeline-body"><div class="timeline-top"><strong>${e.title} · ${dateText(e).slice(5)}</strong><div class="timeline-arrow"><button data-action="prev" aria-label="上一次渡河">${icon('left')}</button><span>0${state.step+1} / 04</span><button data-action="next" aria-label="下一次渡河">${icon('right')}</button></div></div><input id="step-range" class="timeline-range" type="range" min="0" max="3" value="${state.step}" aria-label="选择四渡赤水步骤"><div class="timeline-bottom"><span>01.29 一渡</span><span>02.18—21 二渡</span><span>03.16—17 三渡</span><span>03.21—22 四渡</span></div></div>`;
  dock.querySelector('.timeline-bottom').classList.add('crossing-dates');
  dock.querySelector('.timeline-bottom').innerHTML=chishuiLessons.map((s,i)=>`<button data-step="${i}" class="${i===state.step?'active':''}" style="--stage-color:${s.color}"><i></i><span>${['01.29','02.18—21','03.16—17','03.21—22'][i]}</span><strong>${s.short}</strong></button>`).join('');
}

let chartGeometry;
function renderProfileDock(){
  const p=profileInfo(),samples=p.samples;
  const all=state.profileScale==='local'?samples.map(s=>s.elevationM):profiles.flatMap(x=>x.samples.map(s=>s.elevationM));
  const low=Math.floor(Math.min(...all)/500)*500,high=Math.ceil(Math.max(...all)/500)*500;
  const w=1000,h=110,left=innerWidth<761?115:44,right=14,top=6,bottom=18,total=samples.at(-1).distanceKm;
  const x=s=>left+s.distanceKm/total*(w-left-right),y=s=>top+(high-s.elevationM)/(high-low)*(h-top-bottom);
  const path=samples.map((s,i)=>`${i?'L':'M'}${x(s).toFixed(2)},${y(s).toFixed(2)}`).join(' ');
  chartGeometry={x,y,w,h,left,right,total};
  dock.innerHTML=`<div class="profile-header"><strong>${p.title} · 山势剖面</strong><span>沿山势起伏，读两侧山河</span></div><div class="profile-chart" id="profile-chart" role="img" aria-label="${p.title}海拔剖面，可拖动下方滑杆读取各采样点"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="terrain-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#b37c51" stop-opacity=".26"/><stop offset="1" stop-color="#b37c51" stop-opacity=".02"/></linearGradient></defs>${[low,(low+high)/2,high].map(v=>{const py=top+(high-v)/(high-low)*(h-top-bottom);return `<path class="chart-grid" d="M${left},${py}H${w-right}"/><text x="0" y="${py+3}">${Math.round(v)} m</text>`;}).join('')}<path d="${path}L${x(samples.at(-1))},${h-bottom}L${left},${h-bottom}Z" fill="url(#terrain-fill)"/><path class="chart-line" d="${path}"/><line id="profile-cursor" class="profile-cursor" x1="0" x2="0" y1="0" y2="${h-bottom}"/><circle id="profile-dot" class="profile-dot" r="4" cx="0" cy="0"/><text x="${left}" y="108">0 km</text><text x="${w-right}" y="108" text-anchor="end">${total.toFixed(1)} km</text></svg></div><input id="sample-range" class="profile-range" type="range" min="0" max="120" value="${state.sampleIndex}" aria-label="读取地形剖面采样点"><div class="profile-footnote"><span>山口与河谷 · 地形剖面</span><span id="sample-coordinate"></span></div>`;
  dock.querySelector('.profile-header').innerHTML=`<strong>${p.title} · 山势剖面</strong><div class="profile-reading-tools"><div>${[['shared','同尺对照'],['local','本段起伏']].map(([id,label])=>`<button data-profile-scale="${id}" class="${state.profileScale===id?'active':''}" aria-pressed="${state.profileScale===id}">${label}</button>`).join('')}</div><button data-terrain-tour aria-pressed="false">沿剖面走读 ▷</button></div>`;
  dock.querySelector('.profile-footnote>span').textContent=terrainLessons[state.profileId].prompt;
  const chart=$('#profile-chart');
  chart.insertAdjacentHTML('beforeend',`${[low,(low+high)/2,high].map(value=>`<span class="profile-axis-value" style="top:${(top+(high-value)/(high-low)*(h-top-bottom))/h*100}%">${Math.round(value)} m</span>`).join('')}<span class="profile-axis-distance" style="left:${left/w*100}%">0 km</span><span class="profile-axis-distance end">${total.toFixed(1)} km</span>`);
  let dragging=false;
  const sampleAt=event=>{
    const rect=chart.getBoundingClientRect(),px=(event.clientX-rect.left)/rect.width*w;
    const distance=Math.max(0,Math.min(1,(px-left)/(w-left-right)))*total;
    let best=0;for(let i=1;i<samples.length;i++)if(Math.abs(samples[i].distanceKm-distance)<Math.abs(samples[best].distanceKm-distance))best=i;
    dispatch({type:'sample',value:best});
  };
  chart.addEventListener('pointerdown',event=>{stopTerrainTour();dragging=true;chart.setPointerCapture(event.pointerId);sampleAt(event);});
  chart.addEventListener('pointermove',event=>{if(dragging)sampleAt(event);});
  chart.addEventListener('pointerup',()=>{dragging=false;});
  chart.addEventListener('pointercancel',()=>{dragging=false;});
}

function updateSample(){
  const s=profileInfo().samples[state.sampleIndex];
  const passage=passageAtSample(terrainPassages(state.profileId,profileInfo()),state.sampleIndex);
  if($('#terrain-passage-title').textContent!==passage.title){
    $('#terrain-passage-title').textContent=passage.title;$('#terrain-passage-copy').textContent=passage.text;$('#terrain-passage-count').textContent=`0${passage.index+1} / 03`;
    $('#terrain-hardships').innerHTML=passage.tags.map(tag=>`<span>${tag}</span>`).join('');
    rail.querySelectorAll('[data-terrain-passage]').forEach(b=>{const active=Number(b.dataset.terrainPassage)===passage.index;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
  }
  $('#sample-elevation').textContent=Math.round(s.elevationM).toLocaleString('en-US');
  $('#sample-distance').textContent=s.distanceKm.toFixed(1);
  $('#sample-coordinate').textContent=`${s.lon.toFixed(3)}°E，${s.lat.toFixed(3)}°N`;
  const cx=chartGeometry.x(s),cy=chartGeometry.y(s);
  $('#profile-cursor').setAttribute('x1',cx);$('#profile-cursor').setAttribute('x2',cx);
  $('#profile-dot').setAttribute('cx',cx);$('#profile-dot').setAttribute('cy',cy);
  const range=$('#sample-range');range.value=state.sampleIndex;range.setAttribute('aria-valuetext',`参照线${s.distanceKm.toFixed(1)}公里，海拔${Math.round(s.elevationM)}米`);
  atlasMap.updateSample(sceneState());
}

function renderMemoryDock(){
  dock.innerHTML=`<div class="memory-dock">${memories.map((m,i)=>`<button class="memory-milestone ${state.memoryIndex===i?'active':''}" data-memory="${i}" aria-pressed="${state.memoryIndex===i}"><strong>${m.date}</strong><span>${m.title}${i===0?' · 中央红军':i===1?' · 红一、红四':i===2?' · 红一、红二':' · 保护与教育'}</span></button>`).join('')}</div>`;
  dock.querySelector(`[data-memory="${memories.length-1}"] span`).textContent='九十载回响 · 精神接续';
  requestAnimationFrame(()=>{const strip=dock.querySelector('.memory-dock'),active=strip?.querySelector('.active');if(strip&&active&&strip.scrollWidth>strip.clientWidth)strip.scrollLeft=Math.max(0,active.offsetLeft-strip.offsetLeft-16);});
}

function render({fit=false}={}){
  const readingKey=state.chapter==='overview'?`overview:${state.unitId}:${state.eventQuery}:${state.eventFrom}:${state.eventTo}:${state.eventKind}`:state.chapter==='battles'?`battles:${state.battleMode}`:`${state.chapter}:${state.memoryIndex}:${state.storyFilter}`;
  const readingPosition=captureReadingPosition(rail,readingKey);
  stopTerrainTour();
  if(calendarMode()&&state.calendarDay===null){const window=timeWindow();if(window.valid&&(window.start!==calendarStart||window.end!==calendarEnd)){const selected=eventById.get(state.eventId);state={...state,calendarDay:Math.max(window.start,Math.min(window.end,selected?dayNumber(selected.start):window.start))};}}
  const view=sceneState();
  $('#atlas').className=`atlas ${state.chapter} ${view.chapter}`;$('#map-stage').className=`map-stage ${state.chapter} ${view.chapter}`;
  $('#atlas').dataset.focusedUnit=state.unitId;
  $('#atlas').classList.toggle('panel-collapsed',state.panelCollapsed);$('#atlas').classList.toggle('is-playing',state.playing);$('#atlas').dataset.basemap=state.basemap;
  $('#atlas').classList.toggle('panel-expanded',state.panelExpanded);$('#atlas').classList.toggle('dock-collapsed',state.dockCollapsed);$('#atlas').classList.toggle('calendar-active',calendarMode()&&state.calendarDay!==null);
  $('#atlas').classList.toggle('story-reading',state.chapter==='stories');
  $('#atlas').classList.toggle('anniversary-finale',state.chapter==='memory'&&!!memories[state.memoryIndex].closing);
  $('#atlas').classList.toggle('battle-reading',state.chapter==='battles'&&state.battleMode==='turns');
  $('#atlas').classList.toggle('overview-start',state.chapter==='overview'&&!state.eventId);$('#atlas').classList.toggle('event-filtering',state.chapter==='overview'&&hasEventFilters(state));
  $('#atlas').classList.toggle('event-controls-open',state.chapter==='overview'&&state.eventFiltersOpen);
  if(state.dockCollapsed)$('#atlas').style.setProperty('--dock','62px');else $('#atlas').style.removeProperty('--dock');
  document.querySelectorAll('.basemap-switch [data-basemap]').forEach(button=>{button.classList.toggle('active',button.dataset.basemap===state.basemap);button.setAttribute('aria-pressed',button.dataset.basemap===state.basemap);});
  $('#terrain-key').hidden=state.basemap==='modern';
  $('#panel-toggle').setAttribute('aria-pressed',!state.panelCollapsed);$('#panel-toggle').setAttribute('aria-label',state.panelCollapsed?'展开故事':'收起故事');$('#panel-toggle').title=state.panelCollapsed?'展开故事':'收起故事';
  document.querySelectorAll('[data-chapter]').forEach(el=>{const active=el.dataset.chapter===state.chapter;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  renderUnitSwitcher();renderOverlay();
  const captions={overview:state.unitId==='all'?'各路红军 · 主要行军走向':`${units.find(u=>u.id===state.unitId).name} · 主要行军走向`,chishui:'川 · 滇 · 黔交界 · 赤水河流域',terrain:`${profileInfo().title} · 山势与高差`,memory:memories[state.memoryIndex].today?'湘江一带 · 历史与今日':'从抵达到会师 · 分别阅读各个时刻'};
  $('#map-caption-text').textContent=state.chapter==='stories'?storyById.get(state.storyId).placeLabel:state.chapter==='battles'&&state.battleMode==='turns'?'从一段征途，读懂一次抉择':captions[view.chapter];
  if(state.chapter==='memory'&&memories[state.memoryIndex].closing)$('#map-caption-text').textContent='1936—2026 · 山河铭记，征途向前';
  const osmCredit='<a href="./evidence.html?source=G05" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>';
  $('.map-attribution').innerHTML=view.chapter==='chishui'?`NASA GIBS · GeoNames · ${osmCredit}`:`NASA GIBS · Natural Earth · GeoNames · ${osmCredit}`;
  if(state.chapter==='overview'){renderOverviewRail();calendarMode()?renderCalendarDock():renderEventDock();}
  if(view.chapter==='chishui'){renderChishuiRail();renderChishuiDock();rail.insertAdjacentHTML('afterbegin','<button class="subscene-back" data-battle-mode="turns">← 转折与战役</button>');}
  if(view.chapter==='terrain'){renderTerrainRail();renderProfileDock();rail.insertAdjacentHTML('afterbegin','<button class="subscene-back" data-battle-mode="turns">← 转折与战役</button>');}
  if(state.chapter==='stories'){
    rail.innerHTML=storyRail(state,photos);renderStoryDock();
    requestAnimationFrame(()=>{const catalog=rail.querySelector('.story-catalog'),active=catalog?.querySelector('.active');if(active){if(innerWidth>760||state.panelExpanded)catalog.scrollTop=active.offsetTop-catalog.offsetTop;else catalog.scrollLeft=active.offsetLeft-catalog.offsetLeft-8;}});
  }
  if(state.chapter==='battles'&&state.battleMode==='turns'){rail.innerHTML=battleRail(state);dock.innerHTML=`<div class="battle-dock"><span>从险境到转机</span><strong>${eventById.get(state.battleId).title}</strong><button data-read-event="${state.battleId}">阅读这段历史 ↗</button><button data-battle-mode="chishui">四渡赤水 · 连续行进 →</button></div>`;}
  if(state.chapter==='memory'){renderMemoryRail();renderMemoryDock();}
  $('#labels-toggle').setAttribute('aria-pressed',state.labels);
  $('#panel-tool-label').textContent=state.panelCollapsed?'展开史事':'收起史事';
  $('#reading-key').innerHTML=view.chapter==='terrain'?'<span class="key-line sourced"></span>史料行军走向<span class="key-line" style="border-color:#4e7c83"></span>今日山势对照线<span class="key-dot"></span>地势读取点':view.chapter==='chishui'?`<span class="key-line sourced"></span>行军方向${state.step>=2||state.chishuiView==='compare'?'<span class="key-line" style="border-color:#8f7048"></span>一部佯动':''}<span class="key-dot"></span>渡河区域`:'<span class="key-line sourced"></span>行军方向<span class="key-line"></span>区域行进<span class="key-dot"></span>历史节点';
  frameWindow();
  restoreReadingPosition(rail,readingKey,readingPosition);
  if(state.chapter==='overview'&&state.eventId&&!readingPosition?.focus){
    const list=rail.querySelector('.event-list'),active=list?.querySelector('.active');
    if(active){const item=active.getBoundingClientRect(),viewport=list.getBoundingClientRect();if(item.top<viewport.top||item.bottom>viewport.bottom)list.scrollTop+=item.top-viewport.top-24;}
  }
  syncContextDrawer(false);atlasMap.render(view,{fit});renderArmyProgress();
  if(!calendarMode())$('#milestone-callout').hidden=true;
  if(view.chapter==='terrain')updateSample();
  if(state.playing){if(calendarMode())calendarPlayer?.play();else player?.play();}else{player?.pause();calendarPlayer?.pause();atlasMap.map.stop();}
  updateJourneyCaption();
}

function dispatch(action){
  if(['chapter','unit','event','step','profile','memory','battle','battleMode','story','storyMode','crossingView'].includes(action.type)){player?.reset();calendarPlayer?.reset();calendarKey='';atlasMap.endJourney();state={...state,milestoneId:null};$('#milestone-callout').hidden=true;}
  const previous=state;state=reduceState(state,action);
  if(action.type==='sample'){updateSample();return;}
  const fit=['chapter','unit','profile','memory','panel','expand','dock','battle','battleMode','story','storyMode','crossingView','step'].includes(action.type);
  render({fit});
  // Keep a selected node visible without discarding a reader's current zoom.
  if(action.type==='event'&&state.chapter==='overview'){
    const p=resolvedPlaces[eventById.get(state.eventId).placeId];
    if(!atlasMap.map.getBounds().pad(-.12).contains([p.lat,p.lon]))atlasMap.map.panTo([p.lat,p.lon],{animate:!matchMedia('(prefers-reduced-motion: reduce)').matches});
  }
}

function advance(delta,playing=false){
  if(!playing){player?.reset();atlasMap.endJourney();}
  if(scene()==='chishui'){
    const next=state.step+delta;
    if(next<0||next>3){state={...state,playing:false};render();return;}
    state={...state,step:next,playing};render();
  }else if(state.chapter==='overview'){
    const list=eventResults(),index=list.findIndex(e=>e.id===state.eventId),next=index+delta;
    if(next<0||next>=list.length){state={...state,playing:false};render();return;}
    state={...state,eventId:list[next].id,follow:true,playing};render();
  }
}
function updateJourneyCaption(){
  if(calendarMode())return;
  const snapshot=player?.snapshot();if(!snapshot||snapshot.phase!=='travel')return;
  const segment=player.segments[snapshot.index],title=$('.timeline-top>strong');
  if(segment&&title){const target=eventById.get(segment.toId);title.textContent=`${state.playing?'行进':'停驻'} · ${segment.label||target.title} · ${dateText(target)}`;}
}

function togglePlayback(){
  if(state.playing){dispatch({type:'play',value:false});return;}
  if(calendarMode()){
    player.pause();
    const window=timeWindow(),from=state.calendarDay??(state.eventId?dayNumber(eventById.get(state.eventId).start):window.start);
    if(state.calendarDay===null||calendarPlayer.day>=window.end)calendarPlayer.seek(from>=window.end?window.start:from);
    state={...state,playing:true,follow:false};render();return;
  }
  let fit=false;
  if(state.chapter==='overview'){
    if(state.unitId==='all'){
      const selected=eventById.get(state.eventId),unitId=selected?.unitIds.find(id=>eventsForUnit(id).some(e=>e.id===selected.id))||'red1';
      state={...state,unitId};fit=true;
    }
    const list=eventResults();if(!list.length)return;
    if(!state.eventId||!list.some(e=>e.id===state.eventId)||state.eventId===list.at(-1).id){state={...state,eventId:list[0].id};player.reset();atlasMap.endJourney();}
  }else if(scene()==='chishui'&&state.step===3&&player.index>=player.segments.length){state={...state,step:0};player.reset();atlasMap.endJourney();}
  if(!player.segments.length||player.index>=player.segments.length){
    let segments;
    if(state.chapter==='overview'){
      const list=eventResults(),start=list.findIndex(e=>e.id===state.eventId),color=units.find(u=>u.id===state.unitId).color;
      const legs=hasEventFilters(state)?legsBetweenEvents(state.unitId,list.slice(Math.max(0,start)).map(e=>e.id),resolvedPlaces,waypointReferences):orderedLegs(state.unitId,resolvedPlaces,waypointReferences).slice(Math.max(0,start));
      segments=legs.map(leg=>({...leg,color,holdMs:turningPoints[leg.fromId]?2000:1150,durationMs:leg.line.every(p=>p.lon===leg.line[0].lon&&p.lat===leg.line[0].lat)?1:Math.min(9000,3200+Math.sqrt(routeLengthKm(leg.line))*145)}));
    }else segments=chishuiSteps.slice(state.step).map((step,i)=>({id:`chishui-${state.step+i}`,toId:step.id,step:state.step+i,line:resolveSceneLine(state.step+i,resolvedPlaces,waypointReferences),color:chishuiLessons[state.step+i].color,label:chishuiSequences[state.step+i].label,holdMs:1900,durationMs:7600}));
    player.load(segments,`${scene()}:${state.unitId}`);
  }
  state={...state,playing:true,follow:true};render({fit});
}

function bindUI(){
  document.addEventListener('click',event=>{
    const target=event.target.closest('button');if(!target)return;
    if(target.dataset.chapter)dispatch({type:'chapter',value:target.dataset.chapter});
    else if(target.hasAttribute('data-open-films'))reader.openFilms(state.chapter==='stories'?state.storyId:null);
    else if(target.hasAttribute('data-read-significance'))reader.openSignificance();
    else if(target.dataset.readCampaign)reader.openFeature(chishuiLessons.find(s=>s.id===target.dataset.readCampaign));
    else if(target.dataset.readLandscape)reader.openFeature(terrainLessons[target.dataset.readLandscape]);
    else if(target.dataset.crossingView)dispatch({type:'crossingView',value:target.dataset.crossingView});
    else if(target.dataset.profileScale)dispatch({type:'profileScale',value:target.dataset.profileScale});
    else if(target.hasAttribute('data-terrain-tour'))toggleTerrainTour();
    else if(target.hasAttribute('data-sample-index')){stopTerrainTour();dispatch({type:'sample',value:Number(target.dataset.sampleIndex)});}
    else if(target.hasAttribute('data-reset-events'))resetEventFilters();
    else if(target.hasAttribute('data-fit-results'))atlasMap.fitEventResults(eventResults());
    else if(target.dataset.eventKind)applyEventFilters({eventKind:target.dataset.eventKind});
    else if(target.dataset.eventYear){const year=target.dataset.eventYear;applyEventFilters({eventFrom:year==='all'?'':year==='1934'?'1934-10-17':year+'-01-01',eventTo:year==='all'?'':year==='1936'?'1936-10-22':year+'-12-31'});}
    else if(target.dataset.readStory){if(state.chapter==='stories'&&state.storyId!==target.dataset.readStory)dispatch({type:'story',value:target.dataset.readStory});reader.openStory(target.dataset.readStory);}
    else if(target.dataset.readEvent)reader.openEvent(target.dataset.readEvent);
    else if(target.dataset.story)dispatch({type:'story',value:target.dataset.story});
    else if(target.dataset.storyMode)dispatch({type:'storyMode',value:target.dataset.storyMode});
    else if(target.dataset.storyFilter)dispatch({type:'storyFilter',value:target.dataset.storyFilter});
    else if(target.dataset.battle)dispatch({type:'battle',value:target.dataset.battle});
    else if(target.dataset.battleMode)dispatch({type:'battleMode',value:target.dataset.battleMode});
    else if(target.dataset.calendarSpeed){calendarPlayer.speed=Number(target.dataset.calendarSpeed);render();}
    else if(target.dataset.basemap)dispatch({type:'basemap',value:target.dataset.basemap});
    else if(target.dataset.photo){if($('#sources-dialog').open)$('#sources-dialog').close();photoView.open(target.dataset.photo);}
    else if(target.dataset.unit)dispatch({type:'unit',value:target.dataset.unit});
    else if(target.dataset.event)dispatch({type:'event',value:target.dataset.event});
    else if(target.dataset.step!==undefined)dispatch({type:'step',value:Number(target.dataset.step)});
    else if(target.dataset.profile)dispatch({type:'profile',value:target.dataset.profile});
    else if(target.dataset.memory!==undefined)dispatch({type:'memory',value:Number(target.dataset.memory)});
    else if(target.dataset.sources)sourceView.open(target.dataset.sources.startsWith('G')?'geography':'history',target.dataset.sources.split(','));
    else if(target.dataset.routeEvidence)sourceView.open('history',target.dataset.routeEvidence.split(','));
    else if(target.dataset.action==='back'){player.reset();atlasMap.endJourney();state={...state,eventId:null,follow:false,playing:false};render({fit:true});}
    else if(target.dataset.action==='prev')advance(-1);
    else if(target.dataset.action==='next')advance(1);
    else if(target.dataset.action==='follow')dispatch({type:'follow',value:!state.follow});
    else if(target.dataset.action==='play')togglePlayback();
    else if(target.dataset.action==='expand-panel')dispatch({type:'expand',value:!state.panelExpanded});
    else if(target.dataset.action==='collapse-panel')dispatch({type:'panel',value:true});
    else if(target.dataset.action==='fold-dock')dispatch({type:'dock',value:!state.dockCollapsed});
    else if(target.dataset.action==='fold-armies'){const collapsed=$('#army-progress').classList.toggle('collapsed');target.setAttribute('aria-expanded',!collapsed);target.setAttribute('aria-label',collapsed?'展开各军进程':'折叠各军进程');target.textContent=collapsed?'⌄':'⌃';}
  });
  document.addEventListener('input',event=>{
    if(event.target.id==='event-search'){applyEventFilters({eventQuery:event.target.value});return;}
    if(event.target.id==='event-from'||event.target.id==='event-to'){applyEventFilters({[event.target.id==='event-from'?'eventFrom':'eventTo']:event.target.value});return;}
    if(event.target.id==='event-in-view'){applyEventFilters({eventInView:event.target.checked});return;}
    if(event.target.id==='story-search'){
      state={...state,storyQuery:event.target.value};
      const query=event.target.value.trim().toLocaleLowerCase();let found=0;
      for(const tile of rail.querySelectorAll('[data-story-search]')){tile.hidden=!tile.dataset.storySearch.includes(query);if(!tile.hidden)found++;}
      $('#story-search-empty').hidden=found>0;
    }
    if(event.target.id==='calendar-range'){
      player.pause();calendarPlayer.pause();state={...state,playing:false,eventId:null,milestoneId:null};$('#milestone-callout').hidden=true;
      calendarPlayer.seek(timeWindow().start+Number(event.target.value));
      $('#atlas').classList.add('calendar-active');$('#atlas').classList.remove('is-playing');
      const play=dock.querySelector('[data-action="play"]');if(play){play.innerHTML=icon('play');play.setAttribute('aria-label','播放各军同步行进');}
    }
    if(event.target.id==='event-range'){
      const list=eventResults();if(!list.length)return;const day=s=>Date.parse(s+'T00:00:00Z')/86400000,targetDay=day(list[0].start)+Number(event.target.value);
      const nearest=list.reduce((best,e)=>Math.abs(day(e.start)-targetDay)<Math.abs(day(best.start)-targetDay)?e:best,list[0]);
      dispatch({type:'event',value:nearest.id});
    }
    if(event.target.id==='step-range')dispatch({type:'step',value:Number(event.target.value)});
    if(event.target.id==='sample-range'){stopTerrainTour();dispatch({type:'sample',value:Number(event.target.value)});}
  });
  document.addEventListener('toggle',event=>{if(event.target.id!=='event-filter-panel')return;state={...state,eventFiltersOpen:event.target.open};$('#atlas').classList.toggle('event-controls-open',event.target.open);if(event.target.open&&innerWidth<761&&!state.panelExpanded)dispatch({type:'expand',value:true});},true);
  document.addEventListener('change',event=>{if(event.target.id==='calendar-range')render();});
  $('#fit-map').addEventListener('click',()=>atlasMap.fit(sceneState(),true));
  $('#panel-toggle').addEventListener('click',()=>dispatch({type:'panel',value:!state.panelCollapsed}));
  $('#rail-reopen').addEventListener('click',()=>dispatch({type:'panel',value:false}));
  $('#fullscreen-map').addEventListener('click',async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await $('#atlas').requestFullscreen();});
  $('#labels-toggle').addEventListener('click',()=>dispatch({type:'labels',value:!state.labels}));
  const menus=[...document.querySelectorAll('.command-menu')];
  for(const [id,selector,title] of [['army-menu','#army-progress','各军进程'],['legend-menu','.legend-sheet','读懂这张地图'],['map-tool-menu','.map-tools','地图工具']]){
    const menu=$('#'+id),panel=menu.querySelector(selector);panel.hidden=true;
    $('#context-content').append(panel);contextPanels.push({menu,panel,title});
  }
  $('#context-close').addEventListener('click',()=>{const current=menus.find(m=>m.open);for(const menu of menus)menu.open=false;syncContextDrawer();current?.querySelector('summary').focus();});
  for(const menu of menus){
    const closeOthers=()=>{for(const other of menus)if(other!==menu)other.open=false;};
    menu.querySelector('summary').addEventListener('click',()=>{if(!menu.open)closeOthers();});
    menu.addEventListener('toggle',()=>{if(menu.open)closeOthers();syncContextDrawer();});
  }
  document.addEventListener('click',event=>{if(event.target.closest('.map-tools button'))$('#map-tool-menu').open=false;});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')){const open=menus.find(m=>m.open);if(open){open.open=false;open.querySelector('summary').focus();}}});
  let resizeFrame;
  let boundsFrame;
  atlasMap.map.on('moveend',()=>{if(state.chapter!=='overview'||!state.eventInView||atlasMap.fitting)return;cancelAnimationFrame(boundsFrame);boundsFrame=requestAnimationFrame(()=>applyEventFilters({},true));});
  window.addEventListener('resize',()=>{
    cancelAnimationFrame(resizeFrame);
    // Fit after Leaflet has processed its own queued resize, so old pixel
    // dimensions cannot shift the composition on wide/narrow transitions.
    resizeFrame=requestAnimationFrame(()=>{if(scene()==='terrain'){stopTerrainTour();renderProfileDock();dock.insertAdjacentHTML('beforeend',`<button class="dock-fold" data-action="fold-dock" aria-label="${state.dockCollapsed?'展开时间窗口':'收起时间窗口'}" aria-expanded="${!state.dockCollapsed}">${state.dockCollapsed?'展开时间 ⌃':'收起 ⌄'}</button>`);updateSample();}atlasMap.fit(sceneState());});
  });
  document.addEventListener('keydown',event=>{
    if($('#sources-dialog').open||$('#photo-dialog').open||$('#history-dialog').open||event.target.closest('.command-menu')||event.target.matches('input,button,a,textarea'))return;
    if(event.key==='ArrowRight'){event.preventDefault();if(scene()==='terrain')dispatch({type:'sample',value:state.sampleIndex+1});else advance(1);}
    if(event.key==='ArrowLeft'){event.preventDefault();if(scene()==='terrain')dispatch({type:'sample',value:state.sampleIndex-1});else advance(-1);}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.playing)dispatch({type:'play',value:false});});
}

async function boot(){
  try {
    const [refs,terrain,boundaries,rivers,lakes,chishui,routeRefs,photoData,modernRoads,modernPlaces,modernUrban,modernBoundaries,modernRivers,worldLand,worldBoundaries,mosaic]=await Promise.all(['./data/place_references.json','./data/terrain-profiles.json','./data/admin_1_states_provinces_lines.geojson','./data/rivers_lake_centerlines.geojson','./data/lakes.geojson','./data/chishui-river.geojson','./data/route-waypoints.json','./data/photos.json','./data/modern-roads.geojson','./data/modern-populated_places.geojson','./data/modern-urban_areas.geojson','./data/modern-admin_1_states_provinces_lines.geojson','./data/modern-rivers_lake_centerlines.geojson','./data/world-land.geojson','./data/world-admin_0_boundary_lines_land.geojson','./data/terrain-mosaic.json'].map(loadJSON));
    resolvedPlaces=Object.fromEntries(Object.entries(places).map(([id,p])=>{
      const reference=p.reference?refs[p.reference]:null;
      return [id,{...p,...(reference?.geonameId&&!p.landmarkSource?{lon:reference.lon,lat:reference.lat,geonameId:reference.geonameId}:{}),coordinateMeaning:p.landmarkSource?'modern heritage building/bridge reference':p.regional?'regional reference':'modern locality reference'}];
    }));
    profiles=terrain.profiles;
    waypointReferences=routeRefs;
    photos=photoData;
    atlasMap=new AtlasMap({places:resolvedPlaces,waypoints:routeRefs,geography:{terrain:mosaic,boundaries,rivers,lakes,chishui,world:{land:worldLand,boundaries:worldBoundaries},modern:{roads:modernRoads,places:modernPlaces,urban:modernUrban,boundaries:modernBoundaries,rivers:modernRivers}},profiles,onEvent:id=>{if(state.chapter!=='overview')dispatch({type:'chapter',value:'overview'});dispatch({type:'event',value:id});reader.openEvent(id);},onCrossing:index=>dispatch({type:'step',value:index}),onStory:id=>reader.openStory(id),onLocality:(place,legs)=>reader.openLocality(place,legs)});
    player=new JourneyPlayer({
      onStart:segment=>{
        if(scene()==='chishui'){state={...state,step:segment.step};render();}
        const settle=atlasMap.beginJourney(segment);updateJourneyCaption();return settle;
      },
      onProgress:(segment,t)=>atlasMap.updateJourney(t),
      onArrival:segment=>{
        state=state.chapter==='overview'?{...state,eventId:segment.toId}:{...state,step:segment.step};render();
      },
      onComplete:()=>{state={...state,playing:false};render();}
    });
    calendarLegs=Object.fromEntries(units.map(u=>[u.id,orderedLegs(u.id,resolvedPlaces,waypointReferences)]));
    calendarPlayer=new CalendarPlayer({milestones:events.filter(e=>turningPoints[e.id]||['会师','出发','抵达'].includes(e.kind)||['r1-xiangjiang','r1-lazi'].includes(e.id)),onFrame:calendarFrame,onMilestone:group=>{
      const e=group[0];state={...state,milestoneId:e.id};const callout=$('#milestone-callout');callout.hidden=false;
      callout.innerHTML=`<span class="milestone-star">★</span><div><small>征途重要时刻 · ${dateText(e)}</small><strong>${e.title}</strong><p class="milestone-armies">${e.unitIds.map(id=>unitNameAt(id,e.start)).join(' · ')}</p><button data-read-event="${e.id}">展开这段历史 ↗</button></div>`;
      const title=$('#calendar-caption');if(title)title.textContent=`${e.title} · ${dateText(e)}`;
    },onComplete:()=>{state={...state,playing:false};render();}});
    const pauseReading=()=>{stopTerrainTour();if(state.playing)dispatch({type:'play',value:false});};
    sourceView=mountSources(resolvedPlaces,photos,{onOpen:pauseReading});photoView=mountPhotos(photos,{onOpen:pauseReading,onReadEvent:id=>reader.openEvent(id),onReadStory:id=>reader.openStory(id)});reader=mountReader({places:resolvedPlaces,photos,onOpen:pauseReading});bindUI();render({fit:true});
    $('#app-status').classList.add('done');
    window.longMarchAtlas={getState:()=>({...state}),getPlaces:()=>structuredClone(resolvedPlaces),getLabelLayout:()=>structuredClone(atlasMap.labelLayout||[]),getProfiles:()=>structuredClone(profiles),getPlayback:()=>calendarMode()?calendarPlayer.snapshot():player.snapshot(),getZoom:()=>atlasMap.map.getZoom(),getMapExtent:()=>({bounds:atlasMap.map.getBounds(),minZoom:atlasMap.map.getMinZoom(),maxZoom:atlasMap.map.getMaxZoom(),terrainBounds:mosaic.bounds,detailLayers:[...atlasMap.detailTiles.values()].filter(x=>atlasMap.map.hasLayer(x.layer)).length}),getCalendarTracks:()=>structuredClone(tracksAtDay(state.calendarDay??calendarStart,calendarLegs)),getEventResults:()=>structuredClone(eventResults()),getTimeWindow:()=>timeWindow(),getCampaigns:()=>structuredClone({crossings:chishuiLessons,landscapes:terrainLessons}),getStories:()=>structuredClone(stories),getActiveSample:()=>scene()==='terrain'?structuredClone(profileInfo().samples[state.sampleIndex]):null,getRoutes:id=>structuredClone([...orderedLegs(id,resolvedPlaces,waypointReferences),...branchLegs(id,resolvedPlaces,waypointReferences)]),getPhotoSources:()=>structuredClone(photos)};
  }catch(error){console.error(error);$('#app-status').textContent='地图资料暂未展开，请重新打开本地入口。';}
}
boot();
