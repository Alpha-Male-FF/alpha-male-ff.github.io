/* Runtime checks across real snapshot data; browser interactions are checked separately. */
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const base=JSON.parse(fs.readFileSync('analytics-data.json')),tools=JSON.parse(fs.readFileSync('analytics-tools-data.json'));
const research=JSON.parse(fs.readFileSync('research-data.json')),nfl=JSON.parse(fs.readFileSync('nflverse-data.json'));
const nodes=new Map();
function el(key){if(!nodes.has(key))nodes.set(key,{value:key==='#season'?'2026':key==='#manager'?'Seth':'',innerHTML:'',textContent:'',open:false,addEventListener(){},setAttribute(){},querySelectorAll(){return []},insertAdjacentHTML(position,content){this.innerHTML+=content},showModal(){this.open=true},close(){this.open=false},focus(){},classList:{add(){},toggle(){},contains(){return false}}});return nodes.get(key)}
const context={document:{querySelector:el,body:el('body')},localStorage:{getItem(){return null}},fetch:async path=>({ok:true,json:async()=>path.includes('tools-data')?tools:path.includes('research-data')?research:path.includes('nflverse-data')?nfl:base}),console,Date};
vm.createContext(context);vm.runInContext(fs.readFileSync('analytics.js','utf8'),context);vm.runInContext(fs.readFileSync('analytics-tools.js','utf8'),context);vm.runInContext(fs.readFileSync('research-extras.js','utf8'),context);vm.runInContext(fs.readFileSync('research-tools.js','utf8'),context);vm.runInContext(fs.readFileSync('research-ui.js','utf8'),context);
setImmediate(()=>{
 for(const season of base.seasons)for(const team of season.teams)for(const tab of ['overview','power','schedule','bracket','nfl','rosters','trades','calculator','waivers','commissioner','players','utilization','positionsos','compare','format','dashboard']){
  el('#season').value=String(season.year);el('#manager').value=team.name;vm.runInContext(`labTab=${JSON.stringify(tab)};draw()`,context);
  assert.ok(el('#app').innerHTML.length>100,`${season.year} ${team.name} ${tab}`);
  assert.ok(!el('#app').innerHTML.includes('NaN'),`${tab} contains invalid number`);
 }
 const fixture={slots:['RB','FLEX'],profiles:{a:{baseline:20,positions:['RB']},b:{baseline:19,positions:['WR']},c:{baseline:10,positions:['RB']}}};
 context.fixture=fixture;assert.equal(vm.runInContext("assignLineup(fixture,['a','a','b','c']).total",context),39);
 fixture.slots=['QB','RB'];assert.equal(vm.runInContext("assignLineup(fixture,['a','b','c'])",context),null);assert.equal(vm.runInContext("assignLineup(fixture,['a','b','c'],true).total",context),20);assert.equal(vm.runInContext("assignLineup(fixture,['a','b','c'],true).missing.join(',')",context),'QB');
 el('#season').value='2026';vm.runInContext("openPlayer(Object.keys(ts().profiles)[0])",context);assert.ok(el('#playerContent').innerHTML.includes('Weekly scoring'));
 for(const panel of ['teams','qb','targets','matchups','schedule'])vm.runInContext(`nflPanel=${JSON.stringify(panel)};renderNFL(ts())`,context);
 assert.ok(Math.abs(vm.runInContext('chance({avg:140,sd:20},{avg:120,sd:30})+chance({avg:120,sd:30},{avg:140,sd:20})',context)-1)<1e-6);
 vm.runInContext("bracketChoices={q1:bracketState(ts()).q1.b.id}",context);assert.equal(vm.runInContext('bracketState(ts()).s1.b.id',context),vm.runInContext('bracketChoices.q1',context));
 const sum=vm.runInContext('ss().teams.reduce((v,t)=>v+scenarioWins(ts(),t.id,new Map([[ss().teams[0].id,5],[ss().teams[1].id,-5]])),0)',context);assert.ok(Math.abs(sum)<1e-6,'Scenario wins must conserve league wins');
 const sos=vm.runInContext('sosRows(nflYear(),"WR",11,17)',context);assert.equal(sos.length,32);assert.ok(sos.every(r=>r.weeks.length===7));
 assert.ok(vm.runInContext('formatTeams=10;formatQB=1;formatRB=2;formatWR=2;formatTE=1;renderFormat(ts())',context).includes('Points above cutoff'));
 assert.equal(vm.runInContext('new Set(researchGroups.flatMap(g=>g.tools)).size',context),16);
 assert.equal(vm.runInContext('researchGroupFor("calculator").id',context),'manage');
 const roster=vm.runInContext('renderRosters(ts())',context);assert.ok(roster.includes('Starter scoring by slot'));assert.ok(roster.includes('Recent scoring movers'));assert.ok(!roster.includes('Market value'));
 const dots=vm.runInContext('scatterChart(nflYear().players.slice(0,10),"target_share","Fixture")',context);assert.ok(dots.includes('data-dot-name'));assert.ok(dots.includes('tabindex="0"'));
 console.log('Passed all 480 season/manager/tool renders, lineup assignment checks and player profile render.');
});
