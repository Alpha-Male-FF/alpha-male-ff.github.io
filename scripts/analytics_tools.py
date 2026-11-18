"""Observable roster, transaction and player evidence for the AMFL Analytics Lab.
No market-value feeds or third-party analyzer outputs are used.
"""
import datetime
import statistics
from concurrent.futures import ThreadPoolExecutor

DAY=86400000

def normalize_transactions(batches):
    unique={}
    for week,transactions in batches.items():
        for tx in transactions:
            if tx.get('status')!='complete' or tx.get('type') not in ('trade','waiver','free_agent'):continue
            ident=str(tx['transaction_id'])
            event={'id':ident,'week':int(tx.get('leg',week)), 'type':tx['type'],
                   'timestamp':tx.get('status_updated') or tx.get('created'),
                   'adds':{str(k):int(v) for k,v in (tx.get('adds') or {}).items()},
                   'drops':{str(k):int(v) for k,v in (tx.get('drops') or {}).items()},
                   'rosters':sorted(set(int(r) for r in tx.get('roster_ids') or [])),
                   'picks':tx.get('draft_picks') or [],'faab':tx.get('waiver_budget') or [],
                   'bid':(tx.get('settings') or {}).get('waiver_bid')}
            if ident not in unique or (event['timestamp'] or 0)>(unique[ident]['timestamp'] or 0):unique[ident]=event
    return sorted(unique.values(),key=lambda e:(e['timestamp'] or 0,int(e['id'])))

def score_evidence(weeks):
    """Each player-week appears once even if several roster records include it."""
    scores={}; conflicts=set()
    for week,rows in sorted(weeks.items()):
        for row in rows:
            for pid,value in (row.get('players_points') or {}).items():
                if value is None:continue
                key=(str(pid),week);value=float(value)
                if key in scores and abs(scores[key]-value)>.011:conflicts.add(key)
                scores[key]=value
    return {k:v for k,v in scores.items() if k not in conflicts},len(conflicts)

def receipts(events,weeks):
    """Count starter points only in complete weeks strictly between movement weeks.
    Boundary weeks are excluded: public transactions do not establish player kickoff locks.
    """
    outgoing={};incoming={}
    for event in events:
        for pid,owner in event['adds'].items():incoming.setdefault((pid,owner),[]).append(event)
        for pid,owner in event['drops'].items():outgoing.setdefault((pid,owner),[]).append(event)
    ambiguous=set()
    for key,arrivals in incoming.items():
        for previous,current in zip(arrivals,arrivals[1:]):
            if not previous['timestamp'] or not current['timestamp']:continue
            departures=[e for e in outgoing.get(key,[]) if e['timestamp'] and previous['timestamp']<e['timestamp']<=current['timestamp']]
            if not departures:
                ambiguous.add((previous['id'],*key));ambiguous.add((current['id'],*key))
    index={}
    for week,rows in weeks.items():
        for row in rows:index[(week,int(row['roster_id']))]=row
    last=max(weeks,default=0)
    result={}
    for event in events:
        details=[]
        for pid,owner in event['adds'].items():
            after=[e for e in outgoing.get((pid,owner),[]) if e['id']!=event['id'] and e['timestamp'] and event['timestamp'] and e['timestamp']>event['timestamp']]
            end=min(after,key=lambda e:e['timestamp']) if after else None
            start_week=event['week'];end_week=end['week'] if end else last+1
            eligible=[];started=[];missing=[]
            if event['timestamp']:
                for week in range(max(1,start_week+1),min(last+1,end_week)):
                    row=index.get((week,owner))
                    if row is None:missing.append(week);continue
                    # A roster gap means the hold cannot be reconstructed faithfully.
                    if pid not in (row.get('players') or []):missing.append(week);continue
                    starters=row.get('starters') or [];points=row.get('starters_points') or []
                    if pid in starters:
                        i=starters.index(pid)
                        if i>=len(points) or points[i] is None:missing.append(week);continue
                        started.append({'week':week,'points':float(points[i])})
                    eligible.append(week)
            repeated=(event['id'],pid,owner) in ambiguous
            if repeated:started=[]
            result[(event['id'],pid,owner)]={'player':pid,'owner':owner,'points':round(sum(x['points'] for x in started),2),
                  'starts':len(started),'eligible_weeks':eligible,'scoring':started,'missing_weeks':missing,
                  'end':{'type':end['type'],'week':end['week'],'timestamp':end['timestamp']} if end else None,
                  'reason':'Repeated incoming movement without a recorded departure' if repeated else None,
                  'status':'incomplete' if repeated or missing or not event['timestamp'] else 'observed' if eligible else 'pending'}
            details.append(result[(event['id'],pid,owner)])
        event['receipts']=details
    return result

def streams(events):
    """A pickup followed by the FIRST outgoing movement being a drop within 7 days."""
    result=[]
    for i,event in enumerate(events):
        if event['type'] not in ('waiver','free_agent') or not event['timestamp']:continue
        for pid,owner in event['adds'].items():
            for nxt in events[i+1:]:
                if nxt['drops'].get(pid)!=owner:continue
                if nxt['type'] in ('waiver','free_agent') and nxt['timestamp'] and 0<=nxt['timestamp']-event['timestamp']<=7*DAY:
                    result.append({'player':pid,'owner':owner,'add_id':event['id'],'drop_id':nxt['id'],'days':round((nxt['timestamp']-event['timestamp'])/DAY,2)})
                break
    return result

