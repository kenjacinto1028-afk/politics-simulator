import { LEADER_FIRST, LEADER_LAST, NATIONAL_LAWS, type NationalLawDef, type NationalPriority, type NationalTargets } from '../data/nation-content';
import { GROUPS } from '../data/city-content';
import { SYSTEMS } from '../data/systems';
import { clamp } from './city';
import { kindOf } from './offices';
import { has, makeCharacter } from './people';
import { parliamentShift } from './systems';
import type { Rng } from './rng';
import type { Country, GameState, GroupId, Nation, Player } from './types';

const GROUP_IDS = Object.keys(GROUPS) as GroupId[];
export const ADDRESS_COOLDOWN = 6;
export const TRADE_MIN_RELATION = 30;
export const WAR_MAX_RELATION = -50;
const PRIORITIES: NationalPriority[] = ['defense', 'welfare', 'health', 'education', 'infrastructure'];
const pick = <T,>(arr: readonly T[], rng: Rng) => arr[Math.floor(rng() * arr.length)];
const stamp = (g: GameState) => `${g.year}-${String(g.month).padStart(2, '0')}`;
const log = (g: GameState, line: string): GameState => ({ ...g, log: [`${stamp(g)}: ${line}`, ...g.log].slice(0, 200) });
const approach = (cur: number, target: number, rate: number) => cur + (target - cur) * rate;

const PARLIAMENT_NAME: Record<string, string> = {
  presidential: 'Congress', federal: 'Congress', parliamentary: 'Parliament', 'semi-presidential': 'National Assembly',
  'constitutional-monarchy': 'Parliament', 'one-party': "People's Congress", 'direct-democracy': 'Federal Assembly', 'corporate-state': 'Shareholder Assembly',
};

export function newNation(country: Country, rng: Rng): Nation {
  const oneParty = country.systemId === 'one-party';
  const seats = country.systemId === 'corporate-state' ? 50 : 300;
  return {
    taxRate: 30, spending: 33,
    priorities: { defense: 15, welfare: 25, health: 20, education: 20, infrastructure: 20 },
    parliament: { name: PARLIAMENT_NAME[country.systemId] ?? 'Parliament', seats, yourParty: oneParty ? seats : Math.round(seats * (0.45 + rng() * 0.15)), goodwill: 55 },
    laws: [], tradeDeals: [], alliances: [], lastSummitTurn: -99, war: null, lastAddressTurn: -99, legacy: 0,
  };
}

export const nationalLaw = (id: string): NationalLawDef | undefined => NATIONAL_LAWS.find((l) => l.id === id);

function lawTargets(n: Nation): Required<NationalTargets> {
  const out = { growth: 0, unemployment: 0, inflation: 0, stability: 0, spending: 0 };
  for (const id of n.laws) {
    const t = nationalLaw(id)?.targets ?? {};
    for (const k of Object.keys(out) as (keyof typeof out)[]) out[k] += t[k] ?? 0;
  }
  return out;
}

/** Total spending including laws, % of GDP. */
export const totalSpending = (n: Nation) => n.spending + lawTargets(n).spending;
/** Yearly deficit, % of GDP (negative = surplus). */
export const deficit = (n: Nation) => totalSpending(n) - n.taxRate;

/** How the country feels about how things are going, 0..100. */
export function nationalMood(c: Country, n: Nation): number {
  const e = c.economy;
  const pr = n.priorities;
  return clamp(50 + (e.growth - 2) * 5 - (e.unemployment - 6) * 3 - (e.inflation - 3) * 2.5 + (pr.health - 20) * 0.3 + (pr.welfare - 20) * 0.3
    - (n.taxRate - 30) * 0.5 - (n.war && n.war.months > 3 ? 8 : 0)
    // Voters notice runaway borrowing.
    - Math.max(0, deficit(n) - 3) * 1.5 - Math.max(0, e.debtToGdp - 100) * 0.1, 0, 100);
}

