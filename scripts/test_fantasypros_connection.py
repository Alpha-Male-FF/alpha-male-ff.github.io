#!/usr/bin/env python3
"""Read-only FantasyPros v2 API smoke tests, never publishing or logging private data."""
import json, os, sys, urllib.request, urllib.error
key=os.environ.get("FANTASYPROS_API_KEY","").strip()
if not key: sys.exit("FAIL: FANTASYPROS_API_KEY secret is absent.")
base="https://api.fantasypros.com/public/v2/json/nfl/2026/"
cases=[
 ("Weekly RB rankings","consensus-rankings?position=RB&scoring=PPR&week=8"),
 ("ROS FLEX rankings","consensus-rankings?position=FLX&scoring=PPR&type=ROS"),
 ("Weekly RB projections","projections?position=RB&week=8"),
 ("Rankings larger page requested","consensus-rankings?position=RB&scoring=PPR&week=8&limit=100"),
 ("Rankings second page requested","consensus-rankings?position=RB&scoring=PPR&week=8&offset=10&limit=10")
]
errors=0
for title,path in cases:
 request=urllib.request.Request(base+path,headers={"x-api-key":key,"Accept":"application/json","User-Agent":"AMFL-API-Smoke-Test/1.0"})
 try:
  with urllib.request.urlopen(request,timeout=30) as resp:
   obj=json.load(resp)
  if not isinstance(obj,dict): raise ValueError("Not a JSON object")
  rows=obj.get("players",obj.get("rankings",obj.get("projections")))
  if not isinstance(rows,list): raise ValueError("No players array")
  fields=sorted(rows[0].keys()) if rows and isinstance(rows[0],dict) else []
  print(f"PASS {title}: {len(rows)} players; reported count={obj.get('count', '—')}, limit={obj.get('limit', '—')}; fields: {', '.join(fields[:18])}")
  if title.startswith("Weekly RB rankings") and len(rows)<50:
   print("NOTICE: Small rankings response; possible free-tier result limit. Do not treat this as comprehensive.")
  if not rows: errors+=1;print("NOTICE: no players returned.")
 except urllib.error.HTTPError as exc:
  errors+=1;print(f"FAIL {title}: HTTP {exc.code} (access or request restriction).")
 except Exception as exc:
  errors+=1;print(f"FAIL {title}: {type(exc).__name__}; {str(exc)[:100]}")
print("Read-only validation: no credentials printed and no files changed.")
if errors:sys.exit(f"{errors} dataset checks failed; do not activate public refresh.")
