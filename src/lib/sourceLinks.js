// Exact destinations checked on 2026-10-23. These public legacy pages serve
// valid articles over HTTP; their HTTPS certificates do not match their hosts.
const replacements={
  "https://dangshi.people.com.cn/n1/2016/0902/c406330-28687932.html": "http://dangshi.people.com.cn/n1/2016/0902/c406330-28687932.html",
  "https://www.mod.gov.cn/gfbw/gfjy_index/js_214151/16418521.html": "http://www.mod.gov.cn/gfbw/gfjy_index/js_214151/16418521.html",
  "https://www.hbdsw.org.cn/tbgz/zggcd/fjlc/202110/t4544087.shtml": "http://www.hbdsw.org.cn/tbgz/zggcd/fjlc/202110/t4544087.shtml",
  "https://www.hbdsw.org.cn/dsgj/202609/t4831447.shtml": "http://www.hbdsw.org.cn/dsgj/202609/t4831447.shtml",
  "https://www.mod.gov.cn/gfbw/gfjy_index/js_214151/16485040.html": "http://www.mod.gov.cn/gfbw/gfjy_index/js_214151/16485040.html",
  "https://www.mod.gov.cn/gfbw/gfjy_index/js_214151/4852696.html": "http://www.mod.gov.cn/gfbw/gfjy_index/js_214151/4852696.html",
  "https://www.81.mil.cn/2022zt/2021-10/17/content_10204934_2.htm": "http://www.81.mil.cn/2022zt/2021-10/17/content_10204934_2.htm",
  "https://politics.people.com.cn/n1/2019/0729/c1001-31260207.html": "http://politics.people.com.cn/n1/2019/0729/c1001-31260207.html",
  "https://www.mod.gov.cn/gfbw/gfjy_index/js_214151/4850739.html": "http://www.mod.gov.cn/gfbw/gfjy_index/js_214151/4850739.html",
  "https://www.81.mil.cn/yljnt_208627/lsda_208656/16444784.html": "http://www.81.mil.cn/yljnt_208627/lsda_208656/16444784.html",
  "https://www.81.mil.cn/yw_208727/16343466.html": "http://www.81.mil.cn/yw_208727/16343466.html",
  "https://www.mod.gov.cn/gfbw/gfjy_index/4900398.html": "http://www.mod.gov.cn/gfbw/gfjy_index/4900398.html",
  "https://military.people.com.cn/BIG5/n1/2016/0911/c1011-28706388.html": "http://military.people.com.cn/BIG5/n1/2016/0911/c1011-28706388.html",
  "https://www.81.mil.cn/yljnt_208627/lsda_208656/16452983.html": "http://www.81.mil.cn/yljnt_208627/lsda_208656/16452983.html",
  "https://politics.people.com.cn/n1/2019/0729/c1001-31260730.html": "http://politics.people.com.cn/n1/2019/0729/c1001-31260730.html",
  "https://military.people.com.cn/n1/2017/0915/c1011-29537858-3.html": "http://military.people.com.cn/n1/2017/0915/c1011-29537858-3.html",
  "https://dangshi.people.com.cn/n1/2021/0610/c436975-32127243.html": "http://dangshi.people.com.cn/n1/2021/0610/c436975-32127243.html",
  "https://www.mod.gov.cn/gfbw/gfjy_index/zyhd/4843909.html": "http://www.mod.gov.cn/gfbw/gfjy_index/zyhd/4843909.html",
  "https://www.81.mil.cn/zt/2026nzt/gxczjsfjfxzc/spbd_253219/16484692.html": "http://www.81.mil.cn/zt/2026nzt/gxczjsfjfxzc/spbd_253219/16484692.html",
  "https://ccwm.china.com.cn/zhuanti/txt/2016-12/02/content_9197599.htm": "http://ccwm.china.com.cn/zhuanti/txt/2016-12/02/content_9197599.htm",
  "https://www.81.mil.cn/2022zt/2021-10/17/content_10204931.htm": "http://www.81.mil.cn/2022zt/2021-10/17/content_10204931.htm",
  "https://m.chnmuseum.cn/Portals/0/web/zt/20160922longmarch/index.html": "https://www.chnmuseum.cn/Portals/0/web/zt/20160922longmarch/index.html",
  "https://tv.cctv.com/special/CCTV4cz/": "https://tv.cctv.com/2016/10/18/VIDACeMlO5RXolB0xU2uIBTf161018.shtml",
  "https://www.earthdata.nasa.gov/eosdis/science-system-description/eosdis-standard-services/global-imagery-browse-services-gibs": "https://www.earthdata.nasa.gov/gibs"
};
export const canonicalLink=url=>replacements[url]||url;
export const isVerifiedLegacyHttp=url=>url.startsWith('http:')&&Object.values(replacements).includes(url);
export const photoArchiveHref=id=>`./evidence.html?photo=${encodeURIComponent(id)}`;
export const sourceHref=source=>source.id.startsWith('G')||['H37','H43','H64'].includes(source.id)?`./evidence.html?source=${source.id}`:canonicalLink(source.url);
