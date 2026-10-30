(function(){
 const API='https://api.sleeper.app/v1';
 const leagues={2024:'1137184732384940032',2025:'1257118106497593344',2026:'1386887172610600960'};
 const names={'G-wizz':'Mike',jlong11:'Justin',ryan14cook:'Ryan',ajgardner307:'Andrew',zbautista:'Zach',zbautista13:'Zach',sbautista:'Seth',KEEESHH:'Marcus',iamSeanWard:'Sean',Ko21:'Kody',jgargano:'Joey',KeiganW:'Keigan',jbitner24:'Jacob'};
 let ongoing=null;
 async function fetchJson(path){const r=await fetch(API+path);if(!r.ok)throw Error('Sleeper '+r.status);return r.json()}
 async function load(){
  const result={},lookup={},players={};
  const ensure=m=>result[m]??={manager:m,loyalty:new Map(),drafted:new Map(),tradedPlayers:new Map(),partners:new Map(),trades:0};
  try{Object.assign(players,await fetchJson('/players/nfl'))}catch(e){}
  const seasons=await Promise.all(Object.entries(leagues).map(async([year,id])=>{
   try{
    const [users,rosters,drafts]=await Promise.all([fetchJson('/league/'+id+'/users'),fetchJson('/league/'+id+'/rosters'),fetchJson('/league/'+id+'/drafts').catch(()=>[])]);
    const byUser=new Map(users.map(u=>[String(u.user_id),u]));
    const roster=new Map(rosters.map(r=>{const u=byUser.get(String(r.owner_id))||{};const raw=u.display_name||u.username||'';return [Number(r.roster_id),names[raw]||names[u.username]||raw||null]}));
    const weeks=Number(year)===2026?Math.min(18,Math.max(0,(Number((await fetchJson('/state/nfl').catch(()=>({week:8}))).week)||8)-1)):17;
    const payloads=await Promise.all(Array.from({length:weeks},(_,i)=>i+1).map(async week=>({week,match:await fetchJson('/league/'+id+'/matchups/'+week).catch(()=>[]),tx:await fetchJson('/league/'+id+'/transactions/'+week).catch(()=>[])})));
    const seenTrades=new Set();
    for(const w of payloads){
      for(const row of w.match){const manager=roster.get(Number(row.roster_id));if(!manager)continue;
       const p=ensure(manager);for(const player of new Set(row.players||[]))p.loyalty.set(player,(p.loyalty.get(player)||0)+1)}
      for(const t of w.tx){if(t.type!=='trade'||t.status!=='complete'||seenTrades.has(String(t.transaction_id)))continue;seenTrades.add(String(t.transaction_id));
       const parties=[...new Set((t.roster_ids||[]).map(id=>roster.get(Number(id))).filter(Boolean))];
       const moved=[...new Set([...Object.keys(t.adds||{}),...Object.keys(t.drops||{})])];
       for(const manager of parties){const p=ensure(manager);p.trades++;
         for(const other of parties)if(other!==manager)p.partners.set(other,(p.partners.get(other)||0)+1);
         for(const player of moved)p.tradedPlayers.set(player,(p.tradedPlayers.get(player)||0)+1);
       }
      }
    }
    for(const draft of drafts||[]){if(!draft.draft_id)continue;const picks=await fetchJson('/draft/'+draft.draft_id+'/picks').catch(()=>[]);
      for(const pick of picks){let manager=roster.get(Number(pick.roster_id));if(!manager&&pick.picked_by){const u=byUser.get(String(pick.picked_by))||{};manager=names[u.display_name]||names[u.username]||u.display_name||u.username}
      if(manager&&pick.player_id){const p=ensure(manager);p.drafted.set(pick.player_id,(p.drafted.get(pick.player_id)||0)+1)}}
    }
    return {year,status:'ok'};
   }catch(e){return {year,status:String(e)}}
  }));
  const named=id=>{const p=players[id];return p?.full_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||String(id)};
  const top=map=>[...map.entries()].sort((a,b)=>b[1]-a[1])[0];
  const summary={};
  for(const [manager,p] of Object.entries(result)){
   const l=top(p.loyalty),t=top(p.tradedPlayers),d=top(p.drafted),partner=top(p.partners);
   summary[manager]={loyalty:l?{player:named(l[0]),weeks:l[1]}:null,mostTraded:t?{player:named(t[0]),appearances:t[1]}:null,mostDrafted:d?{player:named(d[0]),picks:d[1]}:null,trades:p.trades,partner:partner?{name:partner[0],trades:partner[1]}:null};
  }
  return {managers:summary,seasons,scope:'Sleeper 2024–2026; incomplete API responses may omit records'};
 }
 window.loadLeaguePlayerStats=()=>ongoing??(ongoing=load().catch(e=>({managers:{},error:String(e)})));
})();