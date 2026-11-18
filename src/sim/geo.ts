import { BLOCS, isRival, type BlocId } from '../data/geo';
import { geoOf } from '../data/countries';
import { clamp } from './city';
import { kindOf } from './offices';
import { has, makeCharacter } from './people';
import type { Rng } from './rng';
import type { AllyCall, Conflict, Country, GameState, Player } from './types';

// ---------- Power ----------

export type Tier = 'super' | 'great' | 'regional' | 'minor';
export const TIERS: Record<Tier, { name: string; blurb: string }> = {
  super: { name: 'Superpower', blurb: 'Huge economy, huge army. Shapes the whole world.' },
  great: { name: 'Great power', blurb: 'A strong army and a voice everyone hears.' },
  regional: { name: 'Regional power', blurb: 'Strong in its own neighborhood.' },
  minor: { name: 'Minor state', blurb: 'Needs friends to stay safe.' },
};

/** Overall weight in the world, 0..100: army, economy and the bomb. */
export const powerIndex = (c: Country) =>
  clamp(c.military * 0.55 + (Math.log10(Math.max(10, c.economy.gdpBn)) - 2) * 20 + (c.nuclear ? 10 : 0), 0, 100);

export function tierOf(c: Country): Tier {
  const p = powerIndex(c);
  return p >= 90 ? 'super' : p >= 65 ? 'great' : p >= 42 ? 'regional' : 'minor';
}
export const isMajor = (c: Country) => tierOf(c) === 'super' || tierOf(c) === 'great';

/** Fighting strength in a war: army size scaled by the economy behind it. */
export const warPower = (c: Country) => Math.max(1, c.military) * Math.sqrt(c.economy.gdpBn) * (c.nuclear ? 1.2 : 1);

export const blocMembers = (g: GameState, bloc: BlocId) => Object.values(g.countries).filter((c) => c.bloc === bloc).map((c) => c.id);

/** The strongest member leads the bloc. Non-aligned has no leader. */
export function blocLeader(g: GameState, bloc: BlocId): string | null {
  if (bloc === 'none') return null;
  let best: Country | null = null;
  for (const c of Object.values(g.countries)) if (c.bloc === bloc && (!best || powerIndex(c) > powerIndex(best))) best = c;
  return best?.id ?? null;
}

/** How much a country moves the world, 0..100. */
export function influence(g: GameState, id: string): number {
  const c = g.countries[id];
  const leads = c.bloc !== 'none' && blocLeader(g, c.bloc) === id ? blocMembers(g, c.bloc).length * 1.5 : 0;
  return Math.round(clamp(powerIndex(c) * 0.7 + c.culture * 0.2 + leads, 0, 100));
}

/** Who stands behind a country in a war: its bloc's leader, if that is someone else. */
export function protector(g: GameState, id: string): string | null {
  const c = g.countries[id];
  const l = blocLeader(g, c.bloc);
  return l && l !== id ? l : null;
}

// ---------- Monthly world update ----------

const approach = (v: number, t: number, rate: number) => v + (t - v) * rate;
const stamp = (g: GameState) => `${g.year}-${String(g.month).padStart(2, '0')}`;
const log = (g: GameState, line: string): GameState => ({ ...g, log: [`${stamp(g)}: ${line}`, ...g.log].slice(0, 200) });
const pick = <T,>(arr: readonly T[], rng: Rng) => arr[Math.floor(rng() * arr.length)];
const ledBy = (g: GameState) => (g.player && kindOf(g.player.office) === 'head' && g.player.nation ? g.player.countryId : null);

/** Change how `a` feels about `b` (one direction). */
function nudge(countries: Record<string, Country>, a: string, b: string, f: (v: number) => number) {
  const c = countries[a];
  if (!c || !(b in c.relations)) return;
  countries[a] = { ...c, relations: { ...c.relations, [b]: clamp(f(c.relations[b]), -100, 100) } };
}

export const CONFLICT_MAX = 2;
export const CONFLICT_CHANCE = 0.02;

