import { POLICIES, POLICY_IDS, STATS, type PolicyId, type StatId } from '../data/society';
import { baseTourismCulture } from '../data/countries';
import { clamp } from './city';
import { kindOf } from './offices';
import type { Rng } from './rng';
import type { Country, GameState, Nation, Player, WorldState } from './types';

// Country scores, the leader's policies, and the world they share.
// Every score settles toward a target set by wealth, budget, policies and the other scores.

type Policies = Partial<Record<PolicyId, 0 | 1 | 2>>;
type Priorities = Nation['priorities'];

export const DEFAULT_PRIORITIES: Priorities = { defense: 15, welfare: 25, health: 20, education: 20, infrastructure: 20 };
export const newWorld = (): WorldState => ({ climate: 25, energyPrice: 100, outbreak: 0 });

/** How developed a country is, 0..1, from income per person. */
export const devLevel = (c: Country) => clamp(Math.log10(Math.max(1, c.economy.gdpBn / Math.max(0.1, c.population))) / 2, 0, 1);

/** Governments that run things their own way even without you. */
export function aiPolicies(c: Country): Policies {
  if (c.systemId === 'one-party') return { press: 0, protest: 0, spying: 2 };
  if (c.systemId === 'corporate-state') return { welfare: 0, healthcare: 0, research: 2 };
  return {};
}
export const policiesOf = (g: GameState, id: string): Policies =>
  g.player?.nation && g.player.countryId === id && kindOf(g.player.office) === 'head' ? g.player.nation.policies ?? {} : g.countries[id].policies ?? aiPolicies(g.countries[id]);
export const levelOf = (pol: Policies, id: PolicyId) => pol[id] ?? 1;

/** Sum of what your policies do. */
export function policyMods(pol: Policies) {
  const stats: Partial<Record<StatId | 'tourism' | 'culture', number>> = {};
  const groups: Record<'workers' | 'business' | 'retirees' | 'students', number> = { workers: 0, business: 0, retirees: 0, students: 0 };
  let spend = 0, growth = 0;
  for (const id of POLICY_IDS) {
    const lv = POLICIES[id].levels[levelOf(pol, id)];
    spend += lv.spend ?? 0;
    growth += lv.growth ?? 0;
    for (const [k, v] of Object.entries(lv.stats ?? {})) stats[k as StatId] = (stats[k as StatId] ?? 0) + v;
    for (const [k, v] of Object.entries(lv.groups ?? {})) groups[k as keyof typeof groups] += v;
  }
  return { stats, groups, spend, growth };
}
export const policySpending = (n: Nation) => policyMods(n.policies ?? {}).spend;

const PRESS_BASE: Record<string, number> = { 'one-party': 15, 'corporate-state': 35, presidential: 50, 'semi-presidential': 55, federal: 55 };
const ENERGY_BASE: Record<string, number> = { oil: 85, minerals: 55 };

interface Ctx { pol: Policies; pr: Priorities; world: WorldState; war: boolean; civilWar: boolean; popRate: number }

/** Where each score is heading. */
export function targets(c: Country, x: Ctx): Record<StatId, number> {
  const L = devLevel(c);
  const s = c.society;
  const e = c.economy;
  const m = policyMods(x.pol).stats;
  const M = (k: StatId) => m[k] ?? 0;
  const out = {
    health: 30 + 55 * L + (x.pr.health - 20) * 0.8 + (s.food - 50) * 0.1 - (s.pollution - 40) * 0.15 - (x.world.outbreak ? 8 : 0),
    education: 30 + 55 * L + (x.pr.education - 20) * 0.8,
    housing: 65 - 25 * L - x.popRate * 10,
    inequality: 50 - 15 * L - (x.pr.welfare - 25) * 0.5 + (c.systemId === 'corporate-state' ? 10 : 0),
    crime: 55 - 30 * L + (e.unemployment - 6) * 1.5 + (s.inequality - 45) * 0.3 - (c.stability - 60) * 0.2 + (x.civilWar ? 20 : 0),
    unrest: 60 - c.stability * 0.5 + (s.inequality - 45) * 0.3 + (e.unemployment - 6) + (e.inflation - 3) * 0.8 + (s.housing < 40 ? 5 : 0) + (x.civilWar ? 30 : 0),
    press: (PRESS_BASE[c.systemId] ?? 60) + 15 * L,
    corruption: 70 - 45 * L - (c.stability - 60) * 0.2 - (s.press - 50) * 0.1,
    intel: 15 + c.military * 0.5,
    infrastructure: 25 + 60 * L + (x.pr.infrastructure - 20) * 0.8 - (s.corruption - 40) * 0.1 - (x.war ? 5 : 0),
    tech: 10 + 60 * L + (s.education - 50) * 0.3,
    energy: (ENERGY_BASE[c.resource] ?? 35) + (c.nuclear ? 10 : 0),
    food: (c.resource === 'food' ? 80 : 50) + 15 * L - (x.world.climate - 25) * 0.2 - (x.war ? 10 : 0),
    pollution: 30 + (c.resource === 'industry' ? 15 : c.resource === 'oil' ? 10 : 0) + 10 * (1 - L) + (e.growth - 2) * 1.5,
    elderly: s.elderly,
    migration: s.migration,
  };
  for (const k of Object.keys(out) as StatId[]) if (k !== 'elderly' && k !== 'migration') out[k] = clamp(out[k] + M(k), 0, 100);
  return out;
}

