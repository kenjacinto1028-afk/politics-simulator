import { describe, expect, it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { startCareer } from './career';
import { SYSTEMS } from '../data/systems';
import { kindOf } from './offices';
import { playMonth } from './robot';
import type { GameState, SystemId } from './types';
import { summarize } from './history';

/** First country of each system in the 10-country world. */
const HOME: Record<SystemId, string> = {
  federal: 'usa', 'one-party': 'chn', parliamentary: 'deu', 'semi-presidential': 'fra', 'constitutional-monarchy': 'gbr',
  presidential: 'phl', 'direct-democracy': 'che', 'corporate-state': 'aurex',
};

/** Every number in the state must be finite: catches NaN/Infinity anywhere. */
function badNumbers(v: unknown, path = '', out: string[] = []): string[] {
  if (typeof v === 'number' && !Number.isFinite(v)) out.push(path);
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) badNumbers(x, `${path}.${k}`, out);
  return out;
}

function checkInvariants(g: GameState) {
  const p = g.player!;
  const bad = badNumbers(g);
  if (bad.length) throw new Error(`Non-finite numbers at turn ${g.turn}: ${bad.slice(0, 5).join(', ')}`);
  for (const [k, v] of Object.entries({ popularity: p.popularity, loyalty: p.loyalty, ...p.groups })) {
    if (v < 0 || v > 100) throw new Error(`${k} out of range: ${v}`);
  }
  if (p.funds < 0) throw new Error(`negative funds ${p.funds}`);
  if (p.office && kindOf(p.office) === 'cabinet' && !p.ministry) throw new Error('cabinet without ministry');
  if (p.office && kindOf(p.office) === 'head' && !p.nation) throw new Error('leader without nation');
  if (p.office && kindOf(p.office) === 'regional' && !p.region) throw new Error('governor without region');
  if (p.office && kindOf(p.office) === 'legislative' && !p.seat) throw new Error('lawmaker without seat');
  for (const c of Object.values(g.countries)) {
    if (c.stability < 0 || c.stability > 100) throw new Error(`${c.id} stability ${c.stability}`);
    if (c.economy.gdpBn <= 0) throw new Error(`${c.id} gdp ${c.economy.gdpBn}`);
  }
}

function career(system: SystemId, seed: number, months = 480) {
  const g0 = newGame(10, seed);
  let g = startCareer(g0, 'Robot', HOME[system], rngFor(g0, 99));
  let topReached = -1;
  const ladder = SYSTEMS[system].ladder;
  for (let m = 0; m < months && !g.player!.retired; m++) {
    g = playMonth(g, 1000);
    const p = g.player!;
    // Nothing may be left blocking the month.
    expect(!!(p.pendingEvent || p.region?.pendingBill || p.seat?.pendingVote || p.ministry?.pendingAsk), `blocked at turn ${g.turn}: ${p.office} ev=${p.pendingEvent?.id} bill=${p.region?.pendingBill} vote=${!!p.seat?.pendingVote} ask=${p.ministry?.pendingAsk} actions=${p.actionsLeft}`).toBe(false);
    if (!p.retired && !p.office && !p.campaign) throw new Error(`stuck out of office with no way back at turn ${g.turn}`);
    const turn = g.turn;
    g = advanceMonth(g, rngFor(g));
    expect(g.turn).toBe(turn + 1);
    checkInvariants(g);
    if (g.player!.office) topReached = Math.max(topReached, ladder.indexOf(g.player!.office));
  }
  if ((globalThis as { process?: { env: Record<string, string> } }).process?.env.DIAG) console.log(system, seed, 'top', topReached, '/', ladder.length - 1, 'turn', g.turn, 'retired', g.player!.retired, 'office', g.player!.office, 'rec', JSON.stringify(g.player!.record), '\n  ', g.log.filter((l) => /becomes|loses|re-elected|leaves|fires|removed|reconfirm|keeps|drops/.test(l)).slice(0, 8).reverse().join('\n   '));
  if (g.player!.retired) {
    expect(g.player!.history?.endReason, `${system} ${seed} end reason`).toBeTruthy();
    expect(Number.isFinite(summarize(g).score)).toBe(true);
  }
  return { g, topReached, top: ladder.length - 1 };
}

describe('full careers in every system', () => {
  for (const system of Object.keys(HOME) as SystemId[]) {
    it(`${system}: plays 40 years without broken numbers or stuck states`, () => {
      let reachedTop = 0;
      for (let seed = 1; seed <= 6; seed++) {
        const r = career(system, seed);
        if (r.topReached === r.top) reachedTop++;
      }
      // A determined robot should reach the top at least sometimes.
      expect(reachedTop).toBeGreaterThan(0);
    });
  }
});
