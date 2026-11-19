# Alpha Male FF — League Legacy

Mobile-friendly, zero-dependency static site covering 2015–2025 league history.

## Preview locally

From this folder, run:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000. The site loads `data.json` using `fetch`, so opening `index.html` directly via `file://` may not work.

## Deploy free on Cloudflare Pages

1. Create a free Cloudflare account.
2. In **Workers & Pages**, create a **Pages** project using **Direct Upload**.
3. Upload this folder's contents (or the zip contents) as static assets.
4. Cloudflare will provide a public `*.pages.dev` URL.

## Deploy free on GitHub Pages

1. Create a public GitHub repository and upload `index.html` and `data.json` to its root.
2. In repository **Settings → Pages**, choose **Deploy from a branch**, `main`, `/ (root)`.
3. Open the published `*.github.io` URL after deployment completes.

## Data notes

- ESPN regular-season records and championship finishes: 2015–2023.
- Sleeper regular-season records and verified postseason scores: 2024–2025.
- ESPN championship-bracket games are reconstructed from seed order, final placements, and the supplied bracket rules. Game scores are unavailable.
- Historical John (2017) is distinct from Justin (`jlong11` in 2024–2025).
- No 2014 data; no live API calls; new seasons require regenerating `data.json`.
- 2024 and 2025 consolation results are displayed separately.

## v3 updates
- Standardized 2024 and 2025 `Final` rounds to `Championship Final` and the placement rounds to explicit labels.
- Added SVG career scoring line charts, career W/L donut charts, and championship distribution chart. No external chart library or network required.
- ESPN championship rounds remain reconstructed; Sleeper matchup scores are verified.

## v4: Fantasy League Personality
- New warm light theme and dark theme. Toggle in the header, preference stored in localStorage.
- Leaderboard now includes scatter (career tenure vs win rate), year-by-year scoring line graph, title-share donut, and original ranking bars.
- Manager profiles display a rivalry report from RECORDED playoff games only, counting actual matchups from existing archive, with W-L, meetings, scored games, and championship meetings.
- No regular-season head-to-head is claimed; ESPN `matchups_by_week` is empty in available source. To add true all-time head-to-head, supply weekly regular-season schedules/results for ESPN and Sleeper years.
- Data remains bundled and works on free static hosting.

## v5 updates
- Manager names throughout rankings, season tables, playoff archive, rivalry rows, charts, and champion lists link to manager profiles. Scatter points also support keyboard selection.
- Rivalry spotlights identify the most favorable and unfavorable recorded postseason opponents, with meeting counts and explicitly limited coverage.
- Scatter chart zooms to the observed win-rate band and separates otherwise overlapping points; championship-share donut is presented in a compact centered panel.
- No external dependencies or APIs added.

## v6: Unique rivalry banter, linked leaderboard, compact visuals
- The **All-time wins · top 10** table now links manager names to their profiles.
- All manager names use the same accessible profile-link component, with hover/focus states.
- The leaderboard chart layout has reduced empty space on desktop and stacks on mobile.
- Rivalry spotlight quotes use the supplied 10 winning and 10 losing lines, plus 15 additional lines in each category. Each historical manager receives a distinct line per outcome type, so the same line is not reused on two manager spotlight profiles.

## Optional free weekly Sleeper 2026 sync
The new **2026 Live** tab reads `data-2026.json`, produced by `scripts/sync_sleeper_2026.py`. It is kept separate from the locked 2015–2025 history. The site shows an honest setup message until that file is generated.

**IMPORTANT: Verify the 2026 league ID.** The workflow currently uses `1386887172610600960`, the previously supplied *current league* ID. This ID has **not been verified as the 2026 season** in this build. Sleeper creates a new league ID every season. If you see an error reporting a season other than 2026, copy the actual 2026 league ID from the Sleeper league URL and replace `SLEEPER_2026_LEAGUE_ID` in `.github/workflows/update-2026.yml`. The script deliberately refuses to write 2025 data as 2026.

### Hosting that updates itself
1. Create a public GitHub repository and upload the **whole extracted directory, including `.github/workflows/` and `scripts/`**. When uploading from your OS, show hidden files to include `.github`.
2. In **Settings → Actions → General**, enable workflow runs and grant workflow permissions to read and write repository contents as needed.
3. Go to **Actions → Refresh Sleeper 2026 standings → Run workflow** to perform the first sync. Check the job log for ID/season validation.
4. For **GitHub Pages**, use Settings → Pages → Deploy from a branch (`main`, root). Future scheduled commits refresh the site automatically.
5. For **Cloudflare Pages**, use GitHub-connected continuous deployment instead of manual Direct Upload. Link the same repository; framework preset None and output directory `/`. Commits by the scheduled workflow then trigger deployments automatically.

The schedule runs Tuesdays at 15:17 UTC. GitHub can delay scheduled workflows; the exact execution time is not guaranteed. It fetches settled weeks through the last completed NFL regular-season week, and records the API response update time. Sleeper stat corrections can alter previous weeks; the script re-reads all completed weeks. The script uses Python's standard library and Sleeper's public API, so no API key or paid service is needed. Free plan limits and third-party service terms may change.