/** Starting scores: where the country would settle with default policies. */
export function seedSociety(c: Omit<Country, 'relations' | 'society'>): Record<StatId, number> {
  const L = devLevel(c as Country);
  let s: Record<StatId, number> = { health: 50, education: 50, housing: 50, inequality: 45, crime: 40, unrest: 30, press: 50, corruption: 40, intel: 30, infrastructure: 50, tech: 50, energy: 50, food: 50, pollution: 40, elderly: 5 + 16 * L, migration: 0 };
  const ctx: Ctx = { pol: aiPolicies(c as Country), pr: DEFAULT_PRIORITIES, world: newWorld(), war: false, civilWar: false, popRate: 1 };
  // A few passes so linked scores settle together.
  for (let i = 0; i < 4; i++) s = { ...targets({ ...(c as Country), society: s }, ctx), elderly: s.elderly, migration: 0 };
  for (const k of Object.keys(s) as StatId[]) s[k] = Math.round(s[k]);
  return s;
}

const SLOW: Partial<Record<StatId, number>> = { education: 0.015, tech: 0.015, infrastructure: 0.015 };
const approach = (v: number, t: number, r: number) => v + (t - v) * r;
const stamp = (g: GameState) => `${g.year}-${String(g.month).padStart(2, '0')}`;
const log = (g: GameState, line: string): GameState => ({ ...g, log: [`${stamp(g)}: ${line}`, ...g.log].slice(0, 200) });

/** Births, deaths and migration, % a year. */
export function popChange(c: Country, x: Ctx) {
  const s = c.society;
  const births = clamp(2.6 - s.education * 0.025 + (s.housing - 50) * 0.006, 0.5, 4);
  const deaths = clamp(0.4 + s.elderly * 0.035 - s.health * 0.003 + (x.war ? 0.3 : 0) + (x.world.outbreak ? 0.1 : 0), 0.3, 3);
  const e = c.economy;
  const appeal = (e.growth - 2) * 4 - (e.unemployment - 6) * 1.5 + (c.stability - 60) * 0.2 - (x.war ? 15 : 0) - (x.civilWar ? 25 : 0);
  const open = [0.3, 0.7, 1.2][levelOf(x.pol, 'immigration')];
  const migration = clamp(appeal * 0.25 * (appeal > 0 ? open : 1), -12, 6);
  return { births, deaths, migration };
}