export function tickGeo(g: GameState, rng: Rng): GameState {
  const led = ledBy(g);
  const countries = { ...g.countries };
  const lines: string[] = [];
  let player = g.player;
  const ids = Object.keys(countries);
  const leaderOf: Partial<Record<BlocId, string | null>> = {};
  for (const b of Object.keys(BLOCS) as BlocId[]) leaderOf[b] = blocLeader(g, b);

  // Armies drift back to their usual size; yours follows your defense budget.
  for (const id of ids) {
    const c = countries[id];
    const base = geoOf(id).military;
    const target = id === led ? clamp(base * (0.6 + player!.nation!.priorities.defense / 37.5), 0, 100) : base;
    countries[id] = { ...c, military: clamp(approach(c.military, target, 0.02), 0, 100) };
  }

  // Blocs pull their members together and against the rival bloc.
  for (const id of ids) {
    const c = countries[id];
    if (id === led || c.bloc === 'none') continue;
    const l = leaderOf[c.bloc];
    const r = BLOCS[c.bloc].rival ? leaderOf[BLOCS[c.bloc].rival!] : null;
    if (l && l !== id) {
      nudge(countries, id, l, (v) => approach(v, 60, 0.01));
      if (l !== led) nudge(countries, l, id, (v) => approach(v, 60, 0.01));
    }
    if (r) nudge(countries, id, r, (v) => approach(v, -30, 0.01));
  }

  // Big powers court smaller countries with ports, loans and arms.
  for (const id of ids) {
    const power = countries[id];
    if (id === led || !isMajor(power) || rng() >= 0.02) continue;
    const targets = ids.filter((t) => {
      const c = countries[t];
      return t !== id && t !== led && !isMajor(c) && (c.bloc === 'none' || (c.bloc !== power.bloc && (c.relations[leaderOf[c.bloc] ?? ''] ?? 0) < 0));
    });
    if (!targets.length) continue;
    // Powers court friendly countries first.
    const t = pick(targets.sort((a, b) => (countries[b].relations[id] ?? 0) - (countries[a].relations[id] ?? 0)).slice(0, 5), rng);
    nudge(countries, t, id, (v) => v + 12);
    nudge(countries, id, t, (v) => v + 5);
    lines.push(`${power.name} offers ${countries[t].name} cheap loans and a new port.`);
  }

  // Non-aligned countries that grow close to a bloc's leader sign up.
  for (const id of ids) {
    const c = countries[id];
    if (id === led || c.bloc !== 'none' || rng() >= 0.03) continue;
    const best = (Object.keys(leaderOf) as BlocId[]).filter((b) => leaderOf[b] && leaderOf[b] !== id && (c.relations[leaderOf[b]!] ?? 0) >= 45)
      .sort((a, b) => (c.relations[leaderOf[b]!] ?? 0) - (c.relations[leaderOf[a]!] ?? 0))[0];
    if (!best) continue;
    countries[id] = { ...c, bloc: best };
    lines.push(`${c.name} joins the ${BLOCS[best].name}, led by ${countries[leaderOf[best]!].name}.`);
  }

  // Members who fall out with their bloc's leader walk away.
  for (const id of ids) {
    const c = countries[id];
    const l = leaderOf[c.bloc];
    if (id === led || c.bloc === 'none' || !l || l === id || (c.relations[l] ?? 0) > -25 || rng() >= 0.05) continue;
    countries[id] = { ...c, bloc: 'none' };
    lines.push(`${c.name} quits the ${BLOCS[c.bloc].name} after a row with ${countries[l].name}.`);
  }

  // Proxy wars: ongoing ones.
  const conflicts: Conflict[] = [];
  for (const cf of g.conflicts ?? []) {
    const c = countries[cf.country];
    if (!c) continue;
    const gov = cf.govBacker ? countries[cf.govBacker] : null;
    const reb = cf.rebelBacker ? countries[cf.rebelBacker] : null;
    const score = cf.score + ((gov ? powerIndex(gov) : 0) - (reb ? powerIndex(reb) : 0)) * 0.06 + (c.stability - 25) * 0.04 + (rng() - 0.5) * 10;
    const months = cf.months + 1;
    countries[cf.country] = { ...c, stability: clamp(c.stability - 0.3, 0, 100), economy: { ...c.economy, growth: clamp(c.economy.growth - 0.1, -8, 12) } };
    if (Math.abs(score) < 30 && months < 24) { conflicts.push({ ...cf, months, score }); continue; }
    const govWins = score >= 0;
    let after = { ...countries[cf.country], stability: clamp(countries[cf.country].stability + 10, 0, 100) };
    if (govWins) {
      lines.push(`The civil war in ${c.name} ends. The government holds on${gov ? `, thanks to ${gov.name}` : ''}.`);
      countries[cf.country] = after;
      if (gov) nudge(countries, cf.country, gov.id, (v) => v + 15);
    } else {
      const ch = makeCharacter(c, rng);
      after = { ...after, leader: { ...ch, party: 'Liberation Front', approval: 50 }, bloc: reb && reb.bloc !== 'none' ? reb.bloc : 'none' };
      countries[cf.country] = after;
      lines.push(`Rebels take power in ${c.name}. ${after.leader.name} leads the new government${reb ? `, backed by ${reb.name}` : ''}.`);
      if (reb) nudge(countries, cf.country, reb.id, (v) => v + 40);
      if (gov) nudge(countries, cf.country, gov.id, (v) => v - 30);
    }
    if (cf.playerSide && player) {
      const won = (cf.playerSide === 'gov') === govWins;
      nudge(countries, cf.country, player.countryId, (v) => v + (won ? 25 : -20));
      if (player.nation) player = { ...player, popularity: clamp(player.popularity + (won ? 3 : -2), 0, 100) };
      lines.push(won ? `The side you backed in ${c.name} won.` : `The side you backed in ${c.name} lost.`);
    }
  }

  // Proxy wars: new ones break out in shaky countries.
  if (conflicts.length < CONFLICT_MAX && rng() < CONFLICT_CHANCE) {
    const shaky = ids.filter((id) => {
      const c = countries[id];
      return id !== g.player?.countryId && c.stability < 55 && !isMajor(c) && !conflicts.some((x) => x.country === id);
    });
    if (shaky.length) {
      const c = countries[pick(shaky, rng)];
      const majors = ids.filter((id) => id !== c.id && isMajor(countries[id]));
      const own = leaderOf[c.bloc];
      const govBacker = own && own !== c.id ? own : majors.sort((a, b) => (c.relations[b] ?? 0) - (c.relations[a] ?? 0))[0] ?? null;
      const gb = govBacker ? countries[govBacker] : null;
      const rival = gb && gb.bloc !== 'none' && BLOCS[gb.bloc].rival ? leaderOf[BLOCS[gb.bloc].rival!] : null;
      const rebelBacker = rival && rival !== c.id ? rival
        : majors.filter((id) => id !== govBacker).sort((a, b) => (c.relations[a] ?? 0) - (c.relations[b] ?? 0))[0] ?? null;
      conflicts.push({ country: c.id, govBacker, rebelBacker, months: 0, score: 0 });
      countries[c.id] = { ...c, stability: clamp(c.stability - 15, 0, 100) };
      lines.push(`Civil war breaks out in ${c.name}.${gb ? ` ${gb.name} backs the government.` : ''}${rebelBacker ? ` ${countries[rebelBacker].name} arms the rebels.` : ''}`);
    }
  }

  // Hostile big powers squeeze the country you lead.
  if (led && player?.nation) {
    for (const id of ids) {
      const c = countries[id];
      if (id === led || !isMajor(c) || (c.relations[led] ?? 0) > -50 || rng() >= 0.015) continue;
      const mine = countries[led];
      countries[led] = { ...mine, economy: { ...mine.economy, growth: clamp(mine.economy.growth - 0.6, -8, 12) } };
      player = { ...player, groups: { ...player.groups, business: clamp(player.groups.business - 4, 0, 100) }, nation: { ...player.nation!, tradeDeals: player.nation!.tradeDeals.filter((x) => x !== id) } };
      lines.push(`${c.name} hits your country with sanctions. Exporters lose orders.`);
    }
  }

  let next: GameState = { ...g, countries, conflicts, player };
  for (const l of lines) next = log(next, l);
  return next;
}

