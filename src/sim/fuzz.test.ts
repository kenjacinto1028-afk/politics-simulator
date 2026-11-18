import { describe, expect, it } from 'vitest';
import { advanceMonth, newGame, rngFor } from './engine';
import { blockingPrompt, comebackOptions, doAction, resolveEvent, runAgain, runForHigher, setBudget, startCareer, type CampaignAction } from './career';
import { cutDeal, lobbyMember, meetGroup, nextOffice, proposeLaw, proposeProject, repealLaw } from './mayor';
import { courtLegislature, decideBill, grantCity, proposeStateLaw, repealStateLaw, setStateBudget, stateAddress, visitCity } from './governor';
import { castVote, chooseCommittee, crossAisle, dropBill, floorSpeech, gatherCosponsors, secureFunding, startSponsoring } from './legislator';
import { answerAsk, briefLeader, choosePortfolio, launchInitiative, mediaTour, requestBudget } from './cabinet';
import { courtParliament, declareWar, foreignAid, formAlliance, hostSummit, nationalAddress, proposeNationalLaw, repealNationalLaw, sanction, seekPeace, setNationalBudget, stateVisit, tradeDeal } from './nation';
import { askEndorsement, faithOutreach, feud, jointDeal, meetContact } from './people';
import { buyback, callReferendum, choosePatron, consultCoalition, defyCapital, executiveOrder, lobbyCapital, negotiateUnions, payRespects, royalOccasion } from './systems';
import { answerAlly, armsDeal, askAlly, backSide, inviteToBloc, joinBloc, leaveBloc } from './geo';
import { setPolicy, spyOp } from './society';
import { POLICY_IDS } from '../data/society';
import type { BlocId } from '../data/geo';
import { deserialize, serialize } from './save';
import { LAWS, PROJECTS } from '../data/city-content';
import { STATE_LAWS } from '../data/state-content';
import { NATIONAL_LAWS } from '../data/nation-content';
import { PORTFOLIOS, type PortfolioId } from '../data/cabinet-content';
import { COMMITTEES, SPONSOR_BILLS, type CommitteeId } from '../data/legislature-content';
import type { GameState, SystemId } from './types';

const HOME: Record<SystemId, string> = {
  federal: 'usa', 'one-party': 'chn', parliamentary: 'deu', 'semi-presidential': 'fra', 'constitutional-monarchy': 'gbr',
  presidential: 'phl', 'direct-democracy': 'che', 'corporate-state': 'aurex',
};
type R = () => number;
const any = <T,>(a: readonly T[], r: R) => a[Math.floor(r() * a.length)];
const ACTS: CampaignAction[] = ['rally', 'fundraise', 'ads', 'door-knock', 'debate', 'party-work', 'buy-shares', 'town-hall'];
const ALL_INITS = Object.values(PORTFOLIOS).flatMap((p) => p.initiatives.map((i) => i.id));

