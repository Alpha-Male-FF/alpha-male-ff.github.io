/* Recovered NFL + Sleeper all-game analytics. Loaded after the primary site script. */
(function(){
let loaded=false;
function allGames(){return (typeof ALL_HEAD_TO_HEAD==='undefined'?[]:ALL_HEAD_TO_HEAD).filter(g=>g&&g.a&&g.b&&g.a!==g.b&&Number.isFinite(Number(g.scoreA))&&Number.isFinite(Number(g.scoreB))&&g.scoreA!==null&&g.scoreB!==null)}
function key(g){return [g.year,g.week,[g.a,g.b].sort().join('|')].join(':')}
function isPlayoff(g){return g.playoff===true||(g.round&&g.round!=='Regular Season'&&g.round!=='Regular season'&&g.round!=='Regular')||Number(g.week)>=15}
function resultsFor(y){return allGames().filter(g=>Number(g.year)===Number(y)).sort((a,b)=>a.week-b.week||a.a.localeCompare(b.a))}
function label(g){return g.round&&g.round!=='NFL archived postseason'?g.round:(isPlayoff(g)?'Postseason':'Regular season')}
function pctDisplay(n){return n.toFixed(1)+'%'}
function recordPanel(title,heads,rows){return panel(title,table(heads,rows.length?rows:[tr(['No scored matchups available yet.'])]))}
function weekPanel(y){const games=resultsFor(y),weeks=[...new Set(games.map(g=>g.week))];let week=window.archiveWeek;if(!weeks.includes(week))week=weeks[0];window.archiveWeek=week;const shown=games.filter(g=>g.week===week);return '<h2 class="sectitle">Week-by-week results · '+y+'</h2><div class="toolbar"><select id="archiveWeekSelect" onchange="window.archiveWeek=Number(this.value);render()">'+weeks.map(w=>'<option value="'+w+'" '+(w===week?'selected':'')+'>Week '+w+'</option>').join('')+'</select></div>'+recordPanel('Week '+(week||'—')+' · '+shown.length+' recovered matchups',['Matchup','Score','Winner','Phase'],shown.map(g=>tr([managerLink(g.a)+' vs '+managerLink(g.b),fmt(g.scoreA)+' – '+fmt(g.scoreB),g.winner?managerLink(g.winner):'Tie',esc(label(g))])))+'<p class="muted small">Week scores are from recovered NFL recap files and Sleeper matchup API data. Missing archived weeks are omitted, not treated as losses. Postseason placement games may not have an independently verified bracket designation.</p>'}
function scoredWeeks(){return allGames().flatMap(g=>[{name:g.a,opponent:g.b,points:Number(g.scoreA),opp:Number(g.scoreB),year:g.year,week:g.week,post:isPlayoff(g)},{name:g.b,opponent:g.a,points:Number(g.scoreB),opp:Number(g.scoreA),year:g.year,week:g.week,post:isPlayoff(g)}])}
function streaks(){const by={};for(const x of scoredWeeks().filter(g=>!g.post))(by[x.name]??=[]).push(x);const out=[];for(const [name,arr] of Object.entries(by)){arr.sort((a,b)=>a.year-b.year||a.week-b.week);let current=0,start=null,previous=null;for(const g of arr){const continuous=previous&&((g.year===previous.year&&g.week===previous.week+1)||(g.year===previous.year+1&&g.week===1));if(!continuous)current=0;if(g.points>g.opp){if(!current)start={year:g.year,week:g.week};current++;out.push({name,n:current,start,end:{year:g.year,week:g.week}})}else current=0;previous=g}}return out.sort((a,b)=>b.n-a.n)}
const oldRefresh=refreshHeadToHead;
refreshHeadToHead=function(extra=[]){
  oldRefresh(extra);
  if(!D)return;
  const indexed=new Map(allGames().map(g=>[key(g),g]));
  for(const m of D.matches){const hit=indexed.get(key(m));if(hit){m.scoreA=m.a===hit.a?hit.scoreA:hit.scoreB;m.scoreB=m.b===hit.b?hit.scoreB:hit.scoreA;m.source=hit.source||'Recovered matchup';if(!m.winner)m.winner=hit.winner}}
  const existing=new Set(D.matches.map(key));
  for(const g of allGames()){if(Number(g.year)>2023||!isPlayoff(g)||existing.has(key(g)))continue;
    D.matches.push({year:g.year,week:g.week,round:'Recovered postseason matchup',bracket:'Recovered',a:g.a,b:g.b,teamA:g.teamA||'',teamB:g.teamB||'',winner:g.winner,scoreA:g.scoreA,scoreB:g.scoreB,source:'Recovered recap; bracket classification unverified'});existing.add(key(g))}
  if(activeManager&&page==='managers')showManager(activeManager);
  else if(page==='playoffs'||page==='seasons'||page==='leaders')render();
};
const origSeasons=seasons;
seasons=function(){return origSeasons()+((Number(seasonYear)<=2025)?weekPanel(seasonYear):'')};
const origLeaders=leaders;
leaders=function(){
  const sw=scoredWeeks(),games=allGames(),win=streaks(),top=[...sw].sort((a,b)=>b.points-a.points).slice(0,20),low=[...sw].sort((a,b)=>a.points-b.points).slice(0,15),
  margins=[...games].map(g=>({g,margin:Math.abs(g.scoreA-g.scoreB),high:g.scoreA>=g.scoreB?g.a:g.b,low:g.scoreA>=g.scoreB?g.b:g.a})).sort((a,b)=>b.margin-a.margin).slice(0,20);
  const close=[...games].map(g=>({g,margin:Math.abs(g.scoreA-g.scoreB)})).sort((a,b)=>a.margin-b.margin).slice(0,15);
  const perYear={};for(const g of sw){const p=perYear[g.year]??=[];p.push(g.points)}
  const yearAvg=Object.entries(perYear).sort((a,b)=>Number(a[0])-Number(b[0]));
  const records='<h2 class="sectitle">Recovered history · single-week records</h2><p class="muted small">2015–2025; regular season plus recovered postseason. Ranked only from scored games. NFL archive gaps affect all-time completeness. Streaks are regular-season only and break at missing weeks; no wins are assumed.</p>'
  +recordPanel('🔥 Highest single-week team scores',['Manager','Opponent','Season','Week','Points','Phase'],top.map(g=>tr([managerLink(g.name),managerLink(g.opponent),g.year,g.week,'<strong>'+fmt(g.points)+'</strong>',g.post?'Postseason':'Regular'])))
  +recordPanel('💥 Biggest recovered blowouts',['Winner','Loser','Season','Week','Score','Margin'],margins.map(x=>tr([managerLink(x.high),managerLink(x.low),x.g.year,x.g.week,fmt(Math.max(x.g.scoreA,x.g.scoreB))+' – '+fmt(Math.min(x.g.scoreA,x.g.scoreB)),'<strong>'+fmt(x.margin)+'</strong>'])))
  +recordPanel('🏆 Longest consecutive regular-season win streaks · recovered',['Manager','Wins','From','Through'],win.filter((g,i)=>win.findIndex(x=>x.name===g.name)===i).slice(0,20).map(g=>tr([managerLink(g.name),'<strong>'+g.n+'</strong>',g.start.year+' W'+g.start.week,g.end.year+' W'+g.end.week])))
  +recordPanel('😬 Lowest single-week team scores',['Manager','Opponent','Season','Week','Points'],low.map(g=>tr([managerLink(g.name),managerLink(g.opponent),g.year,g.week,fmt(g.points)])))
  +recordPanel('🤏 Closest recovered games',['Matchup','Year','Week','Score','Difference'],close.map(x=>tr([managerLink(x.g.a)+' vs '+managerLink(x.g.b),x.g.year,x.g.week,fmt(x.g.scoreA)+' – '+fmt(x.g.scoreB),fmt(x.margin)])))
  +recordPanel('📈 Average points per scored team-week',['Season','Scored team-weeks','Average points'],yearAvg.map(([y,v])=>tr([y,v.length,fmt(v.reduce((a,b)=>a+b,0)/v.length)])));
  return origLeaders()+records;
};
const origPlayoffs=playoffs;
playoffs=function(){
 const y=Number(playoffYear);let html=origPlayoffs();
 if(y<=2023)html=html.replace('</select></div><div class="banner"','<option '+(playoffBracket==='Recovered'?'selected':'')+'>Recovered</option></select></div><div class="banner"');
 if(y>2023)return html;
 const consolation=resultsFor(y).filter(g=>isPlayoff(g)&&!D.matches.some(m=>m.year===g.year&&m.week===g.week&&key(m)===key(g)&&m.bracket==='Championship'));
 if(playoffBracket==='Consolation'&&!consolation.length)return html.replace('Consolation outcomes are not available for ESPN seasons 2015–2023.','No additional recovered postseason games for this season.');
 const replaced=html.replace('2015–2023 championship bracket outcomes are reconstructed from original playoff seeds, league bracket rules, and final placements; game scores were not supplied.','2015–2023 championship pairings are reconstructed from seeds and placements; matching scores are now drawn from archived NFL recaps wherever recovered. Recovered consolation and placement matches have not been independently verified by bracket.');
 return replaced;
};
window.recoveredRecordBook={get allGames(){return allGames()},get seasonCounts(){return Object.fromEntries([...new Set(allGames().map(g=>g.year))].map(y=>[y,resultsFor(y).length]))}};
})();