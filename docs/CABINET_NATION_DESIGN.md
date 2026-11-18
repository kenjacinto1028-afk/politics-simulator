# Cabinet and Head of State

## Cabinet (Minister, Vice President, Executive Director)
- You run one ministry (pick a portfolio: Finance, Health, Education, Interior, Foreign, Economy).
- Ministry budget is about 1% of GDP ($bn) and refills monthly up to 1.5x.
- Initiatives (3 per portfolio) cost budget, take months, and change the national economy and voter groups.
- Leader's trust ("boss"): briefings raise it; outshining the leader lowers it. Below 15 you're fired.
- The leader sometimes asks for public backing: back (+8 trust) or refuse (-12 trust, +2 popularity).
- No re-election: at term end you're kept on if trust is 40+, or you run for the top job in your final 6 months.

## Head of state (President, PM, Party Secretary, Council President, Chairman)
- Detailed national sim replaces the generic one for your country: tax, spending, five priorities, deficit and debt.
- Parliament: seats, goodwill, national laws (8). Removal risk: impeachment, no-confidence, or party/board revolt.
- Diplomacy: state visits, trade deals (relations 30+), sanctions, war (relations -50 or worse), peace talks.
- Elected systems face re-election; one-party/corporate leaders are reconfirmed if party/board standing is 30+ (it fades monthly).
- Leaving the top job (term limit, loss, removal) or reaching age 75 ends the career with a legacy score.

## Bug hunts
- `src/sim/careers.test.ts`: a robot plays 40-year careers in all 8 systems, checks every number is finite and in range, and that nothing blocks the month.
- Browser click-through of every office in every system (41 saves): no page errors, no NaN/undefined on screen.
- Fixed: a past job's unanswered prompt (bill, vote, ask) could freeze "Next month" forever. Old saves are cleaned on load.
