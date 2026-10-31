/* FantasyPros snapshots: no account credentials or league keys in public assets. */
(()=>{
let data=null,error='',mode='weekly',position='ALL',query='',pageNumber=0;
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=document.createElement('button');
button.dataset.page='research';button.textContent='Advanced Research';
button.onclick=()=>setPage('research');
document.getElementById('nav').append(button);
function draw(){
 const area=document.getElementById('content');
 area.innerHTML='<h2 class="sectitle">Advanced Research</h2>';
 if(!data){area.innerHTML+='<p role="status">'+escape(error||'Loading FantasyPros snapshot…')+'</p>';return}
 if(window.renderResearch?.(data,area))return;
 const meta=data.weekly.data_as_of||{};
 const age=Date.now()-Date.parse(data.retrieved_at);
 area.innerHTML+='<p class="muted">PPR · '+escape(meta.nfl_season)+' · Week '+escape(meta.nfl_week)+' · Source date '+escape(meta.date)+'. Snapshot retrieved '+escape(new Date(data.retrieved_at).toLocaleString())+'.</p>'+
 '<p class="muted small">'+(age>7*86400000?'This snapshot is over seven days old. ':'')+'Saved snapshot; rankings and projections do not refresh automatically. Weekly overall rankings use the FantasyPros FLEX pool (RB/WR/TE); QB, K and DST are available under projections. Projections are estimates, not results.</p>'+
 '<div class="fp-toolbar"><select id="fp-mode" aria-label="Data view"><option value="weekly">Weekly FLEX rankings</option><option value="ros">Rest-of-season rankings</option><option value="DRAFT">Draft rankings</option><option value="DYNASTY">Dynasty rankings</option><option value="ROOKIES">Rookie rankings</option><option value="projections">Weekly projections</option></select><select id="fp-position" aria-label="Position">'+['ALL','QB','RB','WR','TE','K','DST'].map(p=>'<option>'+p+'</option>').join('')+'</select><input id="fp-search" type="search" aria-label="Search players or teams" placeholder="Search players or teams"></div><div id="fp-results" aria-live="polite"></div><p class="muted small">Data: <a href="https://www.fantasypros.com/nfl/" target="_blank" rel="noopener">FantasyPros</a>. Standard PPR projections may differ from custom league scoring.</p>';
 const m=document.getElementById('fp-mode'),p=document.getElementById('fp-position'),s=document.getElementById('fp-search');
 m.value=mode;p.value=position;s.value=query;
 m.onchange=()=>{mode=m.value;pageNumber=0;results()};p.onchange=()=>{position=p.value;pageNumber=0;results()};s.oninput=()=>{query=s.value;pageNumber=0;results()};
 results();
}
function results(){
 const projection=mode==='projections';
 let rows=projection?data.projections.flatMap(x=>x.projections||[]):(data[mode]||window.researchSnapshot?.rankings?.[mode]||{}).rankings||[];
 rows=rows.filter(r=>(position==='ALL'||r.position===position)&&[r.name||r.player_name,r.team].join(' ').toLowerCase().includes(query.toLowerCase()));
 rows=[...rows].sort((a,b)=>projection?Number(b.stats?.points_ppr??-Infinity)-Number(a.stats?.points_ppr??-Infinity):Number(a.rank_ecr)-Number(b.rank_ecr));
 const headings=projection?['Player','Team','Position','Projected PPR points']:['Overall rank','Player','Team','Position rank'];
 const html=rows.map(r=>'<tr>'+(projection?[r.name,r.team,r.position,r.stats?.points_ppr==null?'—':Number(r.stats.points_ppr).toFixed(2)]:[r.rank_ecr,r.player_name,r.team,r.pos_rank]).map(x=>'<td>'+escape(x)+'</td>').join('')+'</tr>').join('');
 const count=rows.length,perPage=30,totalPages=Math.max(1,Math.ceil(count/perPage));pageNumber=Math.min(pageNumber,totalPages-1);
 const sliced=rows.slice(pageNumber*perPage,(pageNumber+1)*perPage);
 const body=sliced.map(r=>'<tr>'+(projection?[r.name,r.team,r.position,r.stats?.points_ppr==null?'—':Number(r.stats.points_ppr).toFixed(2)]:[r.rank_ecr,r.player_name,r.team,r.pos_rank]).map(x=>'<td>'+escape(x)+'</td>').join('')+'</tr>').join('');
 document.getElementById('fp-results').innerHTML='<div class="fp-statgrid"><div class="fp-stat"><span>Matching players</span><strong>'+count+'</strong></div><div class="fp-stat"><span>Research view</span><strong>'+escape(document.getElementById('fp-mode')?.selectedOptions?.[0]?.textContent||mode)+'</strong></div><div class="fp-stat"><span>Position</span><strong>'+escape(position)+'</strong></div></div><div class="fp-panel"><div class="fp-panel-title">Player rankings &amp; projections · '+(pageNumber+1)+' / '+totalPages+'</div><div class="tablewrap"><table><thead><tr>'+headings.map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table></div></div><div class="fp-toolbar"><button type="button" class="fp-page-prev" '+(pageNumber===0?'disabled':'')+'>← Previous</button><span class="muted small">Showing '+(count?pageNumber*perPage+1:0)+'–'+Math.min(count,(pageNumber+1)*perPage)+' of '+count+'</span><button type="button" class="fp-page-next" '+(pageNumber===totalPages-1?'disabled':'')+'>Next →</button></div>'+(count?'':'<p class="fp-empty">No players match these filters.</p>');
 const prev=document.querySelector('.fp-page-prev'),next=document.querySelector('.fp-page-next');if(prev)prev.onclick=()=>{pageNumber=Math.max(0,pageNumber-1);results()};if(next)next.onclick=()=>{pageNumber=Math.min(totalPages-1,pageNumber+1);results()};
}
const previousRender=render;
render=function(){if(page!=='research')return previousRender();document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));draw()};
fetch('./fantasypros-data.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('FantasyPros snapshot unavailable');return r.json()}).then(x=>{if(x.schema_version!==1||!x.weekly||!x.ros||!Array.isArray(x.projections))throw Error('Invalid FantasyPros snapshot');data=x;if(page==='research')draw()}).catch(e=>{error=e.message;if(page==='research')draw()});
})();
