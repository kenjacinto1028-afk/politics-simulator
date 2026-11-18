import { describe, expect, it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { resolveEvent, startCareer } from './career';
import { askEndorsement, endorseBlocker, faithOutreach, feud, jointDeal, meetContact, visibleContacts } from './people';
import { callReferendum, choosePatron, executiveOrder, EXEC_ORDER_COST, patronBlocker, tickSystem } from './systems';
import { MORE_EVENTS } from '../data/more-events';
import { SYSTEMS } from '../data/systems';
import type { GameState } from './types';

function start(country = 'usa', seed = 3): GameState {
  const g0 = newGame(10, seed);
  return startCareer(g0, 'P', country, rngFor(g0, 99));
}

function mayor(country = 'usa'): GameState {
  const g = start(country);
  return { ...g, player: { ...g.player!, office: SYSTEMS[g.countries[country].systemId].ladder[0], campaign: null, termMonthsLeft: 48, highestRung: 0, termsInOffice: 1 } };
}

describe('politicians', () => {
  it('every career starts with people at every level, the leader and a faith leader', () => {
    const p = start().player!;
    const rungs = new Set(p.contacts.map((c) => c.rung));
    for (let r = -1; r < SYSTEMS.federal.ladder.length; r++) expect(rungs.has(r), `rung ${r}`).toBe(true);
    expect(p.contacts.find((c) => c.id === 'leader')!.name).toBe(start().countries.usa.leader.name);
  });

  it('meeting raises relations; endorsements need a campaign and goodwill', () => {
    let g = start();
    const c = visibleContacts(g).find((x) => x.party === 'yours' && x.rung === 1)!;
    const before = c.relation;
    g = meetContact(g, c.id, rngFor(g, 1));
    const after = g.player!.contacts.find((x) => x.id === c.id)!;
    expect(after.relation).toBeGreaterThan(before);
    const friendly = { ...g, player: { ...g.player!, actionsLeft: 3, contacts: g.player!.contacts.map((x) => (x.id === c.id ? { ...x, relation: 70 } : x)) } };
    expect(endorseBlocker(friendly.player!, friendly.player!.contacts.find((x) => x.id === c.id)!)).toBeNull();
    const endorsed = askEndorsement(friendly, c.id);
    expect(endorsed.player!.contacts.find((x) => x.id === c.id)!.endorsed).toBe(true);
  });

  it('endorsements help win', () => {
    const g = start();
    const all = { ...g, player: { ...g.player!, contacts: g.player!.contacts.map((c) => ({ ...c, endorsed: c.party === 'yours' })) } };
    const r = (x: GameState) => advanceMonth(x, rngFor(x)).player!.campaign!.poll;
    expect(r(all)).toBeGreaterThan(r(g));
  });

  it('mayors can sign a sister-city pact with a peer once per term', () => {
    let g = mayor();
    const peer = visibleContacts(g).find((c) => c.rung === 0)!;
    g = { ...g, player: { ...g.player!, contacts: g.player!.contacts.map((c) => (c.id === peer.id ? { ...c, relation: 40 } : c)) } };
    const jobs = g.player!.city!.jobs;
    g = jointDeal(g, peer.id);
    expect(g.player!.city!.jobs).toBeGreaterThan(jobs);
    expect(jointDeal(g, peer.id)).toBe(g);
  });

  it('a public attack makes an enemy', () => {
    const g = start();
    const rival = visibleContacts(g).find((c) => c.party === 'rival')!;
    expect(feud(g, rival.id).player!.contacts.find((c) => c.id === rival.id)!.relation).toBe(Math.max(-100, rival.relation - 30));
  });

  it('faith outreach raises faith leaders\' favor', () => {
    const g = start('phl');
    expect(faithOutreach(g, rngFor(g, 1)).player!.clergy).toBeGreaterThan(g.player!.clergy);
  });
});

describe('system rules', () => {
  it('presidential: executive orders enact laws without a vote and spend capital', () => {
    let g = mayor('phl');
    g = { ...g, player: { ...g.player!, sys: { ...g.player!.sys, meter: 60 } } };
    g = executiveOrder(g, 'curfew');
    expect(g.player!.city!.laws).toContain('curfew');
    expect(g.player!.sys.meter).toBe(60 - EXEC_ORDER_COST);
    expect(g.player!.sys.decrees.length).toBe(1);
  });

  it('one-party: a patron must outrank and like you', () => {
    const g = start('chn');
    const senior = visibleContacts(g).find((c) => c.rung === 2 && c.party === 'yours')!;
    expect(patronBlocker(g, senior.id)).toMatch(/relation/);
    const liked = { ...g, player: { ...g.player!, contacts: g.player!.contacts.map((c) => (c.id === senior.id ? { ...c, relation: 50 } : c)) } };
    expect(choosePatron(liked, senior.id).player!.sys.patronId).toBe(senior.id);
  });

  it('parliamentary: reforms drain the coalition', () => {
    const g = mayor('deu');
    const before = tickSystem(g, 50, rngFor(g, 1)).game.player!.sys.meter;
    const reformed = { ...g, player: { ...g.player!, city: { ...g.player!.city!, laws: ['curfew', 'rent'] } } };
    expect(tickSystem(reformed, 50, rngFor(g, 1)).game.player!.sys.meter).toBeLessThan(before - 10);
  });

  it('federal: good ties bring a monthly grant', () => {
    const g = mayor('usa');
    const t = g.player!.city!.treasury;
    expect(tickSystem(g, 50, rngFor(g, 1)).game.player!.city!.treasury).toBeGreaterThan(t);
  });

  it('direct democracy: referendums can pass laws, and cost money', () => {
    let g = mayor('che');
    g = { ...g, player: { ...g.player!, funds: 100, sys: { ...g.player!.sys, meter: 100 } } };
    const after = callReferendum(g, 'transit', () => 0);
    expect(after.player!.city!.laws).toContain('transit');
    expect(after.player!.funds).toBe(80);
  });

  it('corporate: holding office pays dividends', () => {
    const g = mayor('aurex');
    expect(tickSystem(g, 60, rngFor(g, 1)).game.player!.funds).toBeGreaterThan(g.player!.funds);
  });
});

describe('event content', () => {
  it('every new event is well formed', () => {
    const ids = new Set<string>();
    for (const e of MORE_EVENTS) {
      expect(ids.has(e.id), e.id).toBe(false);
      ids.add(e.id);
      expect(e.choices.length, e.id).toBeGreaterThanOrEqual(2);
      const text = [e.title, e.text, ...e.choices.flatMap((c) => [c.label, c.log])].join(' ');
      if (!e.about) expect(text, e.id).not.toMatch(/\{name\}|\{role\}/);
      for (const c of e.choices) {
        if (c.effects.meter) expect(e.systems, `${e.id} meter needs systems`).toBeTruthy();
        if (c.effects.contact) expect(e.about, `${e.id} contact needs about`).toBeTruthy();
        if (c.effects.treasury) expect(!e.kinds || e.kinds.includes('out') || e.kinds.includes('legislative'), `${e.id} treasury`).toBe(false);
      }
    }
  });

  it('events with people fill in real names', () => {
    let g = mayor();
    let seen = 0;
    for (let i = 0; i < 120; i++) {
      g = advanceMonth(g, rngFor(g));
      const ev = g.player!.pendingEvent;
      if (ev) {
        expect(ev.text).not.toMatch(/\{\w+\}/);
        if (ev.contactId) seen++;
        g = resolveEvent(g, 0);
      }
      if (!g.player!.office) break;
    }
    expect(seen).toBeGreaterThan(0);
  });
});
