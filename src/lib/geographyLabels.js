// Natural Earth feature names, translated only for unambiguous rivers in this
// atlas. Label anchors are derived from the visible source geometry.
const riverNames={Gan:'赣江',Han:'汉江',Jinsha:'金沙江','Chang Jiang':'长江',Yangtze:'长江',Huang:'黄河',Dadu:'大渡河',Jialing:'嘉陵江',Wu:'乌江',Xiang:'湘江',Yuan:'沅江',Yalong:'雅砻江',Lancang:'澜沧江',You:'酉水',Wei:'渭河',Jing:'泾河',Huan:'环江',Nanpan:'南盘江',Hongshui:'红水河',Tuo:'沱江',Zi:'资水'};
for(const name of ['赤水河','大渡河','金沙江','湘江','白龙江','腊子河','腊子沟','达拉河'])riverNames[name]=name;
export const riverTitle=name=>riverNames[name]||name;
export function riverLabelCandidates(features,project,zoom,width,height){
  const candidates=[];
  for(const f of features){
    const name=f.properties.name;
    if(!riverNames[name]&&name!=='Min')continue;
    const lines=f.geometry.type==='MultiLineString'?f.geometry.coordinates:[f.geometry.coordinates];
    for(const line of lines){
      let run=[],runs=[];
      for(const coord of line){
        const p=project(coord);
        if(p.x>35&&p.x<width-55&&p.y>35&&p.y<height-40)run.push({...p,lon:coord[0],lat:coord[1]});
        else if(run.length){runs.push(run);run=[];}
      }
      if(run.length)runs.push(run);
      for(const points of runs){
        let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
        if(length<(zoom<6?95:70))continue;
        // Half the visible arc, rather than half the source vertex count.
        // OSM ways often have dense vertices on one bend and sparse ones elsewhere.
        let travelled=0,i=1;for(;i<points.length-1;i++){travelled+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);if(travelled>=length*.5)break;}
        const p=points[i],before=points[Math.max(0,i-2)],after=points[Math.min(points.length-1,i+2)];
        const title=name==='Min'?(p.lon<110?'岷江':'闽江'):riverNames[name];
        let angle=Math.atan2(after.y-before.y,after.x-before.x)*180/Math.PI;
        if(angle>90)angle-=180;if(angle< -90)angle+=180;
        const clamped=Math.max(-60,Math.min(60,angle)),w=title.length*13+12,h=19,radians=clamped*Math.PI/180;
        const labelWidth=Math.abs(w*Math.cos(radians))+Math.abs(h*Math.sin(radians)),labelHeight=Math.abs(w*Math.sin(radians))+Math.abs(h*Math.cos(radians));
        candidates.push({id:`river-${title}`,river:true,place:{name:title,lon:p.lon,lat:p.lat},screen:p,angle:clamped,priority:.6+Math.min(length,500)/2000,rect:{left:p.x-labelWidth/2,right:p.x+labelWidth/2,top:p.y-labelHeight/2,bottom:p.y+labelHeight/2}});
      }
    }
  }
  return candidates.sort((a,b)=>b.priority-a.priority).filter((p,i,all)=>all.findIndex(q=>q.id===p.id)===i);
}
