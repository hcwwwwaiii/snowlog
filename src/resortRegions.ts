export type ResortRegion={id:string;name:string;area:'日本'|'大灣區';regions:string[];description:string;longitude:number;latitude:number;labelOffset:[number,number];mapLabel?:[number,number];tone?:string};
export const resortRegions:ResortRegion[]=[
 {id:'hokkaido',name:'北海道',area:'日本',regions:['北海道'],description:'二世古、留壽都、富良野，向北安排山上日常。',longitude:141.3,latitude:43.2,labelOffset:[0,0],mapLabel:[526,112],tone:'#9dbfd2'},
 {id:'tohoku',name:'東北',area:'日本',regions:['東北・岩手','東北・山形'],description:'安比、夏油與藏王，把雪山和溫泉排在一起。',longitude:140.65,latitude:39.7,labelOffset:[0,0],mapLabel:[524,244],tone:'#aac8c5'},
 {id:'niigata',name:'新潟',area:'日本',regions:['新潟・湯澤','新潟・南魚沼'],description:'湯澤與南魚沼，從新幹線接上自己的滑行日。',longitude:139,latitude:37.8,labelOffset:[0,0],mapLabel:[497,340],tone:'#92b6d4'},
 {id:'nagano',name:'長野',area:'日本',regions:['長野・白馬','長野・野澤','長野・志賀'],description:'白馬、野澤與志賀，雪山和小鎮一起安排。',longitude:138,latitude:36.6,labelOffset:[0,0],mapLabel:[160,325],tone:'#9dadc9'},
 {id:'gunma',name:'群馬',area:'日本',regions:['群馬'],description:'丸沼與玉原，安排關東山區的滑行日。',longitude:139.05,latitude:36.8,labelOffset:[0,0],mapLabel:[550,427],tone:'#bdcfa9'},
 {id:'gifu',name:'岐阜',area:'日本',regions:['岐阜'],description:'高鷲與 Dynaland，從中部出發前往奧美濃。',longitude:137,latitude:36,labelOffset:[0,0],mapLabel:[118,428],tone:'#bac9d5'},
 {id:'kansai',name:'關西',area:'日本',regions:['滋賀'],description:'滋賀琵琶湖 Valley，湖畔山上的冬季目的地。',longitude:136.1,latitude:35.3,labelOffset:[0,0],mapLabel:[370,526],tone:'#b9d0c2'},
 {id:'guangzhou',name:'廣州',area:'大灣區',regions:['廣州'],description:'花都熱雪奇蹟，安排一個室內滑行日。',longitude:113.26,latitude:23.13,labelOffset:[25,-14]},
 {id:'shenzhen',name:'深圳',area:'大灣區',regions:['深圳'],description:'前海冰雪世界，週末也能留下雪跡。',longitude:114.06,latitude:22.55,labelOffset:[26,-2]},
 {id:'zhuhai',name:'珠海',area:'大灣區',regions:['珠海'],description:'萬雪匯，把灣區西岸排進滑雪之旅。',longitude:113.58,latitude:22.27,labelOffset:[-94,22]},
];
export const regionForResort=(region:string)=>resortRegions.find(r=>r.regions.includes(region));

