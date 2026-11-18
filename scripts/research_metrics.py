"""Transparent AMFL schedule and power metrics derived from completed team weeks."""
import math,statistics

def build_research(seasons):
    ratings={};out=[]
    for season in sorted(seasons,key=lambda s:s['year']):
        teams=season['teams'];by_name={t['name']:t for t in teams};by_id={t['id']:t for t in teams}
        ratings={n:1500+.65*(ratings.get(n,1500)-1500) for n in by_name};history=[];sos={n:[] for n in by_name}
        for week in sorted(set(r['week'] for r in season['records'])):
            changes={};seen=set()
            for team in teams:
                game=next((w for w in team['weeks'] if w['week']==week),None)
                if not game:continue
                a,b=team['name'],game['opponent'];pair=tuple(sorted([a,b]))
                if pair in seen:continue
                seen.add(pair);ra,rb=ratings[a],ratings[b];sos[a].append(rb);sos[b].append(ra)
                expected=1/(1+10**((rb-ra)/400));actual=1 if game['score']>game['against'] else .5 if game['score']==game['against'] else 0
                mult=min(1.7,1+math.log1p(abs(game['score']-game['against']))/8);delta=24*mult*(actual-expected)
                changes[a]=changes.get(a,0)+delta;changes[b]=changes.get(b,0)-delta
            for name,delta in changes.items():ratings[name]+=delta
            history.append({'week':week,'ratings':dict(ratings)})
        league_avg=statistics.mean(t['avg'] for t in teams if t['avg'] is not None) if teams else 0
        values=[]
        for t in teams:
            recent=t['weeks'][-3:];rate=[]
            for w in recent:
                scores=[r['score'] for r in season['records'] if r['week']==w['week']]
                rate.append((sum(w['score']>v for v in scores)+(sum(w['score']==v for v in scores)-1)/2)/(len(scores)-1))
            streak='—'
            if t['weeks']:
                result=t['weeks'][-1]['result'];length=0
                for w in reversed(t['weeks']):
                    if w['result']!=result:break
                    length+=1
                streak=f'{result}{length}'
            opponents=[by_name[w['opponent']]['avg'] for w in t['weeks']]
            future=[g for g in season['schedule'] if t['id'] in [g['a'],g['b']]]
            future_ids=[g['b'] if g['a']==t['id'] else g['a'] for g in future]
            values.append({'id':t['id'],'name':t['name'],'elo':ratings[t['name']], 'played_sos_elo':statistics.mean(sos[t['name']]) if sos[t['name']] else None,
                'played_sos_ppg':statistics.mean(opponents) if opponents else None,'remaining_sos_elo':statistics.mean(ratings[by_id[i]['name']] for i in future_ids) if future_ids else None,
                'remaining_sos_ppg':statistics.mean(by_id[i]['avg'] for i in future_ids) if future_ids else None,
                'recent_all_play':statistics.mean(rate) if rate else 0,'scoring_ratio':t['avg']/league_avg if league_avg and t['avg'] is not None else 1,
                'streak':streak,'above_500':t['wins']+.5*t['ties']-.5*t['games']})
        norm=lambda x,vals:(x-min(vals))/(max(vals)-min(vals)) if max(vals)>min(vals) else .5
        elos=[v['elo'] for v in values];opps=[v['played_sos_elo'] or 1500 for v in values]
        for v in values:
            t=by_id[v['id']]
            v['components']={'Elo':30*norm(v['elo'],elos),'All-play':30*(t['all_play'] or 0),'Scoring':20*max(0,min(1,(v['scoring_ratio']-.75)/.5)),'Schedule':10*norm(v['played_sos_elo'] or 1500,opps),'Recent form':10*v['recent_all_play']}
            v['power']=sum(v['components'].values())
        values.sort(key=lambda v:-v['power'])
        for i,v in enumerate(values):v['rank']=i+1
        out.append({'year':season['year'],'rankings':values,'elo_history':history})
    return out
