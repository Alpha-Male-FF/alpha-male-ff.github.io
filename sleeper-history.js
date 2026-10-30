/* Historical Sleeper matchup loader for 2024 and 2025. */
(function(){
const leagues={2024:"1137184732384940032",2025:"1257118106497593344",2026:"1386887172610600960"};
const aliases={"G-wizz":"Mike",jlong11:"Justin",ryan14cook:"Ryan",ajgardner307:"Andrew",zbautista:"Zach",zbautista13:"Zach",sbautista:"Seth",KEEESHH:"Marcus",iamSeanWard:"Sean",Ko21:"Kody",jgargano:"Joey",KeiganW:"Keigan",jbitner24:"Jacob","G-wizz":"Mike"};
const api="https://api.sleeper.app/v1";
async function get(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),18000);try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw Error("Sleeper "+r.status);return await r.json()}finally{clearTimeout(t)}}
window.loadSleeperHistory=async function(){
 const seasons=await Promise.all(Object.entries(leagues).map(async([year,id])=>{
   const [users,rosters]=await Promise.all([get(api+"/league/"+id+"/users"),get(api+"/league/"+id+"/rosters")]);
   const byUser=new Map(users.map(u=>[String(u.user_id),u]));
   const byRoster=new Map(rosters.map(r=>[Number(r.roster_id),r]));
   const who=(id)=>{const r=byRoster.get(Number(id));if(!r)return null;const u=byUser.get(String(r.owner_id));if(!u)return null;const username=u.display_name||u.username||"";const name=aliases[username]||aliases[u.username]||null;return name?{manager:name,team:(u.metadata&&u.metadata.team_name)||username}:null};
   const games=[];
   const allowedWeeks=Number(year)===2026?Math.max(0,Math.min(18,Number((await get(api+"/state/nfl")).week||1)-1)):17;
   const weeks=await Promise.all(Array.from({length:allowedWeeks},(_,i)=>i+1).map(async week=>{try{return {week,records:await get(api+"/league/"+id+"/matchups/"+week)}}catch(e){return {week,records:[],error:String(e)}}}));
   let failed=0;
   for(const {week,records,error} of weeks){if(error){failed++;continue}const groups=new Map();for(const r of records){if(r.matchup_id==null)continue;let pair=groups.get(r.matchup_id)||[];pair.push(r);groups.set(r.matchup_id,pair)}
    for(const pair of groups.values()){if(pair.length!==2)continue;const [x,y]=pair,a=who(x.roster_id),b=who(y.roster_id);if(!a||!b||a.manager===b.manager||x.points==null||y.points==null)continue;
      const scoreA=Number(x.points),scoreB=Number(y.points);
      games.push({year:Number(year),week,round:week<=14?"Regular Season":"Sleeper postseason",a:a.manager,b:b.manager,teamA:a.team,teamB:b.team,scoreA,scoreB,winner:scoreA>scoreB?a.manager:scoreB>scoreA?b.manager:null,source:"Sleeper API",playoff:week>=15})
    }
   }
   return {year:Number(year),games,failedWeeks:failed};
 }));
 return {games:seasons.flatMap(s=>s.games),seasons};
};
})();