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
- [ ] Design doc — docs/MAYOR_DESIGN.md
- [ ] Engine: voter groups, council, projects, laws, tips, next office — src/sim/mayor.ts, src/data/city-content.ts
- [ ] Balance: first race ~75%, tests
- [ ] UI (Sonnet): groups, council, projects, laws, tips — src/ui/
- [ ] Browser play-test, republish play link, push
