/* Weekly Game of the Week and manager matchup spotlights. */
(function(){
const LEAGUE='1386887172610600960', API='https://api.sleeper.app/v1';
let ready=false,matchups=[],error='';
const alias={'G-wizz':'Mike',jlong11:'Justin',ryan14cook:'Ryan',ajgardner307:'Andrew',zbautista:'Zach',zbautista13:'Zach',sbautista:'Seth',KEEESHH:'Marcus',iamSeanWard:'Sean',Ko21:'Kody',jgargano:'Joey',KeiganW:'Keigan',jbitner24:'Jacob'};
const label=x=>String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function snapshot(){return typeof LIVE!=='undefined'&&LIVE&&LIVE.season===2026?LIVE:null}
function info(){const live=snapshot(),stand=live?.standings||[];return new Map(stand.map(r=>[alias[r.username]||r.username,r]))}
function topGame(week){const list=matchups.filter(x=>x.week===week),by=info();return [...list].sort((x,y)=>score(y,by)-score(x,by))[0]}
function score(x,by){const a=by.get(x.a),b=by.get(x.b);if(!a||!b)return 0;const wa=+a.wins||0,wb=+b.wins||0;return (wa+wb)*4-Math.abs(wa-wb)*5+Math.min(+a.points_for||0,+b.points_for||0)/500}
function pastMeeting(x){return (snapshot()?.recent_matchups||[]).find(g=>[alias[g.home?.username]||g.home?.username,alias[g.away?.username]||g.away?.username].sort().join('|')===[x.a,x.b].sort().join('|'))}
function motivation(x,by,focus){
 const a=by.get(x.a),b=by.get(x.b),p=pastMeeting(x);
 const delta=Math.abs((+a?.wins||0)-(+b?.wins||0));
 const recordA=(a?.wins??'—')+'–'+(a?.losses??'—'),recordB=(b?.wins??'—')+'–'+(b?.losses??'—');
 const winner=p?(alias[p.winner?.username]||p.winner?.username):null;
 const foe=focus?(x.a===focus?x.b:x.a):null;
 const head=focus&&winner&&winner!==focus?'Revenge watch: '+winner+' took their last meeting.':winner?'Rematch: '+winner+' won their previous 2026 meeting.':focus?'A chance for '+focus+' to gain ground against '+foe+'.':'Two teams with a lot at stake.';
 const stakes=delta<=1?'A win could decide who holds the higher spot in the standings.':'The higher-ranked manager can protect a lead while the underdog tries to close the gap.';
 return {head,stakes,recordA,recordB};
}
function card(x,kind){
 if(!x)return '<div class="panel"><div class="panelhead">'+label(kind)+'</div><div class="panelbody muted">Upcoming matchups will appear once Sleeper publishes the schedule.</div></div>';
 const by=info(),a=by.get(x.a),b=by.get(x.b),why=motivation(x,by,x.focus),aAvg=a?Number(a.points_for)/(Math.max(1,Number(a.wins)+Number(a.losses)+Number(a.ties||0))):null,bAvg=b?Number(b.points_for)/(Math.max(1,Number(b.wins)+Number(b.losses)+Number(b.ties||0))):null;
 const valid=Number.isFinite(aAvg)&&Number.isFinite(bAvg),max=valid?Math.max(aAvg,bAvg,1):1;
 const bars=valid?'<div style="display:grid;gap:9px;margin:12px 0">'+[[x.a,aAvg],[x.b,bAvg]].map(([n,v])=>'<div><div style="display:flex;justify-content:space-between;gap:12px"><strong>'+label(n)+'</strong><span>'+v.toFixed(1)+' pts/game</span></div><div style="background:var(--line,#334155);border-radius:8px;height:12px;overflow:hidden"><div style="height:100%;width:'+(100*v/max).toFixed(1)+'%;background:#f4bf56;border-radius:8px"></div></div></div>').join('')+'</div>':'';
 const gap=valid?Math.abs(aAvg-bAvg).toFixed(1):'—';
 return '<div class="panel"><div class="panelhead">🏈 '+label(kind)+' · Week '+x.week+'</div><div class="panelbody"><h3 style="margin:0 0 10px">'+label(x.a)+' vs '+label(x.b)+'</h3><p class="muted small">Current records: '+label(x.a)+' '+label(why.recordA)+' · '+label(x.b)+' '+label(why.recordB)+'</p>'+bars+'<p class="muted small">'+(valid?'Season scoring pace differs by '+gap+' points per game. These are actual season averages, not projected matchup scores.':'Current scoring averages unavailable.')+'</p><p><strong>'+label(why.head)+'</strong> '+label(why.stakes)+'</p></div></div>';
}
const originalHome=home;
home=function(){const next=(snapshot()?.completed_weeks||[]).reduce((a,x)=>Math.max(a,+x.week||0),0)+1;return (ready?card(topGame(next),'Game of the Week'):'<div class="panel"><div class="panelbody muted">Game of the Week · Loading scheduled matchups…</div></div>')+originalHome()};
const originalShow=showManager;
showManager=function(manager){
 originalShow(manager);
 const currentWeek=(snapshot()?.completed_weeks||[]).reduce((a,g)=>Math.max(a,+g.week||0),0);
 const remaining=matchups.filter(x=>x.week>currentWeek&&(x.a===manager||x.b===manager));
 const by=info(),me=by.get(manager);
 const previous=person=>{const x=remaining.find(g=>g.a===manager?g.b===person:g.a===person);return x};
 // Prefer a revenge match; otherwise the opponent nearest in the standings.
 const ordered=remaining.map(x=>{const foe=x.a===manager?x.b:x.a,op=by.get(foe),p=pastMeeting(x),winner=p?(alias[p.winner?.username]||p.winner?.username):null;return {x,points:(winner&&winner!==manager?100:0)-Math.abs((+me?.wins||0)-(+op?.wins||0))*5-x.week/100}});
 ordered.sort((a,b)=>b.points-a.points);
 const target=ordered[0]?.x;
 if(target)target.focus=manager;
 const area=document.querySelector('#manager-matchup-spotlight');
 if(area)area.innerHTML='<h2 class="sectitle">2026 · Matchup to look forward to</h2>'+card(target,'Matchup to watch');
};
async function get(url){const r=await fetch(API+url);if(!r.ok)throw Error('Sleeper '+r.status);return r.json()}
(async()=>{try{const [users,rosters]=await Promise.all([get('/league/'+LEAGUE+'/users'),get('/league/'+LEAGUE+'/rosters')]);const byUser=new Map(users.map(u=>[String(u.user_id),u]));const byRoster=new Map(rosters.map(r=>{const u=byUser.get(String(r.owner_id))||{};const raw=u.display_name||u.username||'';return [+r.roster_id,alias[raw]||alias[u.username]||raw]}));const last=Math.max(0,...(snapshot()?.completed_weeks||[]).map(x=>+x.week||0));const weeks=await Promise.all(Array.from({length:Math.max(0,14-last)},(_,i)=>last+i+1).map(async week=>{try{return {week,rows:await get('/league/'+LEAGUE+'/matchups/'+week)}}catch(e){return {week,rows:[]}}}));for(const {week,rows} of weeks){const groups=new Map();for(const row of rows){if(row.matchup_id==null)continue;const pair=groups.get(row.matchup_id)||[];pair.push(row);groups.set(row.matchup_id,pair)}for(const pair of groups.values()){if(pair.length!==2)continue;const a=byRoster.get(+pair[0].roster_id),b=byRoster.get(+pair[1].roster_id);if(a&&b&&a!==b)matchups.push({week,a,b})}}ready=true;if(typeof page!=='undefined'&&D){if(page==='home')render();else if(page==='managers'&&activeManager)showManager(activeManager)}}catch(e){error=String(e);ready=true;if(typeof page!=='undefined'&&page==='home'&&D)render()}})();
})();