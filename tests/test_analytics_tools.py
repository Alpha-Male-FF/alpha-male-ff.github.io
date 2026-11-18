import sys, pathlib, unittest, json
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
from analytics_tools import normalize_transactions, streams, receipts, score_evidence, DAY

def event(ident,week,days,kind='free_agent',adds=None,drops=None):
 return {'id':str(ident),'week':week,'timestamp':days*DAY,'type':kind,'adds':adds or {},'drops':drops or {},'rosters':[1,2] if kind=='trade' else [1]}
def row(week,owner=1,points=10,starter=True):
 return {'roster_id':owner,'players':['p'],'players_points':{'p':points},'starters':['p'] if starter else [],'starters_points':[points] if starter else []}
class ToolsTests(unittest.TestCase):
 def test_repeated_transactions_and_incomplete_status(self):
  e={'transaction_id':'12','leg':3,'type':'trade','status':'complete','adds':{'p':2},'drops':{'p':1},'roster_ids':[1,2],'status_updated':DAY}
  self.assertEqual(len(normalize_transactions({2:[e],3:[e,{**e,'transaction_id':'13','status':'failed'}]})),1)
 def test_stream_uses_exact_time_not_week_number(self):
  es=[event(1,2,10,adds={'p':1}),event(2,4,16,drops={'p':1})]
  self.assertEqual(streams(es)[0]['days'],6)
  self.assertFalse(streams([es[0],event(3,3,18,drops={'p':1})]))
 def test_trade_ends_stream_hold(self):
  es=[event(1,1,10,adds={'p':1}),event(2,1,11,'trade',{'p':2},{'p':1}),event(3,1,12,drops={'p':1})]
  self.assertFalse(streams(es))
 def test_receipts_exclude_boundary_and_bench_weeks(self):
  es=[event(1,2,10,'trade',{'p':1},{'p':2}),event(2,5,30,drops={'p':1})]
  weeks={w:[row(w,starter=w!=4)] for w in range(1,7)}
  r=receipts(es,weeks)[('1','p',1)]
  self.assertEqual(r['eligible_weeks'],[3,4]);self.assertEqual(r['points'],10);self.assertEqual(r['starts'],1)
 def test_receipt_missing_row_is_incomplete_and_new_trade_pending(self):
  es=[event(1,2,10,adds={'p':1})]
  r=receipts(es,{3:[]})[('1','p',1)];self.assertEqual(r['status'],'incomplete')
  self.assertEqual(receipts(es,{2:[row(2)]})[('1','p',1)]['status'],'pending')
 def test_duplicate_incoming_holds_withhold_ambiguous_credits(self):
  es=[event(1,1,10,'trade',{'p':1},{'p':2}),event(2,2,18,'trade',{'p':1},{'p':2})]
  result=receipts(es,{w:[row(w)] for w in range(1,5)})
  self.assertTrue(all(r['status']=='incomplete' and r['points']==0 for r in result.values()))
 def test_player_scores_deduplicate_and_reject_conflicts(self):
  d,n=score_evidence({1:[row(1),row(1,2)]});self.assertEqual(d,{('p',1):10});self.assertEqual(n,0)
  d,n=score_evidence({1:[row(1),row(1,2,11)]});self.assertFalse(d);self.assertEqual(n,1)
 def test_snapshots_no_duplicate_receipt_credits(self):
  path=pathlib.Path(__file__).resolve().parents[1]/'analytics-tools-data.json'
  for s in json.loads(path.read_text())['seasons']:
   self.assertEqual(len(s['transactions']),len(set(e['id'] for e in s['transactions'])))
   seen=set()
   for event in s['transactions']:
    for r in event['receipts']:
     for score in r['scoring']:
      key=(r['player'],r['owner'],score['week'])
      self.assertTrue(key not in seen,f'Duplicate receipt {s["year"]} {key}');seen.add(key)
   self.assertEqual(len(s['productive_drops']),len(set(r['player'] for r in s['productive_drops'])))
if __name__=='__main__':unittest.main()
