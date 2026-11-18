import { describe, expect, it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { doAction, resolveEvent, startCareer } from './career';
import { SYSTEMS } from '../data/systems';
import { balanceEvent, upsDowns } from './choices';
import { MORE_EVENTS } from '../data/more-events';
import { CITY_EVENTS } from '../data/events';
import { SOCIETY_EVENTS } from '../data/society-events';
import { GEO_EVENTS } from '../data/geo-events';
import { homeEdge, opinionOf, repOf, supportByArea, visitHometown } from './reputation';
import { scandalOf, tickScandal } from './scandals';
import type { GameState } from './types';

function mayor(seed = 3): GameState {
  const g0 = newGame(10, seed);
  const g = startCareer(g0, 'P', 'usa', rngFor(g0, 99));
  return { ...g, player: { ...g.player!, office: SYSTEMS[g.countries.usa.systemId].ladder[0], campaign: null, termMonthsLeft: 48, highestRung: 0, termsInOffice: 1 } };
}

describe('event choices', () => {
  const all = [...MORE_EVENTS, ...CITY_EVENTS, ...SOCIETY_EVENTS, ...GEO_EVENTS];
  it('every choice has a cost and a gain, and most events offer 3+ options', () => {
    const p = mayor().player!;
    let three = 0;
    for (const ev of all) {
      const b = balanceEvent(ev, p, 10);
      if (b.choices.length >= 3) three++;
      for (const ch of b.choices) {
        const { up, down } = upsDowns(ch.effects);
        expect(down, `${ev.id}: ${ch.label} has no downside`).toBeGreaterThan(0);
        expect(up, `${ev.id}: ${ch.label} has no upside`).toBeGreaterThan(0);
      }
    }
    expect(three / all.length).toBeGreaterThan(0.8);
  });
  it('taking a donor check leaves a favor owed', () => {
    const ev = balanceEvent(CITY_EVENTS.find((e) => e.id === 'donor')!, mayor().player!, 10);
    expect(ev.choices[0].effects.secret?.favor).toBeTruthy();
  });
});

describe('scandals', () => {
  it('a favor comes due, and paying it back clears it', () => {
    let g = mayor();
    g = { ...g, player: { ...g.player!, scandal: { heat: 0, nextId: 2, exposed: 0, secrets: [{ id: 's1', text: 'took money', sev: 1, turn: 0, donor: 'D', favor: 'a permit', amount: 10, due: g.turn }] } } };
    const t = tickScandal(g, rngFor(g));
    expect(t.event?.id).toBe('sc-favor');
    g = { ...t.game, player: { ...t.game.player!, pendingEvent: t.event, funds: 100 } };
    g = resolveEvent(g, 1);
    expect(scandalOf(g.player!).secrets).toHaveLength(0);
    expect(g.player!.funds).toBe(90);
    expect(repOf(g.player!).integrity).toBeGreaterThan(0);
  });
  it('heavy secrets come out over time and count as scandals', () => {
    let g = mayor();
    g = { ...g, player: { ...g.player!, scandal: { heat: 80, nextId: 3, exposed: 0, secrets: [{ id: 's1', text: 'hid a bribe', sev: 3, turn: 0 }, { id: 's2', text: 'faked expenses', sev: 2, turn: 0 }] } } };
    let exposed = 0;
    for (let i = 0; i < 48; i++) {
      g = advanceMonth({ ...g, player: { ...g.player!, termMonthsLeft: 48 } }, rngFor(g));
      if (g.player!.pendingEvent?.id === 'sc-exposed') { exposed++; g = resolveEvent(g, 0); }
      else if (g.player!.pendingEvent) g = resolveEvent(g, 0);
    }
    expect(exposed).toBeGreaterThan(0);
    expect(g.player!.history?.scandals ?? 0).toBeGreaterThan(0);
  });
  it('fundraising sometimes brings a donor with strings', () => {
    let g = mayor();
    let offers = 0;
    for (let i = 0; i < 60; i++) {
      g = { ...g, turn: g.turn + 1, player: { ...g.player!, actionsLeft: 3, pendingEvent: null } };
      g = doAction(g, 'fundraise', rngFor(g, 7));
      if (g.player!.pendingEvent?.id === 'sc-donor') offers++;
    }
    expect(offers).toBeGreaterThan(2);
    expect(offers).toBeLessThan(25);
  });
});

describe('reputation and home', () => {
  it('reformers like honest politicians, the corrupt like shady ones', () => {
    const p = mayor().player!;
    const honest = { ...p, rep: { integrity: 60, party: 0, people: 0, bold: 0 } };
    const shady = { ...p, rep: { integrity: -60, party: 0, people: 0, bold: 0 } };
    const reformer = { traits: ['reformer' as const], party: 'rival' as const, rung: 1 };
    const crook = { traits: ['corrupt' as const], party: 'rival' as const, rung: 1 };
    expect(opinionOf(honest, reformer).score).toBeGreaterThan(opinionOf(shady, reformer).score);
    expect(opinionOf(shady, crook).score).toBeGreaterThan(opinionOf(honest, crook).score);
  });
  it('home turf backs you more, and a proud home helps in state races', () => {
    const p = mayor().player!;
    expect(p.home?.city).toBe(p.city!.name);
    const s = supportByArea(p);
    expect(s.city).toBeGreaterThan(s.rest);
    const proud = { ...p, home: { ...p.home!, pride: 90 } };
    expect(homeEdge(proud, 'governor')).toBeGreaterThan(homeEdge(p, 'governor'));
  });
  it('serving as mayor builds home pride; visiting home helps later', () => {
    let g = mayor();
    const start = g.player!.home!.pride;
    for (let i = 0; i < 12; i++) { g = advanceMonth({ ...g, player: { ...g.player!, termMonthsLeft: 48, pendingEvent: null } }, rngFor(g)); }
    expect(g.player!.home!.pride).toBeGreaterThan(start);
    const out = { ...g, player: { ...g.player!, office: null, pendingEvent: null, funds: 50 } };
    const v = visitHometown(out);
    expect(v.player!.home!.pride).toBeGreaterThan(out.player!.home!.pride);
  });
});
