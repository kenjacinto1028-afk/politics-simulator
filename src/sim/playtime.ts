import type { GameState } from './types';

// Real time spent playing: per save (inside the game state) and overall (in this browser).

const KEY = 'polsim:playtime';
type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void };
const kv = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };

export function totalPlaySeconds(store: KV | null = kv()): number {
  try { return Number(store?.getItem(KEY) ?? 0) || 0; } catch { return 0; }
}

export function addTotalPlaySeconds(s: number, store: KV | null = kv()) {
  try { store?.setItem(KEY, String(totalPlaySeconds(store) + s)); } catch { /* private mode */ }
}

export const addPlaySeconds = (g: GameState, s: number): GameState => ({ ...g, playSeconds: (g.playSeconds ?? 0) + s });

/** 3h 05m, 12m, 40s */
export function formatPlaytime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m) return `${m}m`;
  return `${s}s`;
}
