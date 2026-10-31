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
