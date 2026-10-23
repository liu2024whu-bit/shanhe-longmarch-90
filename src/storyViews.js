import {sourceHref} from './lib/sourceLinks.js';
import {stories,storyById,storiesForEvent,eventNarratives} from './data/stories.js';
import {events,units,sources} from './data/history.js';
import {eventById,eventsForUnit,dateText,unitNameAt} from './marchModel.js';
import {turningPoints,eventPhotoIds} from './data/turningPoints.js';
import {significance} from './data/films.js';
import {viewingShelf,viewingGuide} from './viewingViews.js';
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photographicCovers=new Set(['yudu-bridge','zunyi-turn','loushan-pass','luding-bridge','jiajin-snow','hadapu-paper','shigu-boats','straw-sandals','peng-mule']);
function illustration(index=0){
 const objects=index>=6,slot=objects?index-6:index,columns=objects?2:3,x=(slot%columns)*512,y=Math.floor(slot/columns)*512;
 return `<svg class="story-art" viewBox="${x} ${y} 512 512" preserveAspectRatio="xMidYMid slice" role="img" aria-label="长征意象艺术插画"><image href="./assets/art/${objects?'long-march-objects-atlas':'long-march-story-atlas'}.webp" width="${columns*512}" height="1024"/></svg>`;
}
function cover(story,photos){
 const p=photos.find(p=>p.id===story.photoId);
 if(p&&photographicCovers.has(story.id))return {html:`<img class="story-cover-photo" src="${p.file}" alt="${escapeHTML(p.caption)}" loading="lazy">`,label:p.kind,credit:`${p.caption} · ${p.date} · ${p.author}`};
 return {html:illustration(story.art),label:'主题艺术插画',credit:'长征意象艺术插画 · AI辅助创作'};
}
function armyCaption(story){const e=eventById.get(story.eventId);return story.armyLabel||(story.unitId?unitNameAt(story.unitId,e.start):e.unitIds.map(id=>unitNameAt(id,e.start)).join(' · '));}

export const battleIds=['r1-xiangjiang','r1-tongdao','r1-liping','r1-zunyi','r1-gouba','r4-jialing','r1-luding','r1-lianghekou','r1-lazi','r2-wumeng','r25-yujia','r25-sipo','r24-ganzi-meeting'];
const buttonSources=ids=>`<button class="source-link" data-sources="${ids.join(',')}">查阅原始出处 ↗</button>`;
export function storyRail(state,photos=[]){
 const story=storyById.get(state.storyId)||stories[0];
 const tags=['全部','军民同心','浴血奋战','雪山草地','求实与抉择'];
 const list=stories.filter(s=>state.storyFilter==='全部'||s.tag===state.storyFilter);
 const query=(state.storyQuery||'').trim().toLocaleLowerCase(),matches=s=>[s.title,s.tag,s.placeLabel,s.protagonist].join(' ').toLocaleLowerCase().includes(query);
 return `<p class="rail-kicker">${stories.length}段记忆 · 人与物的长征</p><h1 class="rail-title story-heading">万里征途<br>记住<em>他们</em></h1><p class="story-section-note"><span>从险关与风雪，读到人的坚持。</span><button data-open-films>影像延伸 ↗</button></p><label class="story-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input id="story-search" type="search" value="${escapeHTML(state.storyQuery||'')}" placeholder="找故事、人物或物件" aria-label="搜索征途故事"></label><div class="story-filters" aria-label="故事主题">${tags.map(t=>`<button data-story-filter="${t}" class="${state.storyFilter===t?'active':''}" aria-pressed="${state.storyFilter===t}"><span>${t}</span><small>${stories.filter(s=>t==='全部'||s.tag===t).length}</small></button>`).join('')}</div><div class="story-catalog">${list.map(s=>`<button class="story-tile ${s.id===story.id?'active':''}" data-story="${s.id}" data-story-search="${escapeHTML([s.title,s.tag,s.placeLabel,s.protagonist].join(' ').toLocaleLowerCase())}" aria-pressed="${s.id===story.id}" ${matches(s)?'':'hidden'}><span class="story-object">${cover(s,photos).html}</span><span><small>${s.genre}</small><strong>${s.title}</strong><em>${s.protagonist||s.placeLabel}</em></span><b>↗</b></button>`).join('')}</div><p class="story-search-empty" id="story-search-empty" ${list.some(matches)?'hidden':''}>试试人物姓名、地点或故事名称。</p><p class="rail-footnote">沿着地点读史实，循着作品读精神。</p>`;
}
export function battleRail(state){
 const e=eventById.get(state.battleId),turn=turningPoints[e.id];
 return `<p class="rail-kicker">转折与战役 · 征途中的抉择</p><h1 class="rail-title">于险境中<br>开辟<em>新路</em></h1><div class="story-view-tabs"><button class="active" data-battle-mode="turns">重要时刻</button><button data-battle-mode="chishui">四渡赤水 · 机动专题</button></div><div class="battle-focus"><span class="event-kind">${e.kind} · ${dateText(e)}</span><h2>${e.title}</h2><p>${turn?.lead||e.summary}</p><button data-read-event="${e.id}" class="read-story-link">展开历史故事 <span>↗</span></button></div><div class="event-list battle-list">${battleIds.map(id=>{const item=eventById.get(id);return `<button data-battle="${id}" class="event-row ${id===e.id?'active':''}" style="--unit-color:${units.find(u=>u.id===item.unitIds[0]).color}"><span class="node-dot"></span><span><small>${dateText(item)}</small><strong>${item.title}</strong></span></button>`;}).join('')}</div>`;
}

