const rowKey=row=>row.dataset.event||row.dataset.battle;
const rows=list=>[...list.querySelectorAll(':scope > .event-row')];

// Keep the actual row buttons, their focus and scroll position while the
// surrounding historical reading changes. No navigation or browser scrolling.
export function captureReadingPosition(rail,key){
  if(rail.dataset.readingContext!==key)return null;
  const list=rail.querySelector('.event-list');if(!list||!rows(list).length)return null;
  return {list,keys:rows(list).map(rowKey),listScroll:list.scrollTop,listTop:list.getBoundingClientRect().top,
    detailScroll:rail.querySelector('.detail-scroll')?.scrollTop||0,railScroll:rail.scrollTop,
    focus:list.contains(document.activeElement)?document.activeElement:null};
}

export function restoreReadingPosition(rail,key,snapshot){
  rail.dataset.readingContext=key;
  if(!snapshot)return false;
  const next=rail.querySelector('.event-list');if(!next)return false;
  const nextRows=rows(next);
  if(nextRows.map(rowKey).join('|')!==snapshot.keys.join('|'))return false;
  rows(snapshot.list).forEach((row,index)=>{row.className=nextRows[index].className;const pressed=nextRows[index].getAttribute('aria-pressed');if(pressed!==null)row.setAttribute('aria-pressed',pressed);});
  next.replaceWith(snapshot.list);snapshot.list.scrollTop=snapshot.listScroll;
  rail.scrollTop=snapshot.railScroll;
  const detail=rail.querySelector('.detail-scroll');
  if(detail){detail.scrollTop=snapshot.detailScroll;detail.scrollTop+=snapshot.list.getBoundingClientRect().top-snapshot.listTop;}
  if(rail.checkVisibility())snapshot.list.scrollTop+=snapshot.list.getBoundingClientRect().top-snapshot.listTop;
  snapshot.focus?.focus({preventScroll:true});
  return true;
}
