const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
function moduleFrom(path,requireModule=()=>{throw Error('unexpected import');}){const exports={};new Function('exports','require',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exports,requireModule);return exports;}
const gear=moduleFrom('src/gearSetup.ts'),prep=moduleFrom('src/preparationData.ts',()=>gear);let id=0;
const original=[{id:'first',text:'Old board name',gearId:'board',checked:true}];
const result=prep.addPackingGear(original,[{id:'board',name:'Renamed board',status:'使用中'},{id:'boots',name:'Boots',status:'使用中'},{id:'boots',name:'Duplicate',status:'使用中'},{id:'old',name:'Retired',status:'已退役'}],()=>String(++id));
assert.equal(original.length,1);assert.equal(result.length,2);assert.equal(result[0].text,'Old board name');assert.equal(result[0].checked,true);assert.equal(result[1].checked,false);assert.equal(result[1].gearId,'boots');
const full=Array.from({length:100},(_,i)=>({id:String(i),text:'Item '+i,gearId:null,checked:false}));assert.equal(prep.addPackingGear(full,[{id:'extra',status:'使用中'}],()=>String(++id)).length,100);
const journals=[{id:'same',date:'2026-11-01'},{id:'a',date:'2026-11-02'},{id:'b',date:'2026-11-02'},{id:'next',date:'2026-11-03'},{id:'future',date:'2026-11-05'}];
const usage=journals.map(j=>({journal_id:j.id,snapshot:{items:[{id:'board'}]}}));
assert.equal(prep.maintenanceUseDays('board','2026-11-01',usage,journals,'2026-11-03'),2);
assert.equal(prep.maintenanceUseDays('board','2026-11-03',usage,journals,'2026-11-03'),0);
assert.equal(prep.maintenanceUseDays('other','2026-11-01',usage,journals,'2026-11-03'),0);
console.log('PASS: packing deduplication/retired exclusion/cap/name preservation and maintenance-day boundaries.');
