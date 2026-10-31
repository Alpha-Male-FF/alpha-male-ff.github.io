# AMFL FantasyPros refresh integration

This is an **opt-in** public-site data export, not an automatic transfer of a
FantasyPros PRO membership entitlement. It requires appropriate FantasyPros API
production access and permission to publish/redistribute the chosen fields.
Do not enable publication based solely on a free development API key.

## What's already implemented
- Official v2 API source: `https://api.fantasypros.com/public/v2/json`
- Reads weekly consensus FLEX rankings, rest-of-season FLEX rankings,
  and weekly PPR projections for QB/RB/WR/TE/K/DST.
- Writes only `fantasypros-data.json` after all data has been validated.
- Reuses the existing **Advanced Research** player rankings/projections UI.
- Existing `research-data.json` (league analyzer, power rankings, schedule,
  matchup, lineup, waivers and trades) remains an independent plugin snapshot.
  The public API does **not** replace the synced My Playbook plugin data.
- The workflow is **manual only** until rights and successful test results
  are confirmed; it has no schedule, so no unapproved recurring publication.

## To activate after authorization
1. In the GitHub repository, open **Settings → Secrets and variables → Actions**.
2. Add secret `FANTASYPROS_API_KEY` containing a **new, rotated** key.
   Never paste it into public code or a chat.
3. After verifying your API plan grants the intended public-site use, set
   repository variable `FANTASYPROS_PUBLICATION_APPROVED` to `true`.
   If you don't have permission, leave it unset.
4. In **Actions → Refresh FantasyPros research snapshot → Run workflow**,
   enter the upcoming NFL week number and run manually.
5. Review the refreshed Advanced Research table before considering a scheduled
   workflow. Every table identifies the saved snapshot and PPR scoring.

## Constraints
- Free API access is for development/prototyping, not production.
- FantasyPros says public redistribution requires an appropriate agreement.
- Do not publish images from FantasyPros' third-party image licenses.
- No player images, API credentials, or account-specific auth tokens are output.
- The workflow's credential never reaches the browser.
- This refresh does **not** automatically update personalized league research;
  that still requires an approved plugin/export workflow.
- Some API endpoints may have response-schema differences; the first test run
  should be reviewed before enabling periodic publication.

Sources: https://support.fantasypros.com/hc/en-us/articles/49749297704475-How-do-I-request-access-to-the-FantasyPros-API
and https://api.fantasypros.com/public/v2/docs
