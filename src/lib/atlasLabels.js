import {rectsOverlap} from './mapLabelCollision.js';

// Move the text around its source point. The geographic anchor never moves.
export function arrangeAtlasLabels(candidates,{width,height,reserved=[],padding=5,limit=80}={}){
  const occupied=[...reserved],accepted=[],ids=new Set();
  const ranked=candidates.map((c,order)=>({...c,order})).sort((a,b)=>b.priority-a.priority||a.order-b.order);
  for(const candidate of ranked){
    if(accepted.length>=limit)break;
    if(ids.has(candidate.id))continue;
    const {screen,rect}=candidate;
    if(screen.x<0||screen.x>width||screen.y<0||screen.y>height)continue;
    const w=rect.right-rect.left,h=rect.bottom-rect.top;
    const offsets=candidate.offsets||[candidate.offset||[rect.left-screen.x,rect.top-screen.y]];
    for(const offset of offsets){
      const box={left:screen.x+offset[0],top:screen.y+offset[1],right:screen.x+offset[0]+w,bottom:screen.y+offset[1]+h};
      if(box.left<8||box.right>width-8||box.top<10||box.bottom>height-10)continue;
      if(occupied.some(r=>rectsOverlap(box,r,padding)))continue;
      accepted.push({...candidate,offset,rect:box});occupied.push(box);ids.add(candidate.id);break;
    }
  }
  return accepted;
}

export function pointLabelOffsets(width,height=20,preferred=[10,-10],gap=10){
  return [preferred,[gap,-height/2],[-width-gap,-height/2],[gap,-height-gap],[-width-gap,-height-gap],[gap,gap],[-width-gap,gap]];
}