export function storyMapCard(id,photos=[]){
 const s=storyById.get(id)||stories[0];
 const media=cover(s,photos),index=stories.indexOf(s),minutes=Math.max(2,Math.ceil(s.paragraphs.join('').length/260));
 return `<article class="story-map-card" aria-label="${escapeHTML(s.title)}的图文导读"><div class="story-card-art">${media.html}<span class="story-cover-label">${media.label}</span></div><div class="story-card-copy"><div class="story-card-edition"><span>征途故事</span><b>${String(index+1).padStart(2,'0')}<small> / ${stories.length}</small></b></div><small class="story-card-genre">${s.genre} · ${s.date}</small><h2>${s.title}</h2><p class="story-card-lead">${s.lead}</p><dl class="story-card-context"><div><dt>人物</dt><dd>${s.protagonist}</dd></div><div><dt>征途</dt><dd>${armyCaption(s)}</dd></div></dl><div class="story-card-excerpt"><h3>${s.chapters[0].title}</h3><p>${s.chapters[0].paragraphs[0]}</p></div></div><footer class="story-card-actions"><button class="read-story-link story-card-read" data-read-story="${s.id}"><span>翻开这段故事<small>四幕阅读 · 约${minutes}分钟</small></span><b>↗</b></button><button class="story-card-source" data-sources="${s.sourceIds.join(',')}">查阅故事出处 <span>↗</span></button></footer></article>`;
}

