import { SYSTEMS } from '../data/systems';
import { kindOf } from './offices';
import { careerScore } from './history';
import type { GameState, OfficeId } from './types';

// Badges earned across all your playthroughs.

export interface Achievement { id: string; name: string; blurb: string; icon: string; check: (g: GameState) => boolean }

const held = (g: GameState, kind: string) => Object.keys(g.player?.history?.monthsByOffice ?? {}).some((o) => kindOf(o as OfficeId) === kind) || kindOf(g.player?.office ?? null) === kind;
const topMonths = (g: GameState) => {
  const p = g.player!;
  const ladder = SYSTEMS[g.countries[p.countryId].systemId].ladder;
  return p.history?.monthsByOffice?.[ladder[ladder.length - 1]] ?? 0;
};
const hasFeat = (g: GameState, f: string) => !!g.player?.feats?.includes(f);
const atTop = (g: GameState) => {
  const p = g.player!;
  return p.highestRung === SYSTEMS[g.countries[p.countryId].systemId].ladder.length - 1;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-win', name: 'First victory', icon: '🗳️', blurb: 'Win your first race.', check: (g) => g.player!.record.won >= 1 },
  { id: 'win-5', name: 'Campaigner', icon: '📣', blurb: 'Win 5 elections.', check: (g) => g.player!.record.won >= 5 },
  { id: 'win-10', name: 'Election machine', icon: '🏆', blurb: 'Win 10 elections.', check: (g) => g.player!.record.won >= 10 },
  { id: 'beyond-city', name: 'Beyond city hall', icon: '🏛️', blurb: 'Serve as a governor or lawmaker.', check: (g) => held(g, 'regional') || held(g, 'legislative') },
  { id: 'cabinet', name: 'Inner circle', icon: '💼', blurb: 'Serve in the national cabinet.', check: (g) => held(g, 'cabinet') },
  { id: 'top', name: 'Top of the ladder', icon: '👑', blurb: 'Reach the highest office.', check: atTop },
  { id: 'decade', name: 'A decade at the top', icon: '⏳', blurb: 'Lead your country for 10 years.', check: (g) => topMonths(g) >= 120 },
  { id: 'comeback', name: 'Comeback kid', icon: '🔁', blurb: 'Lose 2 races and still reach the top.', check: (g) => g.player!.record.lost >= 2 && atTop(g) },
  { id: 'beloved', name: 'Beloved', icon: '❤️', blurb: 'Hit 90% popularity while in office.', check: (g) => !!g.player!.office && g.player!.popularity >= 90 },
  { id: 'sister-city', name: 'Twin towns', icon: '🤝', blurb: 'Make a sister city abroad.', check: (g) => hasFeat(g, 'sister-city') },
  { id: 'investor', name: 'Deal maker', icon: '💰', blurb: 'Bring home foreign investors from a trade trip.', check: (g) => hasFeat(g, 'investor') },
  { id: 'caught-spy', name: 'Spy catcher', icon: '🕵️', blurb: 'Catch foreign spies.', check: (g) => hasFeat(g, 'caught-spy') },
  { id: 'survived-coup', name: 'Survive a coup', icon: '🛡️', blurb: 'Stay in power through a coup attempt.', check: (g) => hasFeat(g, 'survived-coup') },
  { id: 'war-won', name: 'Victory', icon: '⚔️', blurb: 'Win a war.', check: (g) => (g.player!.history?.warsWon ?? 0) >= 1 },
  { id: 'clean', name: 'Clean hands', icon: '🧼', blurb: 'Retire after 10+ years in office with no scandals.', check: (g) => {
    const h = g.player!.history;
    const months = Object.values(h?.monthsByOffice ?? {}).reduce((a, b) => a + (b ?? 0), 0);
    return g.player!.retired && !!h && h.scandals === 0 && !h.removed && months >= 120;
  } },
  { id: 'legend', name: 'Legend', icon: '🌟', blurb: 'Finish a career with an S rank.', check: (g) => g.player!.retired && careerScore(g).grade === 'S' },
];

/** Ids of the badges this game state has earned. */
export function earned(g: GameState): string[] {
  if (!g.player) return [];
  return ACHIEVEMENTS.filter((a) => { try { return a.check(g); } catch { return false; } }).map((a) => a.id);
}

// ---------- Saved in this browser ----------

const KEY = 'polsim:achievements';
type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void };
const kv = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };

export function loadUnlocked(store: KV | null = kv()): Record<string, string> {
  try { return JSON.parse(store?.getItem(KEY) ?? '{}') ?? {}; } catch { return {}; }
}

/** Saves newly earned badges; returns the ones that are new. */
export function unlock(ids: string[], when: string, store: KV | null = kv()): string[] {
  const have = loadUnlocked(store);
  const fresh = ids.filter((id) => !have[id]);
  if (!fresh.length) return [];
  for (const id of fresh) have[id] = when;
  try { store?.setItem(KEY, JSON.stringify(have)); } catch { /* private mode */ }
  return fresh;
}
