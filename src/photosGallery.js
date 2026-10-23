import {events} from './data/history.js';
import {dateText,unitNameAt} from './marchModel.js';
import {photoArchiveHref} from './lib/sourceLinks.js';

export function mountPhotos(photos,{onOpen,onReadEvent,onReadStory}={}){
 const dialog=document.querySelector('#photo-dialog'),content=document.querySelector('#photo-content');let index=0,returnFocus=null,group='all';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const category=p=>p.id==='relics'?'objects':['grassland','jiajin','shigu','liupan-landscape'].includes(p.id)?'landscape':'sites';
 const selection=()=>photos.map((p,i)=>({p,i})).filter(({p})=>group==='all'||category(p)===group);
 function render(){
  const previousFocus=content.contains(document.activeElement)?document.activeElement:null;
  const focusGroup=previousFocus?.hasAttribute('data-photo-group');
  const p=photos[index],lead=events.find(e=>p.eventIds.includes(e.id)),list=selection();
  const notes=p.id==='relics'?'草鞋、斗笠与行军物件，让漫长征途有了可触摸的重量。':lead?lead.summary:'从今日留存的山川与实物，走近长征的记忆。';
  content.innerHTML=`<header class="photo-viewer-heading"><span>山河留影<small>沿途实景 · 摄影手记</small></span><nav aria-label="按影像主题查看">${[['all','全部'],['sites','旧址与纪念'],['landscape','山河与环境'],['objects','文物见证']].map(([id,name])=>`<button data-photo-group="${id}" aria-pressed="${group===id}" class="${group===id?'active':''}">${name}</button>`).join('')}</nav></header><figure class="photo-exhibit"><div class="photo-stage"><img src="${p.file}" alt="${esc(p.caption)}"><span class="photo-stage-label">${p.kind}<b>${p.date}</b></span></div><figcaption><div class="photo-folio-number"><span>山河与遗存</span><b>${String(index+1).padStart(2,'0')}<small> / ${photos.length}</small></b></div><h2 id="photo-title">${esc(p.title)}</h2><p class="photo-caption">${esc(p.caption)}</p><section class="photo-history"><small>${lead?dateText(lead)+' · '+lead.unitIds.map(id=>unitNameAt(id,lead.start)).join('、'):'长征时期 · 行军生活'}</small><h3>${lead?esc(lead.title):'从一件物，读一段远征'}</h3><p>${esc(notes)}</p>${lead?`<button data-photo-history="${lead.id}">展开这一程的史事 <span>↗</span></button>`:'<button data-photo-story="straw-sandals">阅读草鞋与绑腿的故事 ↗</button>'}</section><dl class="photo-metadata"><div><dt>摄影</dt><dd>${esc(p.author)}</dd></div><div><dt>拍摄日期</dt><dd>${p.date}</dd></div><div><dt>原许可</dt><dd><a href="${photoArchiveHref(p.id)}#license" target="_blank" rel="noopener noreferrer">${p.license} ↗</a></dd></div></dl><a class="photo-origin" href="${photoArchiveHref(p.id)}" target="_blank" rel="noopener noreferrer">摄影与授权档案 <span>↗</span></a><p class="photo-temporal-note">镜头记录今日山河，史事依据文献另记。</p></figcaption></figure><nav class="photo-filmstrip" aria-label="选择沿途实景">${list.map(({p:photo,i})=>`<button data-photo-index="${i}" class="${i===index?'active':''}" aria-pressed="${i===index}" aria-label="查看${esc(photo.title)}"><img src="${photo.file}" alt="" loading="lazy"><span>${esc(photo.title)}</span></button>`).join('')}</nav>`;
  document.querySelector('#photo-count').textContent=`${String(list.findIndex(item=>item.i===index)+1).padStart(2,'0')} / ${String(list.length).padStart(2,'0')}`;
  if(previousFocus)content.querySelector(focusGroup?`[data-photo-group="${group}"]`:`[data-photo-index="${index}"]`)?.focus({preventScroll:true});
  requestAnimationFrame(()=>{const strip=content.querySelector('.photo-filmstrip');if(!strip)return;const active=strip.querySelector('.active');strip.scrollLeft=Math.max(0,active.offsetLeft-strip.offsetLeft-strip.clientWidth/2+active.clientWidth/2);});
 }
 function advance(delta){const list=selection(),at=list.findIndex(item=>item.i===index);index=list[(at+delta+list.length)%list.length].i;render();}
 function open(id){index=Math.max(0,photos.findIndex(p=>p.id===id));group='all';const opener=document.activeElement;onOpen?.();returnFocus=opener?.isConnected?opener:document.querySelector(`[data-photo="${photos[index].id}"]`)||document.querySelector('#photos-open');render();if(!dialog.open)dialog.showModal();}
 content.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.photoGroup){group=b.dataset.photoGroup;const list=selection();if(!list.some(item=>item.i===index))index=list[0].i;render();}else if(b.dataset.photoIndex!==undefined){index=Number(b.dataset.photoIndex);render();}else if(b.dataset.photoHistory){dialog.close();onReadEvent?.(b.dataset.photoHistory);}else if(b.dataset.photoStory){dialog.close();onReadStory?.(b.dataset.photoStory);}});
 document.querySelector('#photo-close').addEventListener('click',()=>dialog.close());
 document.querySelector('#photo-prev').addEventListener('click',()=>advance(-1));document.querySelector('#photo-next').addEventListener('click',()=>advance(1));
 document.querySelector('#photos-open').addEventListener('click',()=>open());
 dialog.addEventListener('close',()=>{content.innerHTML='';(returnFocus?.isConnected&&returnFocus.checkVisibility()?returnFocus:document.querySelector('#map-tool-menu summary'))?.focus({preventScroll:true});});
 dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();advance(1);}if(e.key==='ArrowLeft'){e.preventDefault();advance(-1);}});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 return {open};
}
