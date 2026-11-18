import { LOCALES, type Locale } from '../data/locales';
import { CITY_NAMES, RIVAL_FIRST, RIVAL_LAST, RIVAL_PARTIES } from '../data/events';
import { STATE_NAMES } from '../data/state-content';
import type { Rng } from './rng';

/** Fallback when a country has no local name list (used by old tests and unknown ids). */
const GENERIC: Locale = { cities: CITY_NAMES, regions: STATE_NAMES, first: RIVAL_FIRST, last: RIVAL_LAST, parties: RIVAL_PARTIES, regionWord: 'State' };

export const localeOf = (countryId?: string): Locale => (countryId && LOCALES[countryId]) || GENERIC;

const pick = <T,>(arr: readonly T[], rng: Rng) => arr[Math.floor(rng() * arr.length)];

/** A local-sounding person's name for that country. */
export const personName = (countryId: string | undefined, rng: Rng) => {
  const l = localeOf(countryId);
  return `${pick(l.first, rng)} ${pick(l.last, rng)}`;
};

/** A real city of that country, avoiding any in `taken`. */
export function cityName(countryId: string | undefined, rng: Rng, taken: string[] = []): string {
  const l = localeOf(countryId);
  const free = l.cities.filter((c) => !taken.includes(c));
  return pick(free.length ? free : l.cities, rng);
}

/** Several distinct cities, avoiding `taken`. */
export function cityNames(countryId: string | undefined, rng: Rng, n: number, taken: string[] = []): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(cityName(countryId, rng, [...taken, ...out]));
  return out;
}

export const regionName = (countryId: string | undefined, rng: Rng) => pick(localeOf(countryId).regions, rng);
export const partyName = (countryId: string | undefined, rng: Rng) => pick(localeOf(countryId).parties, rng);
