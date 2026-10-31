/* Node 20+ job: generate immutable weekly AMFL power rankings from Sleeper. */
import fs from 'node:fs/promises';
import vm from 'node:vm';
const api='https://api.sleeper.app/v1';
const leagues={2024:'1137184732384940032',2025:'1257118106497593344',2026:'1386887172610600960'};
const alias={'G-wizz':'Mike',jlong11:'Justin',ryan14cook:'Ryan',ajgardner307:'Andrew',zbautista:'Zach',zbautista13:'Zach',sbautista:'Seth',KEEESHH:'Marcus',iamSeanWard:'Sean',Ko21:'Kody',jgargano:'Joey',KeiganW:'Keigan',jbitner24:'Jacob'};
async function get(path){for(let i=0;i<3;i++){try{const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),14000);try{const r=await fetch(api+path,{signal:ctrl.signal});if(!r.ok)throw new Error(r.status+' '+path);return await r.json()}finally{clearTimeout(timeout)}}catch(e){if(i===2)throw e;await new Promise(resolve=>setTimeout(resolve,(i+1)*750))}}}
const nfl=await get('/state/nfl');
const weeks2026=String(nfl.season)==='2026'?Math.max(0,Math.min(14,(Number(nfl.week)||1)-1)):14;
const seasons=await Promise.all(Object.entries(leagues).map(async([y,id])=>{
 const [users,rosters]=await Promise.all([get('/league/'+id+'/users'),get('/league/'+id+'/rosters')]);
 const byUser=new Map(users.map(u=>[String(u.user_id),u])),names=new Map(rosters.map(r=>{const u=byUser.get(String(r.owner_id))||{};const raw=u.display_name||u.username||'';return [Number(r.roster_id),alias[raw]||alias[u.username]||null]}));
 const maxWeek=Number(y)===2026?weeks2026:14, games=[];
 for(let start=1;start<=maxWeek;start+=7){
  const batches=await Promise.all(Array.from({length:Math.min(7,maxWeek-start+1)},(_,i)=>start+i).map(async week=>({week,matchups:await get('/league/'+id+'/matchups/'+week)})));
  for(const {week,matchups} of batches){
   const grouped=new Map();
   for(const row of matchups){if(row.matchup_id==null)continue;const g=grouped.get(row.matchup_id)||[];g.push(row);grouped.set(row.matchup_id,g)}
   for(const group of grouped.values()){
    if(group.length!==2)continue;const [a,b]=group,nameA=names.get(Number(a.roster_id)),nameB=names.get(Number(b.roster_id));
    if(!nameA||!nameB||nameA===nameB||a.points==null||b.points==null)continue;
    games.push({year:Number(y),week,a:nameA,b:nameB,scoreA:Number(a.points),scoreB:Number(b.points),playoff:false});
   }
  }
 }
 return {year:Number(y),games};
}));
globalThis.window=globalThis;
vm.runInThisContext(await fs.readFile('power-rankings.js','utf8'),{filename:'power-rankings.js'});
const result=globalThis.amflComputePowerRankings(seasons.flatMap(s=>s.games));
if(result.rankings.length===0&&weeks2026>0)throw Error('Missing rankings despite completed weeks; preserving prior snapshot');
result.generatedAt=new Date().toISOString();
result.source='Sleeper API / AMFL official algorithm';
result.coverage=Object.fromEntries(seasons.map(s=>[s.year,s.games.length]));
await fs.writeFile('power-rankings.json',JSON.stringify(result,null,2)+'\n');
console.log('Power rankings published:',result.week,'weeks;',result.rankings.length,'managers;',JSON.stringify(result.coverage));