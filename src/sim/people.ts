import { FAITHS, OPPOSED, TRAITS } from '../data/people';
import { cityName, personName, regionName } from './names';
import { OFFICE_NAMES, SYSTEMS } from '../data/systems';
import { clamp } from './city';
import { kindOf } from './offices';
import type { Rng } from './rng';
import type { Character, Contact, Country, FaithId, FocusId, GameState, Player, TraitId } from './types';

const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];
const FOCUS_IDS: FocusId[] = ['economy', 'security', 'welfare', 'faith', 'diplomacy', 'environment'];
const pick = <T,>(arr: readonly T[], rng: Rng) => arr[Math.floor(rng() * arr.length)];
const stamp = (g: GameState) => `${g.year}-${String(g.month).padStart(2, '0')}`;
const log = (g: GameState, line: string): GameState => ({ ...g, log: [`${stamp(g)}: ${line}`, ...g.log].slice(0, 200) });

/** Two traits that make sense together. */
export function rollTraits(rng: Rng): TraitId[] {
  const a = pick(TRAIT_IDS, rng);
  const ok = TRAIT_IDS.filter((t) => t !== a && !OPPOSED.some(([x, y]) => (x === a && y === t) || (y === a && x === t)));
  return [a, pick(ok, rng)];
}

/** A new character. Most share the country's faith, more so in religious countries. */
export function makeCharacter(country: Country, rng: Rng, name?: string): Character {
  const traits = rollTraits(rng);
  let faith: FaithId = rng() < 0.5 + country.religiosity / 250 ? country.faith : pick(['secular', country.faith, 'christian', 'muslim', 'buddhist'] as FaithId[], rng);
  if (traits.includes('pious') && faith === 'secular') faith = country.faith === 'secular' ? 'folk' : country.faith;
  if (traits.includes('secular')) faith = 'secular';
  const focus = traits.includes('pious') && rng() < 0.5 ? 'faith' : pick(FOCUS_IDS, rng);
  return { name: name ?? personName(country.id, rng), traits, focus, faith };
}

/** Deterministic leader personality for a starting country (seed data has no RNG). */
export function seedLeaderTraits(id: string): Pick<Character, 'traits' | 'focus'> {
  let h = 7;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const r = () => { h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return h / 2 ** 32; };
  return { traits: rollTraits(r), focus: FOCUS_IDS[Math.floor(r() * FOCUS_IDS.length)] };
}

export const has = (c: Pick<Character, 'traits'> | undefined, t: TraitId) => !!c?.traits?.includes(t);

const LEADER_ID = 'leader';

/** Everyone you'll deal with: two people per rung of your ladder, the national leader, and a faith leader. */
export function newContacts(country: Country, playerFaith: FaithId, rng: Rng, homeCity?: string): Contact[] {
  const used = homeCity ? [homeCity] : [];
  const ladder = SYSTEMS[country.systemId].ladder;
  const oneParty = country.systemId === 'one-party';
  const out: Contact[] = [];
  ladder.forEach((office, rung) => {
    const top = rung === ladder.length - 1;
    for (let i = 0; i < 2; i++) {
      if (top && i === 0) continue; // the sitting leader is added below
      const party = oneParty || i === 0 ? 'yours' : 'rival';
      const kind = kindOf(office);
      const where = () => { const c = cityName(country.id, rng, used); used.push(c); return c; };
      const place = kind === 'local' ? ` of ${where()}` : kind === 'regional' ? ` of ${regionName(country.id, rng)}` : '';
      const role = top ? (oneParty ? 'Party elder' : 'Opposition leader') : `${OFFICE_NAMES[office]}${place}`;
      out.push(contact(country, rng, `c${rung}-${i}`, rung, role, party, playerFaith));
    }
  });
  const leader = country.leader;
  out.push({ id: LEADER_ID, name: leader.name, traits: leader.traits, focus: leader.focus, faith: leader.faith, rung: ladder.length - 1, role: OFFICE_NAMES[ladder[ladder.length - 1]], party: 'yours', relation: 0, endorsed: false, dealUsed: false });
  const f = FAITHS[country.faith];
  const priest = makeCharacter(country, rng);
  out.push({ ...priest, faith: country.faith, traits: priest.traits.includes('secular') ? ['pious', 'cautious'] : priest.traits, id: 'faith', rung: -1, role: `${f.leader} (${f.name})`, party: 'yours', relation: playerFaith === country.faith ? 15 : -5, endorsed: false, dealUsed: false });
  return out;
}

