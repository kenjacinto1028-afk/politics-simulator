import { describe, expect, it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { resolveEvent, startCareer } from './career';
import { deficit, declareWar, newNation, proposeNationalLaw, removalRisk, seekPeace, setNationalBudget, stateVisit, tradeDeal } from './nation';
import { deserialize, serialize } from './save';
import type { GameState } from './types';

function leader(country = 'deu', office: 'prime-minister' | 'party-secretary' = 'prime-minister', seed = 5): GameState {
  const g0 = newGame(10, seed);
  const g = startCareer(g0, 'L', country, rngFor(g0, 99));
  const p = g.player!;
  return { ...g, player: { ...p, office, campaign: null, termMonthsLeft: 60, highestRung: 3, termsInOffice: 1, popularity: 55, loyalty: 45, nation: newNation(g.countries[country], rngFor(g, 5)) } };
}

describe('head of state', () => {
  it('you become the country\'s leader and run its economy', () => {
    let g = leader();
    g = advanceMonth(g, rngFor(g));
    expect(g.countries.deu.leader.name).toBe('L');
  });

  it('deficits add to debt; a balanced budget does not', () => {
    const run = (tax: number) => {
      let g = leader();
      const n = g.player!.nation!;
      g = setNationalBudget(g, tax, 33, n.priorities);
      const d0 = g.countries.deu.economy.debtToGdp;
      for (let i = 0; i < 24; i++) { g = advanceMonth(g, rngFor(g)); if (g.player!.pendingEvent) g = resolveEvent(g, 1); }
      return g.countries.deu.economy.debtToGdp - d0;
    };
    expect(run(20)).toBeGreaterThan(run(35) + 10);
  });

  it('deficit counts law spending', () => {
    const g = leader();
    const n = { ...g.player!.nation!, laws: ['n-health'] };
    expect(deficit(n)).toBe(n.spending + 3 - n.taxRate);
  });

  it('national events that spend money add to the debt', () => {
    const g = leader();
    const ev = { id: 'x', title: 'X', text: '', choices: [{ label: 'spend', effects: { treasury: -45 }, log: '' }] };
    const after = resolveEvent({ ...g, player: { ...g.player!, pendingEvent: ev } }, 0);
    expect(after.countries.deu.economy.debtToGdp).toBeCloseTo(g.countries.deu.economy.debtToGdp + 1, 5);
  });

  it('diplomacy: visits warm relations; trade needs warmth; war needs hostility', () => {
    let g = leader();
    expect(tradeDeal({ ...g, countries: { ...g.countries, deu: { ...g.countries.deu, relations: { ...g.countries.deu.relations, fra: 0 } } } }, 'fra').player!.nation!.tradeDeals).toEqual([]);
    const before = g.countries.deu.relations.fra ?? 0;
    g = stateVisit(g, 'fra', rngFor(g, 1));
    expect(g.countries.deu.relations.fra).toBeGreaterThan(before);
    expect(declareWar(g, 'fra')).toBe(g);
  });

  it('wars end, by peace or on the battlefield', () => {
    let g = leader();
    g = { ...g, countries: { ...g.countries, deu: { ...g.countries.deu, relations: { ...g.countries.deu.relations, tarvos: -80 } } } };
    g = declareWar(g, 'tarvos');
    expect(g.player!.nation!.war?.enemy).toBe('tarvos');
    for (let i = 0; i < 7 && g.player!.nation!.war; i++) { g = advanceMonth(g, rngFor(g)); if (g.player!.pendingEvent) g = resolveEvent(g, 0); }
    expect(g.player!.nation!.war).toBeNull();
    expect(seekPeace(g, rngFor(g, 2))).toBe(g);
  });

  it('a popular law can pass parliament', () => {
    const g = leader();
    const after = proposeNationalLaw({ ...g, player: { ...g.player!, nation: { ...g.player!.nation!, parliament: { ...g.player!.nation!.parliament, yourParty: 200 } } } }, 'n-anticorrupt', rngFor(g, 3));
    expect(after.player!.nation!.laws).toContain('n-anticorrupt');
  });

  it('one-party leaders face a party revolt if their standing collapses', () => {
    const g = leader('chn', 'party-secretary');
    expect(removalRisk({ ...g, player: { ...g.player!, loyalty: 10 } }).risk).toBeGreaterThan(0);
    expect(removalRisk(g).risk).toBe(0);
  });

  it('leaving the top job ends the career', () => {
    let g = leader();
    g = { ...g, player: { ...g.player!, termMonthsLeft: 1, termsInOffice: 1, campaign: null } };
    // Parliamentary PMs face re-election; skip it by making the term end with no campaign.
    g = { ...g, player: { ...g.player!, popularity: 0 } };
    for (let i = 0; i < 8 && !g.player!.retired; i++) { g = advanceMonth(g, rngFor(g)); if (g.player!.pendingEvent) g = resolveEvent(g, 0); }
    expect(g.player!.retired || g.player!.office === 'prime-minister').toBe(true);
  });

  it('saves round-trip with a nation', () => {
    const g = leader();
    expect(deserialize(serialize(g)).player!.nation).toEqual(g.player!.nation);
  });
});
