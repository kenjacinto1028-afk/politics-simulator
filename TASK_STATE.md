# Task state

- [x] Scaffold Vite React TS app — package.json, src/
- [x] Sim core: types, systems, countries, engine, tests — src/sim, src/data
- [x] UI: new game + dashboard — src/ui, src/App.tsx
- [x] Docs: PLAN, model routing, PROGRESS — docs/PLAN.md, claude/model-routing.md
- [x] 8 systems (federal, direct democracy, corporate state) — src/data/systems.ts
- [x] 50 countries + world sizes 10/15/25/35/50 — src/data/countries.ts, src/ui/NewGame.tsx
- [x] Push to GitHub — origin/main

## Save/load + Mayor (branch feat/save-load-mayor)
- [x] Save/load: autosave, 3 slots, export/import JSON — src/sim/save.ts, src/ui/SaveMenu.tsx
- [x] Campaign + election for first office — src/sim/career.ts
- [x] Mayor: city sim, budget, events, re-election — src/sim/city.ts, src/data/events.ts
- [x] UI: campaign, city, event modal, save menu — src/ui/Game.tsx
- [x] Tests + build green — 14 tests; balance ~60-65% first-race win for active play
- [x] Push branch + open PR

## Easier race + richer Mayor (branch feat/save-load-mayor)
- [x] Design doc — docs/MAYOR_DESIGN.md
- [x] Engine: voter groups, council, projects, laws, tips, next office — src/sim/mayor.ts, src/data/city-content.ts
- [x] Balance: first race ~75%, higher office ~55-65%, 21 tests — src/sim/mayor.test.ts
- [x] UI (Sonnet): groups, council, projects, laws, tips — src/ui/*.tsx
- [x] Browser play-test, republish play link, push

## Bug fixes + Governor (branch feat/save-load-mayor)
- [x] Event repeats: hashed RNG seeds + event memory/cooldown — src/sim/engine.ts, career.ts
- [x] Term rules: run higher only in final 6 months, lose = out of office, term limits, comebacks — career.ts, mayor.ts
- [x] Governor engine: state, cities, legislature, bills, laws, events — src/sim/governor.ts, src/data/state-content.ts
- [x] Governor UI (Sonnet) — src/ui/Governor.tsx
- [x] Tests (29), browser check, play link v3, push

## Lawmaker + funds tracker (branch feat/save-load-mayor)
- [x] Legislator engine: floor votes, own bills, committees, district funding, party revenge — src/sim/legislator.ts, src/data/legislature-content.ts
- [x] Balance + tests (33) — src/sim/legislator.test.ts
- [x] Lawmaker UI + funds tracker (Sonnet) — src/ui/Legislator.tsx, money.ts, Game.tsx, Governor.tsx, Projects.tsx
- [x] Browser check (mayor, governor, senator saves), play link v4, push

## Cabinet + Head of state (branch feat/save-load-mayor)
- [x] Engines drafted — src/sim/cabinet.ts, src/sim/nation.ts, src/data/cabinet-content.ts, nation-content.ts
- [x] Wire into career/engine/save/store, PLAYABLE_KINDS — career.ts, engine.ts, save.ts (v5), store.ts
- [x] Tests + balance sims — cabinet.test.ts, nation.test.ts
- [x] Screens (Sonnet): Cabinet.tsx, Nation.tsx, Retired.tsx, money.ts
- [x] Bug hunt 1: robot careers in all 8 systems — careers.test.ts; fixed freeze from old-job prompts
- [x] Bug hunt 2: browser click-through, 41 saves — fixed city panels showing for national jobs
- [x] Fix, play link v5, push, PR update

## Local country names (branch feat/local-names)
- [x] Local names for all 50 countries, shown beside English names — src/data/local-names.ts, NewGame/Game/Nation/Retired

## Systems play differently (branch feat/systems-differ)
- [x] System rules engine — src/sim/systems.ts
- [x] Politicians, leader personalities, faith — src/sim/people.ts, src/data/people.ts
- [x] 102 new events (Sonnet) + wiring — src/data/more-events.ts, career.ts
- [x] Diplomacy: summits, aid, alliances, reactions — src/sim/nation.ts
- [x] Tests — src/sim/people.test.ts; save v6
- [x] Screens (Sonnet) — People.tsx, SystemPanel.tsx, Nation.tsx, NewGame.tsx
- [x] Bug hunts (robot 8 systems, 43 browser saves + v5 save migration), play link v7, PR
