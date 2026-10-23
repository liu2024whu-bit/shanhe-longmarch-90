// Limited screen-space corner rounding: each quadratic corner stays inside the
// triangle of its adjacent vertices, no more than `radius` pixels from the anchor.
// It cannot introduce a loop or a new geographical waypoint.
export function roundedRoutePath(parts,radius=6){
  let path='';
  const format=p=>`${Number(p.x.toFixed(2))},${Number(p.y.toFixed(2))}`;
  for(const points of parts){
    if(!points.length)continue;
    path+=`M${format(points[0])}`;
    for(let i=1;i<points.length-1;i++){
      const a=points[i-1],b=points[i],c=points[i+1];
      const before=Math.hypot(b.x-a.x,b.y-a.y),after=Math.hypot(c.x-b.x,c.y-b.y);
      const r=Math.min(radius,before*.25,after*.25);
      if(r<.2){path+=`L${format(b)}`;continue;}
      const enter={x:b.x+(a.x-b.x)*r/before,y:b.y+(a.y-b.y)*r/before};
      const leave={x:b.x+(c.x-b.x)*r/after,y:b.y+(c.y-b.y)*r/after};
      path+=`L${format(enter)}Q${format(b)} ${format(leave)}`;
    }
    if(points.length>1)path+=`L${format(points.at(-1))}`;
  }
  return path||'M0,0';
}

// Shared tangents round the source-backed locality chain, including joins
// between event legs. Cubic controls remain in a bounded corridor, so the
// convex-hull property bounds the entire curve without pointwise clamping.
export function routeDisplayOffset(zoom){return Math.min(.09,12*360/(512*2**zoom));}

export function displayRoute(line,zoom,context={}){
  const clean=line.filter((p,i)=>!i||p.lon!==line[i-1].lon||p.lat!==line[i-1].lat);
  if(clean.length<2)return clean;
  const vector=(a,b)=>{const x=b.lon-a.lon,y=b.lat-a.lat,n=Math.hypot(x,y);return {x:n?x/n:0,y:n?y/n:0,n};};
  const tangent=(before,p,after)=>{
    if(!before)return vector(p,after);
    if(!after)return vector(before,p);
    const a=vector(before,p),b=vector(p,after),x=a.x+b.x,y=a.y+b.y,n=Math.hypot(x,y);
    return n<.12?{x:0,y:0,n:0}:{x:x/n,y:y/n,n:Math.min(a.n,b.n)};
  };
  const output=[],offset=routeDisplayOffset(zoom),scale=512*2**zoom/360;
  for(let i=0;i<clean.length-1;i++){
    const a=clean[i],b=clean[i+1],direction=vector(a,b);
    const ta=tangent(clean[i-1]||context.before,a,b),tb=tangent(a,b,clean[i+2]||context.after);
    const handle=t=>Math.min(direction.n*.4,t.n*.4,offset/Math.max(.001,Math.abs(t.x*direction.y-t.y*direction.x)));
    const ha=handle(ta),hb=handle(tb),c={lon:a.lon+ta.x*ha,lat:a.lat+ta.y*ha},d={lon:b.lon-tb.x*hb,lat:b.lat-tb.y*hb};
    const count=Math.min(256,Math.max(16,Math.ceil(direction.n*scale/3)));
    for(let j=0;j<count;j++){
      if(j===0){output.push(a);continue;}
      // Sample more densely at the joins, where curvature changes fastest.
      const t=(1-Math.cos(Math.PI*j/count))/2,u=1-t;
      output.push({lon:u*u*u*a.lon+3*u*u*t*c.lon+3*u*t*t*d.lon+t*t*t*b.lon,lat:u*u*u*a.lat+3*u*u*t*c.lat+3*u*t*t*d.lat+t*t*t*b.lat});
    }
  }
  output.push(clean.at(-1));return output;
}

export function detailLevel(zoom){return zoom<5.5?'overview':zoom<7.0?'regional':'local';}

export function screenRouteLength(points){
  let distance=0;for(let i=1;i<points.length;i++)distance+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
  return distance;
}
