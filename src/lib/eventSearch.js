const first='1934-10-17',last='1936-10-22';
const valid=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;};
const endOfMonth=(year,month)=>new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
export function parseEventQuery(value=''){
  const ranges=[];let invalidDate=false;
  const text=value.normalize('NFKC').toLocaleLowerCase().replace(/(193[4-6])(?:[年./-]\s*(\d{1,2})(?:[月./-]\s*(\d{1,2})日?)?月?|年)?/g,(_,year,month,day)=>{
    const m=month?.padStart(2,'0'),d=day?.padStart(2,'0');
    const from=d?`${year}-${m}-${d}`:m?`${year}-${m}-01`:`${year}-01-01`;
    const to=d?from:m?endOfMonth(Number(year),Number(month)):`${year}-12-31`;
    if(valid(from)&&valid(to))ranges.push({from,to});else invalidDate=true;return ' ';
  });
  return {terms:text.trim().split(/\s+/).filter(Boolean),ranges,invalidDate};
}
export function eventTimeWindow(state={}){
  let from=valid(state.eventFrom)?state.eventFrom:first,to=valid(state.eventTo)?state.eventTo:last;
  for(const range of parseEventQuery(state.eventQuery).ranges){if(range.from>from)from=range.from;if(range.to<to)to=range.to;}
  from=from<first?first:from;to=to>last?last:to;
  return {from,to,valid:from<=to&&!parseEventQuery(state.eventQuery).invalidDate};
}
export const hasEventFilters=state=>!!(state.eventQuery?.trim()||state.eventFrom||state.eventTo||state.eventKind&&state.eventKind!=='all'||state.eventInView);
const kinds={decision:['会议','转折'],battle:['战斗','渡河'],meeting:['会师','抵达','建制'],landscape:['山河']};
export function filterEvents(list,state={},places={},unitNames={},storyTitles={}){
  const query=parseEventQuery(state.eventQuery),window=eventTimeWindow(state);
  if(!window.valid)return [];
  return list.filter(e=>{
    if(e.start>window.to||e.end<window.from)return false;
    if(state.eventKind&&state.eventKind!=='all'&&!kinds[state.eventKind]?.includes(e.kind))return false;
    const p=places[e.placeId]||{},bounds=state.eventInView?state.eventBounds:null;
    if(bounds&&(p.lon<bounds.west||p.lon>bounds.east||p.lat<bounds.south||p.lat>bounds.north))return false;
    const text=[e.title,e.kind,e.summary,p.name,p.today,storyTitles[e.id],...(e.unitIds||[]).map(id=>unitNames[id]||id)].join(' ').normalize('NFKC').toLocaleLowerCase();
    return query.terms.every(term=>text.includes(term));
  });
}