export function mountReader({places,photos,onOpen}){
 const dialog=document.querySelector('#history-dialog'),body=document.querySelector('#history-content');let opener;
 const photo=(id,context)=>{const p=photos.find(x=>x.id===id);return p?`<button class="reader-photo" data-photo="${p.id}"><img src="${p.file}" alt="${p.caption}" loading="lazy"><span>${context||p.caption} · ${p.date} · 摄影 ${p.author}　查看原幅 ↗</span></button>`:'';};
 const linkedSources=ids=>`<div class="reader-sources"><h3>故事的来处</h3>${ids.map(id=>{const s=sources.find(x=>x.id===id);return s?`<a href="${sourceHref(s)}" target="_blank" rel="noopener noreferrer">${s.title}<small>${s.publisher}</small><span>↗</span></a>`:'';}).join('')}</div>`;
 const banner=(media,tag,seal='征途<br>故事')=>`<div class="reader-banner"><div>${media.html}<span class="reader-photo-shade"></span></div><span class="reader-seal">${seal}</span><small>${tag}</small><span class="reader-image-credit">${media.credit}</span></div>`;
 const open=(html)=>{opener=document.activeElement;onOpen();body.innerHTML=html;body.scrollTop=0;body.querySelector('.reader-copy')?.scrollTo(0,0);if(!dialog.open)dialog.showModal();};
 const close=()=>dialog.close();
 document.querySelector('#history-close').addEventListener('click',close);
 dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
 dialog.addEventListener('close',()=>{(opener?.isConnected&&opener.checkVisibility()?opener:document.querySelector('.chapter.active'))?.focus({preventScroll:true});});
 body.addEventListener('click',event=>{
  const button=event.target.closest('[data-reader-section]');if(!button)return;
  const section=body.querySelector(`[data-story-section="${button.dataset.readerSection}"]`);
  section?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 });
 return {
  openFeature(feature){
   if(!feature)return;
   const image=photos.find(p=>p.id===feature.photoId);
   const media=image?{html:`<img class="reader-hero-image" src="${image.file}" alt="${image.caption}">`,credit:`${image.caption} · ${image.date} · ${image.author}`}:{html:illustration(0),credit:'长征意象艺术插画 · AI辅助创作'};
   const e=feature.eventId?eventById.get(feature.eventId):null;
   open(`${banner(media,e?'赤水之间 · 读懂机动':'雪山草地 · 读懂征途','山河<br>征途')}<div class="reader-copy"><p class="rail-kicker">${e?'中央红军 · '+dateText(e):feature.date+' · '+feature.army}</p><h1 id="history-title">${feature.title}</h1><p class="reader-lead">${feature.lead}</p>${feature.sections.map(([title,text],i)=>`<section class="reader-chapter"><h2><span>0${i+1}</span>${title}</h2><p>${text}</p></section>`).join('')}<aside class="reader-spirit"><small>${e?'循着行动再读一步':'征途中的精神'}</small><p>${feature.reading||feature.spirit}</p></aside>${photo(feature.photoId)}<div class="reader-related"><h3>相连的历史时刻</h3>${feature.eventLinks.map(id=>{const item=eventById.get(id);return `<button data-read-event="${id}">${item.title}<small>${dateText(item)}</small><span>→</span></button>`;}).join('')}</div>${feature.storyLinks?`<div class="reader-related"><h3>循着人物与物件，继续读</h3>${feature.storyLinks.map(([id,title])=>`<button data-read-story="${id}">${title}<span>→</span></button>`).join('')}</div>`:''}${viewingShelf({eventId:feature.eventId,tag:e?'浴血奋战':'雪山草地'})}${linkedSources(feature.sourceIds)}</div>`);
  },
  close,
  openFilms(storyId){
   open(`${banner({html:illustration(3),credit:'长征意象艺术插画 · AI辅助创作'},'影像长征','山河<br>回响')}<div class="reader-copy"><p class="rail-kicker">纪录片、专题片与课本故事</p><h1 id="history-title">从地图，走进影像</h1><p class="reader-lead">在亲历者的讲述、文物的细节和作品的画面中，把这一程再读深一点。</p><p class="viewing-intro">纪录片带我们回望史事，专题片连接文物与当代生活，动画呈现课本作品中的人物。影片在对应的国内展播页继续观看。</p>${storyId?`<button class="read-story-link" data-read-story="${storyId}">回到刚才的故事 ↗</button>`:''}${viewingGuide()}${linkedSources(['H54','H78','H79','H81'])}</div>`);
  },
  openSignificance(){
   open(`${banner({html:illustration(5),credit:'长征意象艺术插画 · AI辅助创作'},'九十年回望','精神<br>如炬')}<div class="reader-copy"><p class="rail-kicker">${significance.date}</p><h1 id="history-title">${significance.title}</h1><p class="reader-lead">${significance.lead}</p>${significance.sections.map(([title,text],i)=>`<section class="reader-chapter"><h2><span>0${i+1}</span>${title}</h2><p>${text}</p></section>`).join('')}${photo('huining','会宁会师纪念地今日实拍')}<aside class="reader-spirit"><small>在今天，怎样接续</small><p>认真核对一个日期，保护一件历史遗存，向后来者讲清一段经历。在平凡的责任中求实、互助、坚持，让九十年前的精神有今天的回声。</p></aside>${viewingShelf({closing:true})}<div class="reader-related"><h3>把意义放回具体的故事</h3>${['zunyi-turn','half-quilt','sixty-two-coins'].map(id=>`<button data-read-story="${id}">${storyById.get(id).title}<span>→</span></button>`).join('')}</div>${linkedSources(significance.sourceIds)}</div>`);
  },
  openLocality(place,legs){
   const ids=[...new Set(legs.flatMap(l=>l.sourceIds))],associated=[...new Set(legs.flatMap(l=>[l.fromId,l.toId]))].map(id=>eventById.get(id)).filter(Boolean);
   open(`${banner({html:illustration(4),credit:'长征意象艺术插画 · AI辅助创作'},'沿途史事','山河<br>征途')}<div class="reader-copy"><p class="rail-kicker">沿行军地点链，走近这片山河</p><h1 id="history-title">${place.name}</h1><p class="reader-lead">从途经的地方，读懂相连的征途。</p><div class="reader-place">${place.name} · 史料途经地</div>${legs.map(l=>{const from=eventById.get(l.fromId),to=eventById.get(l.toId);return `<h2>${l.label||`${from?.title||''} — ${to.title}`}</h2><p>${place.name}见于这一段行军所涉的地点记载。沿着${l.line[0].name}至${l.line.at(-1).name}的联系，可以结合前后史事，阅读这段征途。</p><p>${l.id==='chishui-feint'?l.note:to.summary}</p>`;}).join('')}<div class="reader-related"><h3>阅读相关历史故事</h3>${associated.map(e=>`<button data-read-event="${e.id}">${e.title}<small>${dateText(e)}</small><span>→</span></button>`).join('')}</div>${linkedSources(ids)}</div>`);
  },
  openStory(id){
   const s=storyById.get(id);if(!s)return;
   const related=stories.filter(x=>x.tag===s.tag&&x.id!==s.id).slice(0,3);
   const index=stories.indexOf(s),before=stories[(index+stories.length-1)%stories.length],after=stories[(index+1)%stories.length],ids=[...s.sourceIds,...(s.animation?['H54']:[])];
   const images=s.photoIds||[s.photoId].filter(Boolean);
   open(`${banner(cover(s,photos),s.tag)}<div class="reader-copy"><p class="rail-kicker">${s.genre} · ${s.date}</p><h1 id="history-title">${s.title}</h1><p class="reader-lead">${s.lead}</p><div class="reader-place">${s.placeLabel}<span class="reader-army">${armyCaption(s)}</span></div><nav class="reader-section-nav" aria-label="这篇故事的四幕">${s.chapters.map((chapter,i)=>`<button data-reader-section="${i}"><span>${String(i+1).padStart(2,'0')}</span>${chapter.title}</button>`).join('')}</nav>${s.chapters.map((chapter,i)=>`<section class="reader-chapter" data-story-section="${i}"><h2><span>${String(i+1).padStart(2,'0')}</span>${chapter.title}</h2>${chapter.paragraphs.map(p=>`<p>${p}</p>`).join('')}</section>`).join('')}<aside class="reader-spirit"><small>从故事读到的精神</small><p>${s.spirit}</p></aside>${images.length>1?`<div class="reader-photo-gallery">${images.map(id=>photo(id)).join('')}</div>`:photo(s.photoId,s.photoContext)}${viewingShelf({storyId:s.id,tag:s.tag})}${linkedSources(ids)}<div class="reader-related"><h3>循着这份精神，继续读</h3>${related.map(x=>`<button data-read-story="${x.id}">${x.title}<span>→</span></button>`).join('')}</div><nav class="reader-pagination" aria-label="逐篇阅读征途故事"><button data-read-story="${before.id}"><small>← 上一段 · ${index||stories.length} / ${stories.length}</small><strong>${before.title}</strong></button><button data-read-story="${after.id}"><small>下一段 →</small><strong>${after.title}</strong></button></nav></div>`);
  },
  openEvent(id){
   const e=eventById.get(id);if(!e)return;
   const p=places[e.placeId],turn=turningPoints[id],related=storiesForEvent(id),list=eventsForUnit(e.unitIds[0]),i=list.findIndex(x=>x.id===id),before=list[i-1],after=list[i+1],ids=[...new Set([...e.sourceIds,...(turn?.extraSources||[]),...(!turn?[...(before?.sourceIds||[]),...(after?.sourceIds||[])]:[])])];
   const images=photos.filter(p=>p.id===eventPhotoIds[id]||p.eventIds.includes(id)).sort((a,b)=>Number(b.id===eventPhotoIds[id])-Number(a.id===eventPhotoIds[id])),image=images[0];
   const media=image?{html:`<img class="reader-hero-image" src="${image.file}" alt="${image.caption}">`,credit:`${image.caption} · ${image.date} · ${image.author}`}:{html:illustration(e.kind==='山河'?1:e.kind==='渡河'?0:4),credit:'长征意象艺术插画 · AI辅助创作'};
   const narrative=turn?[['此前',turn.before],['行动与抉择',turn.decision],['此后',turn.after]]:[...(before?[[`此前 · ${before.title}`,`${dateText(before)}。${before.summary}`]]:[]),['这一程的史事',eventNarratives[id]||e.summary],...(after?[[`此后 · ${after.title}`,`${dateText(after)}。${after.summary}`]]:[])];
   open(`${banner(media,e.kind,'山河<br>为证')}<div class="reader-copy"><p class="rail-kicker">${e.unitIds.map(u=>unitNameAt(u,e.start)).join(' / ')}</p><h1 id="history-title">${e.title}</h1><div class="event-date">${dateText(e)}</div><p class="reader-lead">${e.summary}</p><div class="reader-place">今日地理 · ${p.today}</div>${narrative.map(([title,text],n)=>`<section class="reader-chapter"><h2><span>0${n+1}</span>${title}</h2><p>${text}</p></section>`).join('')}${photo(image?.id)}${related.length?`<div class="reader-related"><h3>这一程的故事</h3>${related.map(s=>`<button data-read-story="${s.id}">${s.title}<small>${s.genre}</small><span>→</span></button>`).join('')}</div>`:''}<div class="reader-continuity"><h3>沿着来路与去向</h3>${[before,after].filter(Boolean).map(x=>`<button data-read-event="${x.id}"><small>${dateText(x)}</small><strong>${x.title}</strong><span>→</span></button>`).join('')}</div>${e.sourceNote?`<details class="history-note"><summary>史料中的日期与口径</summary><p>${e.sourceNote}</p></details>`:''}${viewingShelf({eventId:id,tag:e.kind==='山河'?'雪山草地':undefined})}${linkedSources(ids)}</div>`);
   const existingPhoto=body.querySelector('.reader-photo');
   if(images.length>1&&existingPhoto)existingPhoto.outerHTML=`<div class="reader-photo-gallery">${images.map(p=>photo(p.id)).join('')}</div>`;
  }
 };
}
