import { CABINET_ASKS, PORTFOLIOS, type CabinetAskDef, type InitiativeDef, type NationalShift, type PortfolioId } from '../data/cabinet-content';
import { GROUPS } from '../data/city-content';
import { clamp } from './city';
import { kindOf } from './offices';
import type { Rng } from './rng';
import type { Country, GameState, GroupId, Ministry, Player } from './types';

const GROUP_IDS = Object.keys(GROUPS) as GroupId[];
export const FIRED_BELOW = 15;
export const BUDGET_ASK_MIN_BOSS = 50;
const pick = <T,>(arr: readonly T[], rng: Rng) => arr[Math.floor(rng() * arr.length)];
const stamp = (g: GameState) => `${g.year}-${String(g.month).padStart(2, '0')}`;
const log = (g: GameState, line: string): GameState => ({ ...g, log: [`${stamp(g)}: ${line}`, ...g.log].slice(0, 200) });

/** A ministry's annual budget scales with the country's economy (about 1% of GDP). */
export function newMinistry(country: Country): Ministry {
  const base = Math.max(1, Math.round(country.economy.gdpBn * 0.01));
  return { portfolio: null, budget: base, baseBudget: base, performance: 45, boss: 55, running: [], done: [], pendingAsk: null, askCooldown: 2 };
}

export const initiative = (id: string): InitiativeDef | undefined =>
  Object.values(PORTFOLIOS).flatMap((p) => p.initiatives).find((i) => i.id === id);
export const initiativeCost = (m: Ministry, i: InitiativeDef) => Math.round(m.baseBudget * i.costShare * 10) / 10;
export const cabinetAsk = (id: string | null): CabinetAskDef | undefined => CABINET_ASKS.find((a) => a.id === id);

/** Apply an initiative's national effects to the player's country. */
export function applyNational(c: Country, n: NationalShift): Country {
  const relations = { ...c.relations };
  if (n.relations) for (const k of Object.keys(relations)) relations[k] = clamp(relations[k] + n.relations, -100, 100);
  return {
    ...c, relations,
    stability: clamp(c.stability + (n.stability ?? 0), 0, 100),
    tourism: clamp(c.tourism + (n.tourism ?? 0), 0, 100),
    culture: clamp(c.culture + (n.culture ?? 0), 0, 100),
    economy: {
      ...c.economy,
      growth: clamp(c.economy.growth + (n.growth ?? 0), -8, 12),
      unemployment: clamp(c.economy.unemployment + (n.unemployment ?? 0), 1, 40),
      inflation: clamp(c.economy.inflation + (n.inflation ?? 0), -2, 60),
    },
  };
}

/** Monthly ministry update. Returns the new game state (it can touch your country) and news lines. */
export function tickMinistry(g: GameState, rng: Rng): { game: GameState; lines: string[] } {
  let p = g.player!;
  let m = p.ministry!;
  let country = g.countries[p.countryId];
  const lines: string[] = [];

  // Money trickles in; finished initiatives pay off.
  m = { ...m, budget: Math.min(m.baseBudget * 1.5, m.budget + m.baseBudget / 12) };
  const running: Ministry['running'] = [];
  for (const r of m.running) {
    if (r.monthsLeft > 1) { running.push({ ...r, monthsLeft: r.monthsLeft - 1 }); continue; }
    const def = initiative(r.id)!;
    country = applyNational(country, def.national);
    const groups = { ...p.groups };
    for (const k of GROUP_IDS) groups[k] = clamp(groups[k] + (def.groups[k] ?? 0), 0, 100);
    p = { ...p, groups, popularity: clamp(p.popularity + 3, 0, 100) };
    m = { ...m, done: [...m.done, r.id], performance: clamp(m.performance + 10, 0, 100), boss: clamp(m.boss + 3, 0, 100) };
    lines.push(`${def.name} is complete. ${p.name} takes a victory lap.`);
  }
  m = { ...m, running };

  // Performance fades without results; the leader warms to results and cools if you outshine them.
  const outshine = p.popularity > country.leader.approval + 15 ? 1.5 : 0;
  m = {
    ...m,
    performance: clamp(m.performance + (45 - m.performance) * 0.04 + (running.length ? 0.5 : 0), 0, 100),
    boss: clamp(m.boss + (40 + (m.performance - 45) * 0.5 - m.boss) * 0.05 - outshine, 0, 100),
  };

  // The leader sometimes asks for public backing.
  if (!m.pendingAsk && m.askCooldown <= 0 && rng() < 0.4) {
    m = { ...m, pendingAsk: pick(CABINET_ASKS, rng).id, askCooldown: 3 };
  } else {
    m = { ...m, askCooldown: m.askCooldown - 1 };
  }

  // Groups fade toward neutral; popularity follows ministry performance and groups.
  const groups = { ...p.groups };
  for (const k of GROUP_IDS) groups[k] = groups[k] + (45 - groups[k]) * 0.04;
  const approval = GROUP_IDS.reduce((a, k) => a + groups[k] * GROUPS[k].weight, 0);
  p = { ...p, groups, ministry: m, popularity: clamp(p.popularity + ((approval + m.performance) / 2 - p.popularity) * 0.08, 0, 100) };

  let game: GameState = { ...g, player: p, countries: { ...g.countries, [p.countryId]: country } };
  if (m.boss < FIRED_BELOW) {
    game = { ...game, player: { ...p, office: null, campaign: null, ministry: null, termMonthsLeft: 0, monthsInOffice: 0, termsInOffice: 0 } };
    lines.push(`${country.leader.name} fires ${p.name} from the cabinet.`);
  }
  return { game, lines };
}

