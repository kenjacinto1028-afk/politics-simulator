import { describe, expect, it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { resolveEvent, startCareer } from './career';
import { newNation, totalSpending } from './nation';
import { readValue, setPolicy, spyOp, tickSociety } from './society';
import { deserialize } from './save';
import { STATS, type StatId } from '../data/society';
import { SOCIETY_EVENTS } from '../data/society-events';
import { SYSTEMS } from '../data/systems';
import type { GameState } from './types';

function leader(country: string, seed = 5): GameState {
  const g0 = newGame(50, seed);
  const g = startCareer(g0, 'L', country, rngFor(g0, 99));
  const ladder = SYSTEMS[g.countries[country].systemId].ladder;
  return { ...g, player: { ...g.player!, office: ladder[ladder.length - 1], campaign: null, termMonthsLeft: 99, highestRung: ladder.length - 1, termsInOffice: 1, popularity: 55, loyalty: 60, actionsLeft: 5, nation: newNation(g.countries[country], rngFor(g, 5)) } };
}
const run = (g: GameState, months: number) => {
  for (let i = 0; i < months; i++) {
    g = advanceMonth({ ...g, player: g.player && { ...g.player, termMonthsLeft: 99, popularity: Math.max(30, g.player.popularity) } }, rngFor(g));
    if (g.player?.pendingEvent) g = resolveEvent(g, 0);
  }
  return g;
};

describe('country scores', () => {
  it('every country starts with every score in range, and rich countries are healthier', () => {
    const g = newGame(50, 1);
    for (const c of Object.values(g.countries)) for (const k of Object.keys(STATS) as StatId[]) {
      const v = c.society[k];
      expect(Number.isFinite(v), `${c.id} ${k}`).toBe(true);
      if (k !== 'migration') expect(v >= 0 && v <= 100, `${c.id} ${k} ${v}`).toBe(true);
    }
    expect(g.countries.che.society.health).toBeGreaterThan(g.countries.nga.society.health + 20);
    expect(g.countries.chn.society.press).toBeLessThan(g.countries.deu.society.press);
  });

  it('policies take an action, cost money and move scores over time', () => {
    let g = leader('phl');
    const spend = totalSpending(g.player!.nation!);
    const pub = setPolicy(g, 'healthcare', 2);
    expect(pub.player!.actionsLeft).toBe(4);
    expect(totalSpending(pub.player!.nation!)).toBeGreaterThan(spend);
    expect(setPolicy(pub, 'healthcare', 2)).toBe(pub);
    const priv = setPolicy(g, 'healthcare', 0);
    expect(run(pub, 24).countries.phl.society.health).toBeGreaterThan(run(priv, 24).countries.phl.society.health + 5);
    g = setPolicy(g, 'policing', 2);
    expect(run(g, 24).countries.phl.society.crime).toBeLessThan(run(leader('phl'), 24).countries.phl.society.crime);
  });

  it('people are born, die and move; the planet warms', () => {
    let g = newGame(25, 2);
    const pop = g.countries.nga.population;
    for (let i = 0; i < 120; i++) g = tickSociety({ ...g, turn: i }, rngFor(g, i));
    expect(g.countries.nga.population).not.toBeCloseTo(pop, 0);
    expect(g.world.climate).toBeGreaterThan(25);
  });

  it('spies steal or get caught', () => {
    const g = leader('usa');
    const outcomes = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const n = spyOp(g, 'chn', 'steal', rngFor(g, i));
      outcomes.add(n.countries.usa.society.tech > g.countries.usa.society.tech ? 'win' : n.countries.usa.relations.chn < g.countries.usa.relations.chn ? 'caught' : 'empty');
    }
    expect(outcomes.has('win')).toBe(true);
    expect(outcomes.has('caught')).toBe(true);
  });

  it('score events only fire when the score fits', () => {
    const g = newGame(10, 1);
    const c = g.countries.usa;
    expect(readValue(g, c, 'crime')).toBe(c.society.crime);
    expect(readValue(g, c, 'climate')).toBe(g.world.climate);
    expect(SOCIETY_EVENTS.length).toBeGreaterThanOrEqual(30);
    for (const e of SOCIETY_EVENTS) if (e.when) expect(['climate', 'outbreak', 'energyPrice', 'tourism', 'culture', ...Object.keys(STATS)]).toContain(e.when.stat);
  });

  it('old saves gain scores, policies and the world', () => {
    const g = leader('deu');
    const old = { ...g, world: undefined, countries: Object.fromEntries(Object.entries(g.countries).map(([id, c]) => { const { society: _s, ...rest } = c; return [id, rest]; })) };
    const loaded = deserialize(JSON.stringify({ version: 7, savedAt: '', game: old }));
    expect(loaded.countries.deu.society.health).toBeGreaterThan(50);
    expect(loaded.world.climate).toBe(25);
    expect(loaded.player!.nation!.policies).toEqual({});
  });
});
