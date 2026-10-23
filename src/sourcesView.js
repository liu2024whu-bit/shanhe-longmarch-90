import {sourceHref,photoArchiveHref} from './lib/sourceLinks.js';
import {sources,events} from './data/history.js';
import {dateText,unitNameAt} from './marchModel.js';
export function mountSources(resolvedPlaces,photos=[],{onOpen=()=>{}}={}){
  const dialog=document.querySelector('#sources-dialog'),body=document.querySelector('#sources-body');
  let currentTab='history',focusIds=[],returnFocus=null;
  function render(){
    document.querySelectorAll('[data-source-tab]').forEach(el=>el.classList.toggle('active',el.dataset.sourceTab===currentTab));
    if(currentTab==='photos'){
      body.innerHTML=`<div class="scope-note"><h3>沿途实景，分别说明年代</h3><p>这组图片均为现代摄影，展示旧址、纪念设施或区域环境。图片与1930年代事件文字分别记录。缩放转码后的照片保留各自的CC BY、CC BY-SA或CC0声明；每幅图分别记录。</p></div>${photos.map(p=>`<article class="source-item photo-source"><a href="${photoArchiveHref(p.id)}" target="_blank" rel="noopener noreferrer"><img src="${p.file}" alt="${p.caption}" loading="lazy"></a><h3>${p.title}</h3><small>${p.kind} · ${p.date} · 摄影 ${p.author}</small><p>${p.caption}</p><p><a href="${photoArchiveHref(p.id)}" target="_blank" rel="noopener noreferrer">摄影、作者与授权档案 ↗</a> · <a href="${photoArchiveHref(p.id)}#license" target="_blank" rel="noopener noreferrer">${p.license}</a></p></article>`).join('')}`;
      body.insertAdjacentHTML('beforeend','<div class="scope-note"><h3>主题艺术插画</h3><p>两组、十幅长征意象画面由AI辅助创作，分别用于人物行军与物件故事。页面以“主题艺术插画”标注；实拍照片保留各自作者、拍摄日期和许可。</p><p><a class="illustration-link" href="./assets/art/long-march-story-atlas.webp" target="_blank" rel="noopener noreferrer">人物与行军 · 查看完整插画 ↗</a></p><p><a class="illustration-link" href="./assets/art/long-march-objects-atlas.webp" target="_blank" rel="noopener noreferrer">鱼钩、火柴、皮带与盟誓 · 查看完整插画 ↗</a></p><p><a href="./evidence.html?font=brush" target="_blank" rel="noopener noreferrer">题字字形授权 ↗</a> · <a href="./assets/fonts/OFL.txt" target="_blank" rel="noopener noreferrer">字体许可原文 ↗</a></p></div>');
    }else{
      const list=sources.filter(s=>currentTab==='history'?s.id.startsWith('H'):s.id.startsWith('G'));
      body.innerHTML=list.map(s=>`<article class="source-item ${focusIds.includes(s.id)?'focused':''}" id="source-${s.id}"><span class="source-id">${s.id}</span><a href="${sourceHref(s)}" target="_blank" rel="noopener noreferrer">${s.title}</a><small>${s.publisher} · ${s.date}</small><p>${s.supports}</p></article>`).join('');
      if(focusIds.length)requestAnimationFrame(()=>body.querySelector('.focused')?.scrollIntoView({block:'start'}));
    }
  }
  function open(tab='history',ids=[]){const opener=document.activeElement;onOpen();returnFocus=opener?.isConnected?opener:document.querySelector('#sources-open');currentTab=['history','geography','photos'].includes(tab)?tab:'history';focusIds=ids;render();if(!dialog.open)dialog.showModal();body.scrollTop=0;}
  document.querySelector('#sources-open').addEventListener('click',()=>open());
  document.querySelector('#sources-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
  document.querySelectorAll('[data-source-tab]').forEach(el=>el.addEventListener('click',()=>{currentTab=el.dataset.sourceTab;focusIds=[];render();body.scrollTop=0;}));
  document.querySelector('#download-events').addEventListener('click',()=>{
    const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
    const rows=[['事件ID','标题','部队','日期','日期精度','历史地名','今地','参考经度WGS84','参考纬度WGS84','位置含义','简述','资料口径备注','资料ID','资料链接'],...events.map(e=>{
      const p=resolvedPlaces[e.placeId];
      return [e.id,e.title,e.unitIds.map(id=>unitNameAt(id,e.start)).join(' / '),dateText(e),e.precision,p.name,p.today,p.lon,p.lat,p.landmarkSource?'现代旧址建筑/桥梁参照':p.regional?'区域参考点':'现代地方参考点，非历史遗址精测',e.summary,e.sourceNote||'',e.sourceIds.join('; '),e.sourceIds.map(id=>sources.find(s=>s.id===id).url).join(' ; ')];
    })];
    const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'});
    const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='长征关键事件与来源.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  });
  return {open};
}

