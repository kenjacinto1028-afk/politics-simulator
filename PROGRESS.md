# Progress

- 2026-11-18: Scaffolded Vite+React+TS app, sim types, 5 political systems, 9 countries (7 real, 2 fantasy), monthly tick engine + tests, new-game + dashboard UI. Plan in `docs/PLAN.md`.

## Next
- Gameplay for the office after Mayor (Governor / Legislator / Board Member), then parties & legislature (#5).
- 2026-11-18: Added Federal Republic, Direct Democracy, Corporate State (8 systems total, each with a distinct mechanic). 50 countries (43 real, 7 fantasy); world size option 10/15/25/35/50. 5 tests pass.
- 2026-11-18: Save/load (autosave each month, 3 slots, JSON export/import; deterministic RNG so loads replay identically). Campaigns for first office with system-specific rules (votes / party standing / shareholder stake), 3 actions per month, debates, polls. Mayor gameplay: city stats, tax + budget sliders, 12 local events, re-election. Balance: active play wins ~60–65% of first races. 14 tests pass.
- 2026-11-18: Published a playable build as a private Claude artifact (no install needed).
- 2026-11-18: Easier first race (~75% for active play) with monthly tips. Mayor overhaul: 4 voter groups, 7-seat council (lobby/deals, votes), 8 multi-month projects, 8 laws with trade-offs, run for higher office after 18 months. Engine by Opus, screens by Sonnet. 21 tests pass. Play link updated.