export function nationGroupTargets(c: Country, n: Nation): Record<GroupId, number> {
  const e = c.economy;
  const pr = n.priorities;
  const lawShift = (g: GroupId) => n.laws.reduce((a, id) => a + (nationalLaw(id)?.groups[g] ?? 0), 0);
  const raw: Record<GroupId, number> = {
    workers: 50 + (pr.welfare - 20) * 0.8 - (e.unemployment - 6) * 3 + lawShift('workers'),
    business: 50 - (n.taxRate - 30) * 1.5 + (e.growth - 2) * 4 + lawShift('business'),
    retirees: 50 + (pr.health - 20) * 0.8 - (e.inflation - 3) * 3 + lawShift('retirees'),
    students: 50 + (pr.education - 20) * 0.8 + (e.growth - 2) * 2 + lawShift('students'),
  };
  for (const gId of GROUP_IDS) raw[gId] = clamp(50 + (raw[gId] - 50) * 0.7, 0, 100);
  return raw;
}

/** Your country's economy under your policies. Replaces the generic drift for the nation you lead. */
export function tickNationalEconomy(c: Country, n: Nation, popularity: number, rng: Rng): Country {
  const lt = lawTargets(n);
  const pr = n.priorities;
  const e = c.economy;
  const war = n.war ? 1 : 0;
  const growthT = 2.2 + (30 - n.taxRate) * 0.06 + (pr.infrastructure - 20) * 0.03 + (pr.education - 20) * 0.02
    + n.tradeDeals.length * 0.15 - Math.max(0, e.debtToGdp - 100) * 0.01 - war + lt.growth;
  const growth = clamp(approach(e.growth, growthT, 0.1) + (rng() - 0.5) * 0.3, -8, 12);
  const def = deficit(n) + war * 2;
  const inflation = clamp(approach(e.inflation, 2 + Math.max(0, def) * 0.4 + (growth - 2) * 0.3 + lt.inflation, 0.1) + (rng() - 0.5) * 0.2, -2, 60);
  const unemployment = clamp(approach(e.unemployment, 6 - (growth - 2) * 0.6 - (pr.welfare - 20) * 0.02 + lt.unemployment, 0.08), 1, 40);
  const debtToGdp = clamp(e.debtToGdp + def / 12 - growth / 12 * (e.debtToGdp / 100), 0, 400);
  const stability = clamp(approach(c.stability, 50 + (popularity - 50) * 0.4 - (unemployment - 6) * 2 - (inflation - 3) * 1.5 + (pr.defense - 20) * 0.2 + lt.stability, 0.08), 0, 100);
  return { ...c, stability, economy: { ...e, growth, inflation, unemployment, debtToGdp, gdpBn: e.gdpBn * (1 + growth / 1200) } };
}

/** Removal from office: no-confidence votes, impeachment, party or board revolts. */
export function removalRisk(g: GameState): { risk: number; label: string } {
  const p = g.player!;
  const n = p.nation!;
  const sys = g.countries[p.countryId].systemId;
  const support = n.parliament.yourParty / n.parliament.seats + n.parliament.goodwill / 200;
  if (sys === 'one-party' || sys === 'corporate-state') {
    return { risk: p.loyalty < 15 ? 0.15 : 0, label: sys === 'one-party' ? 'Party revolt' : 'Board ouster' };
  }
  if (sys === 'presidential' || sys === 'federal') {
    return { risk: p.popularity < 15 && n.parliament.goodwill < 25 ? 0.12 : 0, label: 'Impeachment' };
  }
  return { risk: support < 0.6 && p.popularity < 25 ? 0.12 : 0, label: 'No-confidence vote' };
}

