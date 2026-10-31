/* Research hub. FantasyPros remains the source for every displayed recommendation. */
(()=>{
let snapshot=null,loadError='',section='power',horizon='ros',team='',sos='RB',nfl='BUF';
const e=x=>String(x??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const horizons={ros:'Rest of season',week:'This week',dyn:'Dynasty',draft:'Draft'};
const sections={power:'Power Rankings',standings:'Projected Standings',players:'Player Rankings & Projections',compare:'Player Comparison',rosters:'Team Rosters',matchups:'Matchup',lineup:'Start / Sit',waivers:'Waivers',trades:'Trades',schedule:'Schedule & Byes',depth:'Depth Charts',injuries:'Injuries & News',draft:'Draft & Keepers',tools:'FantasyPros Tools'};
const table=(heads,rows)=>rows.length?'<div class="panel tablewrap"><table><thead><tr>'+heads.map(x=>'<th scope="col">'+e(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+e(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':'<p class="muted">No data in this snapshot.</p>';
const select=(id,label,options,value)=>'<label>'+e(label)+' <select id="'+id+'">'+Object.entries(options).map(([k,v])=>'<option value="'+e(k)+'"'+(k===value?' selected':'')+'>'+e(v)+'</option>').join('')+'</select></label>';
const names=x=>(x||[]).join(', ');
const link=(label,path)=>'<a href="https://www.fantasypros.com/nfl/'+path+'" target="_blank" rel="noopener">'+e(label)+' ↗</a>';
function refresh(){if(typeof page!=='undefined'&&page==='research')render()}
document.addEventListener('click',event=>{const button=event.target.closest('[data-research]');if(button){section=button.dataset.research;refresh()}});
window.renderResearch=(players,area)=>{
 area.classList.add('fp-research');
 area.innerHTML='<div class="fp-intro"><div><div class="fp-eyebrow">AMFL / DATA LAB</div><h2 class="fp-title">Advanced Research</h2><p class="fp-summary">Explore player rankings, team power, projections and schedule advantages. Every report is sourced from a saved FantasyPros snapshot.</p></div><div class="fp-source">★ FantasyPros Data</div></div><div class="fp-tabs" id="research-tabs" role="group" aria-label="Research sections">'+Object.entries(sections).map(([key,label])=>'<button type="button" data-research="'+key+'" aria-pressed="'+(section===key)+'" class="'+(section===key?'on':'')+'">'+e(label)+'</button>').join('')+'</div>';

 if(section==='players')return false;
 if(!snapshot){area.innerHTML+='<p role="status">'+e(loadError||'Loading league research…')+'</p>';return true}
 area.innerHTML+='<div class="fp-meta"><span>📅 '+e(players.weekly.data_as_of?.nfl_season)+' · Week '+e(players.weekly.data_as_of?.nfl_week)+'</span><span>🔄 Saved '+e(new Date(snapshot.retrieved_at).toLocaleString())+'</span><span>🏈 Standard PPR player data</span><span>👤 Personal advice: '+e(snapshot.user_team)+'</span></div><p class="muted small">Saved results do not update automatically. FantasyPros estimates are not guaranteed outcomes; full custom league scoring is not reflected.</p><div id="research-body"></div>';
 const body=document.getElementById('research-body'),d=snapshot,a=d.analysis[horizon];
 let html='';
 if(section==='power'){
 const ordered=[...a.teams].sort((x,y)=>Number(x.power_rank)-Number(y.power_rank)),top=ordered[0],user=ordered.find(t=>t.is_user_team),userScore=a.league_ranks.find(r=>r.team?.trim()===user?.team_name?.trim())?.score??user?.power_score;
 html='<div class="fp-toolbar">'+select('research-horizon','Ranking horizon',horizons,horizon)+'</div><div class="fp-statgrid"><div class="fp-stat"><span>League leader</span><strong>'+e(top?.team_name)+'</strong></div><div class="fp-stat"><span>Your power rank</span><strong>#'+e(user?.power_rank)+'</strong></div><div class="fp-stat"><span>League teams</span><strong>'+e(a.total_teams)+'</strong></div></div><div class="fp-panel"><div class="fp-panel-title">'+e(horizons[horizon])+' · League power rankings</div><div class="tablewrap"><table><thead><tr><th>Rank</th><th>Team</th><th>Power score</th><th>Comparison</th></tr></thead><tbody>'+ordered.map(t=>{const value=a.league_ranks.find(r=>r.team?.trim()===t.team_name?.trim())?.score??t.power_score;const num=Number(String(value).replace('%',''));return '<tr><td><strong>#'+e(t.power_rank)+'</strong></td><td>'+e(t.team_name)+(t.is_user_team?' ⭐':'')+'</td><td><strong>'+e(value)+'</strong></td><td><div class="fp-rankbar"><span style="width:'+Math.max(0,Math.min(100,Number.isFinite(num)?num:0))+'%"></span></div></td></tr>'}).join('')+'</tbody></table></div></div>';
 html+='<h3>Position strength · '+e(horizons[horizon])+'</h3>'+table(['Team','QB','RB','WR','TE','FLEX','K','DST'],a.teams.map(t=>{const ranks=t.is_user_team?a.user_position_rank:a.opponent_position_ranks[t.team_name]||[];return [t.team_name,...['QB','RB','WR','TE','FLEX','K','DST'].map(p=>ranks.find(r=>r.position===p)?.rank??'—')]}));
 }else if(section==='standings'){
 html='<h3>Projected final regular-season standings</h3><p class="muted">FantasyPros season projections; these do not change with the power-ranking horizon. Odds are estimates, not guarantees.</p>'+table(['Projected finish','Team','Projected W–L–T','Playoff odds','Title odds'],[...d.analysis.ros.teams].sort((a,b)=>a.projected_rank-b.projected_rank).map(t=>[t.projected_rank,t.team_name,[t.projected_wins,t.projected_losses,t.projected_ties].join('–'),t.playoffs_odds,t.championship_odds]));
 }else if(section==='rosters'){
 team=team||d.rosters.teams[0]?.team_id;
 const t=d.rosters.teams.find(t=>t.team_id===team);
 html='<div class="toolbar">'+select('research-team','Team',Object.fromEntries(d.rosters.teams.map(t=>[t.team_id,t.team_name])),team)+'</div>'+table(['Position','Players'],Object.entries(t?.roster||{}).map(([pos,players])=>[pos,names(players)]));
 }else if(section==='matchups'){
 const m=d.matchups;
 html='<h3>'+e(d.user_team)+' · Week '+e(m.week)+'</h3><p>Win probability: '+(m.win_probability==null?'—':e((m.win_probability*100).toFixed(1))+'%')+' · Snapshot status: '+e(m.status)+'</p>'+table(['Team','Record','Scored points','Current projection'],[m.user_lineup,m.opponent_lineup].filter(Boolean).map(t=>[t.team_name,t.record,t.points,t.current_projection]));
 for(const t of [m.user_lineup,m.opponent_lineup].filter(Boolean))html+='<h3>'+e(t.team_name)+' starters</h3>'+table(['Slot','Player','NFL team','Opponent','Original projection','Game status'],(t.starters||[]).map(p=>[p.position,p.full,p.real_team,p.opponent,p.original_proj,p.game_status]));
 }else if(section==='lineup'){
 const l=d.lineup;
 html='<h3>Recommended lineup · '+e(d.user_team)+'</h3>'+table(['Slot','Player','Team','Expert agreement %'],(l.recommended_lineup||[]).map(p=>[p.position,p.player_name,p.player_team,p.percent_of_experts]))+'<h3>Recommended changes</h3>'+table(['Action','Player','Expert agreement %'],[...(l.players_to_start||[]).map(p=>['Start',p.player_name,p.percent_of_experts]),...(l.players_to_sit||[]).map(p=>['Sit',p.player_name,p.percent_of_experts])])+'<p class="muted">Advice only. Review current injury reports and locked games before setting a lineup in Sleeper.</p>';
 }else if(section==='waivers'){
 const w=d.waivers;
 html='<h3>Waiver recommendations · '+e(d.user_team)+'</h3><p class="muted">Source: '+e(w.data_source)+'. '+e((w.limitations||[]).join(' '))+'</p>'+table(['Add','Drop','Reason',w.data_source==='getWaiverPlan'?'Suggested priority value':'Recommendation score'],(w.recommended_adds||[]).map(r=>[r['Player to Add']?.player_name,r['Player to Drop']?.player_name,names(r.Reasons),w.data_source==='getWaiverPlan'?r.priority_value:r.recommendation_score]));
 html+='<h3>Available starts this week</h3>'+table(['Position','Player','Team','Weekly position ECR'],Object.entries(w.top_starts_this_week||{}).flatMap(([pos,rows])=>rows.map(p=>[pos,p.full,p.team,p.ecr])));
 }else if(section==='trades'){
 html='<h3>Suggested trades · '+e(d.user_team)+'</h3><p class="muted">FantasyPros Trade Finder suggestions based on rest-of-season improvement. Confirm a candidate in Trade Analyzer before acting.</p>'+table(['Partner','Send','Receive'],d.trades.moves.map(m=>[m.partner,names(m.send),names(m.receive)]))+'<p>'+link('Open Trade Analyzer','myplaybook/trade-analyzer.php')+'</p>';
 }else if(section==='schedule'){
 const s=d.schedule[sos],rows=s['easiest schedules']?.schedules||[];
 html='<div class="toolbar">'+select('research-sos','Position',Object.fromEntries(Object.keys(d.schedule).map(k=>[k,k])),sos)+'</div><h3>'+e(sos)+' strength of schedule · '+e(s.sos_window?.label)+'</h3><p class="muted">Lower rank and more stars mean easier matchups. DST describes a whole defense.</p>'+table(['Team','Ease rank','Stars / 5','Remaining schedule'],rows.map(t=>{const strength=t['Strength of Schedule']||{};return [t.team,strength[sos.toLowerCase()+'_rank_out_of_32'],strength[sos.toLowerCase()+'_stars_out_of_5'],(t.Matchups||[]).flatMap(m=>Object.entries(m).map(([week,v])=>week+': '+v.matchup)).join(' · ')]}));
 }else if(section==='depth'){
 html='<div class="toolbar">'+select('research-nfl','NFL team',Object.fromEntries(Object.keys(d.depth).map(k=>[k,k])),nfl)+'</div><p class="muted">Position ECR is weekly, or rest of season for teams on bye.</p>'+table(['Position','Depth','Player','Position ECR'],Object.entries(d.depth[nfl]).filter(([,v])=>Array.isArray(v)).flatMap(([pos,rows])=>rows.map(p=>[pos,p.depth,p.playerName,p.ecrRank])));
 }else if(section==='injuries'){
 html='<h3>League roster injury reports</h3><p class="muted">Absence from this feed does not establish health or active roster status.</p>'+table(['Player','Team','Position','Status','Injury','Practice 1','Practice 2','Practice 3','Updated'],d.injuries.practice_details.map(p=>[p.name,p.team_id,p.position_id,p.status,p.injury_type,p.practice_1,p.practice_2,p.practice_3,p.injury_update_date]));
 html+='<h3>Recent FantasyPros player news</h3><ul>'+d.injuries.news.filter(n=>/^https:\/\/www\.fantasypros\.com\//.test(n.url)).map(n=>'<li><a target="_blank" rel="noopener" href="'+e(n.url)+'">'+e(n.player_name)+'</a> · '+e(n.published)+'</li>').join('')+'</ul>';
 }else if(section==='draft'){
 html='<h3>2026 PPR average draft position</h3><p class="muted">Draft market data, not current weekly value. Keeper decisions depend on each player’s cost.</p>'+table(['Rank','Player','Team','Position','ADP','Bye'],d.adp.players.map(p=>[p.rank,p.player_name,p.team,p.position,p.adp,p.bye_week]))+'<p>'+link('Keeper decisions and draft tools','draft/')+'</p>';
 }else if(section==='compare'){
 html='<h3>Compare saved weekly projections</h3><p class="muted">Select up to four players. This compares standard PPR projections; expert start/sit voting is available through FantasyPros.</p><div class="toolbar">'+[0,1,2,3].map(i=>select('research-compare-'+i,'Player '+(i+1),{'':'Choose a player',...Object.fromEntries(players.projections.flatMap(p=>p.projections).map(p=>[p.fpid,p.name+' · '+p.position]))},'')).join('')+'</div><div id="research-comparison"></div>';
 }else{
 html='<h3>FantasyPros football toolbox</h3><p class="muted">These tools open FantasyPros and may require sign-in. Custom analyses run there; saved research appears in the sections above.</p><ul>'+[
 ['League Analyzer','myplaybook/league-analyzer.php'],['Start/Sit Assistant','myplaybook/start-sit-assistant.php'],['Who Should I Start?','start/'],['Waiver Assistant','myplaybook/waiver-assistant.php'],['Trade Analyzer','myplaybook/trade-analyzer.php'],['Trade Finder','myplaybook/trade-finder.php'],['Draft Wizard & Keeper Research','draft/'],['Player Stats','stats/'],['Rankings','rankings/'],['Projections','projections/'],['Depth Charts','depth-charts.php'],['Injury News','injuries.php']].map(([label,path])=>'<li>'+link(label,path)+'</li>').join('')+'</ul>';
 }
 body.innerHTML=html;
 for(const [id,apply] of Object.entries({'research-horizon':v=>horizon=v,'research-team':v=>team=v,'research-sos':v=>sos=v,'research-nfl':v=>nfl=v})){const input=document.getElementById(id);if(input)input.onchange=()=>{apply(input.value);refresh()}}
 for(let i=0;i<4;i++){const input=document.getElementById('research-compare-'+i);if(input)input.onchange=()=>{const ids=[0,1,2,3].map(j=>document.getElementById('research-compare-'+j).value);const rows=players.projections.flatMap(p=>p.projections).filter(p=>ids.includes(String(p.fpid)));document.getElementById('research-comparison').innerHTML=table(['Player','Team','Position','PPR projection','Passing yards','Rushing yards','Receptions','Receiving yards'],rows.map(p=>[p.name,p.team,p.position,p.stats.points_ppr,p.stats.pass_yds,p.stats.rush_yds,p.stats.rec_rec,p.stats.rec_yds]))}}
 return true;
};
fetch('./research-data.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Research snapshot unavailable');return r.json()}).then(d=>{if(d.schema_version!==1||!d.analysis?.ros?.teams)throw Error('Invalid research snapshot');snapshot=d;window.researchSnapshot=d;refresh()}).catch(err=>{loadError=err.message;refresh()});
})();
