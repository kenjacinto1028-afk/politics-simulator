import { GROUPS, LAWS, PROJECTS, type LawDef, type ProjectDef } from '../data/city-content';
import { SYSTEMS } from '../data/systems';
import { clamp } from './city';
import type { Rng } from './rng';
import type { AdvancementMode, City, CouncilMember, GameState, GroupId, Player } from './types';

export const GROUP_IDS = Object.keys(GROUPS) as GroupId[];
export const MAX_BUILDS = 2;
export const HIGHER_OFFICE_MIN_MONTHS = 18;
export const HIGHER_OFFICE_MIN_POPULARITY = 55;
export const DEAL_COST = 20;

export const COUNCIL_LABEL: Record<AdvancementMode, string> = {
  election: 'City council', appointment: 'Party committee', shares: 'Board of directors',
};

export const startingGroups = (rng: Rng): Record<GroupId, number> =>
  Object.fromEntries(GROUP_IDS.map((g) => [g, Math.round(38 + rng() * 14)])) as Record<GroupId, number>;

/** Electorate-weighted approval across groups, 0..100. */
export const groupApproval = (p: Player) => GROUP_IDS.reduce((a, g) => a + p.groups[g] * GROUPS[g].weight, 0);

/** Where each group's approval drifts while you hold office. */
export function groupTargets(p: Player): Record<GroupId, number> {
  const c = p.city!;
  const lawShift = (g: GroupId) => c.laws.reduce((a, id) => a + (LAWS.find((l) => l.id === id)?.groups[g] ?? 0), 0);
  const welfare = c.spending.welfare * 2 * (c.taxRate / 5);
  const raw: Record<GroupId, number> = {
    workers: (c.jobs + welfare) / 2 + lawShift('workers'),
    business: 50 + (5 - c.taxRate) * 5 + (c.jobs - 50) * 0.6 + lawShift('business'),
    retirees: ((100 - c.crime) + c.services) / 2 + lawShift('retirees'),
    students: (c.culture + c.services) / 2 + lawShift('students'),
  };
  // Voters are hard to fully please: compress toward the middle.
  for (const g of GROUP_IDS) raw[g] = 50 + (raw[g] - 50) * 0.7;
  return raw;
}

export function tickGroups(p: Player): Player {
  if (!p.office || !p.city) {
    const groups = { ...p.groups };
    for (const g of GROUP_IDS) groups[g] = groups[g] + (45 - groups[g]) * 0.03;
    return { ...p, groups };
  }
  const t = groupTargets(p);
  const groups = { ...p.groups };
  for (const g of GROUP_IDS) groups[g] = clamp(groups[g] + (clamp(t[g], 0, 100) - groups[g]) * 0.06, 0, 100);
  return { ...p, groups };
}

export function tickCouncil(c: City, popularity: number): City {
  const pull = 50 + (popularity - 50) * 0.4;
  return { ...c, council: c.council.map((m) => ({ ...m, relationship: clamp(m.relationship + (pull - m.relationship) * 0.04, 0, 100) })) };
}

/** Builds finish: returns the updated city plus the projects completed this month. */
export function tickBuilds(c: City): { city: City; finished: ProjectDef[] } {
  const finished: ProjectDef[] = [];
  const building = [];
  for (const b of c.building) {
    if (b.monthsLeft <= 1) finished.push(PROJECTS.find((p) => p.id === b.id)!);
    else building.push({ ...b, monthsLeft: b.monthsLeft - 1 });
  }
  return { city: { ...c, building, built: [...c.built, ...finished.map((f) => f.id)] }, finished };
}

// ---------- Council votes ----------

type Proposal = { groups: Partial<Record<GroupId, number>> };

/** How strongly a member leans yes, before noise. 50 is the tipping point. */
export const memberScore = (m: CouncilMember, prop: Proposal) => m.relationship + (prop.groups[m.leans] ?? 0) * 4;

