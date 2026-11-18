#!/usr/bin/env python3
"""AMFL's independently calculated analytics. Public Sleeper inputs only."""
import json, math, random, statistics, datetime, pathlib, urllib.request
from concurrent.futures import ThreadPoolExecutor
from analytics_tools import build_tools
ROOT=pathlib.Path(__file__).resolve().parents[1]
API='https://api.sleeper.app/v1'
LEAGUES={2024:'1137184732384940032',2025:'1257118106497593344',2026:'1386887172610600960'}
ALIASES={'G-wizz':'Mike','jlong11':'Justin','ryan14cook':'Ryan','ajgardner307':'Andrew','zbautista13':'Zach','sbautista':'Seth','KEEESHH':'Marcus','iamSeanWard':'Sean','Ko21':'Kody','jgargano':'Joey','KeiganW':'Keigan','jbitner24':'Jacob'}
def get(path):
    with urllib.request.urlopen(API+path,timeout=40) as r:return json.load(r)
def optimal(record, slots, players):
    """Maximum weight assignment; each player and slot can be used once. IR excluded upstream."""
    flex={'FLEX':{'RB','WR','TE'},'SUPER_FLEX':{'QB','RB','WR','TE'},'REC_FLEX':{'WR','TE'},'WRRB_FLEX':{'RB','WR'}}
    dp={0:0.0}; full=(1<<len(slots))-1
    for pid in record.get('players') or []:
        if pid in (record.get('reserve') or []) or pid in (record.get('taxi') or []):continue
        pts=(record.get('players_points') or {}).get(pid)
        positions=set((players.get(pid) or {}).get('fantasy_positions') or [])
        if pts is None or not positions: return None
        nxt=dict(dp)
        for mask,total in dp.items():
            for i,slot in enumerate(slots):
                if not mask&(1<<i) and positions & flex.get(slot,{slot}):
                    key=mask|(1<<i);nxt[key]=max(nxt.get(key,-math.inf),total+float(pts))
        dp=nxt
    return dp.get(full)
def pairs(records):
    groups={}
    for r in records:
        if r.get('matchup_id') is not None:groups.setdefault(r['matchup_id'],[]).append(r)
    return [p for p in groups.values() if len(p)==2]
def calculate(weeks, names, slots, players):
    teams={rid:dict(id=rid,name=name,wins=0,losses=0,ties=0,pf=0,pa=0,scores=[],weeks=[],all_w=0,all_t=0,all_n=0,expected=0,max_pf=0,eff_actual=0,eff_weeks=0,lucky=0,unlucky=0) for rid,name in names.items()}
    records=[]; skipped=[]
    for week,rows in sorted(weeks.items()):
        valid=[r for r in rows if r.get('points') is not None and r['roster_id'] in teams]
        if len(valid)!=len(names) or len(pairs(valid))*2!=len(names):skipped.append(week);continue
        scores=[float(r['points']) for r in valid];median=statistics.median(scores)
        for a,b in pairs(valid):
            for me,opp in [(a,b),(b,a)]:
                t=teams[me['roster_id']];s=float(me['points']);o=float(opp['points']);win=s>o;tie=s==o
                t['wins']+=win;t['losses']+=s<o;t['ties']+=tie;t['pf']+=s;t['pa']+=o;t['scores'].append(s)
                aw=sum(s>x for x in scores);at=sum(s==x for x in scores)-1;n=len(scores)-1
                t['all_w']+=aw;t['all_t']+=at;t['all_n']+=n;t['expected']+=(aw+at/2)/n
                t['lucky']+=win and s<median;t['unlucky']+=s<o and s>median
                best=optimal(me,slots,players)
                # Commissioner overrides cannot be compared to player-level totals.
                starter_total=sum(me.get('starters_points') or [])
                if best is not None and best>0 and abs(starter_total-s)<.02 and best+.02>=s:
                    t['max_pf']+=best;t['eff_actual']+=s;t['eff_weeks']+=1
                t['weeks'].append({'week':week,'score':s,'opponent':names[opp['roster_id']],'against':o,'optimal':best,'result':'W' if win else 'T' if tie else 'L'})
                records.append({'name':t['name'],'week':week,'score':s})
    for t in teams.values():
        n=len(t['scores']);t['games']=n;t['avg']=t['pf']/n if n else None;t['sd']=statistics.pstdev(t['scores']) if n>1 else None
        t['all_play']=(t['all_w']+t['all_t']/2)/t['all_n'] if t['all_n'] else None
        t['schedule_luck']=t['wins']+t['ties']/2-t['expected'];t['median_luck']=t['lucky']-t['unlucky']
        t['efficiency']=t['eff_actual']/t['max_pf'] if t['max_pf'] else None;t['diff']=t['pf']-t['pa']
    return sorted(teams.values(),key=lambda t:(-t['wins']-t['ties']/2,-t['pf'])),records,skipped

