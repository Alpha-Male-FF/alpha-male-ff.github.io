import json,pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
from research_metrics import build_research
from sync_nflverse import aggregate
ROOT=pathlib.Path(__file__).resolve().parents[1]
class ResearchTests(unittest.TestCase):
 def test_power_components_and_expected_participants(self):
  source=json.loads((ROOT/'analytics-data.json').read_text());result=build_research(source['seasons'])
  for y in result:
   self.assertEqual(len(y['rankings']),10);self.assertEqual({r['rank'] for r in y['rankings']},set(range(1,11)))
   for r in y['rankings']:
    self.assertAlmostEqual(sum(r['components'].values()),r['power']);self.assertTrue(0<=r['power']<=100)
   self.assertAlmostEqual(sum(y['elo_history'][-1]['ratings'].values()),sum(y['elo_history'][0]['ratings'].values()),places=6)
 def test_nflverse_aggregation_does_not_count_receiver_epa_twice(self):
  games=[dict(season='2026',game_type='REG',week='1',gameday='2026-09-13',home_team='A',away_team='B',home_score='20',away_score='10')]
  common=dict(season='2026',season_type='REG',week='1',team='A',opponent_team='B',player_name='Name')
  rows=[dict(common,player_id='qb',position='QB',passing_epa='4',rushing_epa='1',attempts='100',sacks_suffered='5'),dict(common,player_id='wr',position='WR',passing_epa='',rushing_epa='',receiving_epa='4',targets='10',fantasy_points_ppr='20')]
  y=aggregate(2026,rows,games);a=next(t for t in y['teams'] if t['team']=='A');b=next(t for t in y['teams'] if t['team']=='B')
  self.assertEqual(a['epa'],5);self.assertEqual(b['epa_allowed'],5);self.assertEqual(b['allowed']['WR'],20)
  self.assertAlmostEqual(y['qbs'][0]['epa_per_dropback'],4/105);self.assertEqual(y['receivers'][0]['target_share'],1)
 def test_published_nfl_integrity(self):
  d=json.loads((ROOT/'nflverse-data.json').read_text())
  for y in d['seasons']:
   self.assertEqual(len(y['teams']),32)
   self.assertEqual(sum(t['pf'] for t in y['teams']),sum(t['pa'] for t in y['teams']))
   for t in y['teams']:self.assertEqual(t['games'],t['wins']+t['losses']+t['ties'])
   for r in y['receivers']:self.assertTrue(0<=r['target_share']<=1)
 def test_research_is_embedded_and_legacy_link_redirects(self):
  html=(ROOT/'index.html').read_text();self.assertIn('data-page="research"',html);self.assertIn('researchMount',html)
  self.assertNotIn('src="./analytics.html"',html);self.assertIn('/#research',(ROOT/'analytics.html').read_text())
  self.assertIn('attachShadow',(ROOT/'research.js').read_text())
if __name__=='__main__':unittest.main()
