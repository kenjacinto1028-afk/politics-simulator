import { describe, expect, it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { availableActions, doAction, resolveEvent, setBudget, startCareer, ACTIONS_PER_MONTH } from './career';
import { deserialize, listSlots, loadFrom, saveTo, serialize, type KV } from './save';
import { SYSTEMS } from '../data/systems';
import type { GameState } from './types';

const memKV = (): KV => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

/** Plays a simple strategy: spend every action, always pick the first event choice. */
function play(g: GameState, months: number): GameState {
  for (let i = 0; i < months; i++) {
    const p = g.player!;
    if (p.pendingEvent) g = resolveEvent(g, 0);
    if (!p.campaign && !p.office) break;
    const mode = SYSTEMS[g.countries[p.countryId].systemId].advancement;
    for (let a = 0; a < ACTIONS_PER_MONTH; a++) {
      const opts = availableActions(mode, !!g.player!.campaign, !!g.player!.office);
      const f = g.player!.funds;
      const pref = mode === 'shares' ? (f >= 30 ? 'buy-shares' : 'fundraise') : mode === 'appointment' ? 'party-work'
        : f >= 25 && opts.includes('ads') ? 'ads' : f >= 5 ? 'rally' : 'fundraise';
      g = doAction(g, pref, rngFor(g, 10 + a));
    }
    if (g.player!.pendingEvent) g = resolveEvent(g, 0);
    g = advanceMonth(g, rngFor(g));
  }
  return g;
}

describe('career', () => {
  it('starts a campaign for the first rung of the ladder', () => {
    const g = startCareer(newGame(10, 7), 'Test', 'usa', rngFor(newGame(10, 7), 99));
    expect(g.player!.campaign!.office).toBe('mayor');
    expect(g.player!.office).toBeNull();
  });

  it('resolves the election after the campaign and either wins office or records a loss', () => {
    const g0 = newGame(10, 3);
    const g = play(startCareer(g0, 'Test', 'deu', rngFor(g0, 99)), 6);
    const p = g.player!;
    expect(p.campaign).toBeNull();
    expect(p.record.won + p.record.lost).toBe(1);
    if (p.record.won) expect(p.office).toBe('mayor');
  });

  it('an active player wins a fair share of first races in every system', () => {
    const ids = ['usa', 'chn', 'deu', 'che', 'aurex'];
    for (const id of ids) {
      let wins = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const g0 = newGame(10, seed);
        const g = play(startCareer(g0, 'T', id, rngFor(g0, 99)), 6);
        wins += g.player!.record.won;
      }
      // Target roughly 50-75% for a diligent player.
      expect(wins, id).toBeGreaterThanOrEqual(12);
      expect(wins, id).toBeLessThanOrEqual(26);
    }
  });

  it('a mayor serves a term and faces re-election, with city stats in range', () => {
    let won: GameState | null = null;
    for (let seed = 1; seed < 50 && !won; seed++) {
      const g0 = newGame(10, seed);
      const g = play(startCareer(g0, 'T', 'usa', rngFor(g0, 99)), 6);
      if (g.player!.office) won = g;
    }
    expect(won).not.toBeNull();
    const g = play(won!, 48);
    const p = g.player!;
    expect(p.record.won + p.record.lost).toBe(2);
    for (const v of [p.city!.crime, p.city!.happiness, p.city!.jobs, p.city!.services, p.city!.culture]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('spending actions is capped per month', () => {
    const g0 = newGame(10, 1);
    let g = startCareer(g0, 'T', 'usa', rngFor(g0, 99));
    for (let i = 0; i < 5; i++) g = doAction(g, 'door-knock', rngFor(g, i));
    expect(g.player!.actionsLeft).toBe(0);
  });

  it('budget is ignored out of office and normalized in office', () => {
    const g0 = newGame(10, 1);
    const g = startCareer(g0, 'T', 'usa', rngFor(g0, 99));
    expect(setBudget(g, 9, { police: 1, infrastructure: 1, welfare: 1, culture: 1 })).toBe(g);
    const inOffice = { ...g, player: { ...g.player!, office: 'mayor' as const } };
    const c = setBudget(inOffice, 9, { police: 10, infrastructure: 10, welfare: 10, culture: 10 }).player!.city!;
    expect(c.taxRate).toBe(9);
    expect(Object.values(c.spending).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('save/load', () => {
  it('round-trips a game through serialize and slots', () => {
    const g0 = newGame(15, 5);
    const g = play(startCareer(g0, 'Saver', 'fra', rngFor(g0, 99)), 3);
    expect(deserialize(serialize(g))).toEqual(g);
    const kv = memKV();
    saveTo(kv, 'slot2', g);
    expect(loadFrom(kv, 'slot2')).toEqual(g);
    expect(loadFrom(kv, 'slot1')).toBeNull();
    expect(listSlots(kv).map((s) => s.slot)).toEqual(['slot2']);
  });

  it('a loaded game continues identically (deterministic RNG)', () => {
    const g0 = newGame(10, 9);
    const g = startCareer(g0, 'D', 'usa', rngFor(g0, 99));
    const a = advanceMonth(g, rngFor(g));
    const loaded = deserialize(serialize(g));
    expect(advanceMonth(loaded, rngFor(loaded))).toEqual(a);
  });

  it('rejects bad files', () => {
    expect(() => deserialize('{}')).toThrow();
    expect(() => deserialize(JSON.stringify({ version: 99, game: {} }))).toThrow();
    expect(() => deserialize(JSON.stringify({ version: 1, game: { turn: 0 } }))).toThrow();
    expect(() => deserialize('not json')).toThrow();
  });
});