// ---------- Your moves as national leader ----------

const isLeader = (p: Player | null): p is Player => !!p && kindOf(p.office) === 'head' && !!p.nation;
const blocked = (p: Player) => p.actionsLeft <= 0 || !!p.pendingEvent;
const spend = (p: Player, extra: Partial<Player> = {}): Player => ({ ...p, ...extra, actionsLeft: p.actionsLeft - 1 });
const relOf = (g: GameState, a: string, b: string) => g.countries[a]?.relations[b] ?? 0;

function both(g: GameState, a: string, b: string, delta: number): GameState {
  const countries = { ...g.countries };
  nudge(countries, a, b, (v) => v + delta);
  nudge(countries, b, a, (v) => v + delta);
  return { ...g, countries };
}
const addDebt = (c: Country, bn: number): Country => ({ ...c, economy: { ...c.economy, debtToGdp: clamp(c.economy.debtToGdp + (bn / c.economy.gdpBn) * 100, 0, 400) } });

export const JOIN_BLOC_RELATION = 40;

export function joinBlocBlocker(g: GameState, bloc: BlocId): string | null {
  const p = g.player!;
  const me = g.countries[p.countryId];
  if (bloc === 'none' || me.bloc === bloc) return me.bloc === bloc ? 'Already a member' : 'Not a bloc';
  if (!blocMembers(g, bloc).length) return 'No members in this world';
  const l = blocLeader(g, bloc)!;
  if (p.nation?.war && g.countries[p.nation.war.enemy]?.bloc === bloc) return 'At war with a member';
  if (relOf(g, p.countryId, l) < JOIN_BLOC_RELATION) return `Needs relations ${JOIN_BLOC_RELATION}+ with ${g.countries[l].name}`;
  return null;
}

