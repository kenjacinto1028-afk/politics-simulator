# Progress

- 2026-11-18: Scaffolded Vite+React+TS app, sim types, 5 political systems, 9 countries (7 real, 2 fantasy), monthly tick engine + tests, new-game + dashboard UI. Plan in `docs/PLAN.md`.

## Next
- Cabinet offices (Minister, Vice President, Executive Director), then head of state.
- 2026-11-18: Added Federal Republic, Direct Democracy, Corporate State (8 systems total, each with a distinct mechanic). 50 countries (43 real, 7 fantasy); world size option 10/15/25/35/50. 5 tests pass.
- 2026-11-18: Save/load (autosave each month, 3 slots, JSON export/import; deterministic RNG so loads replay identically). Campaigns for first office with system-specific rules (votes / party standing / shareholder stake), 3 actions per month, debates, polls. Mayor gameplay: city stats, tax + budget sliders, 12 local events, re-election. Balance: active play wins ~60–65% of first races. 14 tests pass.
- 2026-11-18: Published a playable build as a private Claude artifact (no install needed).
- 2026-11-18: Easier first race (~75% for active play) with monthly tips. Mayor overhaul: 4 voter groups, 7-seat council (lobby/deals, votes), 8 multi-month projects, 8 laws with trade-offs, run for higher office after 18 months. Engine by Opus, screens by Sonnet. 21 tests pass. Play link updated.
- 2026-11-18: Fixed repeating events (better RNG seeding, events can't recur until 8 others happen, max one every 2 months; bills max one every 3 months). Term rules: run for higher office only in your final 6 months, instead of re-election; losing any race = out of office; term limits; comeback can target one rung above your best. Governor gameplay: a state with 5 cities and mayors, state budget, 60-seat legislature, 6 state laws, bills to sign/veto, 8 state crises, yearly State of the State. Saves migrate to v3. 29 tests.
- 2026-11-18: Lawmaker gameplay for every legislative office (Legislator, Senator, State Legislator, councillors, Board Member): floor votes with party pressure, your own bills (co-sponsors → committee → floor), 5 committees with perks, influence, cross-party ties, district funding, 6 lawmaker events. Funds tracker: campaign funds + city/state treasury (with monthly change) or district funding in the header; money shown before/after on events, bills, projects and grants. Saves v4. 33 tests.

## Cabinet + head of state + bug hunts
- Cabinet (ministry, initiatives, leader's trust, asks, reshuffles) and head of state (national budget, parliament, laws, diplomacy, war, removal, legacy, retirement) playable in all 8 systems.
- Robot career test across all systems; browser click-through of 41 saves. Fixed a game-freezing leftover-prompt bug and city panels showing in national jobs.
- Play link v5. 58 tests.

## Systems play differently
- Each system has its own rule and meter at every level (executive orders, coalition, public patience/strikes, royal favor/knighthood, patrons/purges, federal grants/defiance, referendums, share value/dividends).
- Politicians at every level with personalities, endorsements, joint deals, feuds; leader personalities shape cabinet life and world diplomacy; faith and faith leaders; summits, aid, alliances; 102 new events.
- 73 tests; robot careers in all 8 systems; browser check of 43 saves. Play link v7.
- 2026-11-18: Local names: cities, provinces/states, politicians, rivals and parties now come from each country (PH: Cebu City, Pampanga, Carmela Cruz...). Fantasy countries get invented local names. 83 tests pass.