function contact(country: Country, rng: Rng, id: string, rung: number, role: string, party: Contact['party'], playerFaith: FaithId): Contact {
  const ch = makeCharacter(country, rng);
  const base = party === 'yours' ? 10 : -10;
  return { ...ch, id, rung, role, party, relation: Math.round(base + (rng() - 0.5) * 20 + (ch.faith === playerFaith ? 5 : 0)), endorsed: false, dealUsed: false };
}

export const contactById = (p: Player, id: string | undefined) => p.contacts.find((c) => c.id === id);

/** Your rung on the ladder right now (or your best rung when out of office). */
export function currentRung(g: GameState): number {
  const p = g.player!;
  const ladder = SYSTEMS[g.countries[p.countryId].systemId].ladder;
  return p.office ? ladder.indexOf(p.office) : Math.max(0, p.highestRung);
}

/** Contacts you can deal with now (you can't deal with yourself once you lead the country). */
export function visibleContacts(g: GameState): Contact[] {
  const p = g.player!;
  return p.contacts.filter((c) => !(c.id === LEADER_ID && kindOf(p.office) === 'head'));
}

export function contactsByRole(g: GameState, about: 'peer' | 'superior' | 'rival' | 'faith'): Contact[] {
  const rung = currentRung(g);
  const list = visibleContacts(g);
  if (about === 'faith') return list.filter((c) => c.rung === -1);
  if (about === 'rival') return list.filter((c) => c.party === 'rival' && c.rung >= 0);
  if (about === 'peer') return list.filter((c) => c.rung === rung && c.id !== LEADER_ID);
  return list.filter((c) => c.rung > rung);
}

export function setRelation(p: Player, id: string, delta: number): Player {
  return { ...p, contacts: p.contacts.map((c) => (c.id === id ? { ...c, relation: clamp(c.relation + delta, -100, 100) } : c)) };
}

/** How much a contact's endorsement is worth in a race (score points). */
export function endorsementWeight(g: GameState, c: Contact): number {
  if (c.rung === -1) return g.countries[g.player!.countryId].religiosity / 15;
  return 2 + c.rung * 1.5 + (c.id === LEADER_ID ? 2 : 0) + (has(c, 'charismatic') ? 1 : 0);
}

export function endorsementBonus(g: GameState): number {
  const p = g.player!;
  const raw = p.contacts.filter((c) => c.endorsed).reduce((a, c) => a + endorsementWeight(g, c), 0);
  const appointed = SYSTEMS[g.countries[p.countryId].systemId].advancement !== 'election';
  return Math.min(12, raw) * (appointed ? 1.5 : 1);
}

/** Monthly: relations cool toward where they'd naturally sit; the leader slot follows whoever leads; people come and go. */
export function tickContacts(g: GameState, rng: Rng): { player: Player; lines: string[] } {
  let p = g.player!;
  const country = g.countries[p.countryId];
  const lines: string[] = [];
  const contacts = p.contacts.map((c) => {
    const rest = c.rung === -1 ? (p.faith === c.faith ? 10 : -5) + (p.clergy - 50) * 0.2 : c.party === 'yours' ? 10 : -10;
    let next = { ...c, relation: clamp(c.relation + (rest - c.relation) * 0.02, -100, 100) };
    if (c.id === LEADER_ID && country.leader.name !== c.name && country.leader.name !== p.name) {
      lines.push(`${country.leader.name} replaces ${c.name} as your country's leader.`);
      next = { ...next, name: country.leader.name, traits: country.leader.traits, focus: country.leader.focus, faith: country.leader.faith, relation: 0, endorsed: false };
    }
    return next;
  });
  p = { ...p, contacts };
  // An enemy above you sometimes knifes you in the press.
  const rung = currentRung(g);
  const enemy = p.contacts.find((c) => c.relation < -50 && c.rung > rung);
  if (enemy && rng() < 0.08) {
    p = { ...p, popularity: clamp(p.popularity - 2, 0, 100) };
    lines.push(`${enemy.name} (${enemy.role}) briefs the press against ${p.name}.`);
  }
  // Now and then a politician retires and someone new takes the seat.
  if (g.month === 1 && rng() < 0.3) {
    const pool = p.contacts.filter((c) => c.rung >= 0 && c.id !== LEADER_ID && c.id !== p.sys.patronId);
    if (pool.length) {
      const old = pick(pool, rng);
      const fresh = makeCharacter(country, rng);
      p = { ...p, contacts: p.contacts.map((c) => (c.id === old.id ? { ...c, ...fresh, relation: c.party === 'yours' ? 5 : -5, endorsed: false } : c)) };
      lines.push(`${old.name} retires. ${fresh.name} becomes ${old.role}.`);
    }
  }
  return { player: p, lines };
}

