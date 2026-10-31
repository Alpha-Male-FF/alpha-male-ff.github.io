/* AMFL power rankings: all-play, MOV-adjusted Elo, scoring, SOS, recent form */
(function(){
let state=null,pending=null;
const htmlEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function compute(games){
 const all=games.filter(g=>!g.playoff&&g.week>=1&&g.week<=14&&g.scoreA!=null&&g.scoreB!=null&&g.a!==g.b).sort((a,b)=>a.year-b.year||a.week-b.week);
 const names=[...new Set(all.flatMap(g=>[g.a,g.b]))],ratings=new Map(names.map(n=>[n,1500])),history=[],weekly=[];
 const keys=[...new Set(all.map(g=>g.year+'-'+g.week))];
 let previous=[];
 for(const key of keys){
  const matches=all.filter(g=>g.year+'-'+g.week===key),year=matches[0].year,week=matches[0].week;
  const weekScores=new Map();
  for(const g of matches){weekScores.set(g.a,Number(g.scoreA));weekScores.set(g.b,Number(g.scoreB))}
  if(weekScores.size<6)continue;
  if(week===1){for(const n of names)ratings.set(n,1500+(ratings.get(n)-1500)*.65)}
  const participants=[...weekScores.keys()],mean=participants.reduce((s,n)=>s+weekScores.get(n),0)/participants.length;
  const records=[];
  for(const name of participants){
   const points=weekScores.get(name),other=participants.filter(n=>n!==name);
   const allPlay=other.reduce((n,m)=>n+(points>weekScores.get(m)?1:points===weekScores.get(m)?.5:0),0);
   const fixture=matches.find(g=>g.a===name||g.b===name),opp=fixture.a===name?fixture.b:fixture.a;
   records.push({year,week,name,points,allPlay,possible:other.length,opp,opponentPoints:weekScores.get(opp),sosAtGame:ratings.get(opp)||1500,eloBefore:ratings.get(name)||1500,mean});
  }
  const delta=new Map();
  for(const g of matches){
    const a=ratings.get(g.a)||1500,b=ratings.get(g.b)||1500,expected=1/(1+10**((b-a)/400));
    const actual=g.scoreA===g.scoreB?.5:g.scoreA>g.scoreB?1:0;
    const margin=Math.abs(g.scoreA-g.scoreB),mov=Math.min(1.7,1+Math.log1p(margin)/8),change=24*mov*(actual-expected);
    delta.set(g.a,(delta.get(g.a)||0)+change);delta.set(g.b,(delta.get(g.b)||0)-change);
  }
  for(const [name,value] of delta)ratings.set(name,(ratings.get(name)||1500)+value);
  for(const r of records){r.eloAfter=ratings.get(r.name);weekly.push(r)}
  history.push({year,week,ratings:Object.fromEntries(participants.map(n=>[n,ratings.get(n)]))});
 }
 const season=2026,seasonRows=weekly.filter(g=>g.year===season),currentWeek=Math.max(0,...seasonRows.map(g=>g.week));
 const currentNames=[...new Set(seasonRows.map(g=>g.name))];
 const result=currentNames.map(name=>{
  const rows=seasonRows.filter(g=>g.name===name),points=rows.reduce((s,x)=>s+x.points,0),n=rows.length;
  const allWon=rows.reduce((s,x)=>s+x.allPlay,0),possible=rows.reduce((s,x)=>s+x.possible,0);
  const expectedWins=rows.reduce((s,x)=>s+x.allPlay/Math.max(1,x.possible),0);
  const wins=rows.reduce((s,x)=>s+(x.points>x.opponentPoints?1:x.points===x.opponentPoints?.5:0),0);
  const sos=rows.reduce((s,x)=>s+x.sosAtGame,0)/n;
  const recent=rows.slice(-3).reduce((s,x)=>s+x.allPlay/Math.max(1,x.possible),0)/Math.min(3,n);
  const ppg=points/n,leagueMean=rows.reduce((s,x)=>s+x.mean,0)/n;
  return {name,games:n,wins,elo:ratings.get(name),allPlayPct:possible?allWon/possible:0,allPlayWon:allWon,allPlayPossible:possible,expectedWins,ppg,sos,recent,scoringRatio:leagueMean?ppg/leagueMean:1};
 });
 if(!result.length)return {week:0,rankings:[],history,notice:'Completed 2026 matchups are not available yet.'};
 const minmax=(x,min,max)=>max>min?(x-min)/(max-min):.5,elos=result.map(x=>x.elo),sosValues=result.map(x=>x.sos);
 for(const r of result){r.components={elo:minmax(r.elo,Math.min(...elos),Math.max(...elos))*30,allPlay:r.allPlayPct*30,scoring:Math.max(0,Math.min(1,(r.scoringRatio-.75)/.5))*20,sos:minmax(r.sos,Math.min(...sosValues),Math.max(...sosValues))*10,recent:r.recent*10};r.rating=Object.values(r.components).reduce((a,b)=>a+b,0)}
 result.sort((a,b)=>b.rating-a.rating);
 const prior=history.filter(x=>x.year===2026&&x.week===currentWeek-1).at(-1);
 for(let i=0;i<result.length;i++){const r=result[i];r.rank=i+1;r.deltaElo=Math.round(r.elo-1500);r.previousElo=prior?.ratings?.[r.name]??null}
 return {week:currentWeek,rankings:result,history,notice:'Calculated from regular-season games (Sleeper 2024–2026). Elo carries across seasons with 35% regression to 1500 at each season start. Ratings are estimates, not Sleeper standings.'};
}
function visual(data){
 if(!data||!data.rankings?.length)return '<div class="panel"><div class="panelbody muted">Power rankings will appear when scored 2026 games are available.</div></div>';
 const leaders=data.rankings,up=[...leaders].sort((a,b)=>(b.elo-(b.previousElo??b.elo))-(a.elo-(a.previousElo??a.elo)))[0];
 const bars=r=>'<div style="display:flex;gap:3px;height:8px;border-radius:5px;overflow:hidden;margin-top:7px">'+Object.entries(r.components).map(([k,v],i)=>'<span title="'+htmlEsc(k)+' '+v.toFixed(1)+' pts" style="display:block;width:'+(v/100*100).toFixed(2)+'%;background:'+['#1e64b8','#cf3042','#588fce','#6d55a1','#2fa66a'][i]+'"></span>').join('')+'</div>';
 const rows=leaders.map(r=>'<tr><td>'+r.rank+(r.rankMovement==null?'':' <small style="color:'+(r.rankMovement>0?'#2fa66a':r.rankMovement<0?'#cf3042':'#8193ac')+'">'+(r.rankMovement>0?'▲'+r.rankMovement:r.rankMovement<0?'▼'+Math.abs(r.rankMovement):'—')+'</small>')+'</td><td><button type="button" class="person-link" data-manager="'+htmlEsc(r.name)+'">'+htmlEsc(r.name)+'</button>'+bars(r)+'</td><td><strong>'+r.rating.toFixed(1)+'</strong></td><td>'+Math.round(r.elo)+'</td><td>'+(r.allPlayPct*100).toFixed(1)+'%</td><td>'+r.expectedWins.toFixed(2)+'</td><td>'+r.wins.toFixed(1)+'</td><td>'+r.ppg.toFixed(1)+'</td><td>'+Math.round(r.sos)+'</td></tr>').join('');
 const diffs=leaders.map(r=>({...r,luck:r.wins-r.expectedWins})).sort((a,b)=>a.luck-b.luck);
 const least=diffs[0],most=diffs.at(-1),risers=leaders.filter(r=>r.rankMovement!=null).sort((a,b)=>b.rankMovement-a.rankMovement),riser=risers[0],faller=risers.at(-1);
 const series=leaders.slice(0,5).map((r,i)=>({name:r.name,color:['#cf3042','#246fc5','#2fa66a','#9055b8','#e1a840'][i],pts:data.history.filter(x=>x.year===2026&&x.ratings[r.name]!=null).map(x=>({week:x.week,elo:x.ratings[r.name]}))}));
 const allPts=series.flatMap(s=>s.pts.map(p=>p.elo)),min=Math.min(...allPts,1450)-15,max=Math.max(...allPts,1550)+15,W=700,H=200,x=w=>30+(w-1)/Math.max(1,data.week-1)*640,y=v=>H-18-(v-min)/(max-min)*(H-35);
 const graph='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="2026 Elo trends" style="width:100%;height:auto">'+series.map(p=>'<polyline fill="none" stroke="'+p.color+'" stroke-width="3" points="'+p.pts.map(t=>x(t.week).toFixed(1)+','+y(t.elo).toFixed(1)).join(' ')+'"/>').join('')+'</svg><div style="display:flex;flex-wrap:wrap;gap:12px">'+series.map(p=>'<span style="color:'+p.color+'">● '+htmlEsc(p.name)+'</span>').join('')+'</div>';
 return '<h2 class="sectitle">AMFL Power Rankings · 2026</h2><p class="muted small">Through completed Week '+data.week+'. Tuesday refresh · Elo 30% · All-play 30% · Scoring 20% · Opponent strength 10% · Last 3 weeks 10%.</p>'+
 '<div class="grid2"><div><div class="panel"><div class="panelhead">🏆 Top power rating</div><div class="panelbody"><strong>'+htmlEsc(leaders[0].name)+'</strong> · '+leaders[0].rating.toFixed(1)+' / 100</div></div></div><div><div class="panel"><div class="panelhead">⚖️ Schedule luck</div><div class="panelbody">'+htmlEsc(most.name)+' +'+most.luck.toFixed(2)+' wins over expected · '+htmlEsc(least.name)+' '+least.luck.toFixed(2)+' below expected</div></div></div></div>'+
 (riser&&faller?'<p class="muted small">Biggest riser: <strong>'+htmlEsc(riser.name)+'</strong> '+(riser.rankMovement>0?'▲'+riser.rankMovement:'—')+' · Biggest faller: <strong>'+htmlEsc(faller.name)+'</strong> '+(faller.rankMovement<0?'▼'+Math.abs(faller.rankMovement):'—')+'</p>':'')+'<div class="panel"><div class="panelhead">2026 Power Rankings · click a name for profile</div><div class="panelbody"><div class="tablewrap"><table><thead><tr><th>#</th><th>Manager / rating breakdown</th><th>Power /100</th><th>Elo</th><th>All-play</th><th>Exp. W</th><th>Actual W</th><th>Pts/Wk</th><th>SOS Elo</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="muted small">Expected wins = weekly all-play win percentage summed over scored weeks; SOS Elo = opponents’ rating before each game. Higher score indicates stronger performance, not a guaranteed outcome.</p></div></div>'+
 '<div class="panel"><div class="panelhead">Elo rating history · top five</div><div class="panelbody">'+graph+'</div></div><p class="muted small">'+htmlEsc(data.notice||'')+'</p>';
}
window.amflPowerPage=function(){
 if(!state&&!pending){pending=fetch('./power-rankings.json?cache='+Date.now()).then(r=>{if(!r.ok)throw Error('no snapshot');return r.json()}).catch(()=>window.loadSleeperHistory().then(d=>compute(d.games))).then(d=>{state=d;if(typeof page!=='undefined'&&page==='power')render()}).catch(e=>{state={rankings:[],notice:String(e)};if(typeof page!=='undefined'&&page==='power')render()})}
 return state?visual(state):'<h2 class="sectitle">AMFL Power Rankings</h2><div class="panel"><div class="panelbody">Loading Sleeper matchup history and ratings…</div></div>';
};
window.amflComputePowerRankings=compute;
})();