/** Monthly update while you lead the country. */
export function tickNation(g: GameState, rng: Rng): { game: GameState; lines: string[] } {
  let p = g.player!;
  let n = p.nation!;
  const lines: string[] = [];
  let country = tickNationalEconomy(g.countries[p.countryId], n, p.popularity, rng);
  const countries = { ...g.countries };

  if (n.war) {
    const enemy = countries[n.war.enemy];
    // Allies fight with you.
    const ours = country.economy.gdpBn + n.alliances.reduce((a, id) => a + (countries[id]?.economy.gdpBn ?? 0) * 0.5, 0);
    const strength = ours / (ours + enemy.economy.gdpBn);
    const score = n.war.score + (strength - 0.5) * 20 + (n.priorities.defense - 20) * 0.4 + (rng() - 0.5) * 12;
    const months = n.war.months + 1;
    p = { ...p, popularity: clamp(p.popularity + (months <= 2 ? 2 : -1.5), 0, 100) };
    if (months >= 6 || Math.abs(score) >= 30) {
      const won = score > 0;
      p = { ...p, popularity: clamp(p.popularity + (won ? 8 : -15), 0, 100) };
      country = { ...country, stability: clamp(country.stability + (won ? 5 : -10), 0, 100) };
      lines.push(won ? `Victory: ${enemy.name} agrees to a ceasefire on your terms.` : `Defeat: your country is forced into a humiliating ceasefire with ${enemy.name}.`);
      n = { ...n, war: null };
    } else {
      n = { ...n, war: { ...n.war, months, score } };
    }
  }

  // A hostile hawk may attack you, unless you have allies to deter them.
  if (!n.war) {
    const foe = Object.values(countries).find((o) => o.id !== p.countryId && has(o.leader, 'hawk') && (o.relations[p.countryId] ?? 0) <= -60);
    if (foe && rng() < (n.alliances.length ? 0.01 : 0.03)) {
      n = { ...n, war: { enemy: foe.id, months: 0, score: -5 }, tradeDeals: n.tradeDeals.filter((x) => x !== foe.id) };
      lines.push(`${foe.leader.name} of ${foe.name} declares war on your country!`);
    }
  }
  const mood = nationalMood(country, n);
  const targets = nationGroupTargets(country, n);
  const groups = { ...p.groups };
  for (const k of GROUP_IDS) groups[k] = clamp(groups[k] + (targets[k] - groups[k]) * 0.06, 0, 100);
  p = { ...p, groups, popularity: clamp(p.popularity + (mood - p.popularity) * 0.1, 0, 100) };
  // Without elections, power rests on the party or board: their backing fades unless tended.
  if (SYSTEMS[country.systemId].advancement !== 'election') p = { ...p, loyalty: clamp(p.loyalty - 0.6, 0, 100) };
  n = { ...n, parliament: { ...n.parliament, goodwill: clamp(approach(n.parliament.goodwill, 50 + (p.popularity - 50) * 0.3, 0.05), 0, 100) }, legacy: n.legacy + (p.popularity + country.stability) / 200 };
  country = { ...country, leader: { ...country.leader, name: p.name, party: 'Your party', approval: p.popularity, faith: p.faith } };
  countries[p.countryId] = country;
  p = { ...p, nation: n };
  let game: GameState = { ...g, player: p, countries };

  const removal = removalRisk(game);
  if (removal.risk > 0 && rng() < removal.risk) {
    game = { ...game, player: { ...p, office: null, campaign: null, termMonthsLeft: 0, monthsInOffice: 0, termsInOffice: 0, retired: true } };
    lines.push(`${removal.label}: ${p.name} is removed from power.`);
  }
  return { game, lines };
}

/** The rest of the world keeps living: unpopular leaders fall, relations drift. Runs every month. */
export function tickWorld(g: GameState, rng: Rng): GameState {
  const playerCountry = g.player && kindOf(g.player.office) === 'head' ? g.player.countryId : null;
  const countries = { ...g.countries };
  const lines: string[] = [];
  for (const [id, c] of Object.entries(countries)) {
    if (id === playerCountry) continue;
    const relations = { ...c.relations };
    // Personality and faith shape how each leader treats the world.
    const mood = (has(c.leader, 'hawk') ? -0.25 : 0) + (has(c.leader, 'dove') ? 0.25 : 0);
    for (const k of Object.keys(relations)) {
      const o = countries[k];
      const faithPull = o && o.faith === c.faith && c.faith !== 'secular' ? 0.1 : o && c.religiosity > 60 && o.faith !== c.faith ? -0.1 : 0;
      relations[k] = clamp(relations[k] + (rng() - 0.5) * 2 - relations[k] * 0.01 + mood + faithPull, -100, 100);
    }
    // Hawks sometimes pick fights with countries they already dislike.
    const foe = Object.keys(relations).find((k) => relations[k] < -40);
    if (has(c.leader, 'hawk') && foe && countries[foe] && rng() < 0.01) {
      relations[foe] = clamp(relations[foe] - 15, -100, 100);
      lines.push(`${c.name} and ${countries[foe].name} clash at the border. ${c.leader.name} blames ${countries[foe].name}.`);
    }
    let leader = c.leader;
    if (c.leader.approval < 35 && rng() < 0.03) {
      const ch = makeCharacter(c, rng, `${pick(LEADER_FIRST, rng)} ${pick(LEADER_LAST, rng)}`);
      leader = { ...ch, party: 'New Movement', approval: 55 };
      lines.push(`${c.name}: ${c.leader.name} is out. ${leader.name} takes power.`);
    }
    countries[id] = { ...c, relations, leader };
  }
  let next: GameState = { ...g, countries };
  for (const l of lines) next = log(next, l);
  return next;
}

