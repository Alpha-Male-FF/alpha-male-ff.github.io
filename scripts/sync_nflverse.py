#!/usr/bin/env python3
"""Download nflverse official weekly-player and schedule releases; publish bounded derived research.
Source: nflverse/nflverse-data (CC BY 4.0). No projections or trade-value data.
"""
import csv,datetime,io,json,pathlib,urllib.request,collections,re
from concurrent.futures import ThreadPoolExecutor
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE='https://github.com/nflverse/nflverse-data/releases/download/'
def download(url):
    with urllib.request.urlopen(url,timeout=60) as r:return r.read().decode('utf-8-sig')
def number(row,key):
    try:return float(row.get(key,''))
    except (TypeError,ValueError):return None
def norm(name):return re.sub(r"[^a-z0-9]", "", name.lower()).removesuffix("iii").removesuffix("jr")
def aggregate(year,rows,games,snaps=None):
    rows=[r for r in rows if r['season_type']=='REG' and int(r['season'])==year]
    schedule=[g for g in games if g['season']==str(year) and g['game_type']=='REG'];teams={}
    for g in schedule:
        for team in [g['away_team'],g['home_team']]:teams.setdefault(team,dict(team=team,games=0,wins=0,losses=0,ties=0,pf=0,pa=0,epa=None,epa_allowed=None,allowed={p:0 for p in ['QB','RB','WR','TE']}))
        home,away=number(g,'home_score'),number(g,'away_score')
        if home is None or away is None:continue
        for team,pf,pa in [(g['home_team'],home,away),(g['away_team'],away,home)]:
            t=teams[team];t['games']+=1;t['wins']+=pf>pa;t['losses']+=pf<pa;t['ties']+=pf==pa;t['pf']+=pf;t['pa']+=pa
    snap_index=collections.defaultdict(list)
    for snap in snaps or []:
        if snap.get('game_type')=='REG':snap_index[(norm(snap['player']),snap['team'],int(snap['week']))].append(snap)
    players={};team_rushes=collections.Counter();team_targets=collections.Counter();team_epa=collections.defaultdict(list);def_epa=collections.defaultdict(list);allowed=collections.Counter()
    fields=['attempts','sacks_suffered','passing_yards','passing_tds','passing_interceptions','passing_epa','targets','receptions','receiving_yards','receiving_tds','receiving_air_yards','carries','rushing_yards','rushing_tds','fantasy_points_ppr']
    for row in rows:
        team=row.get('team') or row.get('recent_team');opponent=row.get('opponent_team');key=(row['player_id'],team)
        p=players.setdefault(key,dict(id=row['player_id'],weekly=[],snap_pcts=[],name=row.get('player_display_name') or row['player_name'],position=row['position'],team=team,**{f:0 for f in fields},epa_rows=0))
        for f in fields:
            value=number(row,f)
            if value is not None:p[f]+=value
        p['epa_rows']+=number(row,'passing_epa') is not None
        team_targets[team]+=number(row,'targets') or 0
        team_rushes[team]+=number(row,'carries') or 0
        p['weekly'].append(dict(week=int(row['week']),points=number(row,'fantasy_points_ppr'),targets=number(row,'targets'),carries=number(row,'carries'),opponent=opponent))
        matched=snap_index.get((norm(p['name']),team,int(row['week'])),[])
        if len(matched)==1 and number(matched[0],'offense_pct') is not None:p['snap_pcts'].append(number(matched[0],'offense_pct'))
        for f in ['passing_epa','rushing_epa']:
            value=number(row,f)
            if value is not None:team_epa[team].append(value);def_epa[opponent].append(value)
        if row['position'] in ['QB','RB','WR','TE']:
            pts=number(row,'fantasy_points_ppr')
            if pts is not None:allowed[(opponent,row['position'])]+=pts
    qbs=[];receivers=[]
    for p in players.values():
        p['games']=len(p['weekly']);p['ppg']=p['fantasy_points_ppr']/p['games'] if p['games'] else None
        p['rush_share']=p['carries']/team_rushes[p['team']] if team_rushes[p['team']] else None
        p['snap_pct']=sum(p['snap_pcts'])/len(p['snap_pcts']) if p['snap_pcts'] else None;p['snap_weeks']=len(p['snap_pcts']);del p['snap_pcts']
        dropbacks=p['attempts']+p['sacks_suffered'];p['interceptions']=p['passing_interceptions'];p['epa_per_dropback']=p['passing_epa']/dropbacks if dropbacks and p['epa_rows'] else None
        if p['position']=='QB' and dropbacks>=100 and p['epa_rows']:qbs.append(p)
        p['target_share']=p['targets']/team_targets[p['team']] if team_targets[p['team']] else None
        if p['position'] in ['WR','TE'] and p['targets']>0:receivers.append(p)
    stats_week=max((int(r['week']) for r in rows),default=0)
    # Match defensive denominators to the player-stat coverage, not later schedule results.
    defense_games=collections.Counter()
    for g in schedule:
        if int(g['week'])<=stats_week and number(g,'home_score') is not None:
            defense_games[g['home_team']]+=1;defense_games[g['away_team']]+=1
    for t in teams.values():
        t['pf_game']=t['pf']/t['games'] if t['games'] else None;t['pa_game']=t['pa']/t['games'] if t['games'] else None;t['diff']=t['pf']-t['pa']
        t['epa']=round(sum(team_epa[t['team']]),3) if team_epa[t['team']] else None;t['epa_allowed']=round(sum(def_epa[t['team']]),3) if def_epa[t['team']] else None
        t['allowed']={pos:allowed[(t['team'],pos)]/defense_games[t['team']] if defense_games[t['team']] else None for pos in ['QB','RB','WR','TE']}
        t['remaining_sos']={}
        for label,start,end in [('regular',stats_week+1,14),('playoffs',max(stats_week+1,15),17)]:
            upcoming=[g for g in schedule if start<=int(g['week'])<=end and t['team'] in [g['away_team'],g['home_team']]]
            opponents=[g['home_team'] if g['away_team']==t['team'] else g['away_team'] for g in upcoming]
            t['remaining_sos'][label]={pos:sum(allowed[(opp,pos)]/defense_games[opp] for opp in opponents if defense_games[opp])/len([opp for opp in opponents if defense_games[opp]]) if any(defense_games[opp] for opp in opponents) else None for pos in ['QB','RB','WR','TE']}
    return {'year':year,'stats_through_week':stats_week,'teams':sorted(teams.values(),key=lambda t:t['team']),
        'players':[p for p in players.values() if p['position'] in ['QB','RB','WR','TE']],
        'qbs':[{k:v for k,v in p.items() if k!='weekly'} for p in sorted(qbs,key=lambda p:-p['epa_per_dropback'])],'receivers':[{k:v for k,v in p.items() if k!='weekly'} for p in sorted(receivers,key=lambda p:-p['targets'])],
        'schedule':[dict(week=int(g['week']),date=g['gameday'],away=g['away_team'],home=g['home_team'],away_score=number(g,'away_score'),home_score=number(g,'home_score')) for g in schedule]}