/** Join a bloc: its leader will stand behind you in a war. Its rivals won't like it. */
export function joinBloc(g: GameState, bloc: BlocId): GameState {
  const p = g.player;
  if (!isLeader(p) || blocked(p) || joinBlocBlocker(g, bloc)) return g;
  const l = blocLeader(g, bloc)!;
  const rival = BLOCS[bloc].rival ? blocLeader(g, BLOCS[bloc].rival!) : null;
  const old = g.countries[p.countryId].bloc;
  const oldLeader = blocLeader(g, old);
  let next = both(g, p.countryId, l, 10);
  if (rival) next = both(next, p.countryId, rival, -20);
  if (oldLeader && oldLeader !== p.countryId) next = both(next, p.countryId, oldLeader, -20);
  const me = next.countries[p.countryId];
  next = { ...next, countries: { ...next.countries, [p.countryId]: { ...me, bloc } } };
  return log({ ...next, player: spend(p, { groups: { ...p.groups, business: clamp(p.groups.business + 2, 0, 100) } }) }, `${p.name} takes ${me.name} into the ${BLOCS[bloc].name}.`);
}

/** Go non-aligned. Your old bloc's leader takes it badly. */
export function leaveBloc(g: GameState): GameState {
  const p = g.player;
  if (!isLeader(p) || blocked(p)) return g;
  const me = g.countries[p.countryId];
  if (me.bloc === 'none') return g;
  const l = blocLeader(g, me.bloc);
  let next = l && l !== p.countryId ? both(g, p.countryId, l, -25) : g;
  next = { ...next, countries: { ...next.countries, [p.countryId]: { ...next.countries[p.countryId], bloc: 'none' } } };
  return log({ ...next, player: spend(p, { popularity: clamp(p.popularity + 1, 0, 100) }) }, `${p.name} pulls ${me.name} out of the ${BLOCS[me.bloc].name}.`);
}

