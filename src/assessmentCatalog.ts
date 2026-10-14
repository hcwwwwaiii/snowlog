export type AssessmentDefinition={checks:string[];sides:{id:string;label:string}[]};
const edges=[{id:'heel',label:'後刃'},{id:'toe',label:'前刃'}];
const stance=[{id:'regular',label:'正腳（慣用腳在前）'},{id:'switch',label:'反腳（另一隻腳在前）'}];
// Observations for a personal journal, rather than a qualification or lesson syllabus.
// IDs c1–c3 are stable; editing their meaning requires a data migration.
export const assessmentDefinitions:Record<string,AssessmentDefinition>={
 'one-foot':{checks:['單腳推行時能保持平衡','滑行時能把活動腳放回板上並維持方向','能在預定位置減速停下'],sides:[]},
 'heel-edge':{checks:['後刃滑行時能保持平衡','能調整後刃壓力，讓速度慢下來','能在預定位置停下，停下後保持站穩'],sides:[]},
 'toe-edge':{checks:['前刃滑行時能保持平衡','能調整前刃壓力，讓速度慢下來','能在預定位置停下，停下後保持站穩'],sides:[]},
 'falling-leaf':{checks:['能朝選定的一側移動','能減速並換向另一側','左右移動時都能保持同一刃的控制'],sides:[{id:'left',label:'向左移動'},{id:'right',label:'向右移動'}]},
 'j-turn':{checks:['能沿預先選定的方向開始轉彎','能完成轉彎並讓速度下降','前刃與後刃的單次轉彎都能重複做到'],sides:edges},
 'linked-turns':{checks:['前刃與後刃的轉彎能連接起來','連續數個彎後仍能控制速度','能沿選定路線連續轉彎，並停在預定位置'],sides:[{id:'heel-to-toe',label:'後刃轉前刃'},{id:'toe-to-heel',label:'前刃轉後刃'}]},
 'speed-control':{checks:['能按需要改變轉彎路線來調整速度','連續轉彎後不會持續加速','能在預定位置減速或停下'],sides:edges},
 'turn-rhythm':{checks:['數個連續轉彎的節奏大致一致','前刃與後刃的彎形大致對稱','能在維持節奏時控制路線和速度'],sides:edges},
 'carving':{checks:['部分路段能留下清楚、較少側滑的弧線','前刃與後刃都能維持弧線一段距離','能連接弧線，同時保留路線與速度控制'],sides:edges},
 'switch':{checks:['反腳時能保持平衡並控制方向','反腳時能分別完成前刃與後刃轉彎','反腳連續轉彎後仍能減速並停下'],sides:edges},
 'short-turns':{checks:['能在選定的較窄範圍內連續轉彎','前刃與後刃能維持較短的彎形','連續短彎後仍能控制節奏與速度'],sides:edges},
 'variable-snow':{checks:['能辨認並記下本次雪況對滑行的影響','能調整路線或速度，保持平衡','在記錄的雪況中能重複轉彎及停下'],sides:edges},
 'terrain':{checks:['能觀察前方地形並選擇路線','經過熟悉的起伏時仍能保持平衡','通過起伏後能控制方向並減速'],sides:[]},
 'ollie':{checks:['能有意識地完成起跳動作','落地時能保持平衡','落地後能保持方向並減速'],sides:stance},
 'butter':{checks:['能在指定板端維持平衡片刻','能從板端平衡回到穩定滑行','能按預期完成動作，結束後保持控制'],sides:[{id:'nose',label:'板頭平衡'},{id:'tail',label:'板尾平衡'}]},
 'park':{checks:['能寫清楚這次練習的設施及動作','在已熟悉的設施上，進入與離開路線可控','能重複完成這次指定動作，結束後保持平衡'],sides:[]},
};
export type Blocker={id:string;text:string;resolved:boolean;note:string;created_at?:string;resolved_at?:string|null};
export type Assessment={checked:string[];sides:Record<string,number>;conditions:Record<string,string>;blockers:Blocker[]};
export const conditionFields=[
 {id:'slope',label:'坡度',options:['緩坡','中等坡度','較陡坡度','平地／設施區']},
 {id:'snow',label:'雪況',options:['壓雪','鬆雪','硬雪／冰面','濕雪','混合雪況']},
 {id:'speed',label:'速度感受',options:['低速','中速','較快']},
 {id:'stance',label:'站姿',options:['正腳','反腳','兩者都有']},
];
export const sideStatuses=['尚未評估','練習中','偶爾成功','指定條件下穩定'];
export function readAssessment(value:unknown):Assessment{
 const a=value&&typeof value==='object'?value as Partial<Assessment>:{};
 return {checked:Array.isArray(a.checked)?a.checked:[],sides:a.sides&&typeof a.sides==='object'?a.sides:{},conditions:a.conditions&&typeof a.conditions==='object'?a.conditions:{},blockers:Array.isArray(a.blockers)?a.blockers:[]};
}
