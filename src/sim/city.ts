import { COUNCIL_FIRST, COUNCIL_LAST, LAWS, PROJECTS, type StatKey } from '../data/city-content';
import type { City, Country, CouncilMember, GroupId, SpendKey } from './types';
import type { Rng } from './rng';

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Very good (or very bad) results get harder to reach: targets flatten above 70 and below 25. */
export const soft = (t: number) => (t > 70 ? 70 + (t - 70) * 0.35 : t < 25 ? 25 - (25 - t) * 0.35 : t);
const approach = (cur: number, target: number, rate = 0.12) => cur + (soft(target) - cur) * rate;

export const DEFAULT_SPENDING: Record<SpendKey, number> = { police: 25, infrastructure: 30, welfare: 25, culture: 20 };
/** Share of revenue the city saves into its treasury each month (the rest runs departments). */
export const RESERVE_RATE = 0.2;

const LEANS: GroupId[] = ['workers', 'workers', 'business', 'retirees', 'retirees', 'students', 'business'];

export function newCouncil(rng: Rng): CouncilMember[] {
  const used = new Set<string>();
  return LEANS.map((leans) => {
    let name = '';
    do name = `${COUNCIL_FIRST[Math.floor(rng() * COUNCIL_FIRST.length)]} ${COUNCIL_LAST[Math.floor(rng() * COUNCIL_LAST.length)]}`;
    while (used.has(name));
    used.add(name);
    return { name, leans, relationship: Math.round(35 + rng() * 30) };
  });
}

export function newCity(name: string, rng: Rng): City {
  return {
    name, population: Math.round(150 + rng() * 350), taxRate: 5, spending: { ...DEFAULT_SPENDING }, treasury: 200,
    crime: 40 + rng() * 20, services: 45 + rng() * 15, jobs: 45 + rng() * 15, happiness: 45 + rng() * 10, culture: 40 + rng() * 20,
    council: newCouncil(rng), building: [], built: [], laws: [],
  };
}

/** Sum of lasting stat shifts from finished projects and active laws. */
export function statBonuses(c: City): Record<StatKey, number> {
  const out: Record<StatKey, number> = { crime: 0, services: 0, jobs: 0, happiness: 0, culture: 0 };
  const add = (s: Partial<Record<StatKey, number>>) => { for (const k of Object.keys(s) as StatKey[]) out[k] += s[k]!; };
  for (const id of c.built) { const p = PROJECTS.find((x) => x.id === id); if (p) add(p.stats); }
  for (const id of c.laws) { const l = LAWS.find((x) => x.id === id); if (l) add(l.stats); }
  return out;
}

/** Monthly revenue in thousands, after law modifiers. */
export function cityRevenue(c: City): number {
  const mod = c.laws.reduce((m, id) => m + (LAWS.find((l) => l.id === id)?.revenue ?? 0), 0);
  return c.population * c.taxRate * 0.06 * Math.max(0.5, 1 + mod);
}

/** Normalizes a spending map so it sums to 100. */
export function normalizeSpending(s: Record<SpendKey, number>): Record<SpendKey, number> {
  const keys = Object.keys(s) as SpendKey[];
  const total = keys.reduce((a, k) => a + Math.max(0, s[k]), 0) || 1;
  const out = {} as Record<SpendKey, number>;
  for (const k of keys) out[k] = Math.round((Math.max(0, s[k]) / total) * 100);
  return out;
}

/**
 * One month of city life. Higher taxes = more funding for departments but
 * unhappier residents and fewer jobs. Projects and laws shift the targets.
 */
export function tickCity(c: City, country: Country, rng: Rng): City {
  const funding = c.taxRate / 5; // 1.0 at the default rate
  const dept = (k: SpendKey) => clamp(c.spending[k] * 2 * funding, 0, 100);
  const noise = () => (rng() - 0.5) * 3;
  const b = statBonuses(c);

  const crime = clamp(approach(c.crime, 100 - dept('police') - (c.jobs - 50) * 0.2 + b.crime) + noise(), 0, 100);
  const services = clamp(approach(c.services, dept('infrastructure') + b.services) + noise(), 0, 100);
  const culture = clamp(approach(c.culture, dept('culture') + b.culture) + noise(), 0, 100);
  const jobs = clamp(approach(c.jobs, 50 + (5 - c.taxRate) * 4 + (services - 50) * 0.3 + country.economy.growth * 3 + b.jobs) + noise(), 0, 100);
  const broke = c.treasury < 0 ? 10 : 0;
  const happinessTarget = (dept('welfare') + culture + services + (100 - crime) + jobs) / 5 - (c.taxRate - 5) * 3 - broke + b.happiness;
  const happiness = clamp(approach(c.happiness, happinessTarget) + noise(), 0, 100);
  const treasury = c.treasury + cityRevenue(c) * RESERVE_RATE;
  const population = Math.max(10, Math.round(c.population * (1 + (happiness - 50) * 0.0002)));
  return { ...c, crime, services, culture, jobs, happiness, treasury, population };
}
