import { it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { startCareer } from './career';
import { SYSTEMS } from '../data/systems';
import { playMonth } from './robot';
import { summarize, careerScore } from './history';
const careerScoreLines = (g: any) => careerScore(g).lines.map((l) => l.label.slice(0, 22) + ' ' + l.points);
import type { SystemId } from './types';
const HOME: Record<SystemId, string> = { federal: 'usa', 'one-party': 'chn', parliamentary: 'deu', 'semi-presidential': 'fra', 'constitutional-monarchy': 'gbr', presidential: 'phl', 'direct-democracy': 'che', 'corporate-state': 'aurex' };
it('balance', () => {
  const N = Number(process.env.N ?? 8);
  for (const sys of Object.keys(HOME) as SystemId[]) {
    const rows: string[] = []; let top = 0, monthsTop = 0, won = 0, lost = 0, headM = 0, removed = 0; const grades: Record<string, number> = {}; const ends: Record<string, number> = {}; let score = 0; let pop = 0, popN = 0; let maxDebt = 0;
    const ladder = SYSTEMS[sys].ladder;
    for (let seed = 1; seed <= N; seed++) {
      const g0 = newGame(25, seed);
      let g = startCareer(g0, 'Robot', HOME[sys], rngFor(g0, 99));
      let reached = -1, tTop = -1;
      for (let m = 0; m < 480 && !g.player!.retired; m++) {
        g = playMonth(g, 1000); g = advanceMonth(g, rngFor(g));
        const p = g.player!;
        if (p.office) { const r = ladder.indexOf(p.office); if (r > reached) reached = r; if (r === ladder.length - 1 && tTop < 0) tTop = m; pop += p.popularity; popN++; }
        if (p.office === ladder[ladder.length - 1]) { headM++; maxDebt = Math.max(maxDebt, g.countries[p.countryId].economy.debtToGdp); }
      }
      const p = g.player!; won += p.record.won; lost += p.record.lost;
      if (tTop >= 0) { top++; monthsTop += tTop; }
      const s = summarize(g); score += s.score; if (seed === 1) console.log(sys, 'age', p.age, JSON.stringify(s.lines ?? (careerScoreLines(g)))); grades[s.grade] = (grades[s.grade] ?? 0) + 1;
      const e = p.history?.endReason ?? (p.retired ? '?' : 'still playing'); ends[e.slice(0, 30)] = (ends[e.slice(0, 30)] ?? 0) + 1;
      if (p.history?.removed) removed++;
    }
    console.log(`${sys.padEnd(24)} top ${top}/${N} (avg ${top ? Math.round(monthsTop / top) : '-'} mo) elections ${won}W-${lost}L leaderMo/run ${Math.round(headM / N)} removed ${removed} score ${Math.round(score / N)} grades ${JSON.stringify(grades)} pop ${Math.round(pop / Math.max(1, popN))} maxDebt ${Math.round(maxDebt)}\n    ends ${JSON.stringify(ends)}`);
  }
}, 600000);