// ---------- Actions ----------

const isLeader = (p: Player | null): p is Player => !!p && kindOf(p.office) === 'head' && !!p.nation;
const blocked = (p: Player) => p.actionsLeft <= 0 || !!p.pendingEvent;
const spendAction = (p: Player, nation: Nation, extra: Partial<Player> = {}): Player => ({ ...p, ...extra, nation, actionsLeft: p.actionsLeft - 1 });
const dim = (v: number, gain: number) => Math.max(1, Math.round(gain * (1 - v / 130)));

function setRelation(g: GameState, a: string, b: string, delta: number): GameState {
  const ca = g.countries[a], cb = g.countries[b];
  return {
    ...g,
    countries: {
      ...g.countries,
      [a]: { ...ca, relations: { ...ca.relations, [b]: clamp((ca.relations[b] ?? 0) + delta, -100, 100) } },
      [b]: { ...cb, relations: { ...cb.relations, [a]: clamp((cb.relations[a] ?? 0) + delta, -100, 100) } },
    },
  };
}

export const relationWith = (g: GameState, other: string) => g.countries[g.player!.countryId].relations[other] ?? 0;

export function canAddress(g: GameState) {
  const p = g.player;
  return isLeader(p) && g.turn - p.nation!.lastAddressTurn >= ADDRESS_COOLDOWN;
}

export function nationalAddress(g: GameState): GameState {
  const p = g.player;
  if (!isLeader(p) || blocked(p) || !canAddress(g)) return g;
  const mood = nationalMood(g.countries[p.countryId], p.nation!);
  const boost = Math.round(2 + (mood - 50) * 0.1);
  const n = { ...p.nation!, lastAddressTurn: g.turn, parliament: { ...p.nation!.parliament, goodwill: clamp(p.nation!.parliament.goodwill + 3, 0, 100) } };
  return log({ ...g, player: spendAction(p, n, { popularity: clamp(p.popularity + boost, 0, 100) }) }, `${p.name} addresses the nation (${boost >= 0 ? '+' : ''}${boost}).`);
}

export function courtParliament(g: GameState, rng: Rng): GameState {
  const p = g.player;
  if (!isLeader(p) || blocked(p)) return g;
  const gain = dim(p.nation!.parliament.goodwill, 5 + rng() * 4);
  const n = { ...p.nation!, parliament: { ...p.nation!.parliament, goodwill: clamp(p.nation!.parliament.goodwill + gain, 0, 100) } };
  return log({ ...g, player: spendAction(p, n) }, `${p.name} works the phones with lawmakers (+${gain} goodwill).`);
}

export function stateVisit(g: GameState, other: string, rng: Rng): GameState {
  const p = g.player;
  if (!isLeader(p) || blocked(p) || !g.countries[other] || other === p.countryId) return g;
  // Peacemakers welcome visits; hawks are cool to them.
  const lead = g.countries[other].leader;
  const gain = Math.round(8 + rng() * 6 + (has(lead, 'dove') ? 4 : 0) - (has(lead, 'hawk') ? 3 : 0) + (lead.faith === p.faith && p.faith !== 'secular' ? 2 : 0));
  const next = setRelation(g, p.countryId, other, gain);
  return log({ ...next, player: spendAction(p, p.nation!, { popularity: clamp(p.popularity + 1, 0, 100) }) }, `${p.name} makes a state visit to ${g.countries[other].name} (+${gain} relations).`);
}

export function tradeDeal(g: GameState, other: string): GameState {
  const p = g.player;
  if (!isLeader(p) || blocked(p) || !g.countries[other] || p.nation!.tradeDeals.includes(other) || relationWith(g, other) < TRADE_MIN_RELATION) return g;
  const groups = { ...p.groups, business: clamp(p.groups.business + 4, 0, 100), workers: clamp(p.groups.workers - 1, 0, 100) };
  const next = setRelation(g, p.countryId, other, 5);
  return log({ ...next, player: spendAction(p, { ...p.nation!, tradeDeals: [...p.nation!.tradeDeals, other] }, { groups }) }, `${p.name} signs a trade deal with ${g.countries[other].name}.`);
}

