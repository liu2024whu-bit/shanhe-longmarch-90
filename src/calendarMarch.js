import {eventsForUnit,unitNameAt} from './marchModel.js';
import {units} from './data/history.js';

export const dayNumber=s=>Date.parse(s+'T00:00:00Z')/86400000;
export const calendarStart=dayNumber('1934-10-17');
export const calendarEnd=dayNumber('1936-10-22');
export const calendarMonth=day=>new Date(day*86400000).toISOString().slice(0,7).replace('-','.');

// A presentation between dated records, not a reconstruction of daily camps.
// Original month/period precision stays attached to the historical records.
export function tracksAtDay(day,legsByUnit){
  const currentDate=new Date(day*86400000).toISOString().slice(0,10);
  return units.map(unit=>{
    const list=eventsForUnit(unit.id),legs=legsByUnit[unit.id],first=dayNumber(list[0].start),last=dayNumber(list.at(-1).start);
    if(day<first)return {unitId:unit.id,color:unit.color,name:unitNameAt(unit.id,list[0].start),status:'待启程',eventId:list[0].id,leg:legs[0],progress:0,started:false};
    if(day>=last)return {unitId:unit.id,color:unit.color,name:unitNameAt(unit.id,currentDate),status:list.at(-1).kind==='会师'?'已会师':'已抵达',eventId:list.at(-1).id,leg:legs.at(-1),progress:1,started:true,arrived:true};
    let index=0;
    for(let i=1;i<list.length;i++)if(dayNumber(list[i].start)<=day)index=i;else break;
    const leg=legs[index],a=dayNumber(list[index].start),b=dayNumber(list[index+1].start);
    return {unitId:unit.id,color:unit.color,name:unitNameAt(unit.id,list[index].start),status:'行进中',eventId:list[index].id,toId:list[index+1].id,leg,progress:Math.max(0,Math.min(1,(day-a)/Math.max(1,b-a))),started:true};
  });
}

export class CalendarPlayer{
  constructor({onFrame,onMilestone,onComplete,milestones=[]}){Object.assign(this,{onFrame,onMilestone,onComplete,milestones});this.rangeStart=calendarStart;this.rangeEnd=calendarEnd;this.reset();}
  reset(day=this.rangeStart){this.pause();this.day=day;this.hold=0;this.last=null;this.speed=9;this.seen=new Set(this.milestones.filter(e=>dayNumber(e.start)<day).map(e=>e.id));}
  setRange(start=calendarStart,end=calendarEnd){const speed=this.speed;this.rangeStart=Math.max(calendarStart,Math.min(calendarEnd,start));this.rangeEnd=Math.max(this.rangeStart,Math.min(calendarEnd,end));this.reset(Math.max(this.rangeStart,Math.min(this.rangeEnd,this.day)));this.speed=speed;}
  seek(day){const speed=this.speed;this.reset(Math.max(this.rangeStart,Math.min(this.rangeEnd,day)));this.speed=speed;this.onFrame(this.day);}
  play(){if(this.running)return;if(this.day>=this.rangeEnd)this.seek(this.rangeStart);this.running=true;this.last=null;this.raf=requestAnimationFrame(t=>this.frame(t));}
  pause(){this.running=false;cancelAnimationFrame(this.raf);this.last=null;}
  frame(now){
    if(!this.running)return;
    const delta=this.last===null?0:Math.min(80,now-this.last);this.last=now;
    if(this.hold>0)this.hold=Math.max(0,this.hold-delta);
    else{
      let next=Math.min(this.rangeEnd,this.day+delta/1000*this.speed);
      const crossed=this.milestones.filter(e=>!this.seen.has(e.id)&&dayNumber(e.start)>=this.day&&dayNumber(e.start)<=next).sort((a,b)=>a.start.localeCompare(b.start));
      if(crossed.length){
        const date=crossed[0].start,group=crossed.filter(e=>e.start===date);next=dayNumber(date);group.forEach(e=>this.seen.add(e.id));this.hold=1800;this.onMilestone(group);
      }
      this.day=next;this.onFrame(this.day);
      if(this.day>=this.rangeEnd){this.pause();this.onComplete();return;}
    }
    this.raf=requestAnimationFrame(t=>this.frame(t));
  }
  snapshot(){return {mode:'calendar',running:this.running,day:this.day,holdMs:this.hold,speed:this.speed,start:this.rangeStart,end:this.rangeEnd};}
}
