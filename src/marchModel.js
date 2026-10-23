import { units, events, places, unitEventOrder, memories } from './data/history.js';
import { pointAlongRoute } from './lib/geo.js';
import {corridorById,routeBranches,resolveWaypoint} from './data/routeCorridors.js';

export const eventById = new Map(events.map(event => [event.id,event]));
export const unitById = new Map(units.map(unit => [unit.id,unit]));
export const initialState = Object.freeze({ chapter:'overview',unitId:'all',eventId:null,step:0,profileId:'jiajin',sampleIndex:0,memoryIndex:0,playing:false,follow:false,terrain:true,basemap:'terrain',panelCollapsed:false,panelExpanded:false,dockCollapsed:false,labels:true,battleMode:'turns',battleId:'r1-zunyi',storyId:'golden-hook',storyMode:'read',storyFilter:'全部',calendarDay:null,eventQuery:'',eventFrom:'',eventTo:'',eventKind:'all',eventInView:false,eventBounds:null,eventFiltersOpen:false,chishuiView:'focus',profileScale:'shared' });

export function eventsForUnit(unitId='all') {
  if (unitId!=='all') return (unitEventOrder[unitId]||[]).map(id=>eventById.get(id));
  return [...events].sort((a,b)=>a.start.localeCompare(b.start)||events.indexOf(a)-events.indexOf(b));
}

export function dateText(event) {
  if (!event) return '1934 — 1936';
  if(event.displayDate) return event.displayDate;
  const a=event.start.replaceAll('-','.');
  const b=event.end.replaceAll('-','.');
  if(event.precision==='month') return a.slice(0,7);
  if(a===b) return a;
  return `${a} — ${b}`;
}

export function unitNameAt(unitId,date) {
  const unit=unitById.get(unitId);
  if(unitId==='red2'&&date&&date<'1936-07-05') return '红二、红六军团';
  if(unitId==='red1'&&date&&date>='1935-09-12'&&date<'1935-10-20') return '中央红军 · 陕甘支队';
  if(unitId==='red1'&&date&&date>='1936-01-01') return '红一方面军';
  return unit?.name||'';
}

export function orderedLegs(unitId,referencePlaces=places,waypointReferences={}) {
  const sequence=eventsForUnit(unitId);
  return sequence.slice(1).map((to,index)=>{
    const from=sequence[index];
    const id=`${unitId}:${from.id}>${to.id}`,definition=corridorById.get(id);
    const via=definition?.via.map(key=>resolveWaypoint(key,waypointReferences))||[];
    return { id,unitId,fromId:from.id,toId:to.id,start:from.start,end:to.end,temporalMeaning:'envelope of linked events, not inferred travel dates',fromPlaceId:from.placeId,toPlaceId:to.placeId,line:[referencePlaces[from.placeId],...via,referencePlaces[to.placeId]],via,geometryMeaning:definition?.level||'event-link',note:definition?.note||'仅表示已收录事件地点之间的概括方向，尚未补足中间行军通道。',sourceIds:[...new Set([...(definition?.sourceIds||[]),...from.sourceIds,...to.sourceIds])] };
  });
}

export function branchLegs(unitId,referencePlaces=places,waypointReferences={}){
  return routeBranches.filter(branch=>branch.unitId===unitId).map(branch=>({
    ...branch,geometryMeaning:branch.level,
    line:[referencePlaces[branch.fromPlaceId],...branch.via.map(id=>resolveWaypoint(id,waypointReferences)),referencePlaces[branch.toPlaceId]],
    via:branch.via.map(id=>resolveWaypoint(id,waypointReferences)),
    start:eventById.get(branch.fromId).start,end:eventById.get(branch.toId).end,
    temporalMeaning:'envelope of linked events, not inferred travel dates',
  }));
}

// Search narrows reading stops. Travel between them still includes every
// original event leg and locality, including repeated visits and reversals.
export function legsBetweenEvents(unitId,selectedIds,referencePlaces=places,waypointReferences={}){
  const sequence=eventsForUnit(unitId),all=orderedLegs(unitId,referencePlaces,waypointReferences),selected=new Set(selectedIds);
  const indexes=sequence.map((e,i)=>selected.has(e.id)?i:-1).filter(i=>i>=0);
  return indexes.slice(1).map((end,i)=>{
    const start=indexes[i],parts=all.slice(start,end);if(parts.length===1)return parts[0];
    const line=parts.flatMap((p,index)=>index?p.line.slice(1):p.line);
    return {id:`${unitId}:reading:${sequence[start].id}>${sequence[end].id}`,unitId,fromId:sequence[start].id,toId:sequence[end].id,line,via:line.slice(1,-1),start:sequence[start].start,end:sequence[end].end,sourceIds:[...new Set(parts.flatMap(p=>p.sourceIds))],geometryMeaning:'linked-original-legs',originalLegIds:parts.map(p=>p.id)};
  });
}

// An explicit leg ID avoids confusing repeated visits at the same coordinate.
export function positionOnLeg(leg,progress) {
  return pointAlongRoute(leg.line,Math.max(0,Math.min(1,progress)));
}

export function routeProgressAtEvent(unitId,eventId) {
  const order=unitEventOrder[unitId]||[];
  const index=order.indexOf(eventId);
  return index<0?null:{ index,legIndex:index-1,eventId,placeId:eventById.get(eventId).placeId };
}

export function reduceState(state,action) {
  if(action.type==='chapter') return {...state,chapter:action.value,playing:false,follow:false,eventId:null,calendarDay:null};
  if(action.type==='unit') return {...state,unitId:action.value,eventId:null,playing:false,follow:false,calendarDay:null};
  if(action.type==='event') return {...state,eventId:action.value,follow:true,playing:false,calendarDay:null};
  if(action.type==='step') return {...state,step:Math.max(0,Math.min(3,action.value)),playing:false};
  if(action.type==='sample') return {...state,sampleIndex:Math.max(0,Math.min(120,Math.round(action.value)))};
  if(action.type==='profile') return {...state,profileId:action.value,sampleIndex:0};
  if(action.type==='memory') return {...state,memoryIndex:Math.max(0,Math.min(memories.length-1,action.value)),playing:false};
  if(action.type==='play') return {...state,playing:action.value,follow:true};
  if(action.type==='follow') return {...state,follow:action.value};
  if(action.type==='terrain') return {...state,terrain:action.value};
  if(action.type==='basemap') return {...state,basemap:action.value,terrain:action.value==='terrain'};
  if(action.type==='panel') return {...state,panelCollapsed:action.value};
  if(action.type==='expand') return {...state,panelExpanded:action.value,panelCollapsed:false};
  if(action.type==='dock') return {...state,dockCollapsed:action.value};
  if(action.type==='battle') return {...state,battleId:action.value,battleMode:'turns',eventId:action.value,playing:false};
  if(action.type==='battleMode') return {...state,battleMode:action.value,playing:false};
  if(action.type==='story') return {...state,storyId:action.value,storyMode:'read',playing:false};
  if(action.type==='storyMode') return {...state,storyMode:action.value,playing:false};
  if(action.type==='storyFilter') return {...state,storyFilter:action.value};
  if(action.type==='labels') return {...state,labels:action.value};
  if(action.type==='crossingView')return {...state,chishuiView:action.value,playing:false};
  if(action.type==='profileScale')return {...state,profileScale:action.value};
  return state;
}
