#!/usr/bin/env python3
"""Public Sleeper API -> static 2026 snapshot. Python standard library only."""
import datetime as dt
import json
import os
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
LEAGUE_ID = os.environ.get('SLEEPER_2026_LEAGUE_ID', '1386887172610600960')
API = 'https://api.sleeper.app/v1'


def get(endpoint):
    req = urllib.request.Request(f'{API}{endpoint}', headers={'User-Agent':'AlphaMaleFF-Archive/1.0','Accept':'application/json'})
    with urllib.request.urlopen(req, timeout=25) as response:
        return json.load(response)


def points(roster):
    settings = roster.get('settings') or {}
    return round(float(settings.get('fpts') or 0) + float(settings.get('fpts_decimal') or 0) / 100, 2)


def against(roster):
    settings = roster.get('settings') or {}
    return round(float(settings.get('fpts_against') or 0) + float(settings.get('fpts_against_decimal') or 0) / 100, 2)


def main():
    league = get(f'/league/{LEAGUE_ID}')
    if not league or str(league.get('season')) != '2026':
        raise SystemExit(f'League {LEAGUE_ID} returned season {league.get("season") if league else "unknown"}, expected 2026. Check SLEEPER_2026_LEAGUE_ID in workflow.')
    users = get(f'/league/{LEAGUE_ID}/users') or []
    rosters = get(f'/league/{LEAGUE_ID}/rosters') or []
    user_by_id = {str(u['user_id']):u for u in users}
    roster_by_id = {int(r['roster_id']):r for r in rosters}
    def person(roster):
        user = user_by_id.get(str(roster.get('owner_id')), {})
        meta = user.get('metadata') or {}
        return {'roster_id':roster['roster_id'], 'username':user.get('display_name') or user.get('username') or str(roster.get('owner_id') or 'Unknown'), 'display_name':user.get('display_name') or '', 'team_name':meta.get('team_name') or user.get('display_name') or '', 'wins':int((roster.get('settings') or {}).get('wins') or 0), 'losses':int((roster.get('settings') or {}).get('losses') or 0), 'ties':int((roster.get('settings') or {}).get('ties') or 0), 'points_for':points(roster), 'points_against':against(roster)}
    standings = [person(r) for r in rosters]
    standings.sort(key=lambda r:(-r['wins'],r['losses'],-r['points_for'],r['username'].lower()))
    # All completed weeks (based on current NFL week). Do not invent a week's result while games are in progress.
    state = get('/state/nfl') or {}
    current_week = int(state.get('week') or 1)
    stage = str(state.get('season_type') or '').lower()
    if str(state.get('season')) != '2026' or stage not in ('regular','post'):
        last_complete = 0
    else:
        last_complete = max(0,min(18,current_week-1 if stage == 'regular' else 18))
    weeks=[]
    recent=[]
    for week in range(1,last_complete+1):
        records = get(f'/league/{LEAGUE_ID}/matchups/{week}') or []
        by_match={}
        for r in records:
            if r.get('matchup_id') is None:continue
            by_match.setdefault(r['matchup_id'], []).append(r)
        seen=0
        for pair in by_match.values():
            if len(pair)!=2:continue
            a,b=pair
            if a.get('points') is None or b.get('points') is None:continue
            ra,rb=roster_by_id.get(a.get('roster_id')),roster_by_id.get(b.get('roster_id'))
            if not ra or not rb:continue
            home=person(ra);away=person(rb)
            home['points']=round(float(a['points']),2);away['points']=round(float(b['points']),2)
            winner=home if home['points']>away['points'] else away if away['points']>home['points'] else None
            recent.append({'week':week,'home':home,'away':away,'winner':winner})
            seen+=1
        weeks.append({'week':week,'matchups':seen})
    recent.sort(key=lambda g:-g['week'])
    output={'league_id':LEAGUE_ID,'league_name':league.get('name'),'season':2026,'status':'in_season','updated_at':dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),'standings':standings,'completed_weeks':weeks,'recent_matchups':recent[:40]}
    dest=ROOT/'data-2026.json'
    dest.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print(f'Wrote {dest}: {len(standings)} teams; {len(weeks)} completed weeks; {len(recent)} games')

if __name__=='__main__': main()