**To refresh immediately:** Run the GitHub Actions workflow manually or execute `python scripts/sync_sleeper_2026.py` locally with Internet access, then deploy the new `data-2026.json`.

## v7: Weekly 2026 results across the entire site

When the Tuesday GitHub Action updates `data-2026.json`, the website automatically merges that snapshot with the **immutable** 2015–2025 archive in the visitor's browser. The same 2026 wins, losses, PF, and PA now appear in **all-time leaderboards, manager profiles, and the Season Explorer's 2026 tab**, in addition to **2026 Live**. Career totals and percentages are recalculated on every page load, never incremented on top of prior weekly copies. No change to the existing Tuesday job is needed.

**Important:** 2026 is a provisional season. It contributes current regular-season stats but not championships, runner-ups, playoff records, last-place finishes, or historical seeding. 2026 career points are partial-year and should not be interpreted as a completed season. The League Scoring Through the Years chart uses completed seasons only. If the snapshot is missing or its season is not 2026, the site stays on the 2015–2025 historical baseline.

The static `data.json` still holds the finalized archive; do not overwrite it with weekly live snapshots. If you have a new manager in 2026 who is not in `LIVE_NAMES`, add their Sleeper username-to-name mapping in `index.html` before deployment.

## Research integration status

FantasyPros Advanced Research has been removed from the live website, including public research snapshots, scripts and GitHub Actions workflows. The rest of the AMFL site remains operational. Implementation history is retained in Git commits should the league choose a future authorized research source.

## Analytics Lab (2024–2026)

`analytics.html` provides season and manager selection, sortable performance standings,
all-play records, expected wins, schedule and median luck, scoring consistency,
hindsight roster efficiency, weekly records and lineup receipts. `scripts/sync_analytics.py`
refreshes `analytics-data.json` from public Sleeper inputs. The existing Tuesday workflow
now refreshes both snapshots. Run manually with `python scripts/sync_analytics.py`.

The active-season forecast uses 10,000 seeded historical team-scoring simulations and
the six-team fixed bracket. It is not a player projection model. Forecasts are suppressed
for incomplete schedules or unsupported settings. The page documents formulas and
historical position/IR/lineup-lock limitations. Missing inputs are not replaced by zero.
Schedule luck is distinct from the archive's existing PF/PA Luck Index.

Validation: `python -m unittest discover -s tests -v` and `node --check analytics.js`.

The second release adds Roster, Trade Receipts, Trade Sandbox, Waivers,
Commissioner and Player Explorer sections, plus league scoring/rank/distribution charts.
`analytics-tools-data.json` is generated by `scripts/analytics_tools.py` through the same
sync command and workflow. It includes completed current-week transactions and player
scoring through the last scored week (historical seasons include Weeks 15–17).

Recent player baselines use at least two observed weeks in the last four completed
league weeks, with recorded zeros included. These are descriptive league-scoring
averages, not market values or projections. The trade sandbox recomputes a slot-compatible
starting lineup before and after a hypothetical swap. Roster reserve/taxi slots and
missing-baseline players are excluded and coverage is shown. Partial totals are
allowed; changes are withheld when the unmodeled slot types change. Injury-status
labels are displayed but NFL availability is not modeled. It does not submit actions to Sleeper.

Trade/waiver receipts count actual starter points only in completed weeks strictly
between acquisition and departure weeks. Duplicate incoming records without a departure
make both affected receipts incomplete. Player-team-week credits cannot be counted twice.
Streams use exact completion timestamps and stop at the first departure. Productive-drop
rankings show one event per player-season, not repeated overlapping future scoring.

Commissioner metrics report completed activity and explicit empty starter IDs, with
transparent scoring-parity and standings-balance formulas; no inferred tanking claims.
Player profiles distinguish recorded scoring weeks from games played and rank only the
observed league pool. Current metadata is labeled when viewing historical seasons.

Remaining screenshot features: player projections, projected waiver recommendations,
injury scenarios, rooting guide, licensed market values and value histories, multi-league
dashboard, NFL box-score categories, news and draft tools. No third-party analyzer
outputs are imported. Browser-only tools do not place offers, claims or roster changes.

Additional checks: `node tests/test_analytics_ui.cjs` renders all seven tools for all 30
season/manager combinations and verifies FLEX assignment and player profile rendering.

## Integrated Research tab

Research now mounts as an isolated custom element in the main site's `#research`
tab; it is not an iframe or a separate page. Old `/analytics.html` links redirect
to that tab. Deep links such as `/#research/bracket` and `/#manager/Seth` are
supported, including browser Back. The main theme toggle controls Research.

Edit `analytics.js`, `analytics-tools.js`, `research-extras.js`, `analytics.css`
and `research-template.html`, then run `python scripts/build_research.py` to
regenerate `research.js` and `research.css`. Generated files are checked into Git
for buildless GitHub Pages hosting. Team and manager links lead to the existing
career profiles. Native dropdown options remain selection controls.

