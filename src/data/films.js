// Official viewing pages, not copied video files. Publication years belong to
// the programmes and are deliberately separate from the 1934–1936 map clock.
import {canonicalLink} from '../lib/sourceLinks.js';
export const filmSources=[
 {id:'H82',title:'《翻开这一页》第1季正版选集',publisher:'哔哩哔哩番剧',date:'2014年作品 · 2026-10-23核对',url:'https://www.bilibili.com/bangumi/media/md289126560',supports:'第一季正版26话目录，作为长征文学故事的补充查阅入口。平台通用集序与央视篇目目录分别记录，不强行对应。'},
 {id:'H78',title:'八集纪录片《长征》官方选集',publisher:'央视网 · CCTV节目官网',date:'2016年',url:'https://tv.cctv.com/special/CCTV4cz/',supports:'八集纪录片的官方目录，包括《伟大转折》《战史奇观》《民心所向》《跨越极限》《百川归海》《永远长征》；作为地图主线的延伸观看。'},
 {id:'H79',title:'六集大型电视专题片《长征之歌》及官方点播',publisher:'中央广播电视总台 · 央视网',date:'2023-01-11',url:'https://news.cctv.cn/special/czzg/czzg/index.shtml',supports:'六集专题片的节目性质、文物保护与当代传承主题；第一集完整版与三分钟速览作为实物、遗址和公共记忆的延伸观看。'},
 {id:'H80',title:'在纪念红军长征胜利80周年大会上的讲话',publisher:'中央网信办（来源：新华社）',date:'2016-10-21',url:'https://www.cac.gov.cn/2016-10/21/c_1119765784.htm',supports:'长征保存革命力量、北上抗日、独立自主与实事求是、紧密团结与依靠人民等历史意义和精神内涵。该文为2016年讲话，90周年当代叙述另据H71、H81。'},
 {id:'H81',title:'赓续长征精神 奋进复兴征程——纪念中国工农红军长征胜利90周年',publisher:'中央广播电视总台 · 央视网',date:'2026年专题',url:'https://news.cctv.cn/special/202609/czsl/index.shtml',supports:'90周年官方影像专题，包含记者再走长征路、纪念活动、文物与沿线地区当代报道；用于2026年回望与传承入口。'},
];
const animation=(id,episode,title,path,storyIds)=>({id,series:'翻开这一页',episode,title,year:2015,kind:'动画演绎',publisher:'央视节目 · 共产党员网展播',url:'https://xuexi.12371.cn/2015/04/03/'+path+'.shtml',sourceIds:['H54'],storyIds,description:'从课本走向画面，循着人物的选择继续理解作品。',linkLabel:'观看这一集'});
export const films=[
 {id:'documentary',series:'长征',title:'八集纪录片官方选集',year:2016,kind:'纪录片 · 全八集',publisher:'央视网',url:'https://tv.cctv.com/special/CCTV4cz/',sourceIds:['H78'],description:'从《伟大转折》《战史奇观》读战略抉择，从《跨越极限》《百川归海》读艰苦跋涉与会师。',linkLabel:'进入央视八集选集'},
 {id:'relics-film',series:'长征之歌',episode:1,title:'让长征文物活起来',year:2023,kind:'电视专题片',publisher:'央视网',url:'https://tv.cctv.com/2023/01/11/VIDEe9hOJrv5bCmJZuSW5R3B230111.shtml',sourceIds:['H79'],description:'从遗址、文物与保护工作，走近长征留下的实物见证。',linkLabel:'观看第一集'},
 {id:'relics-short',series:'长征之歌',title:'让长征文物活起来 · 速览',year:2023,kind:'三分钟速览',publisher:'央视网',url:'https://news.cctv.com/2023/01/11/VIDEZSkWp6yfuAC02PkPViKH230111.shtml',sourceIds:['H79'],description:'用一段短片，连接长征遗存与今天的保护、讲述和学习。',linkLabel:'观看速览短片'},
 {id:'anniversary-film',series:'长征胜利90周年',title:'再走长征路，读懂今天的回响',year:2026,kind:'周年影像专题',publisher:'央视网',url:'https://news.cctv.cn/special/202609/czsl/index.shtml',sourceIds:['H81'],description:'在90周年的影像与采访中，继续阅读沿线山河、英雄记忆和时代变化。',linkLabel:'进入90周年专题'},
 animation('animation-stubborn',3,'倔强的小红军','VIDE1428053406683114',['stubborn-red-soldier']),
 animation('animation-hook',4,'金色的鱼钩','VIDE1428053410940231',['golden-hook']),
 animation('animation-snow',5,'翻越大雪山','VIDE1428053405824991',['jiajin-snow','snow-monument','wang-xinlan']),
 animation('animation-bridge',6,'飞夺泸定桥','VIDE1428053405302978',['luding-bridge']),
 animation('animation-matches',9,'七根火柴','VIDE1428053409293187',['seven-matches']),
 {...animation('animation-rations',14,'一袋干粮','VIDE1428053406264103',[]),relatedStoryIds:['golden-hook','half-belt','straw-sandals'],description:'另一则关于干粮、伤员与互助的动画故事，可与草地给养主题对照阅读。'},
 {...animation('animation-supper',16,'草地晚餐','VIDE1428053411359242',[]),relatedStoryIds:['golden-hook','peng-mule','half-belt'],description:'从另一篇动画作品，继续理解草地行军中的给养与战友情。'},
 {id:'wuhuanxian-film',series:'国家荣光',title:'吴焕先',year:2025,kind:'人物纪实',publisher:'共产党员网 · 央视展播',url:'https://www.12371.cn/2025/03/25/VIDE1742884202186223.shtml',sourceIds:['H43'],storyIds:['sipo'],eventIds:['r25-sipo'],description:'从人物生平读到1935年8月汭河战斗，走近吴焕先的担当与牺牲。',linkLabel:'观看人物纪实'},
 {id:'animation-season',series:'翻开这一页',title:'第一季 · 26集正版选集',year:2014,kind:'正版动画选集',publisher:'哔哩哔哩番剧',url:'https://www.bilibili.com/bangumi/media/md289126560',sourceIds:['H82'],relatedStoryIds:['laoshanjie','snow-monument'],description:'保留第一季完整的正版选集入口，方便继续查找课本故事。平台集序与央视目录分别呈现。',linkLabel:'进入正版选集'},
];
const documentaryEpisodes=[
 ['英雄史诗','2016/10/17/VIDEVKrzxA8VBVFtoNBYXR33161017',['straw-sandals']],
 ['路在何方','2016/10/17/VIDE1YqaEGGaB84cLjc6twF1161017',['yudu-bridge']],
 ['伟大转折','2016/10/18/VIDE5tWwUN21bXt6tG0BfHfU161018',['xiangjiang-rearguard','laoshanjie','zunyi-turn']],
 ['战史奇观','2016/10/18/VIDEtjZa0mceOsuXKb40QLiM161018',['dushu-snow','loushan-pass','jialing-boats','anshunchang-boat','luding-bridge','lazi-climber']],
 ['民心所向','2016/10/19/VIDEnNhwmRppiWtbGFt1iY7U161019',['half-quilt','yihai','wuqi-pot','shigu-boats','sixty-two-coins','ganzi-help']],
 ['跨越极限','2016/10/20/VIDELFIy4qpnE2Rmx27WKtMv161020',['jiajin-snow','snow-monument','wang-xinlan','golden-hook','seven-matches','stubborn-red-soldier','peng-mule','he-bingyan','half-belt']],
 ['百川归海','2016/10/21/VIDEYxwDx2dPT20WCqElC89a161021',['hadapu-paper']],
 ['永远长征','2016/10/22/VIDE5d5zG7hefXPWOCflLvSu161022',[]],
];
films.push(...documentaryEpisodes.map(([title,path,storyIds],index)=>({id:`documentary-${index+1}`,series:'长征',episode:index+1,title,year:2016,kind:'纪录片',publisher:'央视网',url:`https://tv.cctv.com/${path}.shtml`,sourceIds:['H78'],storyIds,description:['回望远征的历史地位与精神财富。','从中央苏区的形势读到战略转移与送别。','从湘江战役、转兵贵州到遵义会议，阅读转折的前后背景。','四渡赤水、独树镇、嘉陵江与大渡河等战斗的相关背景。','从民族政策、群众纪律与沿途支援，阅读军民关系。','从亲历者讲述，阅读雪山草地的处境、照护与互助。','从各路会师与北上方向，阅读不同部队的征途。','把长征的记忆接向后来人的责任与实践。'][index],linkLabel:`观看第${index+1}集`})));
for(const film of films)film.url=canonicalLink(film.url);
for(const source of filmSources)source.url=canonicalLink(source.url);
export const filmById=new Map(films.map(f=>[f.id,f]));
export function recommendedFilms({storyId,tag,eventId,closing=false}={}){
 const direct=films.filter(f=>f.storyIds?.includes(storyId)||f.eventIds?.includes(eventId));
 const ids=closing?['anniversary-film','documentary-8','relics-film']:eventId==='r1-luding'?['animation-bridge','documentary-4']:tag==='雪山草地'?['documentary-6','animation-snow','animation-rations','animation-supper']:tag==='军民同心'?['documentary-5','relics-film']:tag==='浴血奋战'?['documentary-4','documentary-3']:['documentary-3','relics-short'];
 const related=films.filter(f=>f.relatedStoryIds?.includes(storyId));
 return [...new Map([...direct,...related,...ids.map(id=>filmById.get(id))].map(f=>[f.id,f])).values()].slice(0,4);
}
export const significance={
 title:'长征，为什么伟大',date:'1936—2026 · 九十年回望',lead:'从危急关头走向新的起点，从一代人的远征走向几代人的共同记忆。',sourceIds:['H80','H71','H81'],
 sections:[
  ['保存力量，打开革命新局','长征使党和红军走出严峻困境，保存并锻炼了革命力量。抵达陕北和各路会师，为继续发展创造了新的立足点，也把北上抗日的战略转移接向民族解放的进程。'],
  ['立足实际，寻找自己的道路','从遵义会议到此后的机动转战，正确方向是在总结经验、判断实际与反复实践中逐步形成的。独立自主、实事求是，让困难中的抉择成为推动转折的力量。'],
  ['依靠人民，凝聚团结的力量','沿途各族群众提供帮助，红军以纪律和行动回应信任。半条被子、渡河船工、留下的银元，把个人生命与共同事业联系在一起，也让革命的主张走进更多地方。'],
  ['九十周年，把记忆接向今天','2026年纪念长征胜利90周年，回望的意义落在理解与行动：尊重史实，保护遗址与文物，把亲历者的记忆讲给后来人；在自己的学习和工作中踏实面对困难，让合作、责任与求实继续发生。'],
 ],
};
