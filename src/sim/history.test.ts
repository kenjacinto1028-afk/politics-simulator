import { describe, expect, it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { resolveEvent, startCareer } from './career';
import { addRun, careerScore, loadRuns, MONTHS_OUT_LIMIT, rankOf, retireNow, summarize } from './history';
import { SYSTEMS } from '../data/systems';
import type { GameState } from './types';

const start = (country = 'usa', seed = 3): GameState => { const g0 = newGame(10, seed); return startCareer(g0, 'P', country, rngFor(g0, 99)); };
const step = (g: GameState) => { g = advanceMonth(g, rngFor(g)); return g.player?.pendingEvent ? resolveEvent(g, 0) : g; };

function memKV() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

describe('career history and end game', () => {
  it('records elections, office changes and a snapshot every year', () => {
    let g = start();
    for (let i = 0; i < 30; i++) g = step(g);
    const h = g.player!.history!;
    expect(h.years.length).toBeGreaterThanOrEqual(2);
    expect(h.moments.some((m) => m.kind === 'election')).toBe(true);
    if (g.player!.office) expect(h.moments.some((m) => m.kind === 'office')).toBe(true);
  });

  it(`a career with no office for ${MONTHS_OUT_LIMIT / 12} years ends`, () => {
    let g = start();
    g = { ...g, player: { ...g.player!, office: null, campaign: null, history: { ...summarizeSafe(g), monthsOut: MONTHS_OUT_LIMIT - 1 } } };
    g = advanceMonth(g, rngFor(g));
    expect(g.player!.retired).toBe(true);
    expect(g.player!.history!.endReason).toBe('Out of office too long');
  });

  it('you can retire any time; the run gets a score, rank and story', () => {
    let g = start();
    for (let i = 0; i < 12; i++) g = step(g);
    g = retireNow(g);
    expect(g.player!.retired).toBe(true);
    const run = summarize(g);
    expect(run.endReason).toBe('Chose to retire');
    expect(Number.isFinite(run.score)).toBe(true);
    expect(run.grade).toMatch(/^[SABCDE]$/);
    expect(run.moments.some((m) => m.kind === 'end')).toBe(true);
  });

  it('reaching the top scores far more than a short stint', () => {
    const g = start();
    const top = SYSTEMS.federal.ladder.length - 1;
    const low = careerScore({ ...g, player: { ...g.player!, highestRung: 0 } }).total;
    const high = careerScore({ ...g, player: { ...g.player!, highestRung: top, record: { won: 6, lost: 1 } } }).total;
    expect(high).toBeGreaterThan(low + 300);
    expect(rankOf(800, false).grade).toBe('S');
    expect(rankOf(400, true).title).toBe('Disgraced');
    expect(rankOf(0, false).grade).toBe('E');
  });

  it('the Hall of Fame keeps runs sorted, without duplicates', () => {
    const kv = memKV();
    let g = retireNow(start());
    const a = summarize(g);
    addRun(kv, a);
    addRun(kv, a);
    g = retireNow(start('chn', 4));
    addRun(kv, { ...summarize(g), score: a.score + 50 });
    const runs = loadRuns(kv);
    expect(runs.length).toBe(2);
    expect(runs[0].score).toBeGreaterThanOrEqual(runs[1].score);
    expect(loadRuns({ getItem: () => 'not json', setItem: () => {} })).toEqual([]);
  });
});

function summarizeSafe(g: GameState) {
  return g.player!.history ?? advanceMonth(g, rngFor(g)).player!.history!;
}
