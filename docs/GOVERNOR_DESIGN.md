# Governor design

Each office has a *kind* (`src/sim/offices.ts`): local (Mayor), regional (Governor), legislative, cabinet, head. Local and regional are playable; the rest come next.

## Term rules (all offices)
- Re-election season opens in your final 6 months. In that window you can **run for higher office instead** (it replaces your re-election bid).
- Lose any race and you are out of office. A comeback can target any office up to one rung above your highest.
- Term limits (from the political system) block re-election; run higher or leave office.

## The state
5 cities (your home city + 4), each with a mayor who likes you more or less. State budget: tax rate (0–10%) and five priorities (schools, hospitals, roads, police, development) that drive education, health care, infrastructure, public safety and the economy. Happiness is their average, minus a tax penalty.

## Legislature (60 seats)
Your party holds 20–34 seats. Opposition votes depend on goodwill and how popular a law is. Low party standing causes defections.

## Actions
- Tour a city (+city mood, +mayor relationship, +popularity)
- State grant to a city ($100k)
- Host legislators (+goodwill, diminishing)
- State of the State address (once a year; boost scales with happiness)
- Propose / repeal 6 state laws (minimum wage, tax cut, free pre-school, state police, clean energy, public health coverage)
- Meet voter groups, fundraise, work the party

## Bills on your desk
About every 3 months the legislature sends a bill (8 kinds). Sign or veto. Vetoes cost goodwill.

## State events
8 state-level crises (hurricane, prison riot, teachers strike, factory closing, national funding cut, corruption probe, wildfire, tech HQ bid). Events can't repeat until 8 others have happened, and come at most every 2 months.

## Balance (simulated, diligent play)
Re-election as Governor ~65%. Mayor re-election is high for players who campaign hard.
