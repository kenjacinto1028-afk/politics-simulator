import { describe, expect, it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { resolveEvent, startCareer } from './career';
import { courtLegislature, decideBill, forecastLaw, grantCity, newRegion, proposeStateLaw, setStateBudget, stateAddress, visitCity, GRANT_COST } from './governor';
import { STATE_LAWS } from '../data/state-content';
import type { GameState } from './types';

function governor(seed = 3): GameState {
  const g0 = newGame(10, seed);
  const g = startCareer(g0, 'G', 'phl', rngFor(g0, 99));
  const p = g.player!;
  const region = newRegion(p.city!.name, rngFor(g, 7));
  return { ...g, player: { ...p, office: 'governor', campaign: null, termMonthsLeft: 48, region, highestRung: 1, termsInOffice: 1, popularity: 50 } };
}

/** Advance a month, clearing any event or bill by signing. */
function step(g: GameState): GameState {
  g = advanceMonth(g, rngFor(g));
  if (g.player!.pendingEvent) g = resolveEvent(g, 0);
  if (g.player!.region?.pendingBill) g = decideBill(g, true);
  return g;
}

describe('governor', () => {
  it('creates a state around your home city', () => {
    const r = governor().player!.region!;
    expect(r.cities).toHaveLength(5);
    expect(r.cities[0].home).toBe(true);
    expect(r.cities[0].name).toBe(governor().player!.city!.name);
  });

  it('city visits and grants help that city and its mayor', () => {
    const g = governor();
    const r = g.player!.region!;
    const v = visitCity(g, 2, rngFor(g, 1)).player!.region!;
    expect(v.cities[2].mayorRelationship).toBeGreaterThan(r.cities[2].mayorRelationship);
    const gr = grantCity(g, 3).player!.region!;
    expect(gr.treasury).toBe(r.treasury - GRANT_COST);
    expect(gr.cities[3].happiness).toBeGreaterThan(r.cities[3].happiness);
  });

  it('bills reach the desk and signing or vetoing clears them; vetoes cost goodwill', () => {
    let g = governor();
    for (let i = 0; i < 24 && !g.player!.region!.pendingBill; i++) {
      g = advanceMonth(g, rngFor(g));
      if (g.player!.pendingEvent) g = resolveEvent(g, 0);
    }
    expect(g.player!.region!.pendingBill).not.toBeNull();
    // Actions are blocked until the bill is handled.
    expect(courtLegislature(g, rngFor(g, 1))).toBe(g);
    const goodwill = g.player!.region!.legislature.goodwill;
    const vetoed = decideBill(g, false).player!.region!;
    expect(vetoed.pendingBill).toBeNull();
    expect(vetoed.legislature.goodwill).toBeLessThan(goodwill);
  });

  it('bills are spaced at least 3 months apart', () => {
    let g = governor(11);
    const months: number[] = [];
    for (let i = 0; i < 48; i++) {
      g = advanceMonth(g, rngFor(g));
      if (g.player!.pendingEvent) g = resolveEvent(g, 0);
      if (g.player!.region!.pendingBill) { months.push(g.turn); g = decideBill(g, true); }
    }
    expect(months.length).toBeGreaterThan(4);
    for (let i = 1; i < months.length; i++) expect(months[i] - months[i - 1]).toBeGreaterThanOrEqual(3);
  });

  it('laws pass with a friendly legislature and fail with a hostile one', () => {
    const g = governor();
    const law = STATE_LAWS.find((l) => l.id === 'prek')!;
    const friendly = { ...g, player: { ...g.player!, loyalty: 80, region: { ...g.player!.region!, legislature: { seats: 60, yourParty: 34, goodwill: 80 } } } };
    expect(forecastLaw(friendly.player!, law).yes).toBeGreaterThanOrEqual(31);
    expect(proposeStateLaw(friendly, 'prek', rngFor(friendly, 2)).player!.region!.laws).toContain('prek');
    const hostile = { ...g, player: { ...g.player!, loyalty: 0, region: { ...g.player!.region!, legislature: { seats: 60, yourParty: 22, goodwill: 5 } } } };
    expect(proposeStateLaw(hostile, 'prek', rngFor(hostile, 2)).player!.region!.laws).not.toContain('prek');
  });

  it('state address has a yearly cooldown', () => {
    const g = stateAddress(governor());
    expect(g.player!.popularity).not.toBe(governor().player!.popularity);
    expect(stateAddress(g)).toBe(g);
  });

  it('budget normalizes and a 4-year term keeps stats in range', () => {
    let g = setStateBudget(governor(), 7, { schools: 1, hospitals: 1, roads: 1, police: 1, development: 1 });
    expect(Object.values(g.player!.region!.budget).reduce((a, b) => a + b, 0)).toBe(100);
    for (let i = 0; i < 40; i++) g = step(g);
    const r = g.player!.region!;
    for (const v of [...Object.values(r.stats), r.happiness]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); }
    expect(g.player!.office).toBe('governor');
  });
});
