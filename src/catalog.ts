export const skillGroups = ["基礎控制", "轉彎與滑行", "刻滑與反腳", "地形與自由式"];
export const statuses = ["未開始", "練習中", "偶爾成功", "指定條件下穩定"];
export const skills = [
  {id:"one-foot",name:"單腳移動",group:0,description:"纜車上下車與平地移動"},
  {id:"heel-edge",name:"後刃控制",group:0,description:"後刃的平衡與速度控制"},
  {id:"toe-edge",name:"前刃控制",group:0,description:"前刃的平衡與速度控制"},
  {id:"falling-leaf",name:"落葉飄",group:0,description:"向兩側移動與控制方向"},
  {id:"j-turn",name:"J-turn",group:1,description:"完成單次轉彎"},
  {id:"linked-turns",name:"連續換刃",group:1,description:"連接前刃與後刃的轉彎"},
  {id:"speed-control",name:"速度控制",group:1,description:"以轉彎形狀調整速度"},
  {id:"turn-rhythm",name:"轉彎節奏",group:1,description:"在熟悉雪道維持流暢節奏"},
  {id:"carving",name:"刻滑 Carving",group:2,description:"記錄刃角、路線與適用雪況"},
  {id:"switch",name:"反腳滑行",group:2,description:"換另一隻腳在前方滑行"},
  {id:"short-turns",name:"短轉彎",group:2,description:"較短半徑的連續轉彎"},
  {id:"variable-snow",name:"不同雪況",group:2,description:"分別記錄軟雪、硬雪等條件"},
  {id:"terrain",name:"起伏地形",group:3,description:"地形變化下的控制與觀察"},
  {id:"ollie",name:"Ollie",group:3,description:"起跳與落地的練習紀錄"},
  {id:"butter",name:"平花 Butter",group:3,description:"板頭板尾平衡與個人練習"},
  {id:"park",name:"Park 基礎",group:3,description:"依課程內容記錄地形公園練習"},
];
export type Row = Record<string, any>;
export type Snapshot = {profile:Row; progress:Row[]; progressHistory?:Row[]; journals:Row[]; trips:Row[]; members:Row[]; sharedJournals:Row[]; resources:Row[]};
export const blankData:Snapshot = {profile:{name:"",stance:"未確定",goal:""},progress:[],progressHistory:[],journals:[],trips:[],members:[],sharedJournals:[],resources:[]};

export function focusSkillIds(data:Snapshot):string[]{return Array.isArray(data.profile.focus_skills)?data.profile.focus_skills.filter((id:string)=>skills.some(s=>s.id===id)).slice(0,3):[];}
