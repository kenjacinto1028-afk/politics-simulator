import { describe, expect, it } from 'vitest';
import { advanceMonth, newGame } from './engine';
import { makeRng } from './rng';

describe('engine', () => {
  it('advances the calendar and keeps stats in range', () => {
    let s = newGame();
    const rng = makeRng(42);
    for (let i = 0; i < 24; i++) s = advanceMonth(s, rng);
    expect(s.turn).toBe(24);
    expect(s.year).toBe(2028);
    for (const c of Object.values(s.countries)) {
      expect(c.leader.approval).toBeGreaterThanOrEqual(5);
      expect(c.leader.approval).toBeLessThanOrEqual(95);
      expect(c.economy.gdpBn).toBeGreaterThan(0);
    }
  });
  it('is deterministic for a given seed', () => {
    const a = advanceMonth(newGame(), makeRng(1));
    const b = advanceMonth(newGame(), makeRng(1));
    expect(a).toEqual(b);
  });
});

import { WORLD_SIZES, seedCountries } from '../data/countries';
import { SYSTEMS } from '../data/systems';

describe('world setup', () => {
  it('builds each world size with exactly N unique countries', () => {
    for (const n of WORLD_SIZES) expect(Object.keys(seedCountries(n))).toHaveLength(n);
  });
  it('smallest world includes every political system', () => {
    const used = new Set(Object.values(seedCountries(10)).map((c) => c.systemId));
    expect(used.size).toBe(Object.keys(SYSTEMS).length);
  });
  it('fantasy-only systems are used only by fantasy nations', () => {
    for (const c of Object.values(seedCountries(50))) {
      if (SYSTEMS[c.systemId].fantasyOnly) expect(c.fantasy).toBe(true);
    }
  });
});
