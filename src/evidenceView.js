import {sources,events} from './data/history.js';
import {canonicalLink} from './lib/sourceLinks.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const params=new URLSearchParams(location.search),root=document.querySelector('#evidence');
const origin=url=>`<section class="origin"><h2>原始出处地址</h2><code>${esc(url)}</code><button data-copy="${esc(url)}">复制原始地址</button></section>`;
const alternatives={H37:[],H43:[['吴焕先：鄂豫陕苏区创建人','https://www.12371.cn/2018/10/04/ARTI1538646351466941.shtml'],['《国家荣光》吴焕先','https://www.12371.cn/2025/03/25/VIDE1742884202186223.shtml']],H64:[['漫话重走长征路的贵州老红军陈靖','https://www.gzszx.gov.cn/gzzxb/web/doc/detail/2134/A3']]};
async function render(){
 if(params.has('photo')){
  const photos=await (await fetch('./data/photos.json')).json(),p=photos.find(p=>p.id===params.get('photo'));if(!p)throw Error('未找到这幅影像');
  const related=events.filter(e=>p.eventIds.includes(e.id));
  document.title=p.title+' · 摄影与授权档案';
  root.innerHTML=`<small>沿途实景 · 摄影与授权档案</small><h1>${esc(p.title)}</h1><div class="evidence-grid"><img src="${p.file}" alt="${esc(p.caption)}"><section><p>${esc(p.caption)}</p><dl><div><dt>摄影</dt><dd>${esc(p.author)}</dd></div><div><dt>拍摄日期</dt><dd>${p.date}</dd></div><div id="license"><dt>原许可</dt><dd>${esc(p.license)}</dd></div><div><dt>原图题名</dt><dd>${esc(p.originalTitle)}</dd></div></dl><p>本页展示现代摄影。历史事件与拍摄日期分别记录，照片用于观察今日的旧址、纪念设施与区域环境。</p>${related.length?`<h2>相连的历史</h2><p>${related.map(e=>`${esc(e.title)} · ${e.start}${e.end!==e.start?'—'+e.end:''}`).join('<br>')}</p>`:''}</section></div><h2>使用与署名</h2><p>摄影：${esc(p.author)}；作品：《${esc(p.originalTitle)}》；许可：${esc(p.license)}。本作品将照片缩放并转换为WebP，缩略图可裁切，展开时保留全图。适用相同方式共享的作品继续沿用原许可。</p><div class="reference-links"><a href="${p.licenseUrl}" target="_blank" rel="noopener noreferrer">原许可条款 ↗</a><a href="${p.file}" target="_blank" rel="noopener noreferrer">查看随包完整照片 ↗</a></div>${origin(p.sourceUrl)}`;
 }else if(params.has('font')){
  const text=await (await fetch('./assets/fonts/OFL.txt')).text();root.innerHTML=`<small>题字字形与授权</small><h1>山河为证 · 标题字档案</h1><p>标题采用Ma Shan Zheng的本地字形子集，派生字体命名为Shanhe Brush，遵循SIL Open Font License 1.1。</p><pre>${esc(text)}</pre>${origin('https://github.com/google/fonts/tree/main/ofl/mashanzheng')}`;
 }else{
  const s=sources.find(s=>s.id===params.get('source'));if(!s)throw Error('请选择需要阅读的资料');
  const list=alternatives[s.id]||[];
  // H02 is taken from the source model, so the companion link stays exact.
  if(s.id==='H37')list.push(['四渡赤水出奇兵',sources.find(x=>x.id==='H02').url],['图步长征路',sources.find(x=>x.id==='H69').url]);
  document.title=s.title+' · 出处档案';
  root.innerHTML=`<small>${s.id} · ${s.id.startsWith('G')?'地理资料':'历史资料'}出处索引</small><h1>${esc(s.title)}</h1><dl><div><dt>发布机构</dt><dd>${esc(s.publisher)}</dd></div><div><dt>资料日期</dt><dd>${esc(s.date)}</dd></div></dl><h2>本图采用的依据</h2><p>${esc(s.supports)}</p>${list.length?`<h2>继续查阅国内官方资料</h2><div class="reference-links">${list.map(([title,url])=>`<a href="${canonicalLink(url)}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a>`).join('')}</div>`:''}${s.id.startsWith('G')?'<p>地图与地形素材已随作品留存，可在原地图中阅读，出处地址在本页保留。</p>':'<p>此页保留原始书目与采用依据，同题官方资料单独列出。</p>'}${origin(canonicalLink(s.url))}`;
 }
}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-copy]');if(!b)return;try{await navigator.clipboard.writeText(b.dataset.copy);b.textContent='地址已复制';}catch{b.textContent='可选择上方地址复制';}});
render().catch(e=>{root.textContent=e.message;});
