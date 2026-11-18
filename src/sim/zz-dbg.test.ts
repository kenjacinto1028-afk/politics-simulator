import { it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { startCareer } from './career';
import { playMonth } from './careers.test';
it('dbg', () => {
  const g0 = newGame(10, 1);
  let g = startCareer(g0, 'R', 'usa', rngFor(g0, 99));
  for (let m = 0; m < 7; m++) {
    g = playMonth(g, 1000);
    const p = g.player!;
    console.log(m, p.popularity.toFixed(1), p.funds, p.actionsLeft, p.campaign?.poll.toFixed(1), g.log.slice(0, 3).join(' | '));
    g = advanceMonth(g, rngFor(g));
  }
});
