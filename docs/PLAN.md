# Plan

## Stack
- **Vite + React + TypeScript** (web, no backend; deploy to GitHub Pages)
- **Zustand** for game state; pure-TS **sim engine** (`src/sim/`) independent of UI, seedable RNG
- **Vitest** for engine tests; save games in `localStorage` (later IndexedDB)

## Design
- 1 turn = 1 month. Player nation = detailed sim (cities/regions, budget, parties, laws, media). Others = high-level stats (GDP, growth, approval, stability, relations).
- **8 political systems**, shared templates: presidential, parliamentary, semi-presidential, constitutional monarchy, one-party, federal (strong states), direct democracy (referendums + rotating council), corporate state (fantasy; shareholder votes). Each defines ladder, terms, electoral freedom, how you advance (election/appointment/shares).
- **World sizes:** 10 (test), 15, 25 (standard), 35, 50 (realistic). The first 10 cover all 8 systems.
- Countries: real (fictionalized leaders) + fantasy.
- Career: Mayor → … → head of state/government per system. Each office has distinct powers, decisions, and events.

## Roadmap
| # | Feature | Model |
|---|---|---|
| 1 | Scaffold, types, seed data, monthly tick, world table | Sonnet ✅ |
| 2 | Save/load + new-game options (seed, start year) | Sonnet |
| 3 | Mayor: city budget, approval, local events | Opus (design) → Sonnet (UI) |
| 4 | Elections & campaigns (polls, funds, debates, endorsements) | Opus |
| 5 | Parties & factions, legislature votes | Opus |
| 6 | Promotions up the ladder per political system | Sonnet |
| 7 | National detail: economy, population, migration, tourism, culture | Opus |
| 8 | Diplomacy, trade, wars (high-level for AI nations) | Opus |
| 9 | News feed & event writing | Haiku |
| 10 | More countries + fantasy nations, map view | Haiku (data) / Sonnet (map) |
| 11 | Balancing pass | Opus |
