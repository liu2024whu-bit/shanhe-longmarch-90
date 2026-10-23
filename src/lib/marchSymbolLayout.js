import {rectsOverlap} from './mapLabelCollision.js';

// Offset only the military symbol and caption. The small ground dot stays on
// the route and a leader keeps that relationship visible at shared crossings.
export function marchSymbolOffset(point,obstacles,width,height){
  const candidates=[[0,0],[72,-52],[-72,-52],[76,22],[-76,22],[0,-92],[0,84]];
  const ranked=candidates.map(([x,y],index)=>{
    const rect={left:point.x+x-46,right:point.x+x+46,top:point.y+y-34,bottom:point.y+y+31};
    const collisions=obstacles.filter(o=>rectsOverlap(rect,o,7)).length;
    const outside=rect.left<10||rect.right>width-10||rect.top<10||rect.bottom>height-10;
    return {x,y,score:collisions*100+(outside?500:0)+index};
  }).sort((a,b)=>a.score-b.score);
  return ranked[0];
}
