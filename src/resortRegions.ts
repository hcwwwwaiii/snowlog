export type ResortRegion={id:string;name:string;area:'日本'|'大灣區';regions:string[];description:string;longitude:number;latitude:number;labelOffset:[number,number]};
export const resortRegions:ResortRegion[]=[
 {id:'hokkaido',name:'北海道',area:'日本',regions:['北海道'],description:'二世古，面向羊蹄山的滑行日。',longitude:141,latitude:43.4,labelOffset:[26,-12]},
 {id:'tohoku',name:'東北',area:'日本',regions:['東北・岩手'],description:'岩手安比高原，往北安排一趟滑雪之旅。',longitude:140.7,latitude:40,labelOffset:[30,-4]},
 {id:'niigata',name:'新潟',area:'日本',regions:['新潟・湯澤'],description:'GALA 湯澤與苗場，接上新幹線的旅程。',longitude:138.8,latitude:37.7,labelOffset:[38,-6]},
 {id:'nagano',name:'長野',area:'日本',regions:['長野・白馬','長野・野澤'],description:'白馬與野澤溫泉，雪山和小鎮一起安排。',longitude:138,latitude:36.2,labelOffset:[-96,28]},
 {id:'guangzhou',name:'廣州',area:'大灣區',regions:['廣州'],description:'花都熱雪奇蹟，安排一個室內滑行日。',longitude:113.26,latitude:23.13,labelOffset:[25,-14]},
 {id:'shenzhen',name:'深圳',area:'大灣區',regions:['深圳'],description:'前海冰雪世界，週末也能留下雪跡。',longitude:114.06,latitude:22.55,labelOffset:[26,-2]},
 {id:'zhuhai',name:'珠海',area:'大灣區',regions:['珠海'],description:'萬雪匯，把灣區西岸排進滑雪之旅。',longitude:113.58,latitude:22.27,labelOffset:[-94,22]},
];
export const regionForResort=(region:string)=>resortRegions.find(r=>r.regions.includes(region));