export function sanction(g: GameState, other: string): GameState {
  const p = g.player;
  if (!isLeader(p) || blocked(p) || !g.countries[other] || other === p.countryId) return g;
  // Hawks and vain leaders hit back with sanctions of their own.
  const lead = g.countries[other].leader;
  const retaliate = has(lead, 'hawk') || has(lead, 'vain');
  const next = setRelation(g, p.countryId, other, retaliate ? -40 : -30);
  const tradeDeals = p.nation!.tradeDeals.filter((x) => x !== other);
  const alliances = p.nation!.alliances.filter((x) => x !== other);
  const c = next.countries[p.countryId];
  const countries = { ...next.countries, [p.countryId]: { ...c, stability: clamp(c.stability + (retaliate ? 0 : 2), 0, 100) } };
  const groups = { ...p.groups, business: clamp(p.groups.business - (retaliate ? 5 : 2), 0, 100) };
  return log({ ...next, countries, player: spendAction(p, { ...p.nation!, tradeDeals, alliances }, { groups }) },
    `${p.name} slaps sanctions on ${g.countries[other].name}.${retaliate ? ` ${lead.name} hits back with sanctions of their own.` : ''}`);
}

export function declareWar(g: GameState, other: string): GameState {
  const p = g.player;
  if (!isLeader(p) || blocked(p) || p.nation!.war || !g.countries[other] || relationWith(g, other) > WAR_MAX_RELATION) return g;
  const next = setRelation(g, p.countryId, other, -100);
  return log({ ...next, player: spendAction(p, { ...p.nation!, war: { enemy: other, months: 0, score: 0 }, tradeDeals: p.nation!.tradeDeals.filter((x) => x !== other) }) },
    `${p.name} declares war on ${g.countries[other].name}.`);
}

export const peaceChance = (g: GameState) => {
  const n = g.player!.nation!;
  return n.war ? clamp(0.3 + n.war.score / 100 + n.war.months * 0.05, 0.1, 0.9) : 0;
};

export function seekPeace(g: GameState, rng: Rng): GameState {
  const p = g.player;
  if (!isLeader(p) || blocked(p) || !p.nation!.war) return g;
  const enemy = g.countries[p.nation!.war.enemy].name;
  if (rng() >= peaceChance(g)) return log({ ...g, player: spendAction(p, p.nation!) }, `${enemy} rejects peace talks.`);
  const next = setRelation(g, p.countryId, p.nation!.war.enemy, 60);
  return log({ ...next, player: spendAction(p, { ...p.nation!, war: null }, { popularity: clamp(p.popularity - 3, 0, 100) }) }, `${p.name} signs a peace deal with ${enemy}.`);
}

export function forecastNationalLaw(p: Player, law: NationalLawDef, shift = 0) {
  const parl = p.nation!.parliament;
  const appeal = GROUP_IDS.reduce((a, k) => a + (law.groups[k] ?? 0) * GROUPS[k].weight, 0);
  const defect = Math.round(parl.yourParty * clamp((40 - p.loyalty) / 100, 0, 0.3));
  const oppYes = clamp((parl.goodwill + appeal * 3 - 55) / 70, 0, 0.8);
  const yes = clamp(parl.yourParty - defect + Math.round((parl.seats - parl.yourParty) * oppYes) + shift, 0, parl.seats);
  return { yes, needed: Math.floor(parl.seats / 2) + 1 };
}

export function proposeNationalLaw(g: GameState, id: string, rng: Rng): GameState {
  const p = g.player;
  const law = nationalLaw(id);
  if (!isLeader(p) || blocked(p) || !law || p.nation!.laws.includes(id)) return g;
  const { yes, needed } = forecastNationalLaw(p, law, parliamentShift(g));
  const seats = p.nation!.parliament.seats;
  const actual = clamp(yes + Math.round((rng() - 0.5) * seats * 0.06), 0, seats);
  if (actual < needed) return log({ ...g, player: spendAction(p, p.nation!, { popularity: clamp(p.popularity - 1, 0, 100) }) }, `${p.nation!.parliament.name} rejects ${law.name} (${actual}–${seats - actual}).`);
  const groups = { ...p.groups };
  for (const k of GROUP_IDS) groups[k] = clamp(groups[k] + (law.groups[k] ?? 0) / 2, 0, 100);
  return log({ ...g, player: spendAction(p, { ...p.nation!, laws: [...p.nation!.laws, id] }, { groups }) }, `${law.name} passes ${p.nation!.parliament.name} (${actual}–${seats - actual}).`);
}

