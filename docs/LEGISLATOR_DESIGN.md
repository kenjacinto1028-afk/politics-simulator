# Lawmaker design

Covers every legislative office: State Legislator, Legislator, Senator, Cantonal/Federal Councillor and Board Member. Code: `src/sim/legislator.ts`, content in `src/data/legislature-content.ts`.

## Your seat
You sit in a chamber (Senate 100 seats, National Assembly 300, State Assembly 80, Board 15, and so on). Your party holds 40–60% of it.
- **Influence** (0–100): clout. Grows 0.5 a month and +8 for each bill you pass. At 70 you become a committee chair.
- **Across the aisle** (0–100): how well you work with the other party. Helps your bills pass.
- **District funding**: total public money you've won for your district. Shown as your funds tracker.

## Floor votes (about every 2 months)
A bill comes to the floor. Your party tells you how to vote. Voting with them: +party standing. Against: −party standing, +across the aisle. Your district reacts to how you vote (a yes gives the bill's effect on each group; a no gives roughly the opposite, halved). Vote against your party more often than with it and the party backs a strong challenger at re-election.

## Your own bills (one at a time, 8 to choose from)
1. **Co-sponsors**: gather 20% of the chamber (action, faster with influence and cross-party ties).
2. **Committee**: passes automatically if it's your committee or you're a chair; otherwise a monthly chance, dies after 4 months.
3. **Floor vote**: chance from your party's share, cross-party ties, influence and how hard the bill is. Passing: +popularity, +influence, district groups react.

## Actions
Floor speech (+popularity, +influence), lunch with the other party (+across the aisle, −a little party standing), win district funding (costs 12 influence, 7 on Infrastructure), join a committee, introduce a bill, gather co-sponsors, meet voter groups, fundraise (+50% on Finance), work the party.

## Committees
Finance (bigger fundraising), Health / Education / Public Safety (your bills in that area clear committee), Infrastructure (cheaper district funding).

## Balance (simulated, diligent play)
Re-election ~85–90% (incumbent lawmakers rarely lose), lower if you defy your party. About one of your own bills becomes law every 10 months.
