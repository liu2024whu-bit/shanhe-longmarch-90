import {films,recommendedFilms} from './data/films.js';
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const play='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z"/></svg>';
function filmLink(f){
 const name=f.episode?`第${f.episode}集 · ${f.title}`:f.title;
 return `<a class="viewing-link" href="${f.url}" target="_blank" rel="noopener noreferrer" data-film="${f.id}" aria-label="${escapeHTML('《'+f.series+'》'+name+'，在新窗口打开官方观看页')}"><span class="viewing-play">${play}</span><span class="viewing-copy"><small>${f.kind} · ${f.year}</small><strong>《${f.series}》</strong><b>${escapeHTML(name)}</b><p>${f.description}</p><em>${f.publisher} · ${f.linkLabel}</em></span><span class="viewing-arrow">↗</span></a>`;
}
export function viewingShelf(context={}){
 return `<section class="viewing-shelf"><header><div><small>让地图的阅读，再延伸一步</small><h3>循着影像，继续读</h3></div><button data-open-films>全部影像 ↗</button></header><div class="viewing-links">${recommendedFilms(context).map(filmLink).join('')}</div><p class="viewing-note">在新窗口打开官方观看页，地图和阅读位置继续保留。</p></section>`;
}
export function viewingGuide(){
 return `<div class="viewing-guide">${[['回望历史与今天',films.filter(f=>f.series!=='翻开这一页')],['课本故事与正版选集',films.filter(f=>f.series==='翻开这一页')]].map(([title,list])=>`<section><h2>${title}</h2><div class="viewing-links">${list.map(filmLink).join('')}</div></section>`).join('')}</div>`;
}
