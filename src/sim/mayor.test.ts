import { describe, expect, it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { runForHigher, startCareer } from './career';
import { campaignTip, cutDeal, forecast, higherOfficeBlocker, lobbyMember, meetGroup, nextOffice, proposeLaw, proposeProject, repealLaw } from './mayor';
import { statBonuses } from './city';
import { deserialize } from './save';
import { PROJECTS } from '../data/city-content';
import type { GameState } from './types';

/** A fresh Mayor with a friendly council and a full treasury. */
function mayor(seed = 1): GameState {
  const g0 = newGame(10, seed);
  const g = startCareer(g0, 'M', 'usa', rngFor(g0, 99));
  const p = g.player!;
  const city = { ...p.city!, treasury: 1000, council: p.city!.council.map((m) => ({ ...m, relationship: 80 })) };
  return { ...g, player: { ...p, office: 'mayor', campaign: null, termMonthsLeft: 48, city } };
}

describe('mayor', () => {
  it('builds an approved project and applies its lasting bonus when finished', () => {
    let g = proposeProject(mayor(), 'park', rngFor(mayor(), 1));
    expect(g.player!.city!.building).toEqual([{ id: 'park', monthsLeft: 4 }]);
    expect(g.player!.city!.treasury).toBe(940);
    for (let i = 0; i < 4; i++) { g = advanceMonth(g, rngFor(g)); if (g.player!.pendingEvent) g = { ...g, player: { ...g.player!, pendingEvent: null } }; }
    expect(g.player!.city!.built).toContain('park');
    expect(statBonuses(g.player!.city!).happiness).toBe(PROJECTS[0].stats.happiness);
    expect(g.log.some((l) => l.includes('cuts the ribbon'))).toBe(true);
  });

  it('a hostile council blocks proposals and the forecast says so', () => {
    const g = mayor();
    const hostile = { ...g, player: { ...g.player!, city: { ...g.player!.city!, council: g.player!.city!.council.map((m) => ({ ...m, relationship: 10 })) } } };
    expect(forecast(hostile.player!.city!, PROJECTS[0]).likelyYes).toBe(0);
    const after = proposeProject(hostile, 'park', rngFor(hostile, 1));
    expect(after.player!.city!.building).toHaveLength(0);
    expect(after.player!.actionsLeft).toBe(g.player!.actionsLeft - 1);
  });

  it('passes and repeals laws', () => {
    let g = proposeLaw(mayor(), 'seniors', rngFor(mayor(), 2));
    expect(g.player!.city!.laws).toContain('seniors');
    g = repealLaw(g, 'seniors');
    expect(g.player!.city!.laws).not.toContain('seniors');
  });

  it('lobbying, deals and meeting groups raise the right numbers', () => {
    const g = mayor();
    const before = g.player!.city!.council[0].relationship;
    expect(lobbyMember(g, 0, rngFor(g, 3)).player!.city!.council[0].relationship).toBeGreaterThan(before);
    const d = cutDeal(g, 1);
    expect(d.player!.funds).toBe(g.player!.funds - 20);
    expect(meetGroup(g, 'students', rngFor(g, 4)).player!.groups.students).toBeGreaterThan(g.player!.groups.students);
  });

  it('gates higher office, and losing that race keeps you Mayor', () => {
    let g = mayor();
    expect(higherOfficeBlocker(g)).toMatch(/Serve/);
    g = { ...g, player: { ...g.player!, monthsInOffice: 20, popularity: 60, termMonthsLeft: 20 } };
    expect(higherOfficeBlocker(g)).toBeNull();
    expect(nextOffice(g)).toBe('state-legislator');
    g = runForHigher(g, 'state-legislator', rngFor(g, 5));
    // Force a loss: tank popularity and groups, then let the campaign run out.
    g = { ...g, player: { ...g.player!, popularity: 0, loyalty: 0, groups: { workers: 0, business: 0, retirees: 0, students: 0 } } };
    for (let i = 0; i < 6; i++) { g = advanceMonth(g, rngFor(g)); g = { ...g, player: { ...g.player!, pendingEvent: null, popularity: 0 } }; }
    expect(g.player!.campaign).toBeNull();
    expect(g.player!.office).toBe('mayor');
    expect(g.player!.record.lost).toBe(1);
  });

  it('gives a campaign tip', () => {
    const g0 = newGame(10, 1);
    const g = startCareer(g0, 'T', 'usa', rngFor(g0, 99));
    expect(campaignTip(g).length).toBeGreaterThan(10);
  });

  it('migrates v1 saves', () => {
    const g = mayor();
    const p = g.player!;
    const { groups: _g, monthsInOffice: _m, ...oldPlayer } = p;
    const { council: _c, building: _b, built: _bt, laws: _l, ...oldCity } = p.city!;
    const v1 = JSON.stringify({ version: 1, savedAt: '', game: { ...g, player: { ...oldPlayer, city: oldCity } } });
    const loaded = deserialize(v1);
    expect(loaded.player!.city!.council).toHaveLength(7);
    expect(loaded.player!.groups.workers).toBe(45);
  });
});
