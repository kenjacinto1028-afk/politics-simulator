import type { GameState } from './types';

export const SAVE_VERSION = 1;
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
  if (file.version !== SAVE_VERSION) throw new Error(`Unsupported save version ${file.version}.`);
  const g = file.game;
  if (typeof g.turn !== 'number' || !g.countries) throw new Error('Save file is corrupted.');
  return g;
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
