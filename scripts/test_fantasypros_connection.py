#!/usr/bin/env python3
"""Read-only FantasyPros API authentication and schema smoke test.
Does not print credentials, save results, or publish any licensed data.
"""
import json, os, sys, urllib.request, urllib.error
key=os.environ.get("FANTASYPROS_API_KEY","").strip()
if not key:
    sys.exit("FAIL: FANTASYPROS_API_KEY secret is not configured or is empty.")
url="https://api.fantasypros.com/public/v2/json/nfl/2026/consensus-rankings?position=RB&scoring=PPR&week=8"
req=urllib.request.Request(url,headers={"x-api-key":key,"Accept":"application/json","User-Agent":"AMFL-Connection-Test/1.0"})
try:
    with urllib.request.urlopen(req,timeout=25) as resp:
        payload=json.load(resp)
except urllib.error.HTTPError as exc:
    sys.exit(f"FAIL: HTTP {exc.code}. 401/403 indicates key or access restrictions; 400 suggests request parameters.")
except Exception as exc:
    sys.exit(f"FAIL: connection or JSON decoding error ({type(exc).__name__}).")
if not isinstance(payload,dict):
    sys.exit("FAIL: Expected JSON object.")
rows=payload.get("players",payload.get("rankings"))
if not isinstance(rows,list):
    sys.exit("FAIL: unexpected response schema, expected players array. Available fields: "+", ".join(sorted(payload.keys())[:20]))
print("PASS: FantasyPros API key authenticated and rankings endpoint returned a JSON players list.")
print("Returned player count:",len(rows))
print("Available top-level fields:",", ".join(sorted(payload.keys())[:20]))
print("API access test only: production/redistribution rights NOT verified. No files modified.")
