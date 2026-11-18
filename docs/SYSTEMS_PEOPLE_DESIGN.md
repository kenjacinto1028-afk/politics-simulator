# Systems that play differently, people, faith

## System rules (src/sim/systems.ts)
Each system has a signature meter (0-100) that lasts your whole career, plus its own actions:
| System | Meter | Rule |
|---|---|---|
| Presidential | Political capital | Executive orders enact laws with no vote (30 capital); courts may strike them down within 6 months. |
| Parliamentary | Coalition | Each law drains it; it helps you win higher office; below 20 as leader, the government falls (snap election). |
| Semi-presidential | Public patience | Each reform drains it; below 15, a general strike. At the top, 35% chance of cohabitation (laws harder). |
| Constitutional monarchy | Royal favor | Sways every election; at 85 you're knighted (+5 popularity). |
| One-party | Patron favor | Pick a senior patron; purges every 30 months can remove you if patron favor or loyalty is weak; patrons can fall. |
| Federal | Ties to the capital | Monthly federal grant to your city/state; defying the capital wins local fans; at the top it's governors' cooperation on laws. |
| Direct democracy | Citizen trust | Call referendums to pass laws; citizens can force votes on your laws when trust is low. |
| Corporate | Share value | Follows results; pays dividends; below 20, hostile takeover risk. |

## Politicians (src/sim/people.ts)
Two people per rung of your ladder (yours and a rival), the national leader, and a faith leader. Each has 2 traits, a focus and a faith.
Actions: meet, ask for endorsement (in campaigns; adds up to 12 score points, x1.5 in appointment systems), joint deal with a peer (once a term), public attack.
Enemies above you brief the press against you; people retire and are replaced.

## Leaders
Every country's leader has traits/focus/faith. Hawks sour relations and clash; peacemakers warm them. As a minister: vain leaders punish outshining and refusals harder, loyal patrons reward backing, technocrats reward results, populists ask for support more often, and results in the leader's focus area earn extra trust.

## Faith
Countries have a main faith and religiosity. You pick your faith. Faith leaders' favor (0-100) sways votes in proportion to religiosity. Outreach raises it (officially atheist one-party states frown on it).

## Diplomacy
Added: world summit (yearly, $5bn), foreign aid ($10bn, +12), defense alliances (relations 60+, 75+ with cautious leaders; allies help in wars and deter attacks). Leaders react: hawks/vain retaliate against sanctions; doves welcome visits. Hostile hawks can declare war on you.

## Events
102 new events (src/data/more-events.ts): every job incl. out of office, 4 per system, 10 religion, 12 relationship. Names/places filled in at fire time.
