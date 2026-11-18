import { LAWS } from '../data/city-content';
import { STATE_LAWS } from '../data/state-content';
import { NATIONAL_LAWS } from '../data/nation-content';
import { GROUPS } from '../data/city-content';
import { SYSTEMS } from '../data/systems';
import { clamp } from './city';
import { kindOf } from './offices';
import { contactById, has, setRelation } from './people';
import type { Rng } from './rng';
import type { GameState, GroupId, Player, SystemId, SystemState } from './types';

const GROUP_IDS = Object.keys(GROUPS) as GroupId[];
const stamp = (g: GameState) => `${g.year}-${String(g.month).padStart(2, '0')}`;
const log = (g: GameState, line: string): GameState => ({ ...g, log: [`${stamp(g)}: ${line}`, ...g.log].slice(0, 200) });

export const EXEC_ORDER_COST = 30;
export const DECREE_RISK_MONTHS = 6;
export const PURGE_EVERY = 30;
export const REFERENDUM_COST = 20;
export const BUYBACK_COST = 30;

export function newSystemState(): SystemState {
  return { meter: 50, patronId: null, cohabitation: false, knighted: false, decrees: [], lastPurgeTurn: 0, reformsSeen: 0 };
}

export const systemOf = (g: GameState): SystemId => g.countries[g.player!.countryId].systemId;

// ---------- Law books: one shape for city, state and national laws ----------

type Book = { where: string; defs: { id: string; name: string; groups: Partial<Record<GroupId, number>> }[]; ids: string[]; set: (p: Player, ids: string[]) => Player };

/** The laws you control in your current job, if any. */
export function lawBook(p: Player): Book | null {
  const kind = kindOf(p.office);
  if (kind === 'local' && p.city) return { where: 'city', defs: LAWS, ids: p.city.laws, set: (q, ids) => ({ ...q, city: { ...q.city!, laws: ids } }) };
  if (kind === 'regional' && p.region) return { where: 'state', defs: STATE_LAWS.map((l) => ({ ...l, groups: l.groups ?? {} })), ids: p.region.laws, set: (q, ids) => ({ ...q, region: { ...q.region!, laws: ids } }) };
  if (kind === 'head' && p.nation) return { where: 'national', defs: NATIONAL_LAWS, ids: p.nation.laws, set: (q, ids) => ({ ...q, nation: { ...q.nation!, laws: ids } }) };
  return null;
}

/** How many laws and finished initiatives you have: reforms drain coalitions and public patience. */
export const reformCount = (p: Player) => (p.city?.laws.length ?? 0) + (p.region?.laws.length ?? 0) + (p.nation?.laws.length ?? 0) + (p.ministry?.done.length ?? 0);

function enact(p: Player, book: Book, id: string): Player {
  const law = book.defs.find((l) => l.id === id)!;
  const groups = { ...p.groups };
  for (const k of GROUP_IDS) groups[k] = clamp(groups[k] + (law.groups[k] ?? 0) / 2, 0, 100);
  return { ...book.set(p, [...book.ids, id]), groups };
}

/** Law appeal to voters, weighted by group size (about -10..10). */
const appeal = (law: { groups: Partial<Record<GroupId, number>> }) => GROUP_IDS.reduce((a, k) => a + (law.groups[k] ?? 0) * GROUPS[k].weight, 0);

/** Election score bonus from your system's signature meter. */
export function systemScoreBonus(g: GameState, firstRung: boolean): number {
  const p = g.player!;
  const m = p.sys.meter;
  switch (systemOf(g)) {
    case 'parliamentary': return firstRung ? 0 : (m - 50) * 0.12;
    case 'constitutional-monarchy': return (m - 50) * 0.1 + (p.sys.knighted ? 2 : 0);
    case 'one-party': return (m - 50) * 0.35 + (p.sys.patronId ? (contactById(p, p.sys.patronId)?.rung ?? 0) * 2 : 0);
    case 'direct-democracy': return (m - 50) * 0.08;
    case 'federal': return (m - 50) * 0.05;
    default: return 0;
  }
}

