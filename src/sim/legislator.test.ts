import { describe, expect, it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { resolveEvent, startCareer } from './career';
import { castVote, chooseCommittee, cosponsorsNeeded, crossAisle, floorSpeech, gatherCosponsors, newSeat, secureFunding, startSponsoring, committeeChance } from './legislator';
import { SPONSOR_BILLS } from '../data/legislature-content';
import type { GameState } from './types';

function senator(seed = 4): GameState {
  const g0 = newGame(10, seed);
  const g = startCareer(g0, 'S', 'usa', rngFor(g0, 99));
  const p = g.player!;
  return { ...g, player: { ...p, office: 'senator', campaign: null, termMonthsLeft: 48, seat: newSeat('senator', rngFor(g, 3)), highestRung: 3, termsInOffice: 1, popularity: 50, loyalty: 50 } };
}

function step(g: GameState, voteYes = true): GameState {
  g = advanceMonth(g, rngFor(g));
  if (g.player!.pendingEvent) g = resolveEvent(g, 0);
  if (g.player!.seat?.pendingVote) g = castVote(g, voteYes);
  return g;
}

describe('legislator', () => {
  it('sits in the right chamber', () => {
    const s = senator().player!.seat!;
    expect(s.chamber).toBe('Senate');
    expect(s.seats).toBe(100);
  });

  it('floor votes arrive, block other actions, and breaking with the party costs standing', () => {
    let g = senator();
    for (let i = 0; i < 12 && !g.player!.seat!.pendingVote; i++) { g = advanceMonth(g, rngFor(g)); if (g.player!.pendingEvent) g = resolveEvent(g, 0); }
    const pv = g.player!.seat!.pendingVote!;
    expect(pv).not.toBeNull();
    expect(floorSpeech(g, rngFor(g, 1))).toBe(g);
    const rebel = castVote(g, !pv.partyWantsYes).player!;
    expect(rebel.loyalty).toBeLessThan(g.player!.loyalty);
    expect(rebel.seat!.votesAgainstParty).toBe(1);
    const loyal = castVote(g, pv.partyWantsYes).player!;
    expect(loyal.loyalty).toBeGreaterThan(g.player!.loyalty);
  });

  it('a sponsored bill moves from co-sponsors to committee to the floor', () => {
    let g = senator();
    g = chooseCommittee(g, 'health');
    const bill = SPONSOR_BILLS.find((b) => b.committee === 'health')!;
    g = startSponsoring(g, bill.id);
    expect(committeeChance(g.player!.seat!, bill)).toBe(1);
    let guard = 0;
    while (g.player!.seat!.sponsoring?.stage === 'cosponsors' && guard++ < 20) {
      for (let a = 0; a < 3; a++) g = gatherCosponsors(g, rngFor(g, 10 + a));
      g = step(g);
    }
    const seat = g.player!.seat!;
    expect(seat.sponsoring === null || seat.sponsoring.stage !== 'cosponsors').toBe(true);
    for (let i = 0; i < 4 && g.player!.seat!.sponsoring; i++) g = step(g);
    expect(g.player!.seat!.sponsoring).toBeNull();
    expect(g.log.some((l) => l.includes(bill.name) && (l.includes('passes') || l.includes('fails')))).toBe(true);
    expect(cosponsorsNeeded(seat)).toBe(20);
  });

  it('district funding spends influence; reaching across the aisle helps', () => {
    let g = senator();
    g = { ...g, player: { ...g.player!, seat: { ...g.player!.seat!, influence: 30 } } };
    const f = secureFunding(g, rngFor(g, 1)).player!.seat!;
    expect(f.influence).toBe(18);
    expect(f.districtFunding).toBeGreaterThan(0);
    expect(crossAisle(g, rngFor(g, 2)).player!.seat!.acrossAisle).toBeGreaterThan(g.player!.seat!.acrossAisle);
    const broke = { ...g, player: { ...g.player!, seat: { ...g.player!.seat!, influence: 5 } } };
    expect(secureFunding(broke, rngFor(g, 1))).toBe(broke);
  });
});
