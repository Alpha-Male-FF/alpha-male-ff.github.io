/* Manager transaction awards for Sleeper seasons 2024–2026. */
(function(){
const leagues={2024:'1137184732384940032',2025:'1257118106497593344',2026:'1386887172610600960'};
const aliases={'G-wizz':'Mike',jlong11:'Justin',ryan14cook:'Ryan',ajgardner307:'Andrew',zbautista:'Zach',zbautista13:'Zach',sbautista:'Seth',KEEESHH:'Marcus',iamSeanWard:'Sean',Ko21:'Kody',jgargano:'Joey',KeiganW:'Keigan',jbitner24:'Jacob'};
let result=null,promise=null;
async function get(path){const r=await fetch('https://api.sleeper.app/v1'+path);if(!r.ok)throw Error('Sleeper '+r.status);return r.json()}
async function build(){
 const scores=new Map(),events=[],issues=[];
 await Promise.all(Object.entries(leagues).map(async([year,id])=>{
   try{
    const [users,rosters]=await Promise.all([get('/league/'+id+'/users'),get('/league/'+id+'/rosters')]);
    const usersById=new Map(users.map(u=>[String(u.user_id),u]));
    const namesByRoster=new Map(rosters.map(r=>{const u=usersById.get(String(r.owner_id))||{};const raw=u.display_name||u.username||'';return [Number(r.roster_id),aliases[raw]||aliases[u.username]||raw]}));
    let weeks=17;
    if(+year===2026){
      const known=(typeof LIVE!=='undefined'&&LIVE?.completed_weeks||[]).map(x=>Number(x.week)||0);
      const state=await get('/state/nfl').catch(()=>null);
      weeks=Math.min(17,Math.max(0,...known,Math.max(0,(Number(state?.week)||1)-1)));
    }
    const fetched=await Promise.all(Array.from({length:weeks},(_,i)=>i+1).map(async week=>{
      const [games,tx]=await Promise.all([
       get('/league/'+id+'/matchups/'+week).catch(()=>[]),
       get('/league/'+id+'/transactions/'+week).catch(()=>[])
      ]);
      return {week,games,tx};
    }));
    const seenTx=new Set();
    for(const w of fetched){
      for(const g of w.games){
        for(const [player,score] of Object.entries(g.players_points||{})){
          const key=year+'|'+w.week+'|'+player;
          if(!scores.has(key)&&Number.isFinite(Number(score)))scores.set(key,Number(score));
        }
      }
      for(const t of w.tx){
        if(t.status!=='complete'||!['waiver','free_agent'].includes(t.type))continue;
        const txKey=year+'|'+String(t.transaction_id);
        if(seenTx.has(txKey))continue;
        seenTx.add(txKey);
        for(const kind of ['adds','drops']){
          for(const [player,rosterId] of Object.entries(t[kind]||{})){
            const manager=namesByRoster.get(Number(rosterId));
            if(!manager)continue;
            events.push({year:+year,week:w.week,manager,player,kind:kind==='adds'?'add':'drop',type:t.type});
          }
        }
      }
    }
   }catch(e){issues.push(year+': '+String(e))}
 }));
 const distinct=new Map();
 for(const e of events){
   const k=[e.year,e.manager,e.player,e.week,e.kind].join('|');
   if(!distinct.has(k))distinct.set(k,e);
 }
 const unique=[...distinct.values()];
 let dictionary={};
 try{dictionary=await get('/players/nfl')}catch(e){issues.push('Player names unavailable')}
 const playerName=id=>dictionary[id]?.full_name||[dictionary[id]?.first_name,dictionary[id]?.last_name].filter(Boolean).join(' ')||String(id);
 const grouped={};
 for(const e of unique)(grouped[e.manager]??=[]).push(e);
 const summary={};
 for(const [manager,moves] of Object.entries(grouped)){
   const drops=new Map(),streams=new Map(),bestWaivers=[],worstDrops=[],dropIndex=new Set(),seenAwards=new Set();
   for(const e of moves)if(e.kind==='drop'){
     drops.set(e.player,(drops.get(e.player)||0)+1);
     dropIndex.add([e.year,e.player,e.week+1].join('|'));
   }
   const later=e=>{
     let total=0,measured=0;
     for(let week=e.week+1;week<=17;week++){
       const points=scores.get([e.year,week,e.player].join('|'));
       if(points!=null){total+=points;measured++}
     }
     return measured?Math.round(total*100)/100:null;
   };
   for(const e of moves){
     if(e.kind==='add'&&dropIndex.has([e.year,e.player,e.week+1].join('|'))){
       streams.set(e.player,(streams.get(e.player)||0)+1);
     }
     if(e.kind==='add'&&e.type==='waiver'){
       const pts=later(e);
       if(pts!=null)bestWaivers.push({...e,points:pts});
     }
     if(e.kind==='drop'){
       const awardKey=[e.year,e.manager,e.player].join('|');
       if(seenAwards.has(awardKey))continue;
       seenAwards.add(awardKey);
       const pts=later(e);
       if(pts!=null)worstDrops.push({...e,points:pts});
     }
   }
   const top=map=>[...map].sort((a,b)=>b[1]-a[1])[0];
   const drop=top(drops),stream=top(streams);
   bestWaivers.sort((a,b)=>b.points-a.points);
   worstDrops.sort((a,b)=>b.points-a.points);
   const format=x=>x?{player:playerName(x.player),year:x.year,week:x.week,points:x.points}:null;
   summary[manager]={
     mostDropped:drop?{player:playerName(drop[0]),count:drop[1]}:null,
     mostStreamed:stream?{player:playerName(stream[0]),count:stream[1]}:null,
     bestWaiver:format(bestWaivers[0]),worstDrop:format(worstDrops[0]),
     totalDrops:moves.filter(e=>e.kind==='drop').length,
     totalStreams:[...streams.values()].reduce((a,b)=>a+b,0)
   };
 }
 return {summary,issues};
}
const original=playerHighlights;
playerHighlights=function(name){
 const base=original(name);
 if(!promise)promise=build().then(x=>{result=x;if(typeof page!=='undefined'&&page==='managers'&&activeManager)showManager(activeManager)}).catch(e=>{result={summary:{},issues:[String(e)]}});
 const x=result?.summary?.[name];
 const cell=(heading,value)=>'<div class="stat"><strong style="font-size:16px">'+esc(value||'—')+'</strong><span>'+esc(heading)+'</span></div>';
 const body=x?'<div class="stats">'+
   cell('Most dropped',x.mostDropped?x.mostDropped.player+' · '+x.mostDropped.count:'—')+
   cell('Most streamed',x.mostStreamed?x.mostStreamed.player+' · '+x.mostStreamed.count:'—')+
   cell('Best waiver pickup',x.bestWaiver?x.bestWaiver.player+' · '+fmt(x.bestWaiver.points)+' pts after claim':'—')+
   cell('Worst drop',x.worstDrop?x.worstDrop.player+' · '+fmt(x.worstDrop.points)+' pts after drop':'—')+
   '</div><p class="muted small">'+x.totalDrops+' drops · '+x.totalStreams+' one-week streams. Post-move points are estimates based on available scored weeks, not a measure of value over replacement.</p>':
   '<p class="muted small">'+(result?'No recorded waiver/drop events for this manager.':'Loading player waiver/drop history…')+'</p>';
 return base+'<h2 class="sectitle">Waiver wire & drops · Sleeper 2024–2026</h2>'+body;
};
})();