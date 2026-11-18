import { BILLS, PRIORITY_STAT, STATE_CITY_NAMES, STATE_LAWS, STATE_NAMES, type BillDef, type StateLawDef, type StatePriority, type StateStat } from '../data/state-content';
import { GROUPS } from '../data/city-content';
import { COUNCIL_FIRST, COUNCIL_LAST } from '../data/city-content';
import { cityNames, personName, regionName } from './names';
import { clamp, soft } from './city';
import { kindOf } from './offices';
import type { Rng } from './rng';
import type { Country, GameState, GroupId, Player, Region } from './types';

export const GRANT_COST = 100;
export const ADDRESS_COOLDOWN = 12;
export const RESERVE_RATE = 0.2;
export const DEFAULT_BUDGET: Region['budget'] = { schools: 25, hospitals: 25, roads: 20, police: 15, development: 15 };
const STATS: StateStat[] = ['education', 'health', 'infrastructure', 'safety', 'economy'];
const GROUP_IDS = Object.keys(GROUPS) as GroupId[];

const pick = <T,>(arr: readonly T[], rng: Rng) => arr[Math.floor(rng() * arr.length)];
const stamp = (g: GameState) => `${g.year}-${String(g.month).padStart(2, '0')}`;
const log = (g: GameState, line: string): GameState => ({ ...g, log: [`${stamp(g)}: ${line}`, ...g.log].slice(0, 200) });

export function newRegion(homeCity: string, rng: Rng, countryId?: string): Region {
  const others = countryId ? cityNames(countryId, rng, 4, [homeCity]) : STATE_CITY_NAMES.filter((n) => n !== homeCity).sort(() => rng() - 0.5).slice(0, 4);
  const person = () => (countryId ? personName(countryId, rng) : `${pick(COUNCIL_FIRST, rng)} ${pick(COUNCIL_LAST, rng)}`);
  const cities = [homeCity, ...others].map((name, i) => ({
    name, home: i === 0, population: Math.round(120 + rng() * 600), happiness: 45 + rng() * 15,
    mayor: i === 0 ? 'Your successor' : person(), mayorRelationship: i === 0 ? 75 : Math.round(30 + rng() * 40),
  }));
  const seats = 60;
  return {
    name: countryId ? regionName(countryId, rng) : pick(STATE_NAMES, rng), taxRate: 5, budget: { ...DEFAULT_BUDGET }, treasury: 400,
    stats: { education: 50, health: 50, infrastructure: 50, safety: 50, economy: 50 },
    happiness: 50, cities, legislature: { seats, yourParty: Math.round(20 + rng() * 14), goodwill: 50 },
    laws: [], pendingBill: null, recentBills: [], billCooldown: 2, lastAddressTurn: -99,
  };
}

export const regionPopulation = (r: Region) => r.cities.reduce((a, c) => a + c.population, 0);

export function regionRevenue(r: Region): number {
  const mod = r.laws.reduce((m, id) => m + (STATE_LAWS.find((l) => l.id === id)?.revenue ?? 0), 0);
  return regionPopulation(r) * r.taxRate * 0.03 * Math.max(0.5, 1 + mod);
}

function lawStatShift(r: Region): Record<StateStat, number> {
  const out = Object.fromEntries(STATS.map((s) => [s, 0])) as Record<StateStat, number>;
  for (const id of r.laws) {
    const l = STATE_LAWS.find((x) => x.id === id);
    for (const s of STATS) out[s] += l?.stats?.[s] ?? 0;
  }
  return out;
}

export function tickRegion(r: Region, country: Country, popularity: number, rng: Rng): Region {
  const funding = r.taxRate / 5;
  const shift = lawStatShift(r);
  const stats = { ...r.stats };
  for (const pr of Object.keys(r.budget) as StatePriority[]) {
    const s = PRIORITY_STAT[pr];
    let target = r.budget[pr] * 2.5 * funding + shift[s];
    if (s === 'economy') target += (5 - r.taxRate) * 4 + country.economy.growth * 3;
    stats[s] = clamp(stats[s] + (soft(target) - stats[s]) * 0.1 + (rng() - 0.5) * 2, 0, 100);
  }
  const broke = r.treasury < 0 ? 10 : 0;
  const hTarget = STATS.reduce((a, s) => a + stats[s], 0) / STATS.length - (r.taxRate - 5) * 3 - broke;
  const happiness = clamp(r.happiness + (soft(hTarget) - r.happiness) * 0.12 + (rng() - 0.5) * 2, 0, 100);
  const pull = 50 + (popularity - 50) * 0.3;
  const cities = r.cities.map((c) => ({
    ...c,
    happiness: clamp(c.happiness + (happiness + (c.mayorRelationship - 50) * 0.1 - c.happiness) * 0.1, 0, 100),
    mayorRelationship: c.home ? c.mayorRelationship : clamp(c.mayorRelationship + (pull - c.mayorRelationship) * 0.04, 0, 100),
  }));
  const legislature = { ...r.legislature, goodwill: clamp(r.legislature.goodwill + (pull - r.legislature.goodwill) * 0.05, 0, 100) };
  let next: Region = { ...r, stats, happiness, cities, legislature, treasury: r.treasury + regionRevenue(r) * RESERVE_RATE };
  // At most one bill every 3 months, and none of the last 5 bills again.
  const roll = rng();
  if (!next.pendingBill && next.billCooldown <= 0 && roll < 0.45) {
    const pool = BILLS.filter((b) => !r.recentBills.includes(b.id));
    if (pool.length) { const b = pick(pool, rng); next = { ...next, pendingBill: b.id, recentBills: [b.id, ...r.recentBills].slice(0, 5), billCooldown: 3 }; }
  } else {
    next = { ...next, billCooldown: (next.billCooldown ?? 0) - 1 };
  }
  return next;
}

