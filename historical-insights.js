/* Recovered NFL + Sleeper all-game analytics. Loaded after the primary site script. */
(function(){
let loaded=false;
function sameScoredMeeting(a,b){
  if(a.year!==b.year||Math.abs(Number(a.week)-Number(b.week))>1)return false;
  if([a.a,a.b].sort().join('|')!==[b.a,b.b].sort().join('|'))return false;
  if(a.scoreA==null||a.scoreB==null||b.scoreA==null||b.scoreB==null)return false;
  const scores=g=>g.a===a.a?[Number(g.scoreA),Number(g.scoreB)]:[Number(g.scoreB),Number(g.scoreA)];
  const x=scores(a),y=scores(b);
  return Math.abs(x[0]-y[0])<0.001&&Math.abs(x[1]-y[1])<0.001;
}
function deduplicateGames(items){
 const ordered=[...items].sort((a,b)=>Number(String(b.source||'').includes('NFL recap'))-Number(String(a.source||'').includes('NFL recap')));
 const unique=[];
 for(const g of ordered){
   const found=unique.find(x=>sameScoredMeeting(x,g)||(key(x)===key(g)&&x.scoreA==null&&g.scoreA==null));
   if(!found)unique.push(g);
 }
 return unique.sort((a,b)=>a.year-b.year||a.week-b.week);
}
function allGames(){
 return deduplicateGames((typeof ALL_HEAD_TO_HEAD==='undefined'?[]:ALL_HEAD_TO_HEAD).filter(g=>g&&g.a&&g.b&&g.a!==g.b&&g.scoreA!=null&&g.scoreB!=null&&Number.isFinite(Number(g.scoreA))&&Number.isFinite(Number(g.scoreB))));
}
function key(g){return [g.year,g.week,[g.a,g.b].sort().join('|')].join(':')}
function isPlayoff(g){return g.playoff===true||(g.round&&g.round!=='Regular Season'&&g.round!=='Regular season'&&g.round!=='Regular')||Number(g.week)>=15}
function resultsFor(y){return allGames().filter(g=>Number(g.year)===Number(y)).sort((a,b)=>a.week-b.week||a.a.localeCompare(b.a))}
function label(g){return g.round&&g.round!=='NFL archived postseason'?g.round:(isPlayoff(g)?'Postseason':'Regular season')}
function pctDisplay(n){return n.toFixed(1)+'%'}
function recordPanel(title,heads,rows){return panel(title,table(heads,rows.length?rows:[tr(['No scored matchups available yet.'])]))}
function weekPanel(y){const games=resultsFor(y),weeks=[...new Set(games.map(g=>g.week))];let week=window.archiveWeek;if(!weeks.includes(week))week=weeks[0];window.archiveWeek=week;const shown=games.filter(g=>g.week===week);return '<h2 class="sectitle">Week-by-week results · '+y+'</h2><div class="toolbar"><select id="archiveWeekSelect" onchange="window.archiveWeek=Number(this.value);render()">'+weeks.map(w=>'<option value="'+w+'" '+(w===week?'selected':'')+'>Week '+w+'</option>').join('')+'</select></div>'+recordPanel('Week '+(week||'—')+' · '+shown.length+' historical matchups',['Matchup','Score','Winner','Phase'],shown.map(g=>tr([managerLink(g.a)+' vs '+managerLink(g.b),fmt(g.scoreA)+' – '+fmt(g.scoreB),g.winner?managerLink(g.winner):'Tie',esc(label(g))])))+'<p class="muted small">Week scores are from historical NFL recap files and Sleeper matchup API data. Missing archived weeks are omitted, not treated as losses. Postseason placement games may not have an independently verified bracket designation.</p>'}
function scoredWeeks(){return allGames().flatMap(g=>[{name:g.a,opponent:g.b,points:Number(g.scoreA),opp:Number(g.scoreB),year:g.year,week:g.week,post:isPlayoff(g)},{name:g.b,opponent:g.a,points:Number(g.scoreB),opp:Number(g.scoreA),year:g.year,week:g.week,post:isPlayoff(g)}])}
function streaks(){
 const by={};
 for(const x of scoredWeeks().filter(g=>!g.post))(by[x.name]??=[]).push(x);
 const out=[];
 for(const [name,arr] of Object.entries(by)){
   // Unique scored week per manager. A single player cannot have two results in one league week.
   const weeks=new Map();
   for(const g of arr){const k=g.year+':'+g.week;if(!weeks.has(k))weeks.set(k,g)}
   const ordered=[...weeks.values()].sort((a,b)=>a.year-b.year||a.week-b.week);
   let current=0,start=null,previous=null;
   for(const g of ordered){
     const continuous=previous&&g.year===previous.year&&g.week===previous.week+1;
     if(!continuous)current=0;
     if(g.points>g.opp){if(!current)start={year:g.year,week:g.week};current++;out.push({name,n:current,start,end:{year:g.year,week:g.week}})}
     else current=0;
     previous=g;
   }
 }
 return out.sort((a,b)=>b.n-a.n||a.name.localeCompare(b.name));
}
const oldRefresh=refreshHeadToHead;
refreshHeadToHead=function(extra=[]){
  const carry=ALL_HEAD_TO_HEAD.filter(g=>g.year===2026&&String(g.source||'').includes('Sleeper 2026 snapshot'));
  oldRefresh([...carry,...extra]);
  if(!D)return;
  // Reconstructed brackets sometimes use Week 17 for NFL Week 16 recaps.
  // Count these as the same meeting, not two rivalry games.
  const sourceGames=ALL_HEAD_TO_HEAD.filter(g=>String(g.source||'').includes('NFL recap'));
  ALL_HEAD_TO_HEAD=ALL_HEAD_TO_HEAD.filter(g=>!String(g.source||'').includes('Reconstructed from seeds')||!sourceGames.some(n=>n.year===g.year&&n.winner===g.winner&&Math.abs(n.week-g.week)<=1&&[n.a,n.b].sort().join('|')===[g.a,g.b].sort().join('|')));
  ALL_HEAD_TO_HEAD=deduplicateGames(ALL_HEAD_TO_HEAD);
  const indexed=new Map(allGames().map(g=>[key(g),g]));
  for(const m of D.matches){const hit=indexed.get(key(m));if(hit&&m.scoreA==null&&(!m.winner||m.winner===hit.winner)){m.scoreA=m.a===hit.a?hit.scoreA:hit.scoreB;m.scoreB=m.b===hit.b?hit.scoreB:hit.scoreA;m.source=hit.source||'Recovered matchup';if(!m.winner)m.winner=hit.winner}}
  // Remove bracket placeholders whose pairings contradict recorded weekly results.
  // Preserve genuinely missing 2017/2022 title-week fixtures as pending.
  D.matches=D.matches.filter(m=>{
    if(m.year!==2019&&m.year!==2023)return true;
    if(m.scoreA!=null||m.bracket!=='Championship')return true;
    if(m.year===2019&&m.week===15&&[m.a,m.b].sort().join('|')==='Joey|Justin')return false;
    if(m.year===2023&&m.week===15&&(['Kody|Sean','Joey|Zach'].includes([m.a,m.b].sort().join('|'))))return false;
    return true;
  });
  // Actual 2023 first-round pairings are established by scored original recaps.
  if(ALL_HEAD_TO_HEAD.some(g=>g.year===2023&&g.week===15)){
    for(const g of allGames().filter(g=>g.year===2023&&g.week===15)){
      if(![['Joey','Sean'],['Kody','Zach']].some(pair=>pair.sort().join('|')===[g.a,g.b].sort().join('|')))continue;
      if(D.matches.some(m=>key(m)===key(g)))continue;
      D.matches.push({year:2023,week:15,round:'Quarterfinal',bracket:'Championship',a:g.a,b:g.b,teamA:g.teamA||'',teamB:g.teamB||'',winner:g.winner,scoreA:g.scoreA,scoreB:g.scoreB,source:'NFL recap'});
    }
  }
  const existing=new Set(D.matches.map(key));
  for(const g of allGames()){if(Number(g.year)>2023||!isPlayoff(g)||existing.has(key(g))||D.matches.some(m=>m.year===g.year&&m.winner===g.winner&&Math.abs(m.week-g.week)<=1&&[m.a,m.b].sort().join('|')===[g.a,g.b].sort().join('|')))continue;
    D.matches.push({year:g.year,week:g.week,round:'Postseason matchup',bracket:'Recovered',a:g.a,b:g.b,teamA:g.teamA||'',teamB:g.teamB||'',winner:g.winner,scoreA:g.scoreA,scoreB:g.scoreB,source:'Archived recap; bracket classification unverified'});existing.add(key(g))}
  if(activeManager&&page==='managers')showManager(activeManager);
  else if(page==='playoffs'||page==='seasons'||page==='leaders')render();
};
// Keep scored 2026 games in every historical leaderboard even if the live API is unavailable.
const baseMergeLiveIntoHistory=mergeLiveIntoHistory;
mergeLiveIntoHistory=function(snapshot){
  baseMergeLiveIntoHistory(snapshot);
  const seen=[...ALL_HEAD_TO_HEAD];
  const recent=(snapshot?.recent_matchups||[]).filter(g=>g.home&&g.away&&g.home.points!=null&&g.away.points!=null).map(g=>{
    const a=liveName(g.home),b=liveName(g.away),scoreA=Number(g.home.points),scoreB=Number(g.away.points);
    return {year:2026,week:g.week,round:'Regular Season',playoff:false,a,b,teamA:g.home.team_name||'',teamB:g.away.team_name||'',scoreA,scoreB,winner:scoreA>scoreB?a:scoreB>scoreA?b:null,source:'Sleeper 2026 snapshot'};
  });
  refreshHeadToHead([...seen,...recent]);
};
const origSeasons=seasons;
seasons=function(){return origSeasons()+((Number(seasonYear)<=2026)?weekPanel(seasonYear):'')};
const origLeaders=leaders;
Object.assign(metrics,{
  HighScore:"Single-week scoring",Blowout:"Largest blowouts",Streak:"Win streaks",
  Close:"Closest games",LowScore:"Lowest week scores",Hundred:"100+ point weeks",
  OneFifty:"150+ point weeks",TwoHundred:"200+ point weeks",
  AvgPoints:"Average weekly score",Combined:"Combined matchup points"
});
leaders=function(){
  const key=leaderMetric;
  if(!["HighScore","Blowout","Streak","Close","LowScore","Hundred","OneFifty","TwoHundred","AvgPoints","Combined"].includes(key))return origLeaders();
  const games=allGames(),sw=scoredWeeks(),round=n=>Number(n||0).toFixed(2);
  let rows=[],title=metrics[key],subtitle=key==="AvgPoints"?"Career regular-season totals ÷ completed regular-season games, including live 2026":"2015–2026 · regular season and playoffs",columns=[];
  if(key==="HighScore"||key==="LowScore"){
    rows=[...sw].sort((a,b)=>key==="HighScore"?b.points-a.points:a.points-b.points).slice(0,30).map(x=>({Manager:x.name,Opponent:x.opponent,Year:x.year,Week:x.week,Value:x.points}));
    columns=["Manager","Opponent","Year","Week","Points"];
  }else if(key==="Blowout"||key==="Close"||key==="Combined"){
    rows=games.map(g=>({Manager:g.scoreA>=g.scoreB?g.a:g.b,Opponent:g.scoreA>=g.scoreB?g.b:g.a,Year:g.year,Week:g.week,Score:round(g.scoreA)+" – "+round(g.scoreB),Value:key==="Combined"?Number(g.scoreA)+Number(g.scoreB):Math.abs(g.scoreA-g.scoreB)}))
      .sort((a,b)=>key==="Close"?a.Value-b.Value:b.Value-a.Value).slice(0,30);
    columns=["Manager","Opponent","Year","Week","Score",key==="Blowout"?"Margin":key==="Close"?"Difference":"Combined"];
  }else if(key==="Streak"){
    rows=streaks().filter((x,i,a)=>a.findIndex(z=>z.name===x.name)===i).map(x=>({Manager:x.name,From:x.start.year+" W"+x.start.week,Through:x.end.year+" W"+x.end.week,Value:x.n}));
    columns=["Manager","From","Through","Wins"];
    subtitle="Regular season only · missing weeks interrupt streaks";
  }else {
    const per={};
    for(const g of sw){const x=per[g.name]??={Manager:g.name,Weeks:0,Points:0,Hundred:0,OneFifty:0,TwoHundred:0};x.Weeks++;x.Points+=g.points;if(g.points>=100)x.Hundred++;if(g.points>=150)x.OneFifty++;if(g.points>=200)x.TwoHundred++}
    rows=(key==="AvgPoints"?D.totals.filter(x=>x.W+x.L+x.T>0).map(x=>({Manager:x.Manager,Weeks:x.W+x.L+x.T,Value:x.PF/(x.W+x.L+x.T)})):Object.values(per).map(x=>({...x,Value:x[key]}))).sort((a,b)=>b.Value-a.Value);
    columns=["Manager","Weeks",key==="AvgPoints"?"Avg points":"Milestone weeks"];
  }
  const barItems=rows.filter(x=>x.Manager==='Mike'||(D.totals.find(t=>t.Manager===x.Manager)?.Seasons||0)>=4).slice(0,10).map(x=>({...x,Manager:x.Manager+(x.Year?" · "+x.Year+" W"+x.Week:"")}));
  const graph=key==="Close"?barChart(title+" · smallest margins",barItems,x=>Math.max(0.01,5-x.Value),x=>round(x.Value)):barChart(title+" · top 10",barItems,x=>x.Value,x=>key==="Streak"||["Hundred","OneFifty","TwoHundred"].includes(key)?x.Value:key==="AvgPoints"?Number(x.Value).toFixed(3):round(x.Value));
  let activePanel='';
  if(key==='Streak'){
    const current=allGames().filter(g=>g.year===2026&&!isPlayoff(g));
    const latest=Math.max(0,...current.map(g=>g.week));
    const byManager={};
    for(const g of current)for(const [manager,points,opponentPoints] of [[g.a,g.scoreA,g.scoreB],[g.b,g.scoreB,g.scoreA]]){
      const weeks=byManager[manager]??={};weeks[g.week]=Number(points)>Number(opponentPoints);
    }
    const active=Object.entries(byManager).map(([manager,weeks])=>{
      let wins=0;for(let w=latest;w>=1&&weeks[w]===true;w--)wins++;
      return {Manager:manager,Value:wins};
    }).filter(x=>x.Value>0).sort((a,b)=>b.Value-a.Value||a.Manager.localeCompare(b.Manager));
    activePanel=panel('🔥 Active 2026 win streaks · through Week '+latest,table(['Manager','Consecutive wins'],active.map(x=>tr([managerLink(x.Manager),'<strong>'+x.Value+'</strong>']))));
  }
  const valueCell=x=>key==="Streak"||["Hundred","OneFifty","TwoHundred"].includes(key)?x.Value:key==="AvgPoints"?Number(x.Value).toFixed(3):round(x.Value);
  const data=rows.map((x,i)=>tr([i+1,...columns.map((col,j)=>col==="Manager"?managerLink(x.Manager):j===columns.length-1?'<strong>'+valueCell(x)+'</strong>':esc(x[col]??"—"))]));
  return '<h2 class="sectitle">The Receipt Board · All-Time Leaderboards</h2><div class="tabs">'+Object.entries(metrics).map(([k,v])=>'<button class="'+(key===k?'on':'')+'" onclick="leaderMetric=\''+k+'\';render()">'+esc(v)+'</button>').join('')+'</div>'+activePanel+graph+panel(title+' leaderboard',table(['#',...columns],data))+'<p class="muted small">'+subtitle+'. Historical gaps may affect rankings; only scored matchups are counted.</p>';
};
const origPlayoffs=playoffs;
playoffs=function(){
 const y=Number(playoffYear);let html=origPlayoffs();
 if(y<=2023)html=html.replace('</select></div><div class="banner"','<option '+(playoffBracket==='Recovered'?'selected':'')+'>Other postseason</option></select></div><div class="banner"');
 if(y>2023)return html;
 const scored=resultsFor(y).filter(isPlayoff);
 const scoreboard=scored.length?recordPanel('Postseason scoreboard · '+scored.length+' scored games',['Week','Matchup','Score','Winner'],scored.map(g=>tr([g.week,managerLink(g.a)+' vs '+managerLink(g.b),fmt(g.scoreA)+' – '+fmt(g.scoreB),g.winner?managerLink(g.winner):'Tie'])))+'<p class="muted small">Scoreboard includes all archived postseason matchups. Bracket designation may be uncertain for some historical placement or consolation games.</p>':'<p class="muted small">No postseason scores for this season.</p>';
 const consolation=resultsFor(y).filter(g=>isPlayoff(g)&&!D.matches.some(m=>m.year===g.year&&m.week===g.week&&key(m)===key(g)&&m.bracket==='Championship'));
 if(playoffBracket==='Consolation'&&!consolation.length)return html.replace('Consolation outcomes are not available for ESPN seasons 2015–2023.','No independently identified consolation bracket matchups for this season; postseason games (including possible placement games) appear in the scoreboard below.')+scoreboard;
 const replaced=html.replace('2015–2023 championship bracket outcomes are reconstructed from original playoff seeds, league bracket rules, and final placements; game scores were not supplied.','2015–2023 championship pairings are reconstructed from seeds and placements; matching scores are now drawn from archived NFL recaps wherever available. Consolation and placement matches have not been independently verified by bracket.');
 return replaced+scoreboard;
};
window.historicalRecordBook={get allGames(){return allGames()},get seasonCounts(){return Object.fromEntries([...new Set(allGames().map(g=>g.year))].map(y=>[y,resultsFor(y).length]))}};
})();