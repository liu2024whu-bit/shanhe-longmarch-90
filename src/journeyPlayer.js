// Frame-based playback: presentation time is independent of historical dates.
// Segment clock with pause/resume and arrival lifecycle.
export class JourneyPlayer{
  constructor({onStart,onProgress,onArrival,onComplete}){
    Object.assign(this,{onStart,onProgress,onArrival,onComplete});this.frame=this.frame.bind(this);this.reset();
  }
  reset(){cancelAnimationFrame(this.raf);this.raf=null;this.running=false;this.segments=[];this.index=0;this.phase='hold';this.elapsed=0;this.progress=0;this.last=null;}
  load(segments,key){this.reset();this.segments=segments;this.key=key;}
  play(){if(this.running)return;this.running=true;this.last=null;this.raf=requestAnimationFrame(this.frame);}
  pause(){this.running=false;cancelAnimationFrame(this.raf);this.raf=null;this.last=null;}
  frame(now){
    if(!this.running)return;
    const delta=this.last===null?0:Math.min(80,Math.max(0,now-this.last));this.last=now;
    const segment=this.segments[this.index];
    if(!segment){this.pause();this.onComplete();return;}
    this.elapsed+=delta;
    if(this.phase==='hold'){
      if(this.elapsed>=segment.holdMs){this.phase='travel';this.elapsed=0;this.settleMs=this.onStart(segment)||0;if(this.settleMs)this.phase='camera';}
    }else if(this.phase==='camera'){
      if(this.elapsed>=this.settleMs){this.phase='travel';this.elapsed=0;}
    }else{
      const t=Math.min(1,this.elapsed/segment.durationMs);
      // Smooth acceleration/deceleration without manufacturing daily positions.
      this.progress=t*t*(3-2*t);this.onProgress(segment,this.progress);
      if(t>=1){this.onArrival(segment);this.index++;this.phase='hold';this.elapsed=0;this.progress=0;}
    }
    if(this.running)this.raf=requestAnimationFrame(this.frame);
  }
  snapshot(){return {running:this.running,key:this.key,index:this.index,phase:this.phase,progress:this.progress,elapsed:this.elapsed};}
}