export function repealNationalLaw(g: GameState, id: string): GameState {
  const p = g.player;
  if (!isLeader(p) || blocked(p) || !p.nation!.laws.includes(id)) return g;
  return log({ ...g, player: spendAction(p, { ...p.nation!, laws: p.nation!.laws.filter((x) => x !== id) }, { popularity: clamp(p.popularity - 2, 0, 100) }) }, `${p.name} repeals ${nationalLaw(id)!.name}.`);
}

export function setNationalBudget(g: GameState, taxRate: number, spending: number, priorities: Nation['priorities']): GameState {
  const p = g.player;
  if (!isLeader(p)) return g;
  const total = PRIORITIES.reduce((a, k) => a + Math.max(0, priorities[k]), 0) || 1;
  const norm = Object.fromEntries(PRIORITIES.map((k) => [k, Math.round((Math.max(0, priorities[k]) / total) * 100)])) as Nation['priorities'];
  return { ...g, player: { ...p, nation: { ...p.nation!, taxRate: clamp(Math.round(taxRate), 10, 55), spending: clamp(Math.round(spending), 10, 60), priorities: norm } } };
}

export const SUMMIT_COOLDOWN = 12;
export const ALLIANCE_MIN_RELATION = 60;
const addDebt = (c: Country, bn: number): Country => ({ ...c, economy: { ...c.economy, debtToGdp: clamp(c.economy.debtToGdp + (bn / c.economy.gdpBn) * 100, 0, 400) } });

/** Invite the world's leaders. Everyone warms to you a little. Once a year. */
export function canHostSummit(g: GameState) {
  const p = g.player;
  return isLeader(p) && g.turn - p.nation!.lastSummitTurn >= SUMMIT_COOLDOWN;
}

export function hostSummit(g: GameState): GameState {
  const p = g.player;
  if (!isLeader(p) || blocked(p) || !canHostSummit(g)) return g;
  let next = g;
  for (const id of Object.keys(g.countries)) if (id !== p.countryId) next = setRelation(next, p.countryId, id, has(g.countries[id].leader, 'dove') ? 6 : 3);
  const countries = { ...next.countries, [p.countryId]: addDebt(next.countries[p.countryId], 5) };
  return log({ ...next, countries, player: spendAction(p, { ...p.nation!, lastSummitTurn: g.turn }, { popularity: clamp(p.popularity + 2, 0, 100) }) },
    `${p.name} hosts a world summit. Leaders from every continent attend ($5bn).`);
}

/** Send aid: wins friends abroad, costs money at home. */
export function foreignAid(g: GameState, other: string): GameState {
  const p = g.player;
  if (!isLeader(p) || blocked(p) || !g.countries[other] || other === p.countryId) return g;
  const next = setRelation(g, p.countryId, other, 12);
  const countries = { ...next.countries, [p.countryId]: addDebt(next.countries[p.countryId], 10) };
  const groups = { ...p.groups, students: clamp(p.groups.students + 2, 0, 100), workers: clamp(p.groups.workers - 1, 0, 100) };
  return log({ ...next, countries, player: spendAction(p, p.nation!, { groups }) }, `${p.name} sends $10bn in aid to ${g.countries[other].name} (+12 relations).`);
}

export function allianceBlocker(g: GameState, other: string): string | null {
  const n = g.player!.nation!;
  if (n.alliances.includes(other)) return 'Already allies';
  if (n.war?.enemy === other) return 'At war';
  if (relationWith(g, other) < ALLIANCE_MIN_RELATION) return `Needs relations ${ALLIANCE_MIN_RELATION}+`;
  if (has(g.countries[other].leader, 'cautious') && relationWith(g, other) < 75) return 'Cautious leader: needs 75+';
  return null;
}

/** A defense pact: allies help you win wars and scare off attackers. */
export function formAlliance(g: GameState, other: string): GameState {
  const p = g.player;
  if (!isLeader(p) || blocked(p) || !g.countries[other] || allianceBlocker(g, other)) return g;
  const next = setRelation(g, p.countryId, other, 5);
  return log({ ...next, player: spendAction(p, { ...p.nation!, alliances: [...p.nation!.alliances, other] }) }, `${p.name} signs a defense alliance with ${g.countries[other].name}.`);
}