export const ARMS_MIN_RELATION = 20;
export const armsCost = (c: Country) => Math.max(2, Math.round(c.economy.gdpBn * 0.004));

export function armsBlocker(g: GameState, seller: string): string | null {
  const p = g.player!;
  const s = g.countries[seller];
  if (!s || seller === p.countryId) return 'Not available';
  if (tierOf(s) === 'minor') return 'Only strong powers sell arms';
  if (relOf(g, p.countryId, seller) < ARMS_MIN_RELATION) return `Needs relations ${ARMS_MIN_RELATION}+`;
  if (g.countries[p.countryId].military >= 95) return 'Army at full strength';
  return null;
}

/** Buy weapons from a power: a stronger army, more debt, and their rivals notice. */
export function armsDeal(g: GameState, seller: string): GameState {
  const p = g.player;
  if (!isLeader(p) || blocked(p) || armsBlocker(g, seller)) return g;
  const me = g.countries[p.countryId];
  const gain = Math.max(2, Math.round(10 * (1 - me.military / 110)));
  const cost = armsCost(me);
  let next = both(g, p.countryId, seller, 6);
  for (const id of Object.keys(g.countries)) if (isRival(seller, id) && id !== p.countryId) next = both(next, p.countryId, id, -4);
  const hawk = has(g.countries[seller].leader, 'hawk') ? ' Its hawkish leader is delighted.' : '';
  next = { ...next, countries: { ...next.countries, [p.countryId]: addDebt({ ...next.countries[p.countryId], military: clamp(me.military + gain, 0, 100) }, cost) } };
  return log({ ...next, player: spend(p, { groups: { ...p.groups, students: clamp(p.groups.students - 2, 0, 100) } }) }, `${p.name} buys $${cost}bn of weapons from ${g.countries[seller].name} (+${gain} military).${hawk}`);
}

export function inviteBlocker(g: GameState, other: string): string | null {
  const p = g.player!;
  const me = g.countries[p.countryId];
  const o = g.countries[other];
  if (!o || other === p.countryId) return 'Not available';
  if (me.bloc === 'none') return 'You are not in a bloc';
  if (blocLeader(g, me.bloc) !== p.countryId) return 'Only the bloc leader can invite';
  if (o.bloc === me.bloc) return 'Already a member';
  if (relOf(g, p.countryId, other) < 55) return 'Needs relations 55+';
  if (o.bloc !== 'none' && relOf(g, other, blocLeader(g, o.bloc) ?? '') > 0) return `Loyal to the ${BLOCS[o.bloc].name}`;
  return null;
}

/** As a bloc leader, bring another country into your camp. */
export function inviteToBloc(g: GameState, other: string): GameState {
  const p = g.player;
  if (!isLeader(p) || blocked(p) || inviteBlocker(g, other)) return g;
  const bloc = g.countries[p.countryId].bloc;
  let next = both(g, p.countryId, other, 5);
  const rival = BLOCS[bloc].rival ? blocLeader(g, BLOCS[bloc].rival!) : null;
  if (rival) next = both(next, p.countryId, rival, -5);
  next = { ...next, countries: { ...next.countries, [other]: { ...next.countries[other], bloc } } };
  return log({ ...next, player: spend(p, { popularity: clamp(p.popularity + 2, 0, 100) }) }, `${g.countries[other].name} joins your ${BLOCS[bloc].name}.`);
}

export const PROXY_COST = 5;

export function backBlocker(g: GameState, country: string): string | null {
  const p = g.player!;
  const cf = (g.conflicts ?? []).find((c) => c.country === country);
  if (!cf) return 'No war there';
  if (cf.playerSide) return 'Already backing a side';
  if (country === p.countryId) return 'Not available';
  return null;
}

