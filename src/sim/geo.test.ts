import { describe, expect, it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { resolveEvent, startCareer } from './career';
import { declareWar, newNation, tradeBonus } from './nation';
import { armsDeal, backSide, blocLeader, joinBloc, joinBlocBlocker, leaveBloc, nuclearShield, tickGeo, tierOf, warPower } from './geo';
import { deserialize } from './save';
import { GEO } from '../data/geo';
import { GEO_EVENTS } from '../data/geo-events';
import { SYSTEMS } from '../data/systems';
import type { GameState } from './types';

function leader(country: string, size: 10 | 50 = 50, seed = 5): GameState {
  const g0 = newGame(size, seed);
  const g = startCareer(g0, 'L', country, rngFor(g0, 99));
  const ladder = SYSTEMS[g.countries[country].systemId].ladder;
  return { ...g, player: { ...g.player!, office: ladder[ladder.length - 1], campaign: null, termMonthsLeft: 60, highestRung: ladder.length - 1, termsInOffice: 1, popularity: 55, loyalty: 45, actionsLeft: 5, nation: newNation(g.countries[country], rngFor(g, 5)) } };
}
const setRel = (g: GameState, a: string, b: string, v: number): GameState => ({
  ...g, countries: { ...g.countries, [a]: { ...g.countries[a], relations: { ...g.countries[a].relations, [b]: v } }, [b]: { ...g.countries[b], relations: { ...g.countries[b].relations, [a]: v } } },
});

describe('world power', () => {
  it('every country has power data; USA and China are superpowers, small states are minor', () => {
    const g = newGame(50, 1);
    for (const id of Object.keys(g.countries)) expect(GEO[id], id).toBeTruthy();
    expect(tierOf(g.countries.usa)).toBe('super');
    expect(tierOf(g.countries.chn)).toBe('super');
    expect(['great', 'super']).toContain(tierOf(g.countries.rus));
    expect(tierOf(g.countries.myrr)).toBe('minor');
    expect(tierOf(g.countries.ken)).toBe('minor');
    expect(warPower(g.countries.usa)).toBeGreaterThan(warPower(g.countries.phl) * 10);
    expect(blocLeader(g, 'atlantic')).toBe('usa');
    expect(blocLeader(g, 'concord')).toBe('chn');
  });

  it('allies start warm and rivals start cold', () => {
    const g = newGame(50, 1);
    expect(g.countries.usa.relations.chn).toBeLessThan(-30);
    expect(g.countries.ind.relations.pak).toBeLessThan(-30);
    expect(g.countries.deu.relations.fra).toBeGreaterThan(20);
  });

  it('nuclear powers and their protected allies cannot be invaded', () => {
    let g = leader('phl');
    g = setRel(setRel(g, 'phl', 'chn', -80), 'phl', 'jpn', -80);
    expect(nuclearShield(g, 'chn')).toMatch(/nuclear/);
    expect(nuclearShield(g, 'jpn')).toMatch(/umbrella/);
    expect(declareWar(g, 'chn')).toBe(g);
    expect(declareWar(g, 'jpn')).toBe(g);
    g = setRel(g, 'phl', 'ken', -80);
    expect(declareWar(g, 'ken').player!.nation!.war?.enemy).toBe('ken');
  });

  it('a big army wins wars a small one loses', () => {
    const fight = (me: string, enemy: string) => {
      let g = setRel(leader(me), me, enemy, -80);
      g = declareWar(g, enemy);
      for (let i = 0; i < 6 && g.player!.nation!.war; i++) { g = advanceMonth(g, rngFor(g)); if (g.player!.pendingEvent) g = resolveEvent(g, 0); }
      return g.log.some((l) => l.includes('Victory'));
    };
    expect(fight('ind', 'bgd')).toBe(true);
    expect(fight('ken', 'egy')).toBe(false);
    // A small bloc member has a superpower behind it.
    expect(fight('nzl', 'tha')).toBe(true);
  });

  it('you can join and leave a bloc, buy arms and back a side in a civil war', () => {
    let g = leader('ind');
    expect(joinBlocBlocker(g, 'atlantic')).toMatch(/relations/);
    g = setRel(g, 'ind', 'usa', 50);
    g = joinBloc(g, 'atlantic');
    expect(g.countries.ind.bloc).toBe('atlantic');
    expect(g.countries.ind.relations.chn).toBeLessThan(newGame(50, 5).countries.ind.relations.chn);
    g = leaveBloc(g);
    expect(g.countries.ind.bloc).toBe('none');
    const army = g.countries.ind.military;
    g = { ...g, player: { ...g.player!, actionsLeft: 5 } };
    g = armsDeal(g, 'usa');
    expect(g.countries.ind.military).toBeGreaterThan(army);
    g = { ...g, conflicts: [{ country: 'ken', govBacker: 'usa', rebelBacker: 'chn', months: 0, score: 0 }] };
    g = backSide(g, 'ken', 'gov');
    expect(g.conflicts[0].playerSide).toBe('gov');
    expect(g.conflicts[0].score).toBeGreaterThan(0);
  });

  it('civil wars break out and end, and the world stays sane for 40 years', () => {
    let g = newGame(50, 7);
    let started = 0, ended = 0;
    for (let i = 0; i < 480; i++) {
      const before = g.conflicts.length;
      g = tickGeo({ ...g, turn: g.turn + 1 }, rngFor(g, i));
      if (g.conflicts.length > before) started++;
      expect(g.conflicts.length).toBeLessThanOrEqual(2);
      for (const c of Object.values(g.countries)) {
        expect(c.military).toBeGreaterThanOrEqual(0);
        expect(c.military).toBeLessThanOrEqual(100);
        for (const r of Object.values(c.relations)) expect(Number.isFinite(r)).toBe(true);
      }
    }
    ended = g.log.filter((l) => /civil war in .* ends|Rebels take power/.test(l)).length;
    expect(started).toBeGreaterThan(2);
    expect(ended).toBeGreaterThan(0);
    // Superpowers keep their place.
    expect(tierOf(g.countries.usa)).toBe('super');
  });

  it('trade partners\' exports help your economy', () => {
    expect(tradeBonus(['oil']).inflation).toBeLessThan(0);
    expect(tradeBonus(['tech', 'tech', 'tech']).growth).toBeCloseTo(0.3);
  });

  it('old saves gain blocs, armies and exports', () => {
    const g = newGame(10, 1);
    const old = { ...g, conflicts: undefined, countries: Object.fromEntries(Object.entries(g.countries).map(([id, c]) => { const { bloc: _b, military: _m, nuclear: _n, resource: _r, region: _g, ...rest } = c; return [id, rest]; })) };
    const loaded = deserialize(JSON.stringify({ version: 6, savedAt: '', game: old }));
    expect(loaded.countries.usa.military).toBe(100);
    expect(loaded.countries.chn.bloc).toBe('concord');
    expect(loaded.conflicts).toEqual([]);
    expect(loaded.countries.usa.relations.chn).toBeLessThan(-30);
  });

  it('world events name a real foreign power', () => {
    let g = leader('phl');
    let seen = 0;
    for (let i = 0; i < 200 && seen < 3; i++) {
      g = { ...g, player: { ...g.player!, termMonthsLeft: 60 } };
      g = advanceMonth(g, rngFor(g));
      const ev = g.player!.pendingEvent;
      if (ev) {
        expect(ev.text).not.toMatch(/\{\w+\}/);
        if (ev.id.startsWith('g-')) seen++;
        g = resolveEvent(g, 0);
      }
    }
    expect(GEO_EVENTS.length).toBeGreaterThanOrEqual(15);
    expect(seen).toBeGreaterThan(0);
  });
});

describe('allies', () => {
  it('a bloc leader is your ally; friendly allies send aid and troops, and you owe them', async () => {
    const { alliesOf, askAlly, helpChance } = await import('./geo');
    let g = leader('phl');
    expect(alliesOf(g)).toContain('usa');
    g = setRel(g, 'phl', 'usa', 95);
    expect(helpChance(g, 'usa', 'aid')).toBeGreaterThan(0.7);
    const debt = g.countries.phl.economy.debtToGdp;
    let tries = 0;
    while (tries < 20 && g.countries.phl.economy.debtToGdp >= debt) { g = askAlly({ ...g, turn: g.turn + 6, player: { ...g.player!, actionsLeft: 3 } }, 'usa', 'aid', rngFor(g, tries++)); }
    expect(g.countries.phl.economy.debtToGdp).toBeLessThan(debt);
    expect(g.player!.nation!.favors!.usa).toBeLessThan(0);
    // Asking again right away is blocked.
    expect(askAlly(g, 'usa', 'aid', rngFor(g, 1))).toBe(g);
  });

  it('allies call for help; answering builds trust, refusing can end the alliance', async () => {
    const { answerAlly, tickAllies } = await import('./geo');
    let g = leader('deu');
    g = { ...g, player: { ...g.player!, nation: { ...g.player!.nation!, alliances: ['fra'] } } };
    let calls = 0;
    for (let i = 0; i < 200 && !calls; i++) { const n = tickAllies({ ...g, turn: i }, rngFor(g, i), []); if (n.player!.nation!.allyCall) { g = n; calls++; } }
    expect(calls).toBe(1);
    const from = g.player!.nation!.allyCall!.from;
    const yes = answerAlly(g, true);
    expect(yes.countries.deu.relations[from]).toBeGreaterThan(g.countries.deu.relations[from]);
    expect(yes.player!.nation!.favors![from]).toBeGreaterThan(0);
    const hurt = setRel(g, 'deu', 'fra', 45);
    const call = { from: 'fra', kind: 'troops' as const, reason: 'x', monthsLeft: 2 };
    const no = answerAlly({ ...hurt, player: { ...hurt.player!, nation: { ...hurt.player!.nation!, allyCall: call } } }, false);
    expect(no.player!.nation!.alliances).not.toContain('fra');
    // Ignoring a call counts as saying no.
    const ignored = tickAllies({ ...hurt, player: { ...hurt.player!, nation: { ...hurt.player!.nation!, allyCall: { ...call, monthsLeft: 1 } } } }, rngFor(g, 1), []);
    expect(ignored.player!.nation!.allyCall).toBeNull();
    expect(ignored.countries.deu.relations.fra).toBeLessThan(45);
  });
});