/** Every action in the game, with random arguments. Most will be refused; none may break the state. */
function randomAction(g: GameState, r: R): GameState {
  const p = g.player!;
  const others = Object.keys(g.countries).filter((x) => x !== p.countryId);
  const cid = p.contacts.length ? any(p.contacts, r).id : 'leader';
  const rng = rngFor(g, Math.floor(r() * 1000));
  const lawIds = [...LAWS, ...STATE_LAWS, ...NATIONAL_LAWS].map((l) => l.id);
  const menu: (() => GameState)[] = [
    () => doAction(g, any(ACTS, r), rng),
    () => meetGroup(g, any(['workers', 'business', 'retirees', 'students'] as const, r), rng),
    () => lobbyMember(g, Math.floor(r() * 7), rng), () => cutDeal(g, Math.floor(r() * 7)),
    () => proposeProject(g, any(PROJECTS, r).id, rng), () => proposeLaw(g, any(LAWS, r).id, rng), () => repealLaw(g, any(LAWS, r).id),
    () => setBudget(g, r() * 20 - 2, { police: r() * 50, infrastructure: r() * 50, welfare: r() * 50, culture: r() * 50 }),
    () => visitCity(g, Math.floor(r() * 6), rng), () => grantCity(g, Math.floor(r() * 6)), () => courtLegislature(g, rng), () => stateAddress(g),
    () => proposeStateLaw(g, any(STATE_LAWS, r).id, rng), () => repealStateLaw(g, any(STATE_LAWS, r).id),
    () => setStateBudget(g, r() * 15, { schools: r() * 40, hospitals: r() * 40, roads: r() * 40, police: r() * 40, development: r() * 40 }),
    () => chooseCommittee(g, any(Object.keys(COMMITTEES) as CommitteeId[], r)), () => floorSpeech(g, rng), () => crossAisle(g, rng),
    () => secureFunding(g, rng), () => startSponsoring(g, any(SPONSOR_BILLS, r).id), () => gatherCosponsors(g, rng), () => dropBill(g),
    () => choosePortfolio(g, any(Object.keys(PORTFOLIOS) as PortfolioId[], r)), () => launchInitiative(g, any(ALL_INITS, r)),
    () => briefLeader(g, rng), () => mediaTour(g, rng), () => requestBudget(g),
    () => nationalAddress(g), () => courtParliament(g, rng), () => stateVisit(g, any(others, r), rng), () => tradeDeal(g, any(others, r)),
    () => sanction(g, any(others, r)), () => declareWar(g, any(others, r)), () => seekPeace(g, rng),
    () => proposeNationalLaw(g, any(NATIONAL_LAWS, r).id, rng), () => repealNationalLaw(g, any(NATIONAL_LAWS, r).id),
    () => setNationalBudget(g, r() * 70, r() * 70, { defense: r() * 40, welfare: r() * 40, health: r() * 40, education: r() * 40, infrastructure: r() * 40 }),
    () => hostSummit(g), () => foreignAid(g, any(others, r)), () => formAlliance(g, any(others, r)),
    () => joinBloc(g, any(['atlantic', 'concord', 'crown', 'iron', 'none'] as BlocId[], r)), () => leaveBloc(g), () => armsDeal(g, any(others, r)), () => inviteToBloc(g, any(others, r)),
    () => setPolicy(g, any(POLICY_IDS, r), any([0, 1, 2] as const, r)), () => spyOp(g, any(others, r), r() < 0.5 ? 'steal' : 'sabotage', rng),
    () => askAlly(g, any(others, r), r() < 0.5 ? 'aid' : 'troops', rng), () => answerAlly(g, r() < 0.5),
    () => (g.conflicts.length ? backSide(g, any(g.conflicts.map((c) => c.country), r), r() < 0.5 ? 'gov' : 'rebel') : g),
    () => meetContact(g, cid, rng), () => askEndorsement(g, cid), () => jointDeal(g, cid), () => feud(g, cid), () => faithOutreach(g, rng),
    () => executiveOrder(g, any(lawIds, r)), () => consultCoalition(g, rng), () => negotiateUnions(g, rng), () => royalOccasion(g, rng),
    () => choosePatron(g, cid), () => payRespects(g, rng), () => lobbyCapital(g, rng), () => defyCapital(g),
    () => callReferendum(g, any(lawIds, r), rng), () => buyback(g),
  ];
  // A real player mostly campaigns and climbs; weight those in so careers move.
  if (r() < 0.25) return doAction(g, any(['ads', 'rally', 'party-work', 'buy-shares', 'fundraise'] as CampaignAction[], r), rng);
  if (r() < 0.05 && nextOffice(g)) return runForHigher(g, nextOffice(g)!, rng);
  return any(menu, r)();
}

