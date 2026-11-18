import type { City, Country, SpendKey } from './types';
import type { Rng } from './rng';

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const approach = (cur: number, target: number, rate = 0.12) => cur + (target - cur) * rate;

export const DEFAULT_SPENDING: Record<SpendKey, number> = { police: 25, infrastructure: 30, welfare: 25, culture: 20 };

export function newCity(name: string, rng: Rng): City {
  return {
    name, population: Math.round(150 + rng() * 350), taxRate: 5, spending: { ...DEFAULT_SPENDING }, treasury: 200,
    crime: 40 + rng() * 20, services: 45 + rng() * 15, jobs: 45 + rng() * 15, happiness: 45 + rng() * 10, culture: 40 + rng() * 20,
  };
}

/** Monthly revenue in thousands. */
export const cityRevenue = (c: City) => c.population * c.taxRate * 0.06;

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
 * unhappier residents and fewer jobs. Treasury absorbs a 10% reserve.
 */
export function tickCity(c: City, country: Country, rng: Rng): City {
  const funding = c.taxRate / 5; // 1.0 at the default rate
  const dept = (k: SpendKey) => clamp(c.spending[k] * 2 * funding, 0, 100);
  const noise = () => (rng() - 0.5) * 3;

  const crime = clamp(approach(c.crime, 100 - dept('police') - (c.jobs - 50) * 0.2) + noise(), 0, 100);
  const services = clamp(approach(c.services, dept('infrastructure')) + noise(), 0, 100);
  const culture = clamp(approach(c.culture, dept('culture')) + noise(), 0, 100);
  const jobs = clamp(approach(c.jobs, 50 + (5 - c.taxRate) * 4 + (services - 50) * 0.3 + country.economy.growth * 3) + noise(), 0, 100);
  const broke = c.treasury < 0 ? 10 : 0;
  const happinessTarget = (dept('welfare') + culture + services + (100 - crime) + jobs) / 5 - (c.taxRate - 5) * 3 - broke;
  const happiness = clamp(approach(c.happiness, happinessTarget) + noise(), 0, 100);
  const treasury = c.treasury + cityRevenue(c) * 0.1;
  const population = Math.max(10, Math.round(c.population * (1 + (happiness - 50) * 0.0002)));
  return { ...c, crime, services, culture, jobs, happiness, treasury, population };
}