/** Send money and weapons to one side of a civil war. Win, and you gain a friend. */
export function backSide(g: GameState, country: string, side: 'gov' | 'rebel'): GameState {
  const p = g.player;
  if (!isLeader(p) || blocked(p) || backBlocker(g, country)) return g;
  const cf = g.conflicts.find((c) => c.country === country)!;
  const mine = powerIndex(g.countries[p.countryId]);
  const push = Math.round(6 + mine * 0.12);
  const ally = side === 'gov' ? cf.govBacker : cf.rebelBacker;
  const foe = side === 'gov' ? cf.rebelBacker : cf.govBacker;
  let next = side === 'gov' ? both(g, p.countryId, country, 10) : both(g, p.countryId, country, -20);
  if (ally && ally !== p.countryId) next = both(next, p.countryId, ally, 6);
  if (foe && foe !== p.countryId) next = both(next, p.countryId, foe, -10);
  const conflicts = g.conflicts.map((c) => (c.country === country ? { ...c, playerSide: side, score: c.score + (side === 'gov' ? push : -push) } : c));
  next = { ...next, conflicts, countries: { ...next.countries, [p.countryId]: addDebt(next.countries[p.countryId], PROXY_COST) } };
  return log({ ...next, player: spend(p) }, `${p.name} sends $${PROXY_COST}bn in arms to the ${side === 'gov' ? 'government' : 'rebels'} in ${g.countries[country].name}.`);
}

/** True when nobody can safely invade this country: it has the bomb, or a nuclear superpower protects it. */
export function nuclearShieldFor(countries: Record<string, Country>, g: GameState, id: string): boolean {
  const o = countries[id];
  if (!o) return false;
  if (o.nuclear) return true;
  const l = protector({ ...g, countries }, id);
  return !!l && countries[l].nuclear && tierOf(countries[l]) === 'super';
}

/** Why you can't go to war with a country, or null. Nuclear powers can't be invaded. */
export function nuclearShield(g: GameState, other: string): string | null {
  const o = g.countries[other];
  if (!o) return null;
  if (o.nuclear) return `${o.name} has nuclear weapons`;
  const l = protector(g, other);
  if (l && l !== g.player?.countryId && g.countries[l].nuclear && tierOf(g.countries[l]) === 'super') return `Protected by ${g.countries[l].name}'s nuclear umbrella`;
  return null;
}

// ---------- Allies: asking for help and answering calls ----------

export const ASK_COOLDOWN = 6;

/** Your allies: defense pacts plus your bloc's leader. */
export function alliesOf(g: GameState): string[] {
  const p = g.player!;
  const out = new Set(p.nation?.alliances ?? []);
  const l = protector(g, p.countryId);
  if (l) out.add(l);
  return [...out].filter((id) => g.countries[id] && id !== p.countryId);
}

const favor = (p: Player, id: string) => p.nation?.favors?.[id] ?? 0;
const withFavor = (p: Player, id: string, d: number): Player => ({ ...p, nation: { ...p.nation!, favors: { ...(p.nation!.favors ?? {}), [id]: favor(p, id) + d } } });

/** Chance an ally says yes. Friendship, favors owed and personality all count. */
export function helpChance(g: GameState, ally: string, kind: 'aid' | 'troops'): number {
  const p = g.player!;
  const a = g.countries[ally];
  const rel = relOf(g, ally, p.countryId);
  let c = 0.35 + (rel - 50) / 100 + favor(p, ally) * 0.15;
  if (has(a.leader, 'generous')) c += 0.15;
  if (has(a.leader, 'cautious')) c -= 0.1;
  if (kind === 'troops' && has(a.leader, 'dove')) c -= 0.25;
  if (kind === 'troops' && has(a.leader, 'hawk')) c += 0.1;
  if (kind === 'troops' && p.nation?.war && isRival(ally, p.nation.war.enemy)) c += 0.25;
  return clamp(c, 0.05, 0.95);
}

export function askBlocker(g: GameState, ally: string, kind: 'aid' | 'troops'): string | null {
  const p = g.player!;
  if (!alliesOf(g).includes(ally)) return 'Not an ally';
  if (kind === 'troops' && !p.nation?.war) return 'Only during a war';
  if (kind === 'troops' && p.nation?.war?.enemy === ally) return 'You are fighting them';
  const last = p.nation?.asked?.[ally];
  if (last !== undefined && g.turn - last < ASK_COOLDOWN) return `Asked recently (${ASK_COOLDOWN - (g.turn - last)} months)`;
  return null;
}