/** Monthly: every country's scores and people, plus the shared world. */
export function tickSociety(g: GameState, rng: Rng): GameState {
  const world0 = g.world ?? newWorld();
  const countries = { ...g.countries };
  const lines: string[] = [];
  const led = g.player?.nation && kindOf(g.player.office) === 'head' ? g.player.countryId : null;
  const leaderWar = led ? g.player!.nation!.war : null;

  // A world outbreak now and then.
  let outbreak = Math.max(0, world0.outbreak - 1);
  if (!world0.outbreak && rng() < 0.005) {
    outbreak = 6 + Math.floor(rng() * 12);
    lines.push('A new disease spreads across the world. Borders tighten and tourists stay home.');
    for (const id of Object.keys(countries)) {
      const c = countries[id];
      countries[id] = { ...c, economy: { ...c.economy, growth: clamp(c.economy.growth - 1.5 * (1 - c.society.health / 150), -8, 12) } };
    }
  } else if (world0.outbreak === 1) lines.push('The world outbreak is over.');

  // Energy prices jump with wars and civil wars, fall when the world is sick.
  const strife = (leaderWar ? 1 : 0) + (g.conflicts ?? []).length + (g.wars ?? []).length;
  const energyPrice = clamp(approach(world0.energyPrice, 100 + strife * 12 - (outbreak ? 20 : 0), 0.1) + (rng() - 0.5) * 6, 50, 250);

  // Pollution, weighted by economy size, warms the planet.
  let gdp = 0, dirt = 0;
  for (const c of Object.values(countries)) { gdp += c.economy.gdpBn; dirt += c.economy.gdpBn * c.society.pollution; }
  const climate = clamp(world0.climate + (dirt / Math.max(1, gdp) - 30) / 300, 0, 100);
  const world: WorldState = { climate, energyPrice, outbreak };

  for (const id of Object.keys(countries)) {
    const c = countries[id];
    const pol = policiesOf(g, id);
    const isLed = id === led;
    const ctx0: Ctx = {
      pol, pr: isLed ? g.player!.nation!.priorities : DEFAULT_PRIORITIES, world,
      war: isLed ? !!leaderWar : (g.wars ?? []).some((w) => w.a === id || w.b === id), civilWar: (g.conflicts ?? []).some((x) => x.country === id), popRate: 0,
    };
    const pc = popChange(c, ctx0);
    const popRate = pc.births - pc.deaths + pc.migration / 10;
    const ctx = { ...ctx0, popRate };
    const t = targets(c, ctx);
    const s = { ...c.society };
    for (const k of Object.keys(STATS) as StatId[]) {
      if (k === 'elderly' || k === 'migration') continue;
      s[k] = clamp(approach(s[k], t[k], SLOW[k] ?? 0.03), 0, 100);
    }
    const L = devLevel(c);
    s.elderly = clamp(approach(s.elderly, 5 + 18 * L + (s.health - 60) * 0.1 - (pc.births - 1.5) * 3, 0.01), 2, 40);
    s.migration = approach(s.migration, pc.migration, 0.1);
    const mods = policyMods(pol).stats;
    const [baseT, baseC] = baseTourismCulture(id) ?? [c.tourism, c.culture];
    const culture = clamp(approach(c.culture, baseC + (s.education - 50) * 0.1 + (mods.culture ?? 0), 0.02), 0, 100);
    const tourismT = baseT + (culture - baseC) * 0.3 - (s.crime - 40) * 0.3 + (s.infrastructure - 50) * 0.15 - (outbreak ? 25 : 0) - (ctx.war ? 20 : 0) - (ctx.civilWar ? 30 : 0) + (mods.tourism ?? 0);
    const tourism = clamp(approach(c.tourism, tourismT, 0.05), 0, 100);
    countries[id] = { ...c, society: s, culture, tourism, population: c.population * (1 + popRate / 1200) };
  }

  let next: GameState = { ...g, countries, world };

  // Disasters hit your country more often as the planet warms.
  if (g.player && rng() < 0.004 + climate * 0.0003) next = disaster(next, rng);

  for (const l of lines) next = log(next, l);
  return next;
}

const DISASTERS = ['A typhoon', 'Major floods', 'An earthquake', 'A drought', 'Wildfires', 'A heatwave'];

function disaster(g: GameState, rng: Rng): GameState {
  const p = g.player!;
  const c = g.countries[p.countryId];
  const ready = levelOf(policiesOf(g, c.id), 'disasters');
  const dmg = clamp(1 - ready * 0.25 - c.society.infrastructure / 250, 0.2, 1);
  const what = DISASTERS[Math.floor(rng() * DISASTERS.length)];
  const hit: Country = {
    ...c, stability: clamp(c.stability - 8 * dmg, 0, 100),
    economy: { ...c.economy, growth: clamp(c.economy.growth - 0.8 * dmg, -8, 12) },
    society: { ...c.society, infrastructure: clamp(c.society.infrastructure - 5 * dmg, 0, 100), food: clamp(c.society.food - 4 * dmg, 0, 100) },
  };
  let player: Player = p;
  const leading = kindOf(p.office) === 'head' && !!p.nation;
  if (leading) player = { ...p, popularity: clamp(p.popularity + (ready === 2 ? 2 : ready === 0 ? -4 : -1), 0, 100) };
  const response = !leading ? '' : ready === 2 ? ' Quick rescue work wins praise.' : ready === 0 ? ' The slow response angers voters.' : '';
  return log({ ...g, player, countries: { ...g.countries, [c.id]: hit } }, `${what} strikes ${c.name}.${dmg > 0.6 ? ' Damage is heavy.' : ' Damage is limited.'}${response}`);
}