def main():
    release=json.loads(download('https://api.github.com/repos/nflverse/nflverse-data/releases/tags/stats_player'))
    assets={a['name']:a['browser_download_url'] for a in release['assets']}
    # Same endpoint convention used in nflreadr/R/load_stats.R.
    years=[y for y in [2024,2025,2026] if f'stats_player_week_{y}.csv' in assets]
    if not years:raise RuntimeError('No supported nflverse weekly player releases found; preserving prior snapshot')
    games=list(csv.DictReader(io.StringIO(download(BASE+'schedules/games.csv'))))
    snap_release=json.loads(download('https://api.github.com/repos/nflverse/nflverse-data/releases/tags/snap_counts'))
    snap_assets={a['name']:a['browser_download_url'] for a in snap_release['assets']}
    def load(y):
        rows=list(csv.DictReader(io.StringIO(download(assets[f'stats_player_week_{y}.csv']))))
        url=snap_assets.get(f'snap_counts_{y}.csv');snaps=list(csv.DictReader(io.StringIO(download(url)))) if url else []
        return y,rows,snaps
    with ThreadPoolExecutor(max_workers=3) as pool:data=list(pool.map(load,years))
    result={'updated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),'source':'nflverse/nflverse-data','license':'CC BY 4.0','seasons':[aggregate(y,rows,games,snaps) for y,rows,snaps in sorted(data)]}
    (ROOT/'nflverse-data.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
    print('nflverse:',[(s['year'],s['stats_through_week'],len(s['qbs']),len(s['receivers'])) for s in result['seasons']])
if __name__=='__main__':main()