function check(g: GameState, where: string) {
  const bad: string[] = [];
  const walk = (v: unknown, path: string) => {
    if (typeof v === 'number' && !Number.isFinite(v)) bad.push(path);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  walk(g, '');
  expect(bad, where).toEqual([]);
  const p = g.player!;
  const in01 = (v: number, name: string) => expect(v >= 0 && v <= 100, `${where} ${name}=${v}`).toBe(true);
  in01(p.popularity, 'popularity'); in01(p.loyalty, 'loyalty'); in01(p.clergy, 'clergy'); in01(p.sys.meter, 'meter');
  for (const [k, v] of Object.entries(p.groups)) in01(v, k);
  expect(p.funds, `${where} funds`).toBeGreaterThanOrEqual(0);
  expect(p.actionsLeft, `${where} actions`).toBeGreaterThanOrEqual(0);
  for (const c of p.contacts) expect(Math.abs(c.relation) <= 100, `${where} contact ${c.id}`).toBe(true);
  if (p.ministry) { in01(p.ministry.boss, 'boss'); in01(p.ministry.performance, 'performance'); expect(p.ministry.budget).toBeGreaterThanOrEqual(0); }
  if (p.nation) {
    in01(p.nation.parliament.goodwill, 'goodwill');
    expect(new Set(p.nation.laws).size, `${where} duplicate national laws`).toBe(p.nation.laws.length);
    expect(new Set(p.nation.tradeDeals).size).toBe(p.nation.tradeDeals.length);
    expect(new Set(p.nation.alliances).size).toBe(p.nation.alliances.length);
  }
  if (p.city) expect(new Set(p.city.laws).size, `${where} duplicate city laws`).toBe(p.city.laws.length);
  if (p.region) expect(new Set(p.region.laws).size, `${where} duplicate state laws`).toBe(p.region.laws.length);
  for (const c of Object.values(g.countries)) {
    in01(c.stability, `${c.id}.stability`);
    for (const v of Object.values(c.relations)) expect(Math.abs(v) <= 100).toBe(true);
  }
}

describe('fuzz: random play in every system', () => {
  for (const system of Object.keys(HOME) as SystemId[]) {
    it(`${system}`, () => {
      for (let seed = 1; seed <= 4; seed++) {
        const g0 = newGame(10, seed * 13);
        let g = startCareer(g0, 'Fuzz', HOME[system], rngFor(g0, 99));
        const r = (() => { let s = seed * 9973; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
        for (let m = 0; m < 300 && !g.player!.retired; m++) {
          for (let k = 0; k < 6; k++) {
            const p = g.player!;
            if (p.pendingEvent) g = resolveEvent(g, Math.floor(r() * p.pendingEvent.choices.length));
            else if (p.region?.pendingBill && blockingPrompt(p) === 'bill') g = decideBill(g, r() < 0.5);
            else if (p.seat?.pendingVote && blockingPrompt(p) === 'vote') g = castVote(g, r() < 0.5);
            else if (p.ministry?.pendingAsk && blockingPrompt(p) === 'ask') g = answerAsk(g, r() < 0.5);
            else if (!p.office && !p.campaign) g = runAgain(g, rngFor(g, 7), any(comebackOptions(g), r));
            else g = randomAction(g, r);
            check(g, `${system} seed ${seed} turn ${g.turn} after action`);
          }
          while (blockingPrompt(g.player) && blockingPrompt(g.player) !== 'retired') {
            const p = g.player!;
            if (p.pendingEvent) g = resolveEvent(g, 0);
            else if (blockingPrompt(p) === 'bill') g = decideBill(g, true);
            else if (blockingPrompt(p) === 'vote') g = castVote(g, true);
            else if (blockingPrompt(p) === 'ask') g = answerAsk(g, true);
          }
          const p = g.player!;
          if (!p.retired && !p.office && !p.campaign) {
            g = runAgain(g, rngFor(g, 7));
            expect(g.player!.campaign, `${system} seed ${seed} turn ${g.turn}: no way back into politics`).not.toBeNull();
          }
          g = advanceMonth(g, rngFor(g));
          check(g, `${system} seed ${seed} turn ${g.turn} after month`);
          if (m % 60 === 0) expect(deserialize(serialize(g)), 'save round trip').toEqual(g);
        }
        if ((globalThis as { process?: { env: Record<string, string> } }).process?.env.DIAG) console.log(system, seed, 'best rung', g.player!.highestRung, 'retired', g.player!.retired, 'turn', g.turn, 'record', JSON.stringify(g.player!.record));
      }
    });
  }
});