/** At the start of a new term, joint deals can be made again. */
export const resetDeals = (p: Player): Player => ({ ...p, contacts: p.contacts.map((c) => ({ ...c, dealUsed: false })) });
/** When a race ends, endorsements are spent. */
export const clearEndorsements = (p: Player): Player => ({ ...p, contacts: p.contacts.map((c) => ({ ...c, endorsed: false })) });

// ---------- Actions ----------

const ready = (p: Player | null): p is Player => !!p && !p.retired && p.actionsLeft > 0 && !p.pendingEvent;
const spend = (p: Player): Player => ({ ...p, actionsLeft: p.actionsLeft - 1 });

/** Meeting gain before diminishing returns, shaped by their personality. */
export function meetGain(p: Player, c: Contact): number {
  let base = 9;
  if (has(c, 'cautious')) base *= 0.6;
  if (has(c, 'charismatic') || has(c, 'generous')) base *= 1.2;
  if (c.faith === p.faith && c.faith !== 'secular') base += 2;
  return base;
}

export function meetContact(g: GameState, id: string, rng: Rng): GameState {
  const p = g.player;
  const c = p && contactById(p, id);
  if (!ready(p) || !c || !visibleContacts(g).includes(c)) return g;
  // Corrupt contacts expect a gift; it works, at a price.
  const gift = has(c, 'corrupt') && p.funds >= 10 ? 10 : 0;
  const gain = Math.max(1, Math.round((meetGain(p, c) + rng() * 4) * (gift ? 1.5 : 1) * (1 - Math.max(0, c.relation) / 150)));
  const next = { ...setRelation(spend(p), id, gain), funds: p.funds - gift };
  return log({ ...g, player: next }, `${p.name} meets ${c.name}, ${c.role} (+${gain})${gift ? ' and leaves a generous gift' : ''}.`);
}

/** Why they won't endorse you, or null. */
export function endorseBlocker(p: Player, c: Contact): string | null {
  if (!p.campaign) return 'Only during a campaign';
  if (c.endorsed) return 'Already backing you';
  const need = c.party === 'rival' ? 60 : 40;
  if (c.relation < need) return `Needs relation ${need}+`;
  if (has(c, 'populist') && p.popularity < 40) return 'Only backs winners (40+ popularity)';
  return null;
}

export function askEndorsement(g: GameState, id: string): GameState {
  const p = g.player;
  const c = p && contactById(p, id);
  if (!ready(p) || !c || endorseBlocker(p, c)) return g;
  const next = { ...spend(p), contacts: p.contacts.map((x) => (x.id === id ? { ...x, endorsed: true, relation: clamp(x.relation - 5, -100, 100) } : x)) };
  return log({ ...g, player: next }, `${c.name}, ${c.role}, endorses ${p.name}.`);
}

/** Why a joint deal can't happen, or null. Only with someone at your level, while you both hold office. */
export function dealBlocker(g: GameState, c: Contact): string | null {
  const p = g.player!;
  if (!p.office) return 'Hold office first';
  if (kindOf(p.office) === 'head') return 'Not at the top';
  if (c.rung !== currentRung(g) || c.id === LEADER_ID) return 'Only with someone at your level';
  if (c.dealUsed) return 'One deal per term';
  if (c.relation < 20) return 'Needs relation 20+';
  return null;
}