export const aidAmount = (ally: Country) => Math.max(3, Math.round(ally.economy.gdpBn * 0.002));

/** Ask an ally for money or for troops in your war. If they help, you owe them. */
export function askAlly(g: GameState, ally: string, kind: 'aid' | 'troops', rng: Rng): GameState {
  let p = g.player;
  if (!isLeader(p) || blocked(p) || askBlocker(g, ally, kind)) return g;
  const a = g.countries[ally];
  const yes = rng() < helpChance(g, ally, kind);
  p = spend(p, { nation: { ...p.nation!, asked: { ...(p.nation!.asked ?? {}), [ally]: g.turn } } });
  if (!yes) {
    return log({ ...both(g, p.countryId, ally, -3), player: p }, `${a.leader.name} of ${a.name} turns down your request for ${kind === 'aid' ? 'aid' : 'troops'}.`);
  }
  p = withFavor(p, ally, kind === 'aid' ? -1 : -2);
  if (kind === 'aid') {
    const bn = aidAmount(a);
    const next = { ...g, countries: { ...g.countries, [p.countryId]: addDebt(g.countries[p.countryId], -bn) } };
    return log({ ...next, player: { ...p, popularity: clamp(p.popularity + 2, 0, 100) } }, `${a.name} sends $${bn}bn in aid to your country.`);
  }
  const push = Math.round(8 + powerIndex(a) * 0.15);
  p = { ...p, nation: { ...p.nation!, war: { ...p.nation!.war!, score: p.nation!.war!.score + push } } };
  return log({ ...g, player: p }, `${a.name} sends troops to fight beside you (+${push} war score).`);
}

/** Say yes or no to an ally's call. Saying no costs trust; a bloc leader may cut you loose. */
export function answerAlly(g: GameState, accept: boolean): GameState {
  let p = g.player;
  if (!isLeader(p) || p.pendingEvent || !p.nation!.allyCall) return g;
  const call = p.nation!.allyCall;
  const a = g.countries[call.from];
  p = { ...p, nation: { ...p.nation!, allyCall: null } };
  if (!a) return { ...g, player: p };
  if (!accept) return refuseAlly(g, p, call);
  let next = both(g, p.countryId, call.from, call.kind === 'troops' ? 15 : 10);
  p = withFavor(p, call.from, call.kind === 'troops' ? 2 : 1);
  if (call.kind === 'aid') {
    const bn = Math.max(2, Math.round(next.countries[p.countryId].economy.gdpBn * 0.002));
    next = { ...next, countries: { ...next.countries, [p.countryId]: addDebt(next.countries[p.countryId], bn) } };
    return log({ ...next, player: { ...p, groups: { ...p.groups, workers: clamp(p.groups.workers - 1, 0, 100) } } }, `${p.name} sends $${bn}bn to help ${a.name}.`);
  }
  const me = next.countries[p.countryId];
  next = { ...next, countries: { ...next.countries, [p.countryId]: { ...me, military: clamp(me.military - 4, 0, 100) } } };
  if (call.warWith) next = { ...next, wars: (next.wars ?? []).map((w) => (w.a === call.from && w.b === call.warWith ? { ...w, score: w.score + 10 } : w.b === call.from && w.a === call.warWith ? { ...w, score: w.score - 10 } : w)) };
  if (call.conflict) next = { ...next, conflicts: next.conflicts.map((c) => (c.country === call.conflict ? { ...c, score: c.score + (c.govBacker === call.from || c.country === call.from ? 8 : -8) } : c)) };
  return log({ ...next, player: { ...p, popularity: clamp(p.popularity - 3, 0, 100), groups: { ...p.groups, students: clamp(p.groups.students - 3, 0, 100) } } }, `${p.name} sends troops to help ${a.name}. Some at home are uneasy.`);
}

