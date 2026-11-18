import { clamp } from './city';
import { kindOf } from './offices';
import { isRival } from '../data/geo';
import { isMajor } from './geo';
import { policiesOf } from './society';
import type { Rng } from './rng';
import type { GameState, PendingEvent, Player } from './types';

// Contact with the wider world below the national level (sister cities, trade trips, investors),
// foreign spies working against you, and coup attempts against a leader.

const stamp = (g: GameState) => `${g.year}-${String(g.month).padStart(2, '0')}`;
const log = (g: GameState, line: string): GameState => ({ ...g, log: [`${stamp(g)}: ${line}`, ...g.log].slice(0, 200) });
const pick = <T,>(a: readonly T[], rng: Rng) => a[Math.floor(rng() * a.length)];
const feat = (p: Player, f: string): Player => (p.feats?.includes(f) ? p : { ...p, feats: [...(p.feats ?? []), f] });
const bumpRel = (g: GameState, a: string, b: string, d: number): GameState => {
  const ca = g.countries[a], cb = g.countries[b];
  if (!ca || !cb) return g;
  return { ...g, countries: { ...g.countries, [a]: { ...ca, relations: { ...ca.relations, [b]: clamp((ca.relations[b] ?? 0) + d, -100, 100) } }, [b]: { ...cb, relations: { ...cb.relations, [a]: clamp((cb.relations[a] ?? 0) + d, -100, 100) } } } };
};

// ---------- Sister cities and trade trips (mayors and governors) ----------

export const MAX_SISTERS = 3;
export const TRIP_COOLDOWN = 6;
export const tripCost = (p: Player) => (kindOf(p.office) === 'regional' ? 150 : 40);
const local = (p: Player | null) => !!p?.office && (kindOf(p.office) === 'local' || kindOf(p.office) === 'regional');
const ready = (p: Player | null): p is Player => !!p && local(p) && p.actionsLeft > 0 && !p.pendingEvent && !p.retired;
const treasuryOf = (p: Player) => (kindOf(p.office) === 'regional' ? p.region?.treasury ?? 0 : p.city?.treasury ?? 0);
const payFrom = (p: Player, k: number): Player => (kindOf(p.office) === 'regional' && p.region
  ? { ...p, region: { ...p.region, treasury: p.region.treasury - k } }
  : p.city ? { ...p, city: { ...p.city, treasury: p.city.treasury - k } } : p);
const placeName = (p: Player) => (kindOf(p.office) === 'regional' ? p.region?.name : p.city?.name) ?? 'your city';

export function sisterBlocker(g: GameState, id: string): string | null {
  const p = g.player;
  if (!local(p)) return 'Only mayors and governors';
  const sisters = p!.abroad?.sisters ?? [];
  if (sisters.includes(id)) return 'Already twinned';
  if (sisters.length >= MAX_SISTERS) return `Up to ${MAX_SISTERS}`;
  if ((g.countries[id]?.relations[p!.countryId] ?? 0) < -20) return 'Relations too poor';
  return null;
}

/** Twin your city or state with a place abroad: culture, students and a little goodwill. */
export function sisterCity(g: GameState, id: string): GameState {
  const p = g.player;
  if (!ready(p) || sisterBlocker(g, id)) return g;
  const c = g.countries[id];
  let q: Player = { ...p, actionsLeft: p.actionsLeft - 1, abroad: { sisters: [...(p.abroad?.sisters ?? []), id], lastTrip: p.abroad?.lastTrip ?? -99 } };
  q = { ...q, groups: { ...q.groups, students: clamp(q.groups.students + 3, 0, 100) }, popularity: clamp(q.popularity + 1, 0, 100) };
  if (q.city && kindOf(q.office) === 'local') q = { ...q, city: { ...q.city, culture: clamp(q.city.culture + 4, 0, 100) } };
  if (q.region) q = { ...q, region: { ...q.region, happiness: clamp(q.region.happiness + 1, 0, 100) } };
  q = feat(q, 'sister-city');
  return log(bumpRel({ ...g, player: q }, p.countryId, id, 2), `${placeName(p)} becomes a sister ${kindOf(p.office) === 'regional' ? 'region' : 'city'} of a town in ${c.name}.`);
}

export function tripBlocker(g: GameState, id: string): string | null {
  const p = g.player;
  if (!local(p)) return 'Only mayors and governors';
  if (id === p!.countryId || !g.countries[id]) return 'Pick another country';
  const wait = (p!.abroad?.lastTrip ?? -99) + TRIP_COOLDOWN - g.turn;
  if (wait > 0) return `Again in ${wait} month${wait === 1 ? '' : 's'}`;
  if (treasuryOf(p!) < tripCost(p!)) return `Needs $${tripCost(p!)}k`;
  return null;
}

export function tripChance(g: GameState, id: string): number {
  const p = g.player!;
  const c = g.countries[id];
  const rel = c.relations[p.countryId] ?? 0;
  return clamp(0.4 + rel / 200 + (p.abroad?.sisters.includes(id) ? 0.15 : 0) + (isMajor(c) ? 0.1 : 0), 0.1, 0.85);
}