def build_tools(year,lid,league,rosters,names,players,regular_weeks,state,get):
    active=str(year)==str(state['season'])
    completed=int(league['settings'].get('last_scored_leg',0)) if active else 17
    completed=max(0,min(17,completed))
    weeks=dict(regular_weeks)
    with ThreadPoolExecutor(max_workers=4) as pool:
        extra=dict(pool.map(lambda w:(w,get(f'/league/{lid}/matchups/{w}')),range(max(weeks,default=0)+1,completed+1)))
        weeks.update(extra)
        tx_last=max(completed,int(league['settings'].get('leg',completed))) if active else 18
        batches=dict(pool.map(lambda w:(w,get(f'/league/{lid}/transactions/{w}')),range(0,min(18,tx_last)+1)))
    events=normalize_transactions(batches)
    scores,conflicts=score_evidence(weeks)
    receipt_index=receipts(events,weeks)
    short_holds=streams(events)
    pids=set(pid for pid,w in scores)
    for event in events:pids.update(event['adds']);pids.update(event['drops'])
    for row in rosters:pids.update(row.get('players') or [])
    profiles={}
    for pid in sorted(pids):
        source=players.get(pid) or {};observed=[]
        for week in sorted(weeks):
            if (pid,week) not in scores:continue
            holders=[]
            for r in weeks[week]:
                if pid in (r.get('players') or []):holders.append({'id':r['roster_id'],'starter':pid in (r.get('starters') or [])})
            observed.append({'week':week,'points':scores[(pid,week)],'holders':holders})
        recent=[scores[(pid,w)] for w in range(max(1,completed-3),completed+1) if (pid,w) in scores]
        profiles[pid]={'id':pid,'name':source.get('full_name') or ' '.join(filter(None,[source.get('first_name'),source.get('last_name')])) or pid,
                       'positions':source.get('fantasy_positions') or ([source['position']] if source.get('position') else []),
                       'team':source.get('team'),'age':source.get('age'),'status':source.get('injury_status') or source.get('status'),
                       'weekly':observed,'total':round(sum(x['points'] for x in observed),2),
                       'baseline':round(statistics.mean(recent),4) if len(recent)>=2 else None,'baseline_weeks':len(recent)}
    # Unique next-owner receipts per dropped player. Do not sum overlapping rest-of-season scores.
    drops=[]
    for event in events:
        if event['type'] not in ('waiver','free_agent'):continue
        for pid,owner in event['drops'].items():
            later=[e for e in events if e['timestamp'] and event['timestamp'] and e['timestamp']>event['timestamp'] and pid in e['adds']]
            first=min(later,key=lambda e:e['timestamp']) if later else None
            other=first['adds'][pid] if first else None
            proof=receipt_index.get((first['id'],pid,other)) if first and other!=owner else None
            if proof:drops.append({'id':event['id'],'player':pid,'owner':owner,'week':event['week'],'next_owner':other,'receipt':proof})
    best_drop={}
    for d in drops:
        if d['receipt']['status']!='observed':continue
        old=best_drop.get(d['player'])
        if old is None or d['receipt']['points']>old['receipt']['points']:best_drop[d['player']]=d
    summary={i:{'trades':0,'waivers':0,'free_agents':0,'drops':0,'streams':0,'empty_slots':0,'partners':{}} for i in names}
    for event in events:
        if event['type']=='trade':
            parties=set(event['rosters'])|set(event['adds'].values())|set(event['drops'].values())
            for i in parties:
                if i not in summary:continue
                summary[i]['trades']+=1
                for other in parties-{i}:summary[i]['partners'][other]=summary[i]['partners'].get(other,0)+1
        else:
            for i in set(event['adds'].values()):
                if i in summary:summary[i]['waivers' if event['type']=='waiver' else 'free_agents']+=1
            for i in event['drops'].values():
                if i in summary:summary[i]['drops']+=1
    for s in short_holds:
        if s['owner'] in summary:summary[s['owner']]['streams']+=1
    for rows in regular_weeks.values():
        for row in rows:
            if row['roster_id'] in summary:summary[row['roster_id']]['empty_slots']+=sum(not pid or pid=='0' for pid in row.get('starters') or [])
    return {'year':year,'names':names,'completed_week':completed,'regular_end':int(league['settings'].get('playoff_week_start',15))-1,
            'active':active,'profiles':profiles,'transactions':events,'streams':short_holds,'productive_drops':list(best_drop.values()),'activity':summary,
            'rosters':[{'id':r['roster_id'],'players':r.get('players') or [],'starters':r.get('starters') or [],'reserve':r.get('reserve') or [],'taxi':r.get('taxi') or []} for r in rosters],
            'slots':[s for s in league['roster_positions'] if s not in ('BN','IR')], 'score_conflicts':conflicts,
            'snapshot_note':'Current roster snapshot' if active else 'Retained end-of-season roster snapshot'}
