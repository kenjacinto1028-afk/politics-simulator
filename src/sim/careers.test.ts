import { describe, expect, it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { availableActions, comebackOptions, doAction, resolveEvent, runAgain, runForHigher, startCareer, type CampaignAction } from './career';
import { higherOfficeBlocker, meetGroup, nextOffice } from './mayor';
import { decideBill, visitCity } from './governor';
import { castVote, floorSpeech } from './legislator';
import { answerAsk, briefLeader, choosePortfolio, launchInitiative } from './cabinet';
import { canAddress, courtParliament, nationalAddress } from './nation';
import { PORTFOLIOS } from '../data/cabinet-content';
import { SYSTEMS } from '../data/systems';
import { kindOf } from './offices';
import { askEndorsement, endorseBlocker, meetContact, visibleContacts } from './people';
import { buyback, choosePatron, consultCoalition, lobbyCapital, negotiateUnions, patronBlocker, payRespects, royalOccasion } from './systems';
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

/** A simple player robot: answers every prompt, campaigns, governs a little, and always reaches higher. */
export function playMonth(g: GameState, rngSalt: number): GameState {
  let i = 0;
  const r = () => rngFor(g, rngSalt + i++);
  const mode = SYSTEMS[g.countries[g.player!.countryId].systemId].advancement;
  for (let k = 0; k < 8; k++) {
    const p = g.player!;
    if (p.retired) return g;
    if (p.pendingEvent) { g = resolveEvent(g, Math.floor(r()() * p.pendingEvent.choices.length)); continue; }
    if (p.region?.pendingBill) { g = decideBill(g, r()() < 0.6); continue; }
    if (p.seat?.pendingVote) { g = castVote(g, p.seat.pendingVote.partyWantsYes); continue; }
    if (p.ministry?.pendingAsk) { g = answerAsk(g, p.ministry.boss < 70); continue; }
    if (!p.office && !p.campaign) { const opts = comebackOptions(g); g = runAgain(g, r(), opts[opts.length - 1]); continue; }
    if (p.actionsLeft <= 0) break;
    const before = g;
    // Work the system's signature rule and the people around you.
    const sysId = g.countries[p.countryId].systemId;
    const m = p.sys.meter;
    if (sysId === 'one-party' && !p.sys.patronId) {
      const pat = visibleContacts(g).find((c) => !patronBlocker(g, c.id));
      if (pat) { g = choosePatron(g, pat.id); if (g !== before) continue; }
      const boss = visibleContacts(g).filter((c) => c.party === 'yours' && c.rung > Math.max(0, p.highestRung)).sort((a, b) => b.relation - a.relation)[0];
      if (boss && k % 2 === 0) { g = meetContact(g, boss.id, r()); if (g !== before) continue; }
    }
    const upkeep = sysId === 'one-party' && p.sys.patronId && m < 55 ? payRespects(g, r())
      : sysId === 'parliamentary' && m < 40 ? consultCoalition(g, r())
      : sysId === 'semi-presidential' && m < 35 ? negotiateUnions(g, r())
      : sysId === 'constitutional-monarchy' && m < 45 ? royalOccasion(g, r())
      : sysId === 'federal' && m < 40 ? lobbyCapital(g, r())
      : sysId === 'corporate-state' && m < 35 && p.funds > 60 ? buyback(g) : g;
    if (upkeep !== g) { g = upkeep; continue; }
    if (p.campaign) {
      const backer = visibleContacts(g).find((c) => !endorseBlocker(p, c));
      if (backer) { g = askEndorsement(g, backer.id); continue; }
    }
    const next = nextOffice(g);
    if (next && !higherOfficeBlocker(g)) { g = runForHigher(g, next, r()); if (g !== before) continue; }
    const kind = kindOf(p.office);
    if (p.campaign || !p.office) {
      const acts = availableActions(mode, !!p.campaign, !!p.office, kind === 'local');
      const pref: CampaignAction[] = p.funds < 30 && k % 3 === 0 ? ['fundraise'] : mode === 'election' ? ['ads', 'rally', 'door-knock', 'party-work', 'fundraise'] : mode === 'shares' ? ['buy-shares', 'ads', 'fundraise'] : ['party-work', 'rally', 'fundraise'];
      const a = pref.find((x) => acts.includes(x) && g !== (g = doAction(g, x, r())));
      if (a) continue;
    } else if (kind === 'cabinet') {
      const m = p.ministry!;
      if (!m.portfolio) g = choosePortfolio(g, 'economy');
      else {
        const d = PORTFOLIOS[m.portfolio].initiatives.find((x) => !m.done.includes(x.id));
        if (d) g = launchInitiative(g, d.id);
        if (g === before) g = briefLeader(g, r());
      }
    } else if (kind === 'head') {
      if (canAddress(g)) g = nationalAddress(g);
      else if (mode !== 'election' && p.loyalty < 45) g = doAction(g, mode === 'shares' ? (p.funds >= 30 ? 'buy-shares' : 'fundraise') : 'party-work', r());
      else g = courtParliament(g, r());
    } else if (kind === 'regional') g = visitCity(g, 0, r());
    else if (kind === 'legislative') g = floorSpeech(g, r());
    else g = meetGroup(g, 'workers', r());
    if (g === before) g = doAction(g, 'fundraise', r());
    if (g === before) break;
  }
  return g;
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
