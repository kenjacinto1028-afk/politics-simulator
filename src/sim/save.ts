import type { GameState } from './types';
import { newCouncil } from './city';
import { makeRng } from './rng';
import { newRegion } from './governor';
import { newSeat } from './legislator';
import { kindOf } from './offices';
import { SYSTEMS } from '../data/systems';

export const SAVE_VERSION = 4;
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
  if (typeof file.version !== 'number' || file.version < 1 || file.version > SAVE_VERSION) throw new Error(`Unsupported save version ${file.version}.`);
  const g = file.game;
  if (typeof g.turn !== 'number' || !g.countries) throw new Error('Save file is corrupted.');
  let out = g;
  if (file.version < 2) out = migrateV1(out);
  if (file.version < 3) out = migrateV2(out);
  if (file.version < 4) out = migrateV3(out);
  return out;
}

/** v3 saves predate lawmaker gameplay. A lawmaker from then gets a fresh seat. */
function migrateV3(g: GameState): GameState {
  const p = g.player;
  if (!p) return g;
  const seat = p.seat ?? (p.office && kindOf(p.office) === 'legislative' ? newSeat(p.office, makeRng(g.seed + 2)) : null);
  return { ...g, player: { ...p, seat } };
}

/** v2 saves predate Governor gameplay, term counting and event memory. */
function migrateV2(g: GameState): GameState {
  const p = g.player;
  if (!p) return g;
  const ladder = SYSTEMS[g.countries[p.countryId].systemId].ladder;
  const rung = p.office ? ladder.indexOf(p.office) : p.record.won > 0 ? 0 : -1;
  // A v2 Governor had no state yet; create one around the home city.
  const region = p.region ?? (p.office && kindOf(p.office) === 'regional' && p.city ? newRegion(p.city.name, makeRng(g.seed + 1)) : null);
  return { ...g, player: { ...p, region: region && { ...region, billCooldown: region.billCooldown ?? 0 }, termsInOffice: p.termsInOffice ?? (p.office ? 1 : 0), highestRung: p.highestRung ?? rung, recentEvents: p.recentEvents ?? [], lastEventTurn: p.lastEventTurn ?? -99 } };
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