/** Where each group's approval drifts while you are Governor. */
export function regionGroupTargets(p: Player): Record<GroupId, number> {
  const r = p.region!;
  const s = r.stats;
  const lawShift = (g: GroupId) => r.laws.reduce((a, id) => a + (STATE_LAWS.find((l) => l.id === id)?.groups?.[g] ?? 0), 0);
  const raw: Record<GroupId, number> = {
    workers: (s.economy + s.health) / 2 + lawShift('workers'),
    business: 50 + (5 - r.taxRate) * 5 + (s.economy - 50) * 0.6 + lawShift('business'),
    retirees: (s.health + s.safety) / 2 + lawShift('retirees'),
    students: (s.education + s.infrastructure) / 2 + lawShift('students'),
  };
  for (const g of GROUP_IDS) raw[g] = 50 + (raw[g] - 50) * 0.7;
  return raw;
}

// ---------- Legislature ----------

/** How much a law appeals across the electorate, used by opposition legislators. */
const appeal = (groups: Partial<Record<GroupId, number>> = {}) => GROUP_IDS.reduce((a, g) => a + (groups[g] ?? 0) * GROUPS[g].weight, 0);

export function forecastLaw(p: Player, law: StateLawDef) {
  const leg = p.region!.legislature;
  const defect = Math.round(leg.yourParty * clamp((40 - p.loyalty) / 100, 0, 0.3));
  const oppYesShare = clamp((leg.goodwill + appeal(law.groups) * 3 - 55) / 70, 0, 0.8);
  const yes = leg.yourParty - defect + Math.round((leg.seats - leg.yourParty) * oppYesShare);
  return { yes, needed: Math.floor(leg.seats / 2) + 1 };
}

// ---------- Actions ----------

const isGovernor = (p: Player | null): p is Player => !!p && kindOf(p.office) === 'regional' && !!p.region;
const canAct = (p: Player | null): p is Player => isGovernor(p) && p.actionsLeft > 0 && !p.pendingEvent && !p.region!.pendingBill;
const spend = (p: Player, region: Region, extra: Partial<Player> = {}): Player => ({ ...p, ...extra, region, actionsLeft: p.actionsLeft - 1 });

export function visitCity(g: GameState, i: number, rng: Rng): GameState {
  const p = g.player;
  if (!canAct(p) || !p.region!.cities[i]) return g;
  const cities = p.region!.cities.map((c, j) => (j === i ? { ...c, happiness: clamp(c.happiness + 3, 0, 100), mayorRelationship: clamp(c.mayorRelationship + 8, 0, 100) } : c));
  const pop = Math.round(1 + rng() * (p.popularity < 70 ? 2 : 0.5));
  return log({ ...g, player: spend(p, { ...p.region!, cities }, { popularity: clamp(p.popularity + pop, 0, 100) }) }, `${p.name} tours ${cities[i].name}.`);
}

export function grantCity(g: GameState, i: number): GameState {
  const p = g.player;
  if (!canAct(p) || !p.region!.cities[i] || p.region!.treasury < GRANT_COST) return g;
  const cities = p.region!.cities.map((c, j) => (j === i ? { ...c, happiness: clamp(c.happiness + 6, 0, 100), mayorRelationship: clamp(c.mayorRelationship + 12, 0, 100) } : c));
  const groups = { ...p.groups, workers: clamp(p.groups.workers + 2, 0, 100) };
  return log({ ...g, player: spend(p, { ...p.region!, cities, treasury: p.region!.treasury - GRANT_COST }, { groups }) }, `${p.name} sends a $${GRANT_COST}k state grant to ${cities[i].name}.`);
}