export function forecast(c: City, prop: Proposal) {
  const votes = c.council.map((m) => memberScore(m, prop));
  const likelyYes = votes.filter((v) => v >= 50).length;
  return { votes, likelyYes, needed: Math.floor(c.council.length / 2) + 1 };
}

function vote(c: City, prop: Proposal, rng: Rng) {
  const yes = c.council.filter((m) => memberScore(m, prop) + (rng() - 0.5) * 16 >= 50).length;
  return { yes, passed: yes > c.council.length / 2 };
}

// ---------- Player actions (each costs 1 action) ----------

const canAct = (p: Player | null): p is Player => !!p && p.actionsLeft > 0 && !p.pendingEvent;
const inCityOffice = (p: Player) => !!p.office && !!p.city;
const spend = (p: Player): Player => ({ ...p, actionsLeft: p.actionsLeft - 1 });
const stamp = (g: GameState) => `${g.year}-${String(g.month).padStart(2, '0')}`;
const log = (g: GameState, line: string): GameState => ({ ...g, log: [`${stamp(g)}: ${line}`, ...g.log].slice(0, 200) });

export function meetGroup(g: GameState, group: GroupId, rng: Rng): GameState {
  const p = g.player;
  if (!canAct(p)) return g;
  const gain = Math.max(1, Math.round((3 + rng() * 3) * (1 - p.groups[group] / 130)));
  const player = spend({ ...p, groups: { ...p.groups, [group]: clamp(p.groups[group] + gain, 0, 100) }, popularity: clamp(p.popularity + (p.popularity < 60 ? 1 : 0), 0, 100) });
  return log({ ...g, player }, `${p.name} meets with ${GROUPS[group].name.toLowerCase()} (+${gain}).`);
}

export function lobbyMember(g: GameState, index: number, rng: Rng): GameState {
  const p = g.player;
  if (!canAct(p) || !inCityOffice(p) || !p.city!.council[index]) return g;
  const gain = Math.round(8 + rng() * 6);
  const council = p.city!.council.map((m, i) => (i === index ? { ...m, relationship: clamp(m.relationship + gain, 0, 100) } : m));
  return log({ ...g, player: spend({ ...p, city: { ...p.city!, council } }) }, `${p.name} has coffee with ${council[index].name} (+${gain}).`);
}

export function cutDeal(g: GameState, index: number): GameState {
  const p = g.player;
  if (!canAct(p) || !inCityOffice(p) || p.funds < DEAL_COST || !p.city!.council[index]) return g;
  const council = p.city!.council.map((m, i) => (i === index ? { ...m, relationship: clamp(m.relationship + 20, 0, 100) } : m));
  return log({ ...g, player: spend({ ...p, funds: p.funds - DEAL_COST, city: { ...p.city!, council } }) }, `${p.name} cuts a deal with ${council[index].name}.`);
}

export function canPropose(p: Player, proj: ProjectDef): string | null {
  const c = p.city!;
  if (c.built.includes(proj.id) || c.building.some((b) => b.id === proj.id)) return 'Already built or underway';
  if (c.building.length >= MAX_BUILDS) return `Max ${MAX_BUILDS} projects at once`;
  if (c.treasury < proj.cost) return `Needs $${proj.cost}k in the treasury`;
  return null;
}

export function proposeProject(g: GameState, id: string, rng: Rng): GameState {
  const p = g.player;
  const proj = PROJECTS.find((x) => x.id === id);
  if (!canAct(p) || !inCityOffice(p) || !proj || canPropose(p, proj)) return g;
  const { yes, passed } = vote(p.city!, proj, rng);
  if (!passed) {
    return log({ ...g, player: spend({ ...p, popularity: clamp(p.popularity - 1, 0, 100) }) }, `Council rejects the ${proj.name} (${yes}–${7 - yes}).`);
  }
  const city = { ...p.city!, treasury: p.city!.treasury - proj.cost, building: [...p.city!.building, { id, monthsLeft: proj.months }] };
  return log({ ...g, player: spend({ ...p, city, popularity: clamp(p.popularity + 1, 0, 100) }) }, `Council approves the ${proj.name} (${yes}–${7 - yes}). Construction starts.`);
}

