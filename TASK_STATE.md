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

## Bug hunt before play link (branch feat/systems-differ)
- [x] Fuzz robot, every action with random args, 8 systems — src/sim/fuzz.test.ts
- [x] Fixes: dead buttons (feud leader as minister, coalition/unions/governors), events needing office fired out of office, endorsements carried to a new race, dividends too big, one-party without patron too harsh
- [x] Browser: phone width + dead-button check on 43 saves; merge, play link

## Mobile view (branch feat/mobile)
- [x] Phone layout: bottom tab bar + Next month, 44px tap targets, readable text, stacked diplomacy cards, bottom-sheet popups (Sonnet) — Game.tsx, Nation.tsx, index.css
- [x] Phone tests on 43 saves; fixed zoomed-out World tab (grid min-width) and popups behind tab bar (z-index)
- [x] Merge, play link

## Local city, region and people names (branch feat/local-names-people)
- [x] Name lists for all 50 countries — src/data/locales.ts (Sonnet): 14 cities, 8 regions, 24+24 names, 4 parties each; fantasy countries invented
- [x] Used everywhere — src/sim/names.ts; city, council, rivals, parties, regions, contacts, AI leaders (Opus)
- [x] Tested — 83 tests incl. locale coverage + PH career check; browser check PH/Eldmar/Japan, no errors
- [x] Merge, update play link

## Great powers, geopolitics and allies (branch feat/geopolitics)
- [x] Power data — src/data/geo.ts: region, bloc, army, nuclear, main export for 50 countries; rivalries (Opus)
- [x] Mechanics — src/sim/geo.ts: power tiers, influence, bloc pull, courting, bloc joins/exits, proxy civil wars, hostile-power sanctions, trade exports, war by army strength, nuclear deterrence (Opus)
- [x] 18 world events for every level with {power} (Sonnet) — src/data/geo-events.ts
- [x] Leader moves: join/leave bloc, buy arms, invite to bloc, back a side in civil wars
- [x] Allies: ask for aid/troops (favors, personality), allies call for help, refusing costs trust or the alliance
- [x] UI: World power panel, World table columns, Diplomacy bloc/allies cards; save v7 migration
- [x] Tested — 94 tests, fuzz incl. new actions, 43 old saves clicked through, phone layout

## Deepen country mechanics, simplified (branch feat/society)
- [x] Data — src/data/society.ts: 16 scores + 18 three-way policies (Opus)
- [x] Sim — src/sim/society.ts: scores settle toward targets (wealth, budget, policies, each other); living population (births, deaths, migration, aging); world climate, energy price, outbreaks; disasters; spy ops; effects on growth, inflation, stability, mood, voter groups; policy spending (Opus)
- [x] 40 score-triggered events (Sonnet) — src/data/society-events.ts, EventDef.when
- [x] UI — country scores panel (World tab, all levels), Policies panel (leader), spy buttons; save v8 migration
- [x] Tested — 100 tests, fuzz incl. policies/spying, 43 old saves clicked through, phone layout

## End game and career scores (branch feat/endgame)
- [x] Endings: retire at 75, leave top office, removal, 8 years without office, Retire now — src/sim/history.ts (Opus)
- [x] Career score (office, years, elections, popularity, country change, legacy, wars, scandals, removal) and rank S–E with titles
- [x] History: key moments timeline + yearly snapshots, recorded each month in advanceMonth
- [x] UI: end report card with chart, Career so far (More tab), Hall of Fame on main menu (browser storage, top 30)
- [x] Tested — 105 tests, browser retire flow desktop + phone

## AI countries act on their own (branch feat/ai-world)
- [x] Yearly AI policy decisions by traits, focus and problems — src/sim/ai.ts
- [x] AI elections, congresses, board ousters, coups, juntas — src/sim/ai.ts
- [x] AI pacts and wars, player can arm a side — src/sim/ai.ts
- [x] Offers and demands to the player, with expiry — src/sim/ai.ts, src/ui/WorldPower.tsx
- [x] Tests (118), fuzz, 43-save browser check
- [x] PR, merge, play link

## GitHub Pages + phone view (branch feat/pages-mobile)
- [x] gh-pages branch + auto-deploy workflow — .github/workflows/pages.yml
- [x] Phone fixes: folded diplomacy actions, table wrapping, stat values — src/index.css, src/ui/Nation.tsx, Game.tsx, Career.tsx
- [ ] Images, music and sound: waiting for Kenneth to pick