export function courtLegislature(g: GameState, rng: Rng): GameState {
  const p = g.player;
  if (!canAct(p)) return g;
  const gain = Math.max(1, Math.round((6 + rng() * 4) * (1 - p.region!.legislature.goodwill / 120)));
  const legislature = { ...p.region!.legislature, goodwill: clamp(p.region!.legislature.goodwill + gain, 0, 100) };
  return log({ ...g, player: spend(p, { ...p.region!, legislature }) }, `${p.name} hosts legislators at the Governor's mansion (+${gain} goodwill).`);
}

export function canGiveAddress(g: GameState) {
  const p = g.player;
  return isGovernor(p) && g.turn - p.region!.lastAddressTurn >= ADDRESS_COOLDOWN;
}

export function stateAddress(g: GameState): GameState {
  const p = g.player;
  if (!canAct(p) || !canGiveAddress(g)) return g;
  const r = p.region!;
  const boost = Math.round(3 + (r.happiness - 50) * 0.2);
  const region = { ...r, lastAddressTurn: g.turn, legislature: { ...r.legislature, goodwill: clamp(r.legislature.goodwill + 3, 0, 100) } };
  return log({ ...g, player: spend(p, region, { popularity: clamp(p.popularity + boost, 0, 100) }) }, `${p.name} gives the State of the State address (${boost >= 0 ? '+' : ''}${boost} popularity).`);
}

export function proposeStateLaw(g: GameState, id: string, rng: Rng): GameState {
  const p = g.player;
  const law = STATE_LAWS.find((l) => l.id === id);
  if (!canAct(p) || !law || p.region!.laws.includes(id)) return g;
  const { yes, needed } = forecastLaw(p, law);
  const actual = yes + Math.round((rng() - 0.5) * 6);
  const seats = p.region!.legislature.seats;
  if (actual < needed) {
    return log({ ...g, player: spend(p, p.region!, { popularity: clamp(p.popularity - 1, 0, 100) }) }, `The legislature rejects ${law.name} (${actual}–${seats - actual}).`);
  }
  const groups = { ...p.groups };
  for (const k of GROUP_IDS) groups[k] = clamp(groups[k] + (law.groups?.[k] ?? 0) / 2, 0, 100);
  return log({ ...g, player: spend(p, { ...p.region!, laws: [...p.region!.laws, id] }, { groups }) }, `${law.name} passes the legislature (${actual}–${seats - actual}).`);
}

export function repealStateLaw(g: GameState, id: string): GameState {
  const p = g.player;
  if (!canAct(p) || !p.region!.laws.includes(id)) return g;
  const name = STATE_LAWS.find((l) => l.id === id)!.name;
  return log({ ...g, player: spend(p, { ...p.region!, laws: p.region!.laws.filter((x) => x !== id) }, { popularity: clamp(p.popularity - 2, 0, 100) }) }, `${p.name} repeals ${name}.`);
}

/** Sign or veto the bill on your desk. Doesn't cost an action. */
export function decideBill(g: GameState, sign: boolean): GameState {
  const p = g.player;
  if (!isGovernor(p) || !p.region!.pendingBill) return g;
  const bill = BILLS.find((b) => b.id === p.region!.pendingBill)!;
  const shift = sign ? bill.sign : bill.veto;
  const r = p.region!;
  const stats = { ...r.stats };
  for (const s of STATS) stats[s] = clamp(stats[s] + (shift.stats?.[s] ?? 0), 0, 100);
  const groups = { ...p.groups };
  for (const k of GROUP_IDS) groups[k] = clamp(groups[k] + (shift.groups?.[k] ?? 0), 0, 100);
  // A signed bill with revenue effects changes the treasury once (a simplification of a lasting budget line).
  const treasury = r.treasury + (shift.revenue ?? 0) * regionRevenue(r) * 12;
  const goodwill = clamp(r.legislature.goodwill + (sign ? 2 : -8), 0, 100);
  const region = { ...r, stats, treasury, pendingBill: null, legislature: { ...r.legislature, goodwill } };
  return log({ ...g, player: { ...p, groups, region } }, `${p.name} ${sign ? 'signs' : 'vetoes'} the ${bill.title}.`);
}

export function setStateBudget(g: GameState, taxRate: number, budget: Region['budget']): GameState {
  const p = g.player;
  if (!isGovernor(p)) return g;
  const keys = Object.keys(budget) as StatePriority[];
  const total = keys.reduce((a, k) => a + Math.max(0, budget[k]), 0) || 1;
  const norm = Object.fromEntries(keys.map((k) => [k, Math.round((Math.max(0, budget[k]) / total) * 100)])) as Region['budget'];
  return { ...g, player: { ...p, region: { ...p.region!, taxRate: clamp(Math.round(taxRate * 2) / 2, 0, 10), budget: norm } } };
}

export const billById = (id: string | null): BillDef | undefined => BILLS.find((b) => b.id === id);
export type { StateLawDef, BillDef };