export function proposeLaw(g: GameState, id: string, rng: Rng): GameState {
  const p = g.player;
  const law = LAWS.find((x) => x.id === id);
  if (!canAct(p) || !inCityOffice(p) || !law || p.city!.laws.includes(id)) return g;
  const { yes, passed } = vote(p.city!, law, rng);
  if (!passed) {
    return log({ ...g, player: spend({ ...p, popularity: clamp(p.popularity - 1, 0, 100) }) }, `Council votes down ${law.name} (${yes}–${7 - yes}).`);
  }
  const groups = { ...p.groups };
  for (const k of Object.keys(law.groups) as GroupId[]) groups[k] = clamp(groups[k] + law.groups[k]! / 2, 0, 100);
  const city = { ...p.city!, laws: [...p.city!.laws, id] };
  return log({ ...g, player: spend({ ...p, city, groups }) }, `${law.name} passes the council (${yes}–${7 - yes}).`);
}

export function repealLaw(g: GameState, id: string): GameState {
  const p = g.player;
  const law = LAWS.find((x) => x.id === id);
  if (!canAct(p) || !inCityOffice(p) || !law || !p.city!.laws.includes(id)) return g;
  const city = { ...p.city!, laws: p.city!.laws.filter((x) => x !== id) };
  return log({ ...g, player: spend({ ...p, city, popularity: clamp(p.popularity - 2, 0, 100) }) }, `${p.name} repeals ${law.name}.`);
}

/** The next rung on this system's ladder, or null at the top. */
export function nextOffice(g: GameState) {
  const p = g.player!;
  const ladder = SYSTEMS[g.countries[p.countryId].systemId].ladder;
  const i = p.office ? ladder.indexOf(p.office) : -1;
  return i >= 0 && i < ladder.length - 1 ? ladder[i + 1] : null;
}

/** Why you can't run higher yet, or null if you can. */
export function higherOfficeBlocker(g: GameState): string | null {
  const p = g.player!;
  if (!p.office) return 'Hold office first';
  if (!nextOffice(g)) return 'You are at the top';
  if (p.campaign) return 'Already campaigning';
  if (p.monthsInOffice < HIGHER_OFFICE_MIN_MONTHS) return `Serve ${HIGHER_OFFICE_MIN_MONTHS - p.monthsInOffice} more months`;
  if (p.popularity < HIGHER_OFFICE_MIN_POPULARITY) return `Need ${HIGHER_OFFICE_MIN_POPULARITY} popularity`;
  if (p.termMonthsLeft <= 7) return 'Too close to the end of your term';
  return null;
}


// ---------- Tips ----------

export function campaignTip(g: GameState): string {
  const p = g.player!;
  const c = p.campaign;
  const mode = SYSTEMS[g.countries[p.countryId].systemId].advancement;
  if (!c) return '';
  if (mode === 'appointment' && p.loyalty < 70) return 'The party decides here. Work the party to raise your standing.';
  if (mode === 'shares' && p.funds >= 30) return 'Votes follow shares here. Turn funds into voting shares.';
  if (mode === 'shares') return 'Fundraise, then buy voting shares.';
  if (c.monthsLeft <= 2 && p.popularity >= c.rival.popularity) return 'You can debate now. You are more popular, so the odds favor you.';
  if (p.funds < 25 && c.monthsLeft > 2) return 'Low on money. Fundraise now so you can run ads later.';
  const weakest = GROUP_IDS.reduce((a, b) => (p.groups[a] * GROUPS[a].weight <= p.groups[b] * GROUPS[b].weight ? a : b));
  if (p.groups[weakest] < 45) return `${GROUPS[weakest].name} are cool on you. Meet with them.`;
  if (c.poll < 50) return 'You are behind. Ads give the biggest boost.';
  return 'You are ahead. Keep building popularity and do not get complacent.';
}

export type { LawDef, ProjectDef };
