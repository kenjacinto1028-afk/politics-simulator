import { describe, expect, it } from 'vitest';
import { newGame, rngFor } from './engine';
import { keepsAppointment, startCareer, tickPlayer } from './career';
import { newNation } from './nation';
import { newHistory } from './history';
import { SYSTEMS } from '../data/systems';
import type { GameState } from './types';

function leader(country: string, yearsTop: number): GameState {
  const g0 = newGame(10, 3);
  const g = startCareer(g0, 'L', country, rngFor(g0, 99));
  const ladder = SYSTEMS[g.countries[country].systemId].ladder;
  const top = ladder[ladder.length - 1];
  const h = { ...newHistory(g), monthsByOffice: { [top]: yearsTop * 12 } };
  return { ...g, player: { ...g.player!, office: top, campaign: null, termMonthsLeft: 40, highestRung: ladder.length - 1, termsInOffice: 1, popularity: 60, loyalty: 60, actionsLeft: 5, history: h, nation: newNation(g.countries[country], rngFor(g, 5)) } };
}

describe('balance', () => {
  it('people tire of a leader who stays too long', () => {
    let fresh = leader('deu', 2), old = leader('deu', 14);
    for (let i = 0; i < 12; i++) { fresh = tickPlayer(fresh, rngFor(fresh, i)); old = tickPlayer(old, rngFor(old, i)); }
    expect(old.player!.popularity).toBeLessThan(fresh.player!.popularity - 5);
  });

  it('each extra term asks for more party standing', () => {
    const g = leader('chn', 5);
    const p1 = { ...g.player!, loyalty: 40, termsInOffice: 1 };
    const p4 = { ...g.player!, loyalty: 40, termsInOffice: 4 };
    expect(keepsAppointment(g, p1).ok).toBe(true);
    expect(keepsAppointment(g, p4).ok).toBe(false);
  });
});