The Research power rating uses the existing AMFL component weights: Elo 30%,
all-play 30%, scoring ratio 20%, played SOS 10%, last-three-week form 10%.
`research-data.json` is generated with the analytics snapshot. Played SOS Elo uses
opponents' ratings immediately before their games; remaining SOS uses current
opponent ratings. The playoff graphic seeds a coherent field by expected final
wins then PF and allows manual bracket-winner changes, without changing baseline
season simulation odds. Outcome-path bands describe mutually exclusive finishes.

The Trade Calculator groups players by position, shows sent totals, received
assets, before/after lineups, depth, and ranks among fully covered rosters. Its
optional additions reduce modeled lineup-gain imbalance; they do not establish
market fairness or trade acceptance. It uses recent observed scoring only. Scenario
wins-added shifts the historical team scoring mean by its lineup change, keeps
variance fixed and recomputes remaining regular-season matchup chances for both
parties. It is an uncalibrated what-if model, not a player projection.

`python scripts/sync_nflverse.py` imports the official `stats_player` weekly CSV
releases (the newer endpoint used by nflreadr's `R/load_stats.R`) and `schedules`
release. The legacy `player_stats.csv` stops at 2024 and is not used. Published
NFL tools cover 2024–2026: team scoring, passing/rushing EPA, defense EPA allowed,
QB EPA/dropback (100-dropback minimum), WR/TE targets and shares, NFL schedule and
PPR defensive matchup averages for Weeks 15–17. NFL seasons have an independent
selector and explicit coverage week. These are factual statistics, not projections.

Data attribution: [nflverse/nflverse-data](https://github.com/nflverse/nflverse-data),
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). AMFL aggregates and
formats player records and schedules. Receiver EPA is not added to passing EPA,
avoiding double counting. Matchup denominators use games through the player-stat
coverage week; standard PPR points are distinct from AMFL custom scoring.

The Tuesday workflow refreshes Sleeper analytics, schedule/power metrics and
nflverse extracts. A failed NFL refresh leaves the prior published files intact.
Validation includes `python -m unittest discover -s tests -v`,
`node tests/test_analytics_ui.cjs` (330 season/manager/tool renders), and browser
checks of main-tab routing, profile links, calculator controls and mobile layout.

### Phone layouts and research workbench

Research tables turn into labeled stat cards below 850px. The playoff bracket becomes a vertical round-by-round layout; outcome paths become labeled probability bars. Charts scale within their containers. `amfl-theme.css` supplies the shared red/blue appearance, with gold reserved for accents, across the main site, records and player-history pages. `responsive-tables.js` labels dynamic archive tables.

`research-tools.js` adds Team dashboard, Utilization, Position SOS, Compare players and League format. NFL weekly releases now include RBs, carries, standard PPR totals and recorded appearances. Offensive snap percentages come from nflverse's `snap_counts` release, matched only by unique normalized player-name/team/week; unverified matches remain missing. Snap percentage is the arithmetic mean across matched recorded weeks. Player/team stints remain separate; manager matching requires a unique normalized Sleeper player name on the selected season's roster. This is current-roster context, not historical ownership per NFL week.

Position SOS divides opponent standard-PPR allowed/game by the unweighted mean of all NFL defenses, minus 1. Selected-week averages exclude byes and missing opponents. These are retrospective season-to-date defensive ratings applied to a selectable schedule window, not opponent-adjusted projections. QB/RB/WR/TE supported; K/DST omitted for lack of comparable scored units.

Player comparison supports up to four players, an upcoming-week selector, observed PPR production, last four recorded appearances, opportunity shares and opponent allowed rank. It includes no expert consensus, licensed projection feeds or betting lines.

League format uses the next scorer after `league teams × starters` as each position's weekly replacement cutoff. Quality starts exceed that cutoff; signed points above replacement sum only covered appearances. This uses standard PPR and primary positions, excludes FLEX, and does not claim WAR or win projections. The team dashboard radar uses modeled primary-slot scoring, excludes FLEX, and is relative to the roster's own maximum position, not a league rank.

### Grouped research navigation and chart inspection

`research-ui.js` groups all 16 tool routes into Analyze, Season outlook, Manage team, and NFL research. Desktop category buttons reveal only that group's tools. Phones use category and tool selectors. Deep links retain their original `#research/tool` routes and select the matching category automatically; each group remembers its last visited tool during the session.

Roster strength uses the existing recent AMFL weekly baseline model, not market values or projections. Overall ranks are assigned only to complete covered lineups. Summary bars start at zero; slot bars normalize to the largest covered assignment of the same slot across managers and show the comparison count. FLEX cannot reuse an already assigned player. Bench totals exclude reserve/taxi slots. Recent scoring movers require all four recorded calendar weeks, comparing two two-week averages on the current roster.

Utilization scatter points support pointer hover, tap/click, keyboard focus, Enter/Space selection and Escape clearing. The inspection panel identifies player/team/position and the share and PPR/game plotted. Native titles remain as fallback. Position colors and stable manager identities are shared across links and roster graphics. Research and main-site headings retain neutral text with varied accents instead of coloring every label blue.
