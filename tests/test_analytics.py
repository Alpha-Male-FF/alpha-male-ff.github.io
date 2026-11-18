import importlib.util, pathlib, unittest, json
spec=importlib.util.spec_from_file_location('analytics',pathlib.Path(__file__).resolve().parents[1]/'scripts/sync_analytics.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class AnalyticsTests(unittest.TestCase):
 def test_flex_assignment_does_not_reuse_players(self):
  p={'a':{'fantasy_positions':['RB']},'b':{'fantasy_positions':['WR']},'c':{'fantasy_positions':['RB']}}
  r={'players':['a','b','c'],'players_points':{'a':20,'b':19,'c':10}}
  self.assertEqual(m.optimal(r,['RB','FLEX'],p),39)
  self.assertIsNone(m.optimal(r,['QB','RB'],p))
 def test_ties_and_expected_wins(self):
  rows=[{'roster_id':i+1,'matchup_id':1 if i<2 else 2,'points':v} for i,v in enumerate([100,100,80,120])]
  teams,records,skipped=m.calculate({1:rows},{1:'A',2:'B',3:'C',4:'D'},[],{})
  self.assertEqual(sum(t['expected'] for t in teams),2)
  self.assertAlmostEqual(sum(t['schedule_luck'] for t in teams),0)
  self.assertEqual(next(t for t in teams if t['name']=='A')['ties'],1)
  self.assertEqual(len(records),4)
  self.assertFalse(skipped)
 def test_missing_slate_is_excluded(self):
  teams,records,skipped=m.calculate({1:[{'roster_id':1,'points':0,'matchup_id':1}]},{1:'A',2:'B'},[],{})
  self.assertEqual(skipped,[1]);self.assertFalse(records)
 def test_live_snapshot_invariants(self):
  d=json.loads((m.ROOT/'analytics-data.json').read_text())
  for s in d['seasons']:
   ts=s['teams'];self.assertAlmostEqual(sum(t['pf'] for t in ts),sum(t['pa'] for t in ts),places=5)
   self.assertAlmostEqual(sum(t['schedule_luck'] for t in ts),0,places=6)
   self.assertEqual(sum(t['games'] for t in ts),len(s['records']))
   if s['forecast']:
    fs=list(s['forecast']['teams'].values())
    self.assertAlmostEqual(sum(f['title'] for f in fs),1)
    self.assertAlmostEqual(sum(f['playoff'] for f in fs),6)
    self.assertAlmostEqual(sum(f['bye'] for f in fs),2)
    for f in fs:self.assertAlmostEqual(sum(f['finishes']),1)
if __name__=='__main__':unittest.main()
