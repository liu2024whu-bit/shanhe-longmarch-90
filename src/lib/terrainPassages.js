import {terrainLessons} from '../data/campaigns.js';

export function terrainPassages(profileId,profile){
 const lesson=terrainLessons[profileId],snow=profileId==='jiajin';
 const high=profile.samples.reduce((best,s,i)=>s.elevationM>profile.samples[best].elevationM?i:best,0);
 const middle=snow&&high>8&&high<112?high:60;
 const titles=snow?['从河谷，望向高山','风雪之中，彼此照护','越过山岭，走向会合']:['地面平缓，处境艰难','泥水损鞋，脚步不停','分期的征途，共同的相扶'];
 const tags=snow?[['陡坡','高寒','缺氧'],['御寒准备','搜寻掉队','宣传与照护'],['分批翻越','1935年6月','达维会合']]:[['积水','泥沼','风雨'],['草鞋','伤脚','组织互助'],['给养','不同部队','不同年份']];
 return [0,middle,120].map((sampleIndex,i)=>({index:i,sampleIndex,title:titles[i],text:lesson.sections[i][1],tags:tags[i],sourceIds:lesson.sourceIds}));
}
export function passageAtSample(passages,index){
 if(index<(passages[0].sampleIndex+passages[1].sampleIndex)/2)return passages[0];
 if(index<(passages[1].sampleIndex+passages[2].sampleIndex)/2)return passages[1];
 return passages[2];
}
