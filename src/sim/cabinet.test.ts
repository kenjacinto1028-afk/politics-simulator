import { describe, expect, it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { blockingPrompt, resolveEvent, startCareer } from './career';
import { answerAsk, briefLeader, choosePortfolio, FIRED_BELOW, initiativeCost, launchInitiative, newMinistry, requestBudget } from './cabinet';
import { PORTFOLIOS } from '../data/cabinet-content';
import type { GameState } from './types';

function minister(seed = 3): GameState {
  const g0 = newGame(10, seed);
  const g = startCareer(g0, 'M', 'deu', rngFor(g0, 99));
  const p = g.player!;
  return { ...g, player: { ...p, office: 'minister', campaign: null, termMonthsLeft: 60, highestRung: 2, termsInOffice: 1, popularity: 50, ministry: newMinistry(g.countries.deu) } };
}

describe('cabinet', () => {
  it('budget scales with the economy', () => {
    expect(minister().player!.ministry!.baseBudget).toBe(45);
  });

  it('first portfolio pick, then initiatives cost budget and pay off nationally', () => {
    let g = choosePortfolio(minister(), 'economy');
    const def = PORTFOLIOS.economy.initiatives[0];
    const cost = initiativeCost(g.player!.ministry!, def);
    const budget = g.player!.ministry!.budget;
    g = launchInitiative(g, def.id);
    expect(g.player!.ministry!.budget).toBeCloseTo(budget - cost, 1);
    const growth0 = g.countries.deu.economy.growth;
    for (let i = 0; i < def.months; i++) {
      g = advanceMonth(g, rngFor(g));
      if (g.player!.pendingEvent) g = resolveEvent(g, 0);
      if (g.player!.ministry?.pendingAsk) g = answerAsk(g, true);
    }
    expect(g.player!.ministry!.done).toContain(def.id);
    expect(g.countries.deu.economy.growth).not.toBe(growth0);
  });

  it('switching portfolio needs trust', () => {
    let g = choosePortfolio(minister(), 'health');
    g = { ...g, player: { ...g.player!, actionsLeft: 3, ministry: { ...g.player!.ministry!, boss: 50 } } };
    expect(choosePortfolio(g, 'finance')).toBe(g);
  });

  it('asks block the month and refusing costs trust', () => {
    const base = minister();
    const g = { ...base, player: { ...base.player!, ministry: { ...base.player!.ministry!, pendingAsk: 'a-tariffs' } } };
    expect(blockingPrompt(g.player)).toBe('ask');
    expect(briefLeader(g, rngFor(g, 1))).toBe(g);
    expect(answerAsk(g, false).player!.ministry!.boss).toBe(g.player!.ministry!.boss - 12);
    expect(answerAsk(g, true).player!.ministry!.boss).toBe(g.player!.ministry!.boss + 8);
  });

  it('a budget request backfires when trust is low', () => {
    const base = minister();
    const g = { ...base, player: { ...base.player!, ministry: { ...base.player!.ministry!, boss: 30 } } };
    const after = requestBudget(g).player!.ministry!;
    expect(after.budget).toBe(g.player!.ministry!.budget);
    expect(after.boss).toBeLessThan(30);
  });

  it('the leader fires you when trust collapses, and the old desk is cleared', () => {
    const base = minister();
    let g: GameState = { ...base, player: { ...base.player!, ministry: { ...base.player!.ministry!, boss: FIRED_BELOW - 5 } } };
    g = advanceMonth(g, rngFor(g));
    expect(g.player!.office).toBeNull();
    expect(g.player!.ministry).toBeNull();
    expect(g.player!.retired).toBe(false);
  });

  it('a trusted minister is kept on at the end of the term; a distrusted one is dropped', () => {
    const base = minister();
    const end = (boss: number) => {
      let g: GameState = { ...base, player: { ...base.player!, termMonthsLeft: 1, ministry: { ...base.player!.ministry!, boss } } };
      g = advanceMonth(g, rngFor(g));
      return g.player!;
    };
    expect(end(60).office).toBe('minister');
    expect(end(60).termMonthsLeft).toBe(60);
    expect(end(30).office).toBeNull();
  });
});