function refuseAlly(g: GameState, p: Player, call: AllyCall): GameState {
  const a = g.countries[call.from];
  let next = both(g, p.countryId, call.from, call.kind === 'troops' ? -15 : -10);
  p = withFavor(p, call.from, -1);
  let line = `${p.name} refuses to help ${a.name}. ${a.leader.name} will remember.`;
  // Hurt allies may walk away.
  if (relOf(next, call.from, p.countryId) < 40 && p.nation!.alliances.includes(call.from)) {
    p = { ...p, nation: { ...p.nation!, alliances: p.nation!.alliances.filter((x) => x !== call.from) } };
    line += ` ${a.name} ends your alliance.`;
  } else if (relOf(next, call.from, p.countryId) < 20 && protector(next, p.countryId) === call.from) {
    next = { ...next, countries: { ...next.countries, [p.countryId]: { ...next.countries[p.countryId], bloc: 'none' } } };
    line += ` ${a.name} throws your country out of the ${BLOCS[a.bloc].name}.`;
  }
  return log({ ...next, player: p }, line);
}

/** Monthly while you lead: allies ask for help, and close friends help unasked in hard times. */
export function tickAllies(g: GameState, rng: Rng, lines: string[]): GameState {
  let p = g.player;
  if (!p?.nation) return g;
  let next = g;
  const call = p.nation.allyCall;
  if (call) {
    if (call.monthsLeft <= 1) {
      lines.push(`You never answered ${g.countries[call.from]?.name ?? 'your ally'}'s call for help.`);
      next = refuseAlly(next, { ...p, nation: { ...p.nation, allyCall: null } }, call);
      return next;
    }
    return { ...next, player: { ...p, nation: { ...p.nation, allyCall: { ...call, monthsLeft: call.monthsLeft - 1 } } } };
  }
  const allies = alliesOf(g);
  // A new call for help.
  if (allies.length && rng() < 0.04 * Math.min(3, allies.length)) {
    const from = pick(allies, rng);
    const a = g.countries[from];
    const aiWar = (g.wars ?? []).find((w) => w.a === from || w.b === from);
    const war = (g.conflicts ?? []).find((c) => c.country === from || c.govBacker === from);
    const c: AllyCall = aiWar
      ? { from, kind: 'troops', reason: `${a.name} is at war with ${g.countries[aiWar.a === from ? aiWar.b : aiWar.a].name} and needs your soldiers.`, monthsLeft: 3, warWith: aiWar.a === from ? aiWar.b : aiWar.a }
      : war
      ? { from, kind: 'troops', reason: war.country === from ? `Rebels threaten ${a.name}'s government.` : `${a.name} is backing the government in ${g.countries[war.country].name}'s civil war and wants your soldiers.`, monthsLeft: 3, conflict: war.country }
      : rng() < 0.6
        ? { from, kind: 'aid', reason: pick([`Floods have hit ${a.name}.`, `${a.name} faces a budget crisis.`, `An earthquake strikes ${a.name}.`, `${a.name} is short of food after a drought.`], rng), monthsLeft: 3 }
        : { from, kind: 'troops', reason: `${a.name} wants your soldiers for a show of strength against its rivals.`, monthsLeft: 3 };
    p = { ...p, nation: { ...p.nation, allyCall: c } };
    lines.push(`${a.leader.name} of ${a.name} asks for your help: ${c.reason}`);
    return { ...next, player: p };
  }
  // Close allies step in when your economy is in trouble.
  const mine = g.countries[p.countryId];
  if (mine.economy.growth < 0 || mine.stability < 30) {
    const friend = allies.find((id) => relOf(g, id, p!.countryId) >= 70);
    if (friend && rng() < 0.08) {
      const bn = aidAmount(g.countries[friend]);
      next = { ...next, countries: { ...next.countries, [p.countryId]: addDebt(mine, -bn) } };
      p = withFavor(p, friend, -1);
      lines.push(`${g.countries[friend].name} sends $${bn}bn to help your country through hard times.`);
      return { ...next, player: p };
    }
  }
  return next;
}