/** Fly abroad to court investors. Success brings jobs; failure looks like a junket. */
export function tradeTrip(g: GameState, id: string, rng: Rng): GameState {
  const p = g.player;
  if (!ready(p) || tripBlocker(g, id)) return g;
  const c = g.countries[id];
  let q = payFrom({ ...p, actionsLeft: p.actionsLeft - 1, abroad: { sisters: p.abroad?.sisters ?? [], lastTrip: g.turn } }, tripCost(p));
  if (rng() < tripChance(g, id)) {
    q = { ...q, groups: { ...q.groups, business: clamp(q.groups.business + 4, 0, 100), workers: clamp(q.groups.workers + 2, 0, 100) }, popularity: clamp(q.popularity + 2, 0, 100) };
    if (q.region) q = { ...q, region: { ...q.region, stats: { ...q.region.stats, economy: clamp(q.region.stats.economy + 3, 0, 100) } } };
    else if (q.city) q = { ...q, city: { ...q.city, jobs: clamp(q.city.jobs + 5, 0, 100) } };
    q = feat(q, 'investor');
    return log(bumpRel({ ...g, player: q }, p.countryId, id, 1), `${p.name}'s trade trip to ${c.name} pays off: a company there opens a branch in ${placeName(p)}.`);
  }
  q = { ...q, popularity: clamp(q.popularity - 2, 0, 100) };
  return log({ ...g, player: q }, `${p.name} comes home from ${c.name} empty-handed. Critics call it a junket.`);
}

/** A foreign company wants to build in your city or state. */
function investorEvent(g: GameState, rng: Rng): PendingEvent | null {
  const p = g.player!;
  const sisters = p.abroad?.sisters ?? [];
  const pool = Object.values(g.countries).filter((c) => c.id !== p.countryId && (c.relations[p.countryId] ?? 0) > -60);
  if (!pool.length) return null;
  const c = sisters.length && rng() < 0.5 ? g.countries[pick(sisters, rng)] ?? pick(pool, rng) : pick(pool, rng);
  const touchy = isRival(c.id, p.countryId) || (c.relations[p.countryId] ?? 0) <= -30;
  const regional = kindOf(p.office) === 'regional';
  const big = regional ? { treasury: 80 } : { jobs: 6 };
  const small = regional ? { treasury: 40 } : { jobs: 3 };
  return {
    id: `investor-${c.id}`,
    title: `Investors from ${c.name}`,
    text: `A company from ${c.name} wants to build a plant in ${placeName(p)}.${touchy ? ` The national government is wary of ${c.name}.` : ''}`,
    choices: [
      { label: 'Welcome them', effects: { ...big, groups: { business: 4, workers: 3 }, ...(touchy ? { loyalty: -6 } : {}) }, log: `${p.name} welcomes investors from ${c.name}.${touchy ? ' The capital is not pleased.' : ''}` },
      { label: 'Yes, if they hire locally', effects: { ...small, groups: { workers: 5 } }, log: `${p.name} signs a local-hiring deal with investors from ${c.name}.` },
      { label: 'Turn them down', effects: { groups: { business: -3 }, ...(touchy ? { loyalty: 3 } : {}) }, log: `${p.name} turns away investors from ${c.name}.` },
    ],
  };
}

// ---------- Foreign spies and coups against you ----------

export const COUNTER_INTEL_COST = 2;
export const COUNTER_INTEL_MONTHS = 12;

/** Countries hostile enough to spy on you, with how hard they try. */
export function spyThreats(g: GameState): { id: string; level: number }[] {
  const p = g.player;
  if (!p?.office) return [];
  const home = p.countryId;
  return Object.values(g.countries)
    .filter((c) => c.id !== home && ((c.relations[home] ?? 0) <= -25 || (isRival(c.id, home) && (c.relations[home] ?? 0) <= 0)))
    .map((c) => ({ id: c.id, level: policiesOf(g, c.id).spying ?? 1 }))
    .filter((x) => x.level > 0);
}

/** How well your country catches spies: its intelligence score, plus a sweep if you ordered one. */
export function counterIntel(g: GameState): number {
  const p = g.player!;
  const intel = g.countries[p.countryId].society?.intel ?? 30;
  const sweep = (p.nation?.counterIntelUntil ?? -1) > g.turn ? 0.3 : 0;
  return clamp(intel / 120 + sweep, 0, 0.9);
}

export function counterIntelBlocker(g: GameState): string | null {
  const p = g.player;
  if (!p?.nation || kindOf(p.office) !== 'head') return 'Only the national leader';
  if ((p.nation.counterIntelUntil ?? -1) > g.turn) return `Running (${p.nation.counterIntelUntil! - g.turn} months left)`;
  if (p.actionsLeft <= 0 || p.pendingEvent) return 'No actions left';
  return null;
}