def simulate(teams,schedule,runs=10000):
    if not teams or not schedule or any(t['games']<3 for t in teams):return None
    ids=[t['id'] for t in teams];by={t['id']:t for t in teams};rng=random.Random(2026)
    result={i:dict(playoff=0,title=0,bye=0,wins=0,rank=0,finishes=[0]*5) for i in ids}
    # Empirical team scoring model; no proprietary projections, injuries or roster changes.
    def score(i):return round(max(0,rng.gauss(by[i]['avg'],max(15,by[i]['sd'] or 15))),2)
    def duel(a,b):
        sa,sb=score(a),score(b)
        return a if sa>sb or (sa==sb and seeds[a]<seeds[b]) else b
    for _ in range(runs):
        wins={i:by[i]['wins']+by[i]['ties']/2 for i in ids};pf={i:by[i]['pf'] for i in ids}
        for game in schedule:
            a,b=game['a'],game['b'];sa,sb=score(a),score(b);pf[a]+=sa;pf[b]+=sb
            wins[a]+=1 if sa>sb else .5 if sa==sb else 0;wins[b]+=1 if sb>sa else .5 if sa==sb else 0
        order=sorted(ids,key=lambda i:(-wins[i],-pf[i],i));seeds={i:k for k,i in enumerate(order)}
        for k,i in enumerate(order):
            r=result[i];r['wins']+=wins[i];r['rank']+=k+1;r['playoff']+=k<6;r['bye']+=k<2;r['finishes'][4 if k>=6 else 0]+=1
        q1=duel(order[3],order[4]);q2=duel(order[2],order[5]);s1=duel(order[0],q1);s2=duel(order[1],q2);champ=duel(s1,s2)
        for i in [q1,q2,order[0],order[1]]:result[i]['finishes'][0]-=1;result[i]['finishes'][1]+=1
        for i in [s1,s2]:result[i]['finishes'][1]-=1;result[i]['finishes'][2]+=1
        result[champ]['finishes'][2]-=1;result[champ]['finishes'][3]+=1;result[champ]['title']+=1
    for r in result.values():
        for k in ['playoff','title','bye','wins','rank']:r[k]/=runs
        r['finishes']=[v/runs for v in r['finishes']]
    return {'runs':runs,'teams':result,'model':'Historical team scoring, normal distribution, standard deviation floor 15 points. Independent weeks; no injury, bye-week or roster-change adjustments. Seeds use record then total PF. Six-team fixed bracket: 1/4/5 and 2/3/6; top two get byes.'}

def build():
    state=get('/state/nfl');players=get('/players/nfl');seasons=[];tools_seasons=[]
    for year,lid in LEAGUES.items():
        league=get('/league/'+lid)
        if str(league.get('season'))!=str(year):raise ValueError(f'Unexpected season for league {lid}')
        users=get('/league/'+lid+'/users');rosters=get('/league/'+lid+'/rosters');um={u['user_id']:u for u in users}
        names={r['roster_id']:ALIASES.get(um.get(r['owner_id'],{}).get('display_name'),ALIASES.get(um.get(r['owner_id'],{}).get('username'),um.get(r['owner_id'],{}).get('display_name','Unknown'))) for r in rosters}
        start=int(league['settings'].get('playoff_week_start',15));last=start-1
        if str(year)==str(state['season']):last=min(last,int(league['settings'].get('last_scored_leg',0)))
        slots=[s for s in league['roster_positions'] if s not in ['BN','IR']]
        with ThreadPoolExecutor(max_workers=4) as pool:
            weeks=dict(pool.map(lambda w:(w,get(f'/league/{lid}/matchups/{w}')),range(1,last+1)))
        teams,records,skipped=calculate(weeks,names,slots,players)
        schedule=[]
        if str(year)==str(state['season']):
            for w in range(last+1,start):
                for a,b in pairs(get(f'/league/{lid}/matchups/{w}')):schedule.append({'week':w,'a':a['roster_id'],'b':b['roster_id']})
        expected_games=(start-last-1)*len(names)//2
        supported=len(names)==10 and league['settings'].get('playoff_teams')==6 and not league['settings'].get('playoff_seed_type') and not league['settings'].get('playoff_round_type') and not league['settings'].get('divisions')
        forecast=simulate(teams,schedule) if supported and len(schedule)==expected_games and not skipped else None
        seasons.append({'year':year,'league_id':lid,'teams':teams,'records':records,'skipped_weeks':skipped,'schedule':schedule,'forecast':forecast,'last_week':last})
        tools_seasons.append(build_tools(year,lid,league,rosters,names,players,weeks,state,get))
        print(f'{year}: {len(records)} team-weeks; skipped {skipped}; forecast {bool(forecast)}',flush=True)
    output={'updated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'seasons':seasons}
    (ROOT/'analytics-data.json').write_text(json.dumps(output,separators=(',',':'))+'\n')
    (ROOT/'analytics-tools-data.json').write_text(json.dumps({'updated_at':output['updated_at'],'seasons':tools_seasons},separators=(',',':'))+'\n')
if __name__=='__main__':build()
