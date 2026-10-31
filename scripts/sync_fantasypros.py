#!/usr/bin/env python3
"""Refresh existing AMFL FantasyPros player snapshots from the official v2 API.

Requires FANTASYPROS_API_KEY and FANTASYPROS_PUBLICATION_APPROVED=true.
No API keys or authorization tokens are ever written to the generated JSON.
The league-specific My Playbook snapshot (research-data.json) is deliberately
left unchanged; the public API does not provide all those personalized tools.
"""
import copy
import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SNAPSHOT = ROOT / "fantasypros-data.json"
BASE = "https://api.fantasypros.com/public/v2/json"
POSITIONS = ("QB", "RB", "WR", "TE", "K", "DST")
SEASON = int(os.environ.get("FP_NFL_SEASON", "2026"))
WEEK = int(os.environ.get("FP_NFL_WEEK", "0"))
KEY = os.environ.get("FANTASYPROS_API_KEY", "").strip()
APPROVED = os.environ.get("FANTASYPROS_PUBLICATION_APPROVED", "").lower() == "true"

def fetch(endpoint, **params):
    url = BASE + endpoint + "?" + urllib.parse.urlencode(params)
    for attempt in range(3):
        request = urllib.request.Request(
            url, headers={"x-api-key": KEY, "Accept": "application/json",
                          "User-Agent": "AMFL-Research/1.0"})
        try:
            with urllib.request.urlopen(request, timeout=25) as response:
                return json.load(response)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
            # Never include request headers / credentials in errors.
            if attempt == 2 or isinstance(exc, urllib.error.HTTPError) and exc.code in (401, 403, 400):
                raise RuntimeError(f"FantasyPros endpoint failed: {endpoint} HTTP {getattr(exc, 'code', 'network error')}") from None
            time.sleep(2 * (attempt + 1))

def rank_players(response):
    rows = response.get("players", response.get("rankings", []))
    if not isinstance(rows, list):
        raise ValueError("Rankings response did not contain a players list")
    out = []
    for r in rows:
        if not isinstance(r, dict):
            continue
        pos = str(r.get("player_position_id", r.get("position", ""))).upper()
        out.append({
            "player_id": r.get("player_id", r.get("fpid")),
            "position": pos,
            "team": r.get("player_team_id", r.get("team")),
            "player_name": r.get("player_name", r.get("name")),
            "pos_rank": r.get("pos_rank"),
            "rank_ecr": r.get("rank_ecr")
        })
    return out

def get_rankings(kind):
    # Position-specific requests keep a reliable fallback for endpoints
    # that do not expose full-roster ALL/FLEX rankings.
    found = {}
    for pos in ("FLX",):
        args = {"position": pos, "scoring": "PPR"}
        if kind == "ros":
            args["type"] = "ROS"
        elif kind == "weekly":
            args["week"] = WEEK
        else:
            args["week"] = 0
        body = fetch(f"/nfl/{SEASON}/consensus-rankings", **args)
        for row in rank_players(body):
            if row["player_id"] is not None:
                found[str(row["player_id"])] = row
    result = list(found.values())
    result.sort(key=lambda p: (
        int(p["rank_ecr"]) if str(p["rank_ecr"]).isdigit() else 99999,
        p["player_name"] or ""
    ))
    return {"rankings": result, "data_as_of": {"nfl_season": SEASON, "nfl_week": WEEK,
            "date": dt.datetime.now(dt.timezone.utc).date().isoformat()}}

def get_projections():
    result = []
    for pos in POSITIONS:
        body = fetch(f"/nfl/{SEASON}/projections", position=pos, week=WEEK)
        # Public v2 response uses 'players'; old snapshot uses 'projections'.
        raw = body.get("players", body.get("projections", []))
        if not isinstance(raw, list):
            raise ValueError("Projection response did not contain a players list")
        rows = []
        for player in raw:
            if not isinstance(player, dict):
                continue
            stats = player.get("stats", {})
            if not isinstance(stats, dict):
                stats = {}
            rows.append({
                "name": player.get("player_name", player.get("name")),
                "team": player.get("player_team_id", player.get("team")),
                "position": player.get("player_position_id", player.get("position", pos)),
                "fpid": player.get("player_id", player.get("fpid")),
                "stats": {"points_ppr": stats.get("points_ppr", player.get("points_ppr"))}
            })
        result.append({"season": str(SEASON), "week": str(WEEK),
                       "position": pos, "scoring": "PPR", "projections": rows})
    return result

def main():
    if not APPROVED:
        raise SystemExit("Publication approval is not enabled; no public data changed.")
    if not KEY:
        raise SystemExit("FANTASYPROS_API_KEY is missing; configure as GitHub Actions secret.")
    if WEEK < 1 or WEEK > 18:
        raise SystemExit("FP_NFL_WEEK must be set to the specific upcoming NFL week (1–18).")
    old = json.loads(SNAPSHOT.read_text())
    updated = copy.deepcopy(old)
    # Weekly and ROS rankings + weekly projections. Other research snapshots
    # are preserved rather than falsely reported as freshly refreshed.
    weekly = get_rankings("weekly")
    ros = get_rankings("ros")
    projections = get_projections()
    if not weekly["rankings"] or not ros["rankings"] or not any(x["projections"] for x in projections):
        raise SystemExit("FantasyPros returned incomplete data; original snapshot preserved.")
    updated["weekly"] = weekly
    updated["ros"] = ros
    updated["projections"] = projections
    updated["retrieved_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
    updated["source"] = "FantasyPros public v2 API"
    updated["scoring"] = "PPR"
    temporary = SNAPSHOT.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(updated, separators=(",", ":"), ensure_ascii=False) + "\n")
    temporary.replace(SNAPSHOT)
    print(f"Refreshed {len(weekly['rankings'])} weekly rankings, "
          f"{len(ros['rankings'])} ROS rankings, "
          f"{sum(len(x['projections']) for x in projections)} projections.")

if __name__ == "__main__":
    main()