/** Order a counter-intelligence sweep: spies are far more likely to be caught for a year. */
export function counterIntelSweep(g: GameState): GameState {
  const p = g.player;
  if (!p || counterIntelBlocker(g)) return g;
  const me = g.countries[p.countryId];
  const debt = clamp(me.economy.debtToGdp + (COUNTER_INTEL_COST / me.economy.gdpBn) * 100, 0, 400);
  const next = { ...g, countries: { ...g.countries, [me.id]: { ...me, economy: { ...me.economy, debtToGdp: debt } } }, player: { ...p, actionsLeft: p.actionsLeft - 1, nation: { ...p.nation!, counterIntelUntil: g.turn + COUNTER_INTEL_MONTHS } } };
  return log(next, `${p.name} orders a counter-intelligence sweep ($${COUNTER_INTEL_COST}bn).`);
}

export const SPY_CHANCE = 0.006;
export const COUP_CHANCE = 0.03;

function spyTick(g: GameState, rng: Rng): GameState {
  const p = g.player!;
  const head = kindOf(p.office) === 'head' && !!p.nation;
  const national = p.campaign && ['head', 'legislative', 'cabinet'].includes(kindOf(p.campaign.office) ?? '');
  if (!head && !national) return g;
  for (const t of spyThreats(g)) {
    if (rng() >= SPY_CHANCE * t.level * (isMajor(g.countries[t.id]) ? 2 : 1)) continue;
    const c = g.countries[t.id];
    const caught = rng() < counterIntel(g);
    const meddle = !!national && !!p.campaign;
    if (caught) {
      // You found them: decide how loudly to react.
      const ev: PendingEvent = {
        id: `spy-${t.id}`,
        title: meddle ? `${c.name} meddles in the election` : `Spies from ${c.name} caught`,
        text: meddle ? `Intelligence finds a ${c.name} campaign of fake news and secret money aimed at the election.` : `Agents working for ${c.name} are caught stealing state secrets.`,
        choices: [
          { label: 'Expose them publicly', effects: { popularity: 4 }, log: `${p.name} exposes ${c.name}'s spies to the world.` },
          { label: 'Expel them quietly', effects: { popularity: 1, loyalty: 2 }, log: `${p.name} quietly expels ${c.name}'s agents.` },
        ],
      };
      let next = bumpRel({ ...g, player: feat({ ...p, pendingEvent: p.pendingEvent ?? ev }, 'caught-spy') }, p.countryId, t.id, -12);
      if (p.pendingEvent) next = log(next, `${c.name}'s spies are caught and expelled.`);
      return next;
    }
    if (meddle) {
      const camp = p.campaign!;
      return log({ ...g, player: { ...p, campaign: { ...camp, rival: { ...camp.rival, popularity: clamp(camp.rival.popularity + 5, 0, 95) } } } }, `Rumors flood social media against ${p.name}. Some suspect foreign meddling.`);
    }
    const me = g.countries[p.countryId];
    const soc = me.society ? { ...me.society, tech: clamp((me.society.tech ?? 50) - 2, 0, 100) } : me.society;
    return log({ ...g, countries: { ...g.countries, [me.id]: { ...me, society: soc, economy: { ...me.economy, growth: clamp(me.economy.growth - 0.2, -8, 12) } } } }, `Secret files go missing from ${me.name}'s research labs. Officials suspect foreign spies.`);
  }
  return g;
}

/** A crumbling country may see the army try to remove you. */
function coupTick(g: GameState, rng: Rng): GameState {
  const p = g.player!;
  if (kindOf(p.office) !== 'head' || !p.nation) return g;
  const me = g.countries[p.countryId];
  if (me.stability >= 25 || (me.society?.unrest ?? 0) <= 60 || rng() >= COUP_CHANCE) return g;
  const hold = clamp(0.35 + p.popularity / 150 + p.loyalty / 300 + me.military / 400, 0.2, 0.92);
  if (rng() < hold) {
    const q = feat({ ...p, popularity: clamp(p.popularity + 6, 0, 100) }, 'survived-coup');
    return log({ ...g, player: q, countries: { ...g.countries, [me.id]: { ...me, stability: clamp(me.stability + 8, 0, 100) } } }, `Coup attempt! Soldiers move on the capital, but loyal troops and crowds stop them. ${p.name} survives.`);
  }
  return log({ ...g, player: { ...p, office: null, campaign: null, termMonthsLeft: 0, monthsInOffice: 0, termsInOffice: 0, retired: true } }, `Coup! The army seizes power, and ${p.name} is removed from power.`);
}

/** Monthly: investors approach local leaders; spies and plotters work against national ones. */
export function tickAbroad(g: GameState, rng: Rng): GameState {
  const p = g.player;
  if (!p || p.retired) return g;
  let next = g;
  if (local(p) && !p.pendingEvent && rng() < 0.04) {
    const ev = investorEvent(g, rng);
    if (ev) next = { ...next, player: { ...p, pendingEvent: ev } };
  }
  next = spyTick(next, rng);
  next = coupTick(next, rng);
  return next;
}