/** What the scores do to the economy and mood of the country you lead. */
export function societyEffects(c: Country, n: Nation, world: WorldState = newWorld()) {
  const s = c.society;
  const pm = policyMods(n.policies ?? {});
  const L = devLevel(c);
  const energyHit = (world.energyPrice - 100) * 0.01;
  const growth = (s.education - 50) * 0.004 + (s.tech - 50) * 0.006 + (s.infrastructure - 50) * 0.006 - (s.corruption - 40) * 0.006
    + (c.tourism - 50) * 0.004 - (s.elderly - 15) * 0.02 + s.migration * 0.03 + (1 - L) * 0.6 - 0.3 + pm.growth
    - (world.outbreak ? 1.5 : 0) + (c.resource === 'oil' ? energyHit : -energyHit * (1 - s.energy / 100));
  const inflation = Math.max(0, world.energyPrice - 100) * 0.02 * (1 - s.energy / 100) + (s.food < 40 ? 1 : 0);
  const stability = -(s.crime - 40) * 0.1 - (s.unrest - 30) * 0.12 + (s.food - 50) * 0.05;
  const mood = (s.health - 50) * 0.1 + (s.housing - 50) * 0.06 - (s.pollution - 50) * 0.05 - (s.crime - 40) * 0.06 - (world.outbreak ? 4 : 0);
  const groups = {
    retirees: (s.health - 50) * 0.15 - (s.crime - 40) * 0.1 + pm.groups.retirees,
    students: (s.education - 50) * 0.1 + (s.housing - 50) * 0.1 + (s.press - 50) * 0.05 + pm.groups.students,
    workers: (s.housing - 50) * 0.08 - (s.inequality - 45) * 0.12 + pm.groups.workers,
    business: -(s.corruption - 40) * 0.1 + (s.infrastructure - 50) * 0.08 + pm.groups.business,
  };
  return { growth, inflation, stability, mood, groups };
}

// ---------- Leader actions ----------

const isLeader = (p: Player | null): p is Player => !!p && kindOf(p.office) === 'head' && !!p.nation;

/** Change one area's policy. Takes an action. */
export function setPolicy(g: GameState, id: PolicyId, level: 0 | 1 | 2): GameState {
  const p = g.player;
  if (!isLeader(p) || p.actionsLeft <= 0 || p.pendingEvent || !POLICIES[id] || ![0, 1, 2].includes(level)) return g;
  const n = p.nation!;
  if (levelOf(n.policies ?? {}, id) === level) return g;
  const nation = { ...n, policies: { ...(n.policies ?? {}), [id]: level } };
  return log({ ...g, player: { ...p, nation, actionsLeft: p.actionsLeft - 1 } }, `${p.name} sets ${POLICIES[id].name.toLowerCase()} policy to "${POLICIES[id].levels[level].name}".`);
}

export function spyBlocker(g: GameState, target: string): string | null {
  const p = g.player!;
  if (!g.countries[target] || target === p.countryId) return 'Not available';
  if (g.countries[p.countryId].society.intel < 25) return 'Spy agency too weak';
  return null;
}

export const spyChance = (g: GameState, target: string) =>
  clamp(0.35 + (g.countries[g.player!.countryId].society.intel - g.countries[target].society.intel) / 100, 0.1, 0.85);

/** Steal technology or sabotage a rival. If caught, it's a scandal. */
export function spyOp(g: GameState, target: string, kind: 'steal' | 'sabotage', rng: Rng): GameState {
  const p = g.player;
  if (!isLeader(p) || p.actionsLeft <= 0 || p.pendingEvent || spyBlocker(g, target)) return g;
  const me = g.countries[p.countryId];
  const them = g.countries[target];
  const roll = rng();
  const player = { ...p, actionsLeft: p.actionsLeft - 1 };
  if (roll < spyChance(g, target)) {
    const countries = kind === 'steal'
      ? { ...g.countries, [me.id]: { ...me, society: { ...me.society, tech: clamp(me.society.tech + 4, 0, 100) } } }
      : { ...g.countries, [them.id]: { ...them, military: clamp(them.military - 3, 0, 100), economy: { ...them.economy, growth: clamp(them.economy.growth - 0.6, -8, 12) } } };
    return log({ ...g, countries, player }, kind === 'steal' ? `Your agents quietly steal research from ${them.name}.` : `Your agents sabotage factories in ${them.name}. No one suspects you.`);
  }
  if (roll < spyChance(g, target) + (1 - spyChance(g, target)) / 2) {
    const rel = (a: Country, b: string) => ({ ...a, relations: { ...a.relations, [b]: clamp((a.relations[b] ?? 0) - 20, -100, 100) } });
    const countries = { ...g.countries, [me.id]: rel(me, them.id), [them.id]: rel(them, me.id) };
    return log({ ...g, countries, player: { ...player, popularity: clamp(p.popularity - 3, 0, 100) } }, `Scandal: ${them.name} catches your spies and expels your diplomats.`);
  }
  return log({ ...g, player }, `Your spy operation in ${them.name} comes back empty-handed.`);
}

/** Read a country or world value for event conditions. */
export function readValue(g: GameState, c: Country, stat: string): number {
  const w = g.world ?? newWorld();
  if (stat === 'climate' || stat === 'outbreak' || stat === 'energyPrice') return w[stat];
  if (stat === 'tourism' || stat === 'culture') return c[stat];
  return c.society?.[stat as StatId] ?? 50;
}
