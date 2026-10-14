import type {ReactNode} from 'react';
const hints:Record<string,string>={
 'one-foot':'自由腳推進','heel-edge':'腳跟一側立刃','toe-edge':'腳尖一側立刃','falling-leaf':'左右橫移',
 'j-turn':'單次 J 字路線','linked-turns':'前刃、後刃連接','speed-control':'以彎形減速','turn-rhythm':'等距換刃節奏',
 carving:'立刃留下弧線',switch:'交換領先腳','short-turns':'小半徑連續彎','variable-snow':'軟雪與硬雪',
 terrain:'吸收地形起伏',ollie:'板尾蓄力起跳',butter:'板頭、板尾平衡',park:'跳台與箱體地形',
};
function Board({x=0,y=0,angle=0}:{x?:number;y?:number;angle?:number}){return <g transform={`translate(${x} ${y}) rotate(${angle})`}><rect x="-23" y="-6" width="46" height="12" rx="6" className="icon-board"/><path d="M-10-3v6M10-3v6" className="icon-binding"/></g>}
function Rider({x=0,y=0,angle=0}:{x?:number;y?:number;angle?:number}){return <g transform={`translate(${x} ${y}) rotate(${angle})`}><circle cx="0" cy="-28" r="5" className="icon-helmet"/><path d="m0-22-3 12 12 7M-3-10-11 9M9-3 14 9M0-19-14-8M0-19 14-13" className="icon-rider"/><Board y={15}/></g>}
export default function SkillIcon({id}:{id:string}){
 let scene:ReactNode;
 switch(id){
  case 'one-foot':scene=<><Board x={61} y={55}/><path d="M51 47V28l12-5 9 17 16 13M58 26l-4-9M83 55h12M20 55h17m-5-5 5 5-5 5"/><circle cx="55" cy="10" r="5" className="icon-helmet"/><path d="M85 57h12" className="icon-accent"/></>;break;
  case 'heel-edge':scene=<><Board x={60} y={39}/><path d="M41 33h38" className="icon-accent"/><path d="M50 28v-9m-4 5 4-5 4 5M70 28v-9m-4 5 4-5 4 5M36 58h48" className="icon-terrain"/><path d="M49 51 46 58m25-7 3 7"/></>;break;
  case 'toe-edge':scene=<><Board x={60} y={31}/><path d="M41 37h38" className="icon-accent"/><path d="M50 42v10m-4-5 4 5 4-5M70 42v10m-4-5 4 5 4-5M36 65h48" className="icon-terrain"/></>;break;
  case 'falling-leaf':scene=<><path d="M84 12C84 22 30 22 30 33S87 42 87 53 43 61 38 68" className="icon-track"/><Board x={59} y={32} angle={-8}/><path d="m24 29-5 4 5 4M97 49l5 4-5 4M107 12v55m-4-5 4 5 4-5" className="icon-accent"/></>;break;
  case 'j-turn':scene=<><path d="M76 9v35c0 27-37 29-37 7" className="icon-track"/><Board x={75} y={22} angle={90}/><path d="m34 54 5-5 5 5" className="icon-accent"/></>;break;
  case 'linked-turns':scene=<><path d="M47 9C101 9 91 32 60 37S21 67 77 68" className="icon-track"/><Board x={71} y={24} angle={-35}/><Board x={48} y={54} angle={35}/><path d="m78 64 6 4-6 4" className="icon-accent"/></>;break;
  case 'speed-control':scene=<><path d="M69 9C101 24 18 29 37 46S89 65 65 72" className="icon-track"/><Board x={44} y={44} angle={-8}/><path d="M91 18h15M91 26h10M91 34h5M23 62h10m-5-4 5 4-5 4" className="icon-accent"/></>;break;
  case 'turn-rhythm':scene=<><path d="M60 8c42 0 42 20 0 20s-42 20 0 20 42 20 0 20" className="icon-track"/><path d="M20 18h8M20 38h8M20 58h8" className="icon-accent"/><circle cx="24" cy="18" r="2"/><circle cx="24" cy="38" r="2"/><circle cx="24" cy="58" r="2"/><Board x={74} y={55} angle={35}/></>;break;
  case 'carving':scene=<><path d="M12 68C33 36 72 37 107 57M12 74C34 42 75 43 107 63" className="icon-track"/><Rider x={68} y={33} angle={-28}/><path d="m93 50 10 7-12 1" className="icon-accent"/></>;break;
  case 'switch':scene=<><Board x={60} y={29}/><Board x={60} y={57}/><circle cx="50" cy="29" r="3" className="icon-accent-fill"/><circle cx="70" cy="57" r="3" className="icon-accent-fill"/><path d="M86 29h16m-5-5 5 5-5 5M34 57H18m5-5-5 5 5 5M56 41h8" className="icon-accent"/></>;break;
  case 'short-turns':scene=<><path d="M60 8c24 0 24 13 0 13s-24 13 0 13 24 13 0 13-24 13 0 13 24 13 0 13" className="icon-track"/><path d="M30 8v65M90 8v65" className="icon-guide"/><Board x={64} y={38} angle={-35}/></>;break;
  case 'variable-snow':scene=<><path d="M17 57h37M19 63h34M65 59q7-15 14 0t14 0 12 0" className="icon-terrain"/><path d="M61 17v49" className="icon-guide"/><Board x={36} y={36} angle={-18}/><path d="M81 15v15m-7-11 14 8m0-8-14 8" className="icon-accent"/></>;break;
  case 'terrain':scene=<><path d="M9 67q16-25 31-7t29-5 40 9" className="icon-terrain"/><Rider x={62} y={34} angle={-8}/><path d="M97 25v22m-4-5 4 5 4-5M97 25l-4 5m4-5 4 5" className="icon-accent"/></>;break;
  case 'ollie':scene=<><path d="M13 68h96" className="icon-terrain"/><Rider x={64} y={29} angle={-12}/><path d="M28 60q-7-15 3-27m-6 2 6-2 1 7M80 57l9 7M79 63l6 7" className="icon-accent"/></>;break;
  case 'butter':scene=<><path d="M13 68h94" className="icon-terrain"/><Rider x={62} y={35} angle={-18}/><circle cx="86" cy="62" r="4" className="icon-accent-fill"/><path d="M26 52c-5-17 4-30 17-34m-4-3 4 3-2 6" className="icon-accent"/></>;break;
  case 'park':scene=<><path d="M10 69h26l13-13h39v13h21M49 56v13M39 69h40" className="icon-terrain"/><Rider x={61} y={22} angle={-7}/><path d="M17 44q15-28 31-29m-7-2 7 2-4 5" className="icon-accent"/></>;break;
  default:scene=<Board x={60} y={40}/>;
 }
 return <div className="skill-symbol"><svg viewBox="0 0 120 80" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{scene}</svg><span className="skill-icon-hint">{hints[id]}</span></div>;
}