/** National-law support shift at the top: cohabitation and governors' cooperation (seats, can be negative). */
export function parliamentShift(g: GameState): number {
  const p = g.player!;
  const seats = p.nation?.parliament.seats ?? 0;
  let shift = 0;
  if (p.sys.cohabitation) shift -= seats * 0.08;
  if (systemOf(g) === 'federal') shift += seats * (p.sys.meter - 50) / 500;
  return Math.round(shift);
}

/**
 * Monthly system rules. `happiness` is how your current job is going (0..100).
 * Returns the player plus news lines; can also nudge your country.
 */
export function tickSystem(g: GameState, happiness: number, rng: Rng): { game: GameState; lines: string[] } {
  let p = g.player!;
  let country = g.countries[p.countryId];
  const lines: string[] = [];
  const kind = kindOf(p.office);
  let sys = { ...p.sys };
  const reforms = reformCount(p);
  const approach = (target: number, rate: number) => sys.meter + (target - sys.meter) * rate;

  switch (country.systemId) {
    case 'presidential': {
      sys.meter = clamp(sys.meter + 2 + (p.popularity - 50) * 0.05, 0, 100);
      // Courts can strike down recent executive orders.
      const book = lawBook(p);
      const keep: SystemState['decrees'] = [];
      for (const d of sys.decrees) {
        if (g.turn - d.turn > DECREE_RISK_MONTHS) continue;
        if (book && book.ids.includes(d.id) && rng() < 0.05) {
          p = { ...book.set(p, book.ids.filter((x) => x !== d.id)), popularity: clamp(p.popularity - 2, 0, 100) };
          lines.push(`A court strikes down ${p.name}'s executive order on ${book.defs.find((l) => l.id === d.id)!.name}.`);
        } else keep.push(d);
      }
      sys.decrees = keep;
      break;
    }
    case 'parliamentary': {
      sys.meter = clamp(approach(55, 0.03) - Math.max(0, reforms - sys.reformsSeen) * 6, 0, 100);
      if (kind === 'head' && sys.meter < 20 && !p.campaign) {
        lines.push(`The coalition collapses. ${p.name}'s government falls and a snap election is called.`);
        sys.meter = 45;
        p = { ...p, termMonthsLeft: Math.min(p.termMonthsLeft, 4) };
      }
      break;
    }
    case 'semi-presidential': {
      sys.meter = clamp(sys.meter + 2.5 - Math.max(0, reforms - sys.reformsSeen) * 7, 0, 100);
      if (p.office && sys.meter < 15) {
        lines.push('A general strike shuts down the country. Trains stop, schools close.');
        sys.meter = 45;
        p = { ...p, popularity: clamp(p.popularity - 4, 0, 100) };
        if (p.city) p = { ...p, city: { ...p.city, happiness: clamp(p.city.happiness - 4, 0, 100) } };
        if (p.region) p = { ...p, region: { ...p.region, happiness: clamp(p.region.happiness - 4, 0, 100) } };
        country = { ...country, economy: { ...country.economy, growth: clamp(country.economy.growth - 0.5, -8, 12) } };
      }
      break;
    }
    case 'constitutional-monarchy': {
      sys.meter = clamp(approach(50, 0.02), 0, 100);
      if (sys.meter >= 85 && !sys.knighted) {
        sys.knighted = true;
        p = { ...p, popularity: clamp(p.popularity + 5, 0, 100) };
        lines.push(`The monarch knights ${p.name} for services to the nation.`);
      }
      break;
    }
    case 'one-party': {
      const patron = contactById(p, sys.patronId ?? undefined);
      sys.meter = clamp(approach(patron ? 30 + patron.relation * 0.5 : 35, 0.05), 0, 100);
      if (g.turn - sys.lastPurgeTurn >= PURGE_EVERY) {
        sys.lastPurgeTurn = g.turn;
        lines.push('The party launches an anti-corruption campaign. Inspectors fan out across the country.');
        if (patron && rng() < 0.15) {
          lines.push(`${patron.name}, your patron, is purged. You need a new one.`);
          sys = { ...sys, patronId: null, meter: 25 };
        }
        const risk = (sys.meter < 30 ? 0.35 : 0) + (p.loyalty < 25 ? 0.35 : 0);
        if (p.office && kind !== 'head' && rng() < risk) {
          lines.push(`${p.name} is removed from office in the purge.`);
          p = { ...p, office: null, campaign: null, termMonthsLeft: 0, monthsInOffice: 0, termsInOffice: 0 };
        }
      }
      break;
    }
    case 'federal': {
      sys.meter = clamp(approach(50, 0.02), 0, 100);
      // Federal grants follow good ties with the capital.
      if (kind === 'local' && p.city) p = { ...p, city: { ...p.city, treasury: p.city.treasury + Math.round(sys.meter * 0.3) } };
      if (kind === 'regional' && p.region) p = { ...p, region: { ...p.region, treasury: p.region.treasury + Math.round(sys.meter) } };
      break;
    }
    case 'direct-democracy': {
      sys.meter = clamp(approach(55, 0.03), 0, 100);
      const book = lawBook(p);
      if (book && book.ids.length && sys.meter < 45 && rng() < 0.06) {
        const id = book.ids[Math.floor(rng() * book.ids.length)];
        const law = book.defs.find((l) => l.id === id)!;
        const groupMood = GROUP_IDS.reduce((a, k) => a + p.groups[k] * GROUPS[k].weight, 0);
        const holds = rng() < 0.35 + sys.meter / 200 + (groupMood - 50) / 100 + appeal(law) / 40;
        if (holds) {
          p = { ...p, popularity: clamp(p.popularity + 2, 0, 100) };
          sys.meter = clamp(sys.meter + 5, 0, 100);
          lines.push(`Citizens force a referendum on ${law.name}. Voters keep it.`);
        } else {
          p = { ...book.set(p, book.ids.filter((x) => x !== id)), popularity: clamp(p.popularity - 2, 0, 100) };
          lines.push(`Citizens force a referendum on ${law.name}. Voters throw it out.`);
        }
      }
      break;
    }
    case 'corporate-state': {
      const target = 50 + (happiness - 50) * 0.8 + (country.economy.growth - 2) * 3;
      sys.meter = clamp(approach(target, 0.1) + (rng() - 0.5) * 4, 0, 100);
      if (p.office) {
        p = { ...p, funds: p.funds + Math.round(sys.meter * 0.08) };
        if (sys.meter < 20 && kind !== 'head' && rng() < 0.1) {
          lines.push(`A hostile takeover: the board replaces ${p.name}.`);
          p = { ...p, office: null, campaign: null, termMonthsLeft: 0, monthsInOffice: 0, termsInOffice: 0 };
        }
      }
      break;
    }
  }
  p = { ...p, sys: { ...sys, reformsSeen: reforms } };
  return { game: { ...g, player: p, countries: { ...g.countries, [p.countryId]: country } }, lines };
}

