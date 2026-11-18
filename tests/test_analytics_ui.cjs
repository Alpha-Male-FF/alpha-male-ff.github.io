/* Runtime checks across real snapshot data; browser interactions are checked separately. */
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const base=JSON.parse(fs.readFileSync('analytics-data.json')),tools=JSON.parse(fs.readFileSync('analytics-tools-data.json'));
const nodes=new Map();
function el(key){if(!nodes.has(key))nodes.set(key,{value:key==='#season'?'2026':key==='#manager'?'Seth':'',innerHTML:'',textContent:'',open:false,addEventListener(){},setAttribute(){},querySelectorAll(){return []},insertAdjacentHTML(position,content){this.innerHTML+=content},showModal(){this.open=true},close(){this.open=false},focus(){},classList:{add(){},toggle(){},contains(){return false}}});return nodes.get(key)}
const context={document:{querySelector:el,body:el('body')},localStorage:{getItem(){return null}},fetch:async path=>({ok:true,json:async()=>path.includes('tools-data')?tools:base}),console,Date};
vm.createContext(context);vm.runInContext(fs.readFileSync('analytics.js','utf8'),context);vm.runInContext(fs.readFileSync('analytics-tools.js','utf8'),context);
setImmediate(()=>{
 for(const season of base.seasons)for(const team of season.teams)for(const tab of ['overview','rosters','trades','calculator','waivers','commissioner','players']){
  el('#season').value=String(season.year);el('#manager').value=team.name;vm.runInContext(`labTab=${JSON.stringify(tab)};draw()`,context);
  assert.ok(el('#app').innerHTML.length>100,`${season.year} ${team.name} ${tab}`);
  assert.ok(!el('#app').innerHTML.includes('NaN'),`${tab} contains invalid number`);
 }
 const fixture={slots:['RB','FLEX'],profiles:{a:{baseline:20,positions:['RB']},b:{baseline:19,positions:['WR']},c:{baseline:10,positions:['RB']}}};
 context.fixture=fixture;assert.equal(vm.runInContext("assignLineup(fixture,['a','a','b','c']).total",context),39);
 fixture.slots=['QB','RB'];assert.equal(vm.runInContext("assignLineup(fixture,['a','b','c'])",context),null);
 el('#season').value='2026';vm.runInContext("openPlayer(Object.keys(ts().profiles)[0])",context);assert.ok(el('#playerContent').innerHTML.includes('Weekly scoring'));
 console.log('Passed all 210 season/manager/tool renders, lineup assignment checks and player profile render.');
});
