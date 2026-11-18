import { describe, expect, it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { startCareer } from './career';
import { newNation } from './nation';
import { counterIntelSweep, sisterBlocker, sisterCity, tickAbroad, tradeTrip, tripBlocker } from './abroad';
import { ACHIEVEMENTS, earned, loadUnlocked, unlock } from './achievements';
import { SYSTEMS } from '../data/systems';
import type { GameState } from './types';

const always = (v: number) => () => v;

function mayor(): GameState {
  const g0 = newGame(10, 4);
  const g = startCareer(g0, 'M', 'phl', rngFor(g0, 99));
  const ladder = SYSTEMS.presidential.ladder;
  return { ...g, player: { ...g.player!, office: ladder[0], campaign: null, termMonthsLeft: 40, highestRung: 0, actionsLeft: 3 } };
}
function leader(country = 'phl'): GameState {
  const g0 = newGame(10, 4);
  const g = startCareer(g0, 'L', country, rngFor(g0, 99));
  const ladder = SYSTEMS[g.countries[country].systemId].ladder;
  return { ...g, player: { ...g.player!, office: ladder[ladder.length - 1], campaign: null, termMonthsLeft: 40, highestRung: ladder.length - 1, actionsLeft: 5, popularity: 50, loyalty: 50, nation: newNation(g.countries[country], rngFor(g, 5)) } };
}
const hostile = (g: GameState, from: string, to: string, v = -80): GameState => ({ ...g, countries: { ...g.countries, [from]: { ...g.countries[from], relations: { ...g.countries[from].relations, [to]: v } } } });

describe('world contact for mayors and governors', () => {
  it('a mayor can twin the city, up to three times', () => {
    let g = mayor();
    const culture = g.player!.city!.culture;
    g = sisterCity(g, 'jpn' in g.countries ? 'jpn' : 'usa');
    expect(g.player!.abroad!.sisters.length).toBe(1);
    expect(g.player!.city!.culture).toBeGreaterThan(culture);
    expect(g.player!.feats).toContain('sister-city');
    g = { ...g, player: { ...g.player!, actionsLeft: 5 } };
    g = sisterCity(sisterCity(g, 'chn'), 'deu');
    expect(sisterBlocker(g, 'fra')).toMatch(/Up to/);
  });

  it('a trade trip costs money and can bring jobs; then it has a cooldown', () => {
    const g = mayor();
    const won = tradeTrip(g, 'usa', always(0));
    expect(won.player!.city!.jobs).toBeGreaterThan(g.player!.city!.jobs);
    expect(won.player!.city!.treasury).toBeLessThan(g.player!.city!.treasury);
    expect(tripBlocker(won, 'usa')).toMatch(/Again in/);
    const lost = tradeTrip(g, 'usa', always(0.99));
    expect(lost.player!.popularity).toBeLessThan(g.player!.popularity);
  });

  it('foreign investors approach local leaders', () => {
    const g = tickAbroad(mayor(), always(0.01));
    expect(g.player!.pendingEvent?.id).toMatch(/^investor-/);
  });
});

describe('foreign spies and coups', () => {
  it('hostile countries meddle in a national campaign, or get caught', () => {
    let g = leader();
    g = hostile(g, 'chn', 'phl');
    const camp = { office: g.player!.office!, monthsLeft: 4, poll: 50, incumbent: true, rival: { name: 'R', party: 'X', popularity: 30, funds: 50 } };
    g = { ...g, countries: { ...g.countries, phl: { ...g.countries.phl, society: { ...g.countries.phl.society, intel: 0 } } }, player: { ...g.player!, campaign: camp } };
    const meddled = tickAbroad(g, always(0.0001));
    // intel 0 still catches at rng 0.0001 < 0; ensure one of the two outcomes happened
    const caught = !!meddled.player!.pendingEvent?.id.startsWith('spy-');
    const rumor = meddled.player!.campaign!.rival.popularity > 30;
    expect(caught || rumor).toBe(true);
  });

  it('a sweep raises the catch rate and costs an action', () => {
    const g = leader();
    const s = counterIntelSweep(g);
    expect(s.player!.nation!.counterIntelUntil).toBe(g.turn + 12);
    expect(s.player!.actionsLeft).toBe(4);
    expect(counterIntelSweep(s)).toBe(s);
  });

  it('a leader of a collapsing country can face a coup and survive or fall', () => {
    let g = leader();
    const friends = Object.fromEntries(Object.entries(g.countries).map(([id, c]) => [id, { ...c, relations: { ...c.relations, phl: 50 } }]));
    g = { ...g, countries: { ...friends, phl: { ...friends.phl, stability: 10, society: { ...friends.phl.society, unrest: 90 } } } };
    const survived = tickAbroad(g, always(0.001));
    expect(survived.player!.office).toBe(g.player!.office);
    expect(survived.player!.feats).toContain('survived-coup');
    let i = 0;
    const fell = tickAbroad({ ...g, player: { ...g.player!, popularity: 5, loyalty: 5 } }, () => (i++ % 2 === 0 ? 0.001 : 0.99));
    expect(fell.player!.retired).toBe(true);
    expect(fell.log[0]).toMatch(/removed from power/);
  });

  it('a long game with spies and investors never breaks', () => {
    let g = mayor();
    for (let i = 0; i < 120; i++) { if (g.player!.pendingEvent) g = { ...g, player: { ...g.player!, pendingEvent: null } }; g = advanceMonth(g, rngFor(g, i)); }
    expect(g.turn).toBeGreaterThan(100);
  });
});

describe('achievements', () => {
  it('badges are earned from the game and saved once', () => {
    const g = { ...mayor(), player: { ...mayor().player!, record: { won: 5, lost: 0 }, feats: ['sister-city'] } };
    const ids = earned(g);
    expect(ids).toEqual(expect.arrayContaining(['first-win', 'win-5', 'sister-city']));
    expect(ids).not.toContain('top');
    const mem: Record<string, string> = {};
    const kv = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; } };
    expect(unlock(ids, '2030-01', kv).length).toBe(ids.length);
    expect(unlock(ids, '2030-02', kv)).toEqual([]);
    expect(Object.keys(loadUnlocked(kv)).length).toBe(ids.length);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});