/** Called when you win a new job at the top in semi-presidential systems. */
export function rollCohabitation(g: GameState, rng: Rng): GameState {
  const p = g.player!;
  if (systemOf(g) !== 'semi-presidential' || kindOf(p.office) !== 'head') return g;
  const cohabitation = rng() < 0.35;
  const next = { ...g, player: { ...p, sys: { ...p.sys, cohabitation } } };
  return cohabitation ? log(next, `Cohabitation: a rival party holds the other top office. Getting laws passed will be harder.`) : next;
}

// ---------- Actions ----------

const ready = (p: Player | null): p is Player => !!p && !p.retired && p.actionsLeft > 0 && !p.pendingEvent;
const spend = (p: Player, sys: Partial<SystemState> = {}, extra: Partial<Player> = {}): Player =>
  ({ ...p, ...extra, sys: { ...p.sys, ...sys }, actionsLeft: p.actionsLeft - 1 });
const gainOf = (v: number, rng: Rng) => Math.max(1, Math.round((6 + rng() * 4) * (1 - v / 130)));

/** Presidential: enact a law in your city, state or country with no vote. */
export function executiveOrderBlocker(g: GameState, id: string): string | null {
  const p = g.player!;
  if (systemOf(g) !== 'presidential') return 'Presidential systems only';
  const book = lawBook(p);
  if (!book) return 'Needs an executive office';
  if (book.ids.includes(id)) return 'Already law';
  if (p.sys.meter < EXEC_ORDER_COST) return `Needs ${EXEC_ORDER_COST} political capital`;
  return null;
}