/** Sister-city pacts, joint state projects, co-sponsored bills, joint ministry programs. */
export function jointDeal(g: GameState, id: string): GameState {
  const p = g.player;
  const c = p && contactById(p, id);
  if (!ready(p) || !c || dealBlocker(g, c)) return g;
  let next = setRelation(spend(p), id, 6);
  next = { ...next, contacts: next.contacts.map((x) => (x.id === id ? { ...x, dealUsed: true } : x)) };
  const kind = kindOf(p.office);
  let what = '';
  if (kind === 'local' && next.city) {
    next = { ...next, popularity: clamp(next.popularity + 2, 0, 100), city: { ...next.city, jobs: clamp(next.city.jobs + 3, 0, 100), culture: clamp(next.city.culture + 2, 0, 100) } };
    next = { ...next, feats: next.feats?.includes('sister-city') ? next.feats : [...(next.feats ?? []), 'sister-city'] };
    what = 'a sister-city pact';
  } else if (kind === 'regional' && next.region) {
    next = { ...next, popularity: clamp(next.popularity + 2, 0, 100), region: { ...next.region, treasury: next.region.treasury + 60 } };
    what = 'a joint infrastructure deal ($60k saved)';
  } else if (kind === 'legislative') {
    next = { ...next, popularity: clamp(next.popularity + 1, 0, 100), loyalty: clamp(next.loyalty + (c.party === 'yours' ? 3 : -2), 0, 100) };
    what = c.party === 'yours' ? 'a co-sponsored bill' : 'a cross-party bill';
  } else if (kind === 'cabinet' && next.ministry) {
    next = { ...next, ministry: { ...next.ministry, performance: clamp(next.ministry.performance + 6, 0, 100) } };
    what = 'a joint ministry program';
  }
  return log({ ...g, player: next }, `${p.name} and ${c.name} sign ${what}.`);
}

/** Pick a public fight. Popular with your base, and they won't forget it. */
export function feud(g: GameState, id: string): GameState {
  const p = g.player;
  const c = p && contactById(p, id);
  if (!ready(p) || !c || c.id === LEADER_ID && kindOf(p.office) === 'cabinet') return g;
  const pop = c.party === 'rival' ? 3 : 1;
  let next = setRelation(spend(p), id, -30);
  next = { ...next, popularity: clamp(next.popularity + pop, 0, 100), loyalty: clamp(next.loyalty - (c.party === 'yours' ? 4 : 0), 0, 100) };
  if (c.rung === -1) next = { ...next, clergy: clamp(next.clergy - 10, 0, 100) };
  return log({ ...g, player: next }, `${p.name} publicly attacks ${c.name}, ${c.role}.`);
}

// ---------- Faith ----------

/** Faith leaders' favor sways voters, more in religious countries. Score points, about ±12 at most. */
export function faithEdge(g: GameState): number {
  const p = g.player!;
  return (p.clergy - 50) * (g.countries[p.countryId].religiosity / 100) * 0.25;
}

export function tickFaith(g: GameState): Player {
  const p = g.player!;
  const c = g.countries[p.countryId];
  const priest = contactById(p, 'faith');
  const match = p.faith === c.faith ? 10 : p.faith === 'secular' ? -8 : -4;
  const target = clamp(50 + match + (priest ? priest.relation * 0.15 : 0), 0, 100);
  return { ...p, clergy: clamp(p.clergy + (target - p.clergy) * 0.05, 0, 100) };
}

/** Attend services or meet faith groups. In officially atheist one-party states, the party frowns on it. */
export function faithOutreach(g: GameState, rng: Rng): GameState {
  const p = g.player;
  if (!ready(p)) return g;
  const c = g.countries[p.countryId];
  const gain = Math.max(1, Math.round((6 + rng() * 4) * (1 - p.clergy / 130)));
  const groups = { ...p.groups };
  if (c.religiosity >= 50) groups.retirees = clamp(groups.retirees + 1, 0, 100);
  if (c.religiosity < 40) groups.students = clamp(groups.students - 1, 0, 100);
  const partyFrowns = c.systemId === 'one-party' && c.faith === 'secular';
  const next = { ...setRelation(spend(p), 'faith', 3), clergy: clamp(p.clergy + gain, 0, 100), groups, loyalty: clamp(p.loyalty - (partyFrowns ? 3 : 0), 0, 100) };
  const where = p.faith === 'secular' ? 'meets faith communities' : `attends ${FAITHS[p.faith].name} services`;
  return log({ ...g, player: next }, `${p.name} ${where} (+${gain} faith leaders' favor)${partyFrowns ? '. The party is not pleased' : ''}.`);
}