// ---------- Actions ----------

const inCabinet = (p: Player | null): p is Player => !!p && kindOf(p.office) === 'cabinet' && !!p.ministry;
const blocked = (p: Player) => p.actionsLeft <= 0 || !!p.pendingEvent || !!p.ministry!.pendingAsk;
const spend = (p: Player, ministry: Ministry, extra: Partial<Player> = {}): Player => ({ ...p, ...extra, ministry, actionsLeft: p.actionsLeft - 1 });
const dim = (v: number, gain: number) => Math.max(1, Math.round(gain * (1 - v / 130)));

export function choosePortfolio(g: GameState, id: PortfolioId): GameState {
  const p = g.player;
  if (!inCabinet(p) || blocked(p) || p.ministry!.portfolio === id) return g;
  // First pick is free; switching later needs the leader's trust and drops unfinished work.
  if (p.ministry!.portfolio && p.ministry!.boss < 60) return g;
  const ministry = { ...p.ministry!, portfolio: id, running: [] };
  return log({ ...g, player: spend(p, ministry) }, `${p.name} takes charge of the ${PORTFOLIOS[id].name} ministry.`);
}

export function launchInitiative(g: GameState, id: string): GameState {
  const p = g.player;
  const def = initiative(id);
  if (!inCabinet(p) || blocked(p) || !def) return g;
  const m = p.ministry!;
  if (!m.portfolio || !PORTFOLIOS[m.portfolio].initiatives.some((i) => i.id === id)) return g;
  if (m.done.includes(id) || m.running.some((r) => r.id === id) || m.running.length >= 2) return g;
  const cost = initiativeCost(m, def);
  if (m.budget < cost) return g;
  const ministry = { ...m, budget: Math.round((m.budget - cost) * 10) / 10, running: [...m.running, { id, monthsLeft: def.months }] };
  return log({ ...g, player: spend(p, ministry) }, `${p.name} launches ${def.name} ($${cost}bn).`);
}

export function briefLeader(g: GameState, rng: Rng): GameState {
  const p = g.player;
  if (!inCabinet(p) || blocked(p)) return g;
  const gain = dim(p.ministry!.boss, 6 + rng() * 4);
  return log({ ...g, player: spend(p, { ...p.ministry!, boss: clamp(p.ministry!.boss + gain, 0, 100) }) }, `${p.name} briefs the leader in private (+${gain}).`);
}

export function mediaTour(g: GameState, rng: Rng): GameState {
  const p = g.player;
  if (!inCabinet(p) || blocked(p)) return g;
  const gain = dim(p.popularity, 2 + rng() * 3);
  const leader = g.countries[p.countryId].leader;
  const jealous = p.popularity + gain > leader.approval + 10 ? 3 : 0;
  return log({ ...g, player: spend(p, { ...p.ministry!, boss: clamp(p.ministry!.boss - jealous, 0, 100) }, { popularity: clamp(p.popularity + gain, 0, 100) }) },
    `${p.name} does a media tour (+${gain})${jealous ? '. The leader is not thrilled about the attention' : ''}.`);
}

export function requestBudget(g: GameState): GameState {
  const p = g.player;
  if (!inCabinet(p) || blocked(p)) return g;
  const m = p.ministry!;
  if (m.boss < BUDGET_ASK_MIN_BOSS) {
    return log({ ...g, player: spend(p, { ...m, boss: clamp(m.boss - 4, 0, 100) }) }, `The leader turns down ${p.name}'s request for more money.`);
  }
  const extra = Math.round(m.baseBudget * 0.25 * 10) / 10;
  return log({ ...g, player: spend(p, { ...m, budget: m.budget + extra, boss: clamp(m.boss - 3, 0, 100) }) }, `${p.name} wins an extra $${extra}bn for the ministry.`);
}

/** Answer the leader's request for public backing. Free. */
export function answerAsk(g: GameState, back: boolean): GameState {
  const p = g.player;
  if (!inCabinet(p) || !p.ministry!.pendingAsk) return g;
  const ask = cabinetAsk(p.ministry!.pendingAsk)!;
  const groups = { ...p.groups };
  for (const k of GROUP_IDS) groups[k] = clamp(groups[k] + (ask.groups[k] ?? 0) * (back ? 1 : -0.5), 0, 100);
  const ministry = { ...p.ministry!, pendingAsk: null, boss: clamp(p.ministry!.boss + (back ? 8 : -12), 0, 100) };
  const popularity = clamp(p.popularity + (back ? 0 : 2), 0, 100);
  return log({ ...g, player: { ...p, groups, ministry, popularity } }, `${p.name} ${back ? 'publicly backs' : 'refuses to back'} the leader on ${ask.title}.`);
}