export function executiveOrder(g: GameState, id: string): GameState {
  const p = g.player;
  if (!ready(p) || executiveOrderBlocker(g, id)) return g;
  const book = lawBook(p)!;
  const law = book.defs.find((l) => l.id === id);
  if (!law) return g;
  const next = enact(p, book, id);
  return log({ ...g, player: spend(next, { meter: p.sys.meter - EXEC_ORDER_COST, decrees: [...p.sys.decrees, { id, turn: g.turn }] }, { popularity: clamp(next.popularity - 1, 0, 100) }) },
    `${p.name} signs an executive order: ${law.name}. Critics call it a power grab.`);
}

/** Parliamentary: keep the coalition partner on side. */
export function consultCoalition(g: GameState, rng: Rng): GameState {
  const p = g.player;
  if (!ready(p) || systemOf(g) !== 'parliamentary') return g;
  const gain = gainOf(p.sys.meter, rng);
  return log({ ...g, player: spend(p, { meter: clamp(p.sys.meter + gain, 0, 100) }) }, `${p.name} meets the coalition partner over dinner (+${gain} coalition).`);
}

/** Semi-presidential: talk the unions down. */
export function negotiateUnions(g: GameState, rng: Rng): GameState {
  const p = g.player;
  if (!ready(p) || systemOf(g) !== 'semi-presidential') return g;
  const gain = gainOf(p.sys.meter, rng) + 3;
  const groups = { ...p.groups, workers: clamp(p.groups.workers + 2, 0, 100), business: clamp(p.groups.business - 2, 0, 100) };
  return log({ ...g, player: spend(p, { meter: clamp(p.sys.meter + gain, 0, 100) }, { groups }) }, `${p.name} sits down with union leaders (+${gain} public patience).`);
}

/** Constitutional monarchy: be seen with the royals. */
export function royalOccasion(g: GameState, rng: Rng): GameState {
  const p = g.player;
  if (!ready(p) || systemOf(g) !== 'constitutional-monarchy' || p.funds < 5) return g;
  const gain = gainOf(p.sys.meter, rng);
  return log({ ...g, player: spend(p, { meter: clamp(p.sys.meter + gain, 0, 100) }, { funds: p.funds - 5 }) }, `${p.name} attends a royal garden party (+${gain} royal favor).`);
}

/** One-party: choose a senior figure in your party as patron. */
export function patronBlocker(g: GameState, id: string): string | null {
  const p = g.player!;
  const c = contactById(p, id);
  if (systemOf(g) !== 'one-party') return 'One-party states only';
  if (!c || c.rung < 0 || c.party !== 'yours') return 'Must be a party figure';
  const rung = p.office ? SYSTEMS[g.countries[p.countryId].systemId].ladder.indexOf(p.office) : p.highestRung;
  if (c.rung <= rung) return 'Must outrank you';
  if (c.relation < 30) return 'Needs relation 30+';
  if (p.sys.patronId === id) return 'Already your patron';
  return null;
}

export function choosePatron(g: GameState, id: string): GameState {
  const p = g.player;
  if (!ready(p) || patronBlocker(g, id)) return g;
  const c = contactById(p, id)!;
  // Switching patrons offends the old one.
  const old = p.sys.patronId;
  const q = old ? setRelation(p, old, -25) : p;
  return log({ ...g, player: spend(q, { patronId: id, meter: clamp(25 + c.relation * 0.5, 0, 100) }) }, `${c.name}, ${c.role}, becomes ${p.name}'s patron in the party.`);
}

