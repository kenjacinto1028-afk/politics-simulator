import { describe, expect, it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { startCareer } from './career';
import { newNation } from './nation';
import { answerOffer, backWar, decidePolicies, tickAI } from './ai';
import { deserialize, serialize } from './save';
import { SYSTEMS } from '../data/systems';
import type { Country, GameState, Offer } from './types';

const always = (v: number) => () => v;

function leader(country: string, seed = 5): GameState {
  const g0 = newGame(50, seed);
  const g = startCareer(g0, 'L', country, rngFor(g0, 99));
  const ladder = SYSTEMS[g.countries[country].systemId].ladder;
  return { ...g, player: { ...g.player!, office: ladder[ladder.length - 1], campaign: null, termMonthsLeft: 60, highestRung: ladder.length - 1, termsInOffice: 1, popularity: 55, loyalty: 45, actionsLeft: 5, nation: newNation(g.countries[country], rngFor(g, 5)) } };
}
const withCountry = (g: GameState, id: string, f: (c: Country) => Country): GameState => ({ ...g, countries: { ...g.countries, [id]: f(g.countries[id]) } });
const withOffer = (g: GameState, o: Offer): GameState => ({ ...g, player: { ...g.player!, nation: { ...g.player!.nation!, offer: o } } });

describe('AI leaders govern', () => {
  it('a leader fixes a crime wave with more policing', () => {
    const g = newGame(50, 1);
    const c: Country = { ...g.countries.ken, leader: { ...g.countries.ken.leader, traits: [], focus: 'security' }, society: { ...g.countries.ken.society, crime: 90 }, policies: { ...(g.countries.ken.policies ?? {}), policing: 1 } as Country['policies'] };
    const d = decidePolicies(c, 2030, always(0.5));
    expect(d.country.policies!.policing).toBe(2);
    expect(d.country.decisions![0]).toMatch(/^2030: /);
  });

  it('countries change policies over the years and keep a record', () => {
    let g = newGame(50, 3);
    for (let i = 0; i < 24; i++) g = advanceMonth(g, rngFor(g, i));
    const changed = Object.values(g.countries).filter((c) => c.decisions?.length);
    expect(changed.length).toBeGreaterThan(20);
  });
});

describe('AI leaders change', () => {
  it('an unpopular democratic leader can be voted out', () => {
    let g = newGame(50, 2);
    const id = Object.values(g.countries).find((c) => SYSTEMS[c.systemId].advancement === 'election' && SYSTEMS[c.systemId].electoralFreedom > 0.8)!.id;
    const before = g.countries[id].leader.name;
    g = withCountry(g, id, (c) => ({ ...c, nextVote: 0, leader: { ...c.leader, approval: 10 } }));
    g = tickAI(g, always(0.95));
    expect(g.countries[id].leader.name).not.toBe(before);
  });

  it('a falling-apart country can suffer a coup', () => {
    let g = newGame(50, 2);
    g = withCountry(g, 'ken', (c) => ({ ...c, stability: 5, society: { ...c.society, unrest: 90 } }));
    g = tickAI(g, always(0.001));
    expect(g.countries.ken.junta).toBe(true);
    expect(g.countries.ken.leader.party).toBe('Military Council');
  });
});

describe('AI wars and pacts', () => {
  it('close friends sign a defense pact', () => {
    let g = newGame(50, 2);
    g = withCountry(withCountry(g, 'ken', (c) => ({ ...c, relations: { ...c.relations, egy: 80 } })), 'egy', (c) => ({ ...c, relations: { ...c.relations, ken: 80 } }));
    let found = false;
    for (let i = 0; i < 400 && !found; i++) { g = tickAI(g, rngFor(g, i)); found = !!g.countries.ken.pacts?.length; }
    expect(found).toBe(true);
  });

  it('a war runs and ends with a winner', () => {
    let g = newGame(50, 2);
    g = { ...g, wars: [{ a: 'egy', b: 'ken', months: 0, score: 25 }] };
    for (let i = 0; i < 13 && g.wars!.some((w) => w.a === 'egy' && w.b === 'ken'); i++) g = tickAI(g, rngFor(g, i));
    expect(g.wars!.some((w) => w.a === 'egy' && w.b === 'ken')).toBe(false);
    expect(g.log.some((l) => /war between .* ends/.test(l))).toBe(true);
  });

  it('wars break out in a long game, and saves keep them', () => {
    let g = newGame(50, 4);
    let seen = 0;
    for (let i = 0; i < 360; i++) { g = advanceMonth(g, rngFor(g, i)); if (g.wars?.length) seen++; }
    expect(seen).toBeGreaterThan(0);
    expect(deserialize(serialize(g))!.countries.usa.leader).toBeTruthy();
  });

  it('a leader can arm one side once', () => {
    let g = leader('usa');
    g = { ...g, wars: [{ a: 'egy', b: 'ken', months: 1, score: 0 }] };
    const g2 = backWar(g, 0, 'ken');
    expect(g2.wars![0].playerSide).toBe('ken');
    expect(g2.wars![0].score).toBeLessThan(0);
    expect(g2.player!.actionsLeft).toBe(4);
    expect(backWar(g2, 0, 'egy')).toBe(g2);
  });
});

describe('offers and demands', () => {
  it('accepting a trade offer adds the deal', () => {
    const g = withOffer(leader('ken'), { from: 'egy', kind: 'trade', monthsLeft: 3, text: 'x' });
    const g2 = answerOffer(g, true);
    expect(g2.player!.nation!.tradeDeals).toContain('egy');
    expect(g2.player!.nation!.offer).toBeNull();
  });

  it('accepting an alliance adds the ally', () => {
    const g = withOffer(leader('ken'), { from: 'egy', kind: 'alliance', monthsLeft: 3, text: 'x' });
    expect(answerOffer(g, true).player!.nation!.alliances).toContain('egy');
  });

  it('paying tribute costs popularity; refusing a superpower brings sanctions', () => {
    const g = withOffer(leader('ken'), { from: 'chn', kind: 'tribute', amount: 3, monthsLeft: 3, text: 'x' });
    const paid = answerOffer(g, true);
    expect(paid.player!.popularity).toBeLessThan(g.player!.popularity);
    expect(paid.countries.ken.economy.debtToGdp).toBeGreaterThan(g.countries.ken.economy.debtToGdp);
    const refused = answerOffer(g, false);
    expect(refused.player!.popularity).toBeGreaterThan(g.player!.popularity);
    expect(refused.countries.ken.economy.growth).toBeLessThan(g.countries.ken.economy.growth);
    expect(refused.countries.chn.relations.ken).toBeLessThan(g.countries.chn.relations.ken);
  });

  it('an unanswered offer expires as a no', () => {
    let g = withOffer(leader('ken'), { from: 'egy', kind: 'trade', monthsLeft: 1, text: 'x' });
    g = tickAI(g, always(0.99));
    expect(g.player!.nation!.offer).toBeNull();
    expect(g.player!.nation!.tradeDeals).not.toContain('egy');
    expect(g.log[0]).toMatch(/never answers/);
  });

  it('offers reach a sitting leader over time', () => {
    let g = leader('ken');
    g = withCountry(g, 'egy', (c) => ({ ...c, relations: { ...c.relations, ken: 40 } }));
    let got = false;
    for (let i = 0; i < 120 && !got; i++) { g = tickAI(g, rngFor(g, i)); got = !!g.player!.nation!.offer; }
    expect(got).toBe(true);
  });
});
