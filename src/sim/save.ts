import type { GameState } from './types';
import { newCouncil } from './city';
import { makeRng } from './rng';

export const SAVE_VERSION = 2;
export const SLOTS = ['autosave', 'slot1', 'slot2', 'slot3'] as const;
export type SlotId = (typeof SLOTS)[number];

interface SaveFile { version: number; savedAt: string; game: GameState }

export interface SlotInfo { slot: SlotId; savedAt: string; label: string }

/** Minimal storage interface so tests can use an in-memory map. */
export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

const key = (slot: SlotId) => `polsim:save:${slot}`;

export function serialize(game: GameState): string {
  const file: SaveFile = { version: SAVE_VERSION, savedAt: new Date().toISOString(), game };
  return JSON.stringify(file);
}

export function deserialize(text: string): GameState {
  const file = JSON.parse(text) as Partial<SaveFile>;
  if (!file || typeof file !== 'object' || !file.game) throw new Error('Not a Politics Simulator save file.');
  if (file.version !== 1 && file.version !== SAVE_VERSION) throw new Error(`Unsupported save version ${file.version}.`);
  const g = file.game;
  if (typeof g.turn !== 'number' || !g.countries) throw new Error('Save file is corrupted.');
  return file.version === 1 ? migrateV1(g) : g;
}

/** v1 saves predate voter groups, the council, projects and laws. */
function migrateV1(g: GameState): GameState {
  const p = g.player;
  if (!p) return g;
  const neutral = { workers: 45, business: 45, retirees: 45, students: 45 };
  const city = p.city && {
    ...p.city,
    council: p.city.council ?? newCouncil(makeRng(g.seed)),
    building: p.city.building ?? [], built: p.city.built ?? [], laws: p.city.laws ?? [],
  };
  return { ...g, player: { ...p, city, groups: p.groups ?? neutral, monthsInOffice: p.monthsInOffice ?? 0 } };
}

export function saveTo(kv: KV, slot: SlotId, game: GameState) {
  kv.setItem(key(slot), serialize(game));
}

export function loadFrom(kv: KV, slot: SlotId): GameState | null {
  const text = kv.getItem(key(slot));
  return text ? deserialize(text) : null;
}

export function deleteSlot(kv: KV, slot: SlotId) {
  kv.removeItem(key(slot));
}

export function listSlots(kv: KV): SlotInfo[] {
  const out: SlotInfo[] = [];
  for (const slot of SLOTS) {
    const text = kv.getItem(key(slot));
    if (!text) continue;
    try {
      const f = JSON.parse(text) as SaveFile;
      const p = f.game.player;
      out.push({ slot, savedAt: f.savedAt, label: p ? `${p.name} · ${f.game.year}-${String(f.game.month).padStart(2, '0')}` : 'New world' });
    } catch { /* skip corrupt slot */ }
  }
  return out;
}

/** Browser localStorage, or null when unavailable (private mode, etc.). */
export function browserKV(): KV | null {
  try {
    const t = '__polsim_test__';
    localStorage.setItem(t, t);
    localStorage.removeItem(t);
    return localStorage;
  } catch {
    return null;
  }
}
