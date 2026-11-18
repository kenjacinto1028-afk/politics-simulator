import { seedCountries, type WorldSize } from '../data/countries';
import type { Country, GameState } from './types';
import { makeRng, type Rng } from './rng';
import { tickPlayer } from './career';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function newGame(worldSize: WorldSize = 25, seed = 1): GameState {
  return { turn: 0, seed, year: 2026, month: 1, worldSize, player: null, countries: seedCountries(worldSize), log: ['The world awaits.'] };
}

/** High-level monthly drift for any country. Detailed sim for the player nation comes later. */
function tickCountry(c: Country, rng: Rng): Country {
  const shock = (rng() - 0.5) * 0.4;
  const growth = clamp(c.economy.growth + shock, -8, 12);
  const gdpBn = c.economy.gdpBn * (1 + growth / 100 / 12);
  const unemployment = clamp(c.economy.unemployment - (growth - 2) * 0.02 + (rng() - 0.5) * 0.1, 1, 40);
  const approval = clamp(c.leader.approval + (growth - 2) * 0.1 - (unemployment - 5) * 0.05 + (rng() - 0.5) * 2, 5, 95);
  const stability = clamp(c.stability + (approval - 45) * 0.01, 0, 100);
  return { ...c, stability, leader: { ...c.leader, approval }, economy: { ...c.economy, growth, gdpBn, unemployment } };
}

export function advanceMonth(state: GameState, rng: Rng): GameState {
  const countries: Record<string, Country> = {};
  for (const [id, c] of Object.entries(state.countries)) countries[id] = tickCountry(c, rng);
  const month = state.month === 12 ? 1 : state.month + 1;
  const year = state.month === 12 ? state.year + 1 : state.year;
  return tickPlayer({ ...state, turn: state.turn + 1, month, year, countries }, rng);
}

/** Deterministic RNG for a given game moment; `salt` separates independent rolls within a turn. */
export function rngFor(state: GameState, salt = 0): Rng {
  return makeRng(mix(mix(state.seed) ^ mix(state.turn + 1) ^ mix(salt * 7919 + 13)));
}

/** murmur3 finalizer: spreads nearby inputs (turn 5 vs 6) into unrelated seeds. */
function mix(h: number): number {
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