export function payRespects(g: GameState, rng: Rng): GameState {
  const p = g.player;
  if (!ready(p) || systemOf(g) !== 'one-party' || !p.sys.patronId) return g;
  const c = contactById(p, p.sys.patronId)!;
  const gain = gainOf(p.sys.meter, rng);
  const gift = has(c, 'corrupt') ? Math.min(10, p.funds) : 0;
  return log({ ...g, player: spend(setRelation(p, c.id, 5), { meter: clamp(p.sys.meter + gain, 0, 100) }, { funds: p.funds - gift }) },
    `${p.name} pays respects to ${c.name} (+${gain} patron favor)${gift ? ' with an envelope of cash' : ''}.`);
}

/** Federal: work the capital, or defy it. */
export function lobbyCapital(g: GameState, rng: Rng): GameState {
  const p = g.player;
  if (!ready(p) || systemOf(g) !== 'federal') return g;
  const gain = gainOf(p.sys.meter, rng);
  return log({ ...g, player: spend(p, { meter: clamp(p.sys.meter + gain, 0, 100) }) }, `${p.name} lobbies officials in the capital (+${gain} ties).`);
}

export function defyCapital(g: GameState): GameState {
  const p = g.player;
  if (!ready(p) || systemOf(g) !== 'federal' || !p.office || kindOf(p.office) === 'head') return g;
  const groups = { ...p.groups, workers: clamp(p.groups.workers + 2, 0, 100), retirees: clamp(p.groups.retirees + 2, 0, 100) };
  return log({ ...g, player: spend(setRelation(p, 'leader', -8), { meter: clamp(p.sys.meter - 15, 0, 100) }, { popularity: clamp(p.popularity + 3, 0, 100), groups }) },
    `${p.name} refuses a federal mandate. Local crowds cheer; the capital fumes.`);
}

/** Direct democracy: let citizens pass a law directly. */
export function referendumChance(p: Player, id: string): number {
  const law = lawBook(p)?.defs.find((l) => l.id === id);
  if (!law) return 0;
  return clamp(0.3 + p.sys.meter / 200 + appeal(law) / 40, 0.05, 0.95);
}

export function referendumBlocker(g: GameState, id: string): string | null {
  const p = g.player!;
  if (systemOf(g) !== 'direct-democracy') return 'Direct democracy only';
  const book = lawBook(p);
  if (!book) return 'Needs a city, state or national office';
  if (book.ids.includes(id)) return 'Already law';
  if (p.funds < REFERENDUM_COST) return `Needs $${REFERENDUM_COST}k for the campaign`;
  return null;
}

export function callReferendum(g: GameState, id: string, rng: Rng): GameState {
  const p = g.player;
  if (!ready(p) || referendumBlocker(g, id)) return g;
  const book = lawBook(p)!;
  const law = book.defs.find((l) => l.id === id);
  if (!law) return g;
  const chance = referendumChance(p, id);
  const paid = { ...p, funds: p.funds - REFERENDUM_COST };
  if (rng() < chance) {
    return log({ ...g, player: spend(enact(paid, book, id), { meter: clamp(p.sys.meter + 3, 0, 100) }) }, `Voters approve ${law.name} in a referendum.`);
  }
  return log({ ...g, player: spend(paid, { meter: clamp(p.sys.meter - 5, 0, 100) }, { popularity: clamp(p.popularity - 1, 0, 100) }) }, `Voters reject ${law.name} in a referendum.`);
}

/** Corporate state: prop up the share value with your own money. */
export function buyback(g: GameState): GameState {
  const p = g.player;
  if (!ready(p) || systemOf(g) !== 'corporate-state' || p.funds < BUYBACK_COST) return g;
  return log({ ...g, player: spend(p, { meter: clamp(p.sys.meter + 6, 0, 100) }, { funds: p.funds - BUYBACK_COST }) }, `${p.name} funds a share buyback (+6 share value).`);
}
