import type { GameState } from './types';
import { newCouncil } from './city';
import { makeRng } from './rng';
import { newRegion } from './governor';
import { newSeat } from './legislator';
import { kindOf } from './offices';
import { newMinistry } from './cabinet';
import { clearOldJobs } from './career';
import { newNation } from './nation';
import { newContacts } from './people';
import { newSystemState } from './systems';
import { geoOf, seedCountries, startingRelation } from '../data/countries';
import { SYSTEMS } from '../data/systems';

export const SAVE_VERSION = 7;
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
  if (file.version < 5) out = migrateV4(out);
  if (file.version < 6) out = migrateV5(out);
  if (file.version < 7) out = migrateV6(out);
  return out;
}

/** v6 saves predate world power: blocs, armies, exports and proxy wars. Relations keep their history. */
function migrateV6(g: GameState): GameState {
  const withGeo = Object.fromEntries(Object.entries(g.countries).map(([id, c]) => [id, { ...geoOf(id), ...c }]));
  // Old relations keep their history, plus the starting warmth or chill between blocs and rivals.
  const countries = Object.fromEntries(Object.entries(withGeo).map(([id, c]) => [id, {
    ...c, relations: Object.fromEntries(Object.entries(c.relations).map(([o, v]) => [o, withGeo[o] ? Math.max(-100, Math.min(100, v + startingRelation(c, withGeo[o]))) : v])),
  }]));
  return { ...g, countries, conflicts: g.conflicts ?? [] };
}

/** v5 saves predate leader personalities, faith, politicians and system rules. */
function migrateV5(g: GameState): GameState {
  const fresh = seedCountries(50);
  const countries = Object.fromEntries(Object.entries(g.countries).map(([id, c]) => {
    const seed = fresh[id];
    const leader = { ...c.leader, traits: c.leader.traits ?? seed?.leader.traits ?? ['cautious', 'charismatic'], focus: c.leader.focus ?? seed?.leader.focus ?? 'economy', faith: c.leader.faith ?? seed?.faith ?? 'secular' };
    return [id, { ...c, leader, faith: c.faith ?? seed?.faith ?? 'secular', religiosity: c.religiosity ?? seed?.religiosity ?? 30 }];
  }));
  const next = { ...g, countries };
  const p = g.player;
  if (!p) return next;
  const country = countries[p.countryId];
  const faith = p.faith ?? country.faith;
  return { ...next, player: { ...p, faith, clergy: p.clergy ?? 50, contacts: p.contacts ?? newContacts(country, faith, makeRng(g.seed + 4)), sys: p.sys ?? newSystemState(), nation: p.nation && { ...p.nation, alliances: p.nation.alliances ?? [], lastSummitTurn: p.nation.lastSummitTurn ?? -99 } } };
}

/** v4 saves predate cabinet and head-of-state gameplay. */
function migrateV4(g: GameState): GameState {
  const p = g.player;
  if (!p) return g;
  const kind = kindOf(p.office);
  const country = g.countries[p.countryId];
  const ministry = p.ministry ?? (kind === 'cabinet' ? newMinistry(country) : null);
  const nation = p.nation ?? (kind === 'head' ? newNation(country, makeRng(g.seed + 3)) : null);
  // Older saves could keep a past job's unanswered prompt, which froze the game.
  return { ...g, player: clearOldJobs({ ...p, ministry, nation, retired: p.retired ?? false }) };
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
