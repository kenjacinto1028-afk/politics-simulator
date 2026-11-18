import { CAMPAIGN_MONTHS_CONST } from './constants';
import { CITY_EVENTS } from '../data/events';
import { cityName, partyName, personName } from './names';
import { SYSTEMS, OFFICE_NAMES } from '../data/systems';
import { clamp, newCity, normalizeSpending, tickCity } from './city';
import { GROUP_IDS, groupApproval, startingGroups, tickBuilds, tickCouncil, tickGroups } from './mayor';
import { newRegion, regionGroupTargets, tickRegion } from './governor';
import { kindOf } from './offices';
import { STATE_EVENTS } from '../data/state-content';
import { LEGISLATIVE_EVENTS } from '../data/legislature-content';
import { newSeat, tickSeat } from './legislator';
import { newMinistry, tickMinistry } from './cabinet';
import { newNation, tickNation } from './nation';
import { NATIONAL_EVENTS } from '../data/nation-content';
import { MORE_EVENTS } from '../data/more-events';
import { GEO_EVENTS } from '../data/geo-events';
import { SOCIETY_EVENTS } from '../data/society-events';
import { readValue } from './society';
import { powerIndex } from './geo';
import { FAITHS } from '../data/people';
import { clearEndorsements, contactsByRole, endorsementBonus, faithEdge, newContacts, resetDeals, setRelation, tickContacts, tickFaith } from './people';
import { newSystemState, rollCohabitation, systemScoreBonus, tickSystem } from './systems';
import type { Rng } from './rng';
import type { AdvancementMode, Campaign, City, Effects, EventDef, FaithId, GameState, OfficeId, PendingEvent, Player, Rival, SpendKey } from './types';

export const ACTIONS_PER_MONTH = 3;
export const CAMPAIGN_MONTHS = CAMPAIGN_MONTHS_CONST;
/** Events: at most one every EVENT_GAP months, and an event can't recur until EVENT_MEMORY others have happened. */
export const EVENT_CHANCE = 0.35;
export const EVENT_GAP = 2;
export const EVENT_MEMORY = 8;
/** Every career ends eventually. */
export const RETIRE_AGE = 75;
/** Years at the top before people start tiring of you. */
export const FATIGUE_YEARS = 8;
const pick = <T,>(arr: readonly T[], rng: Rng) => arr[Math.floor(rng() * arr.length)];

export type CampaignAction = 'rally' | 'fundraise' | 'ads' | 'door-knock' | 'debate' | 'party-work' | 'buy-shares' | 'town-hall';

export const ACTION_INFO: Record<CampaignAction, { label: string; hint: string; cost: number }> = {
  rally: { label: 'Hold a rally', hint: '+popularity', cost: 5 },
  fundraise: { label: 'Fundraise', hint: '+funds', cost: 0 },
  ads: { label: 'Run ads', hint: '++popularity', cost: 25 },
  'door-knock': { label: 'Knock doors', hint: '+popularity, free', cost: 0 },
  debate: { label: 'Debate rival', hint: 'risky, last 2 months', cost: 0 },
  'party-work': { label: 'Work the party', hint: '+standing', cost: 0 },
  'buy-shares': { label: 'Buy voting shares', hint: '+stake', cost: 30 },
  'town-hall': { label: 'Town hall', hint: '+happiness, +popularity', cost: 0 },
};

/** Actions offered depend on how the system advances you and whether you are campaigning. */
export function availableActions(mode: AdvancementMode, campaigning: boolean, inOffice: boolean, localOffice = true): CampaignAction[] {
  const base: CampaignAction[] = ['fundraise'];
  // Out of office you are always building toward the next run; in office, campaign tools wait for campaign season.
  const stumping = campaigning || !inOffice;
  if (stumping && mode === 'election') base.push('rally', 'ads', 'door-knock');
  if (stumping && mode === 'appointment') base.push('rally');
  if (stumping && mode === 'shares') base.push('ads');
  if (mode === 'shares') base.push('buy-shares');
  else base.push('party-work');
  if (campaigning && mode === 'election') base.push('debate');
  if (inOffice && localOffice) base.push('town-hall');
  return [...new Set(base)];
}

/** What "standing" means per system, for UI labels. */
export const STANDING_LABEL: Record<AdvancementMode, string> = {
  election: 'Party support', appointment: 'Party standing', shares: 'Shareholder stake',
};

function newRival(rng: Rng, strength: number, countryId?: string): Rival {
  return {
    name: personName(countryId, rng), party: partyName(countryId, rng),
    popularity: clamp(strength + rng() * 15, 5, 90), funds: Math.round(40 + rng() * 80),
  };
}

const modeOf = (g: GameState) => SYSTEMS[g.countries[g.player!.countryId].systemId].advancement;

/** Score used for the vote: what wins depends on the system. */
function scores(g: GameState, p: Player, c: Campaign) {
  const sys = SYSTEMS[g.countries[p.countryId].systemId];
  const r = c.rival;
  const incumbency = c.incumbent ? clamp((officeHappiness(p) - 50) * 0.4 + 3, -10, 10) : 0;
  const groupsEdge = clamp((groupApproval(p) - 50) * 0.8, -12, 12);
  // Who backs you, how faith leaders see you, and your system's signature rule.
  const gp = { ...g, player: p };
  const network = endorsementBonus(gp) + faithEdge(gp) + systemScoreBonus(gp, sys.ladder.indexOf(c.office) <= 0);
  let you: number, them: number;
  if (sys.advancement === 'appointment') {
    you = p.loyalty * 1.2 + p.popularity * 0.3 + incumbency * 0.5 + groupsEdge * 0.3 + network;
    them = r.popularity * 1.2 + (c.incumbent ? 30 : 44);
  } else if (sys.advancement === 'shares') {
    you = p.loyalty * 1.2 + Math.sqrt(Math.max(0, p.funds)) * 1.5 + p.popularity * 0.3 + incumbency * 0.5 + groupsEdge * 0.3 + network;
    them = r.popularity * 1.2 + Math.sqrt(r.funds) * 1.5 + 20;
  } else {
    // Money matters through what it buys (ads, rallies); a small war-chest bonus remains.
    you = p.popularity + Math.sqrt(Math.max(0, p.funds)) * 0.5 + p.loyalty * 0.15 + incumbency + groupsEdge + network;
    them = r.popularity + Math.sqrt(r.funds) * 0.5 + 3;
  }
  return { you: Math.max(1, you), them: Math.max(1, them) };
}

export function pollShare(g: GameState, p: Player, c: Campaign, rng: Rng, noise = 4): number {
  const { you, them } = scores(g, p, c);
  return clamp((you / (you + them)) * 100 + (rng() - 0.5) * 2 * noise, 1, 99);
}

function log(g: GameState, line: string): GameState {
  return { ...g, log: [`${g.year}-${String(g.month).padStart(2, '0')}: ${line}`, ...g.log].slice(0, 200) };
}

/** How happy the people you govern are: your state if Governor, otherwise your city. */
export function officeHappiness(p: Player): number {
  if (kindOf(p.office) === 'regional' && p.region) return p.region.happiness;
  if (kindOf(p.office) === 'legislative' || kindOf(p.office) === 'head') return groupApproval(p);
  if (kindOf(p.office) === 'cabinet' && p.ministry) return p.ministry.performance;
  return p.city?.happiness ?? 50;
}

/** Rival strength. Re-elections scale with how you're doing; races above the first rung draw a stronger field. */
function rivalStrength(g: GameState, p: Player, office: OfficeId, incumbent: boolean): number {
  if (incumbent) {
    // Vote against your party more often than with it, and it backs a strong challenger.
    const partyRevenge = p.seat && p.seat.votesAgainstParty > p.seat.votesWithParty ? 10 : 0;
    return 15 + p.popularity * 0.58 + (60 - officeHappiness(p)) * 0.3 + partyRevenge;
  }
  const ladder = SYSTEMS[g.countries[p.countryId].systemId].ladder;
  if (ladder.indexOf(office) <= 0) return 18;
  return SYSTEMS[g.countries[p.countryId].systemId].advancement === 'election' ? 27 + p.popularity * 0.55 : 68;
}

function makeCampaign(g: GameState, p: Player, office: OfficeId, incumbent: boolean, rng: Rng): Campaign {
  const c: Campaign = { office, monthsLeft: CAMPAIGN_MONTHS, rival: newRival(rng, rivalStrength(g, p, office, incumbent), p.countryId), poll: 50, incumbent };
  return { ...c, poll: pollShare(g, p, c, rng) };
}

export function startCareer(g: GameState, name: string, countryId: string, rng: Rng, faith?: FaithId): GameState {
  const sys = SYSTEMS[g.countries[countryId].systemId];
  const myFaith = faith ?? g.countries[countryId].faith;
  const city = newCity(cityName(countryId, rng), rng, countryId);
  const player: Player = {
    name, countryId, office: null, popularity: 12, funds: 50, age: 30, loyalty: 20, actionsLeft: ACTIONS_PER_MONTH,
    campaign: null, city, termMonthsLeft: 0, pendingEvent: null, record: { won: 0, lost: 0 },
    groups: startingGroups(rng), monthsInOffice: 0, recentEvents: [], lastEventTurn: -99,
    region: null, seat: null, ministry: null, nation: null, retired: false, termsInOffice: 0, highestRung: -1,
    faith: myFaith, clergy: 50, contacts: newContacts(g.countries[countryId], myFaith, rng, city.name), sys: newSystemState(),
  };
  player.campaign = makeCampaign(g, player, sys.ladder[0], false, rng);
  const verb = sys.advancement === 'election' ? 'announces a run' : sys.advancement === 'shares' ? 'seeks a board seat' : 'seeks party nomination';
  return log({ ...g, player }, `${name} ${verb} for ${OFFICE_NAMES[sys.ladder[0]]} of ${city.name}, ${g.countries[countryId].name}. Opponent: ${player.campaign.rival.name} (${player.campaign.rival.party}).`);
}

/** Offices you can run for while out of office: anything up to one rung above the highest you've held. */
export function comebackOptions(g: GameState): OfficeId[] {
  const p = g.player!;
  const ladder = SYSTEMS[g.countries[p.countryId].systemId].ladder;
  return ladder.slice(0, Math.min(ladder.length, p.highestRung + 2));
}

/** Start a fresh campaign while out of office. */
export function runAgain(g: GameState, rng: Rng, office?: OfficeId): GameState {
  const p = g.player!;
  if (p.campaign || p.office || p.retired) return g;
  const options = comebackOptions(g);
  const target = office && options.includes(office) ? office : options[0];
  const player = { ...p, campaign: makeCampaign(g, p, target, false, rng) };
  return log({ ...g, player }, `${p.name} launches a bid for ${OFFICE_NAMES[target]} against ${player.campaign.rival.name}.`);
}

export function applyEffects(p: Player, e: Effects): Player {
  // Money from events comes out of whichever budget you run.
  const stateMoney = kindOf(p.office) === 'regional' && !!p.region;
  // National jobs spend national money: handled by resolveEvent through the national debt.
  const national = kindOf(p.office) === 'cabinet' || kindOf(p.office) === 'head';
  const region = stateMoney ? { ...p.region!, treasury: p.region!.treasury + (e.treasury ?? 0) } : p.region;
  const city: City | null = p.city ? {
    ...p.city,
    treasury: p.city.treasury + (stateMoney || national ? 0 : e.treasury ?? 0),
    crime: clamp(p.city.crime + (e.crime ?? 0), 0, 100),
    services: clamp(p.city.services + (e.services ?? 0), 0, 100),
    jobs: clamp(p.city.jobs + (e.jobs ?? 0), 0, 100),
    happiness: clamp(p.city.happiness + (e.happiness ?? 0), 0, 100),
    culture: clamp(p.city.culture + (e.culture ?? 0), 0, 100),
  } : null;
  const groups = { ...p.groups };
  for (const g of GROUP_IDS) groups[g] = clamp(groups[g] + (e.groups?.[g] ?? 0), 0, 100);
  return {
    ...p, city, region, groups,
    popularity: clamp(p.popularity + (e.popularity ?? 0), 0, 100),
    funds: Math.max(0, p.funds + (e.funds ?? 0)),
    loyalty: clamp(p.loyalty + (e.loyalty ?? 0), 0, 100),
    clergy: clamp(p.clergy + (e.clergy ?? 0), 0, 100),
    sys: e.meter ? { ...p.sys, meter: clamp(p.sys.meter + e.meter, 0, 100) } : p.sys,
    feats: e.feat && !p.feats?.includes(e.feat) ? [...(p.feats ?? []), e.feat] : p.feats,
  };
}

export function doAction(g: GameState, action: CampaignAction, rng: Rng): GameState {
  const p = g.player;
  if (!p || p.actionsLeft <= 0 || p.pendingEvent) return g;
  const info = ACTION_INFO[action];
  if (p.funds < info.cost) return g;
  if (!availableActions(modeOf(g), !!p.campaign, !!p.office).includes(action)) return g;
  if (action === 'debate' && (!p.campaign || p.campaign.monthsLeft > 2)) return g;

  const r = (lo: number, hi: number) => Math.round(lo + rng() * (hi - lo));
  // Diminishing returns: the higher a stat already is, the less each action adds.
  const dim = (stat: number, lo: number, hi: number) => Math.max(1, Math.round(r(lo, hi) * (1 - stat / 130)));
  let e: Effects = { funds: -info.cost };
  let msg = '';
  switch (action) {
    case 'rally': e = { ...e, popularity: dim(p.popularity, 2, 4) }; msg = 'holds a packed rally'; break;
    case 'fundraise': e = { funds: Math.round(r(15, 30) * (p.seat?.committee === 'finance' && p.office ? 1.5 : 1)), popularity: -r(0, 1) }; msg = 'hosts a fundraising dinner'; break;
    case 'ads': e = { ...e, popularity: dim(p.popularity, 3, 6) }; msg = 'launches an ad blitz'; break;
    case 'door-knock': e = { popularity: dim(p.popularity, 1, 2) }; msg = 'knocks on doors all weekend'; break;
    case 'party-work': e = { loyalty: dim(p.loyalty, 3, 6) }; msg = 'works the party machine'; break;
    case 'buy-shares': e = { ...e, loyalty: dim(p.loyalty, 5, 9) }; msg = 'quietly buys voting shares'; break;
    case 'town-hall': e = { happiness: p.city && p.city.happiness < 70 ? r(1, 2) : 0, popularity: dim(p.popularity, 1, 3) }; msg = 'holds a town hall'; break;
    case 'debate': {
      const edge = (p.popularity - p.campaign!.rival.popularity) / 100 + (rng() - 0.5);
      const swing = Math.round(edge * 12);
      e = { popularity: swing };
      msg = swing >= 0 ? `wins the debate (+${swing})` : `stumbles in the debate (${swing})`;
      break;
    }
  }
  let player = { ...applyEffects(p, e), actionsLeft: p.actionsLeft - 1 };
  if (player.campaign) player = { ...player, campaign: { ...player.campaign, poll: pollShare(g, player, player.campaign, rng) } };
  return log({ ...g, player }, `${p.name} ${msg}.`);
}

export function setBudget(g: GameState, taxRate: number, spending: Record<SpendKey, number>): GameState {
  const p = g.player;
  if (!p?.city || !p.office) return g;
  const city = { ...p.city, taxRate: clamp(Math.round(taxRate * 2) / 2, 0, 15), spending: normalizeSpending(spending) };
  return { ...g, player: { ...p, city } };
}

export function resolveEvent(g: GameState, choiceIndex: number): GameState {
  const p = g.player;
  const ev = p?.pendingEvent;
  const choice = ev?.choices[choiceIndex];
  if (!p || !ev || !choice) return g;
  let countries = g.countries;
  const kind = kindOf(p.office);
  if ((kind === 'cabinet' || kind === 'head') && choice.effects.treasury) {
    // National events price money in $ billions; new spending adds to the national debt.
    const c = g.countries[p.countryId];
    const debtToGdp = clamp(c.economy.debtToGdp - (choice.effects.treasury / c.economy.gdpBn) * 100, 0, 400);
    countries = { ...countries, [p.countryId]: { ...c, economy: { ...c.economy, debtToGdp } } };
  }
  let player: Player = { ...applyEffects(p, choice.effects), pendingEvent: null };
  if (ev.contactId && choice.effects.contact) player = setRelation(player, ev.contactId, choice.effects.contact);
  return log({ ...g, countries, player }, `${ev.title}: ${choice.log}`);
}

function resolveElection(g: GameState, rng: Rng): GameState {
  const p = g.player!;
  const c = p.campaign!;
  const sys = SYSTEMS[g.countries[p.countryId].systemId];
  const share = pollShare(g, p, c, rng, 3);
  const won = share >= 50;
  const office = OFFICE_NAMES[c.office];
  const how = sys.advancement === 'election' ? `${share.toFixed(1)}% of the vote` : sys.advancement === 'shares' ? `${share.toFixed(1)}% of shareholder votes` : 'the party committee\'s decision';
  const record = won ? { ...p.record, won: p.record.won + 1 } : { ...p.record, lost: p.record.lost + 1 };
  if (won) {
    const rung = sys.ladder.indexOf(c.office);
    const newJob = c.office !== p.office;
    let player: Player = {
      ...p, office: c.office, campaign: null, termMonthsLeft: sys.termYears * 12, record,
      monthsInOffice: newJob ? 0 : p.monthsInOffice, termsInOffice: newJob ? 1 : p.termsInOffice + 1,
      highestRung: Math.max(p.highestRung, rung), popularity: clamp(p.popularity + 5, 0, 100),
    };
    if (newJob && kindOf(c.office) === 'regional') player = { ...player, region: newRegion(p.city!.name, rng, p.countryId) };
    if (newJob && kindOf(c.office) === 'legislative') player = { ...player, seat: newSeat(c.office, rng) };
    if (newJob && kindOf(c.office) === 'cabinet') player = { ...player, ministry: newMinistry(g.countries[p.countryId]) };
    if (newJob && kindOf(c.office) === 'head') player = { ...player, ministry: null, nation: p.nation ?? newNation(g.countries[p.countryId], rng) };
    const k = kindOf(c.office);
    player = resetDeals(clearEndorsements(player));
    const where = k === 'local' ? ` of ${p.city!.name}` : k === 'regional' ? ` of ${player.region!.name}` : k === 'head' ? ` of ${g.countries[p.countryId].name}` : '';
    const done = log({ ...g, player }, `${p.name} ${c.incumbent ? 'is re-elected' : 'becomes'} ${office}${where} with ${how}.`);
    return newJob ? rollCohabitation(done, rng) : done;
  }
  // Any loss leaves you out of office: you gave up your old seat to run. Losing the top job ends your career.
  const player: Player = { ...clearEndorsements(p), office: null, campaign: null, termMonthsLeft: 0, monthsInOffice: 0, termsInOffice: 0, record, retired: atTop(g, p) };
  return log({ ...g, player }, `${p.name} loses the race for ${office} to ${c.rival.name} (${how}) and is out of office.${player.retired ? ' The career is over.' : ''}`);
}

/**
 * Run for the next rung instead of seeking re-election. Only possible in your final months,
 * and it replaces the re-election campaign: lose and you are out of office.
 */
export function runForHigher(g: GameState, office: OfficeId, rng: Rng): GameState {
  const p = g.player;
  if (!p?.office || p.actionsLeft <= 0 || p.termMonthsLeft > CAMPAIGN_MONTHS) return g;
  if (p.campaign && !(p.campaign.incumbent && p.campaign.office === p.office)) return g;
  const c: Campaign = { office, monthsLeft: CAMPAIGN_MONTHS, rival: newRival(rng, rivalStrength(g, p, office, false), p.countryId), poll: 50, incumbent: false };
  // Endorsements were for the old race; ask again for the new one.
  const fresh = clearEndorsements(p);
  const player = { ...fresh, actionsLeft: p.actionsLeft - 1, campaign: { ...c, poll: pollShare(g, fresh, c, rng) } };
  return log({ ...g, player }, `${p.name} skips re-election and runs for ${OFFICE_NAMES[office]}. Opponent: ${c.rival.name} (${c.rival.party}).`);
}

/** Holding the top office of the ladder: leaving it ends the career. */
function atTop(g: GameState, p: Player): boolean {
  const ladder = SYSTEMS[g.countries[p.countryId].systemId].ladder;
  return !!p.office && ladder.indexOf(p.office) === ladder.length - 1;
}

/** Cabinet members keep their job at the end of a term if the leader still trusts them this much. */
export const REAPPOINT_AT = 40;
/** Leaders in one-party and corporate states aren't voted out: the party or board reconfirms them if your standing holds. */
export const RECONFIRM_LOYALTY = 30;
/** Extra standing needed for each term after the first. */
export const RECONFIRM_STEP = 7;

/** Jobs you keep by someone's say-so rather than an election. */
export function isAppointed(g: GameState, p: Player): boolean {
  const kind = kindOf(p.office);
  return kind === 'cabinet' || (kind === 'head' && SYSTEMS[g.countries[p.countryId].systemId].advancement !== 'election');
}

/** Whether an appointed job is renewed at term end, and what it takes. */
export function keepsAppointment(g: GameState, p: Player): { ok: boolean; need: string } {
  if (kindOf(p.office) === 'cabinet') return { ok: (p.ministry?.boss ?? 0) >= REAPPOINT_AT, need: `the leader's trust at ${REAPPOINT_AT}+` };
  const who = SYSTEMS[g.countries[p.countryId].systemId].advancement === 'shares' ? 'board' : 'party';
  // Each extra term asks for more: insiders want fresh faces too.
  const need = Math.min(70, RECONFIRM_LOYALTY + RECONFIRM_STEP * Math.max(0, p.termsInOffice - 1));
  return { ok: p.loyalty >= need, need: `${who} standing at ${need}+` };
}

function basePool(p: Player): PendingEvent[] {
  const kind = kindOf(p.office);
  if (kind === 'cabinet' || kind === 'head') return NATIONAL_EVENTS;
  return kind === 'regional' ? STATE_EVENTS : kind === 'legislative' ? LEGISLATIVE_EVENTS : CITY_EVENTS;
}

/** Events that fit your job, system and country right now. Out of office, only the new pool has events for you. */
function eventPool(g: GameState): EventDef[] {
  const p = g.player!;
  const c = g.countries[p.countryId];
  const kind = kindOf(p.office) ?? 'out';
  const met = (e: EventDef) => !e.when || ((e.when.above === undefined || readValue(g, c, e.when.stat) > e.when.above) && (e.when.below === undefined || readValue(g, c, e.when.stat) < e.when.below));
  const extra = [...MORE_EVENTS, ...GEO_EVENTS, ...SOCIETY_EVENTS].filter((e) => met(e)).filter((e) => (e.kinds ? e.kinds.includes(kind) : kind !== 'out') && (!e.systems || e.systems.includes(c.systemId))
    && (e.minReligiosity === undefined || c.religiosity >= e.minReligiosity) && (!e.about || contactsByRole(g, e.about).length > 0));
  return [...(p.office ? basePool(p) : []), ...extra];
}

/** Fill in names and places, and pick the politician the event is about. */
function prepareEvent(g: GameState, ev: EventDef, rng: Rng): PendingEvent {
  const p = g.player!;
  const c = g.countries[p.countryId];
  const who = ev.about ? pick(contactsByRole(g, ev.about), rng) : undefined;
  // {power}: one of the strongest foreign countries.
  const powers = Object.values(g.countries).filter((o) => o.id !== c.id).sort((a, b) => powerIndex(b) - powerIndex(a)).slice(0, 3);
  const power = powers.length ? pick(powers, rng).name : 'a foreign power';
  const fill = (t: string) => t.replace(/\{name\}/g, who?.name ?? 'a colleague').replace(/\{role\}/g, who?.role ?? 'an official')
    .replace(/\{city\}/g, p.city?.name ?? 'your city').replace(/\{country\}/g, c.name).replace(/\{leader\}/g, c.leader.name)
    .replace(/\{faith\}/g, FAITHS[c.faith].name).replace(/\{power\}/g, power);
  return { id: ev.id, title: fill(ev.title), text: fill(ev.text), choices: ev.choices.map((ch) => ({ ...ch, label: fill(ch.label), log: fill(ch.log) })), contactId: who?.id };
}

/** Drop the desk of a job you no longer hold, so its leftover prompts can't block the game. */
export function clearOldJobs(p: Player): Player {
  const kind = kindOf(p.office);
  return {
    ...p,
    region: kind === 'regional' ? p.region : null,
    seat: kind === 'legislative' ? p.seat : null,
    ministry: kind === 'cabinet' ? p.ministry : null,
  };
}

/** What must be answered before the month can end, if anything. */
export function blockingPrompt(p: Player | null): 'event' | 'bill' | 'vote' | 'ask' | 'retired' | null {
  if (!p) return null;
  if (p.retired) return 'retired';
  if (p.pendingEvent) return 'event';
  const kind = kindOf(p.office);
  if (kind === 'regional' && p.region?.pendingBill) return 'bill';
  if (kind === 'legislative' && p.seat?.pendingVote) return 'vote';
  if (kind === 'cabinet' && p.ministry?.pendingAsk) return 'ask';
  return null;
}

const nextUp = (g: GameState) => {
  const ladder = SYSTEMS[g.countries[g.player!.countryId].systemId].ladder;
  const i = g.player!.office ? ladder.indexOf(g.player!.office) : -1;
  return i >= 0 && i < ladder.length - 1;
};

/** Player-side monthly update; runs after the world tick. */
export function tickPlayer(g: GameState, rng: Rng): GameState {
  const out = tickPlayerInner(g, rng);
  return out.player ? { ...out, player: clearOldJobs(out.player) } : out;
}

function tickPlayerInner(g: GameState, rng: Rng): GameState {
  let p = g.player;
  if (!p || p.retired) return g;
  const country = g.countries[p.countryId];
  const sys = SYSTEMS[country.systemId];
  p = { ...p, actionsLeft: ACTIONS_PER_MONTH, age: g.month === 1 ? p.age + 1 : p.age };
  if (p.age >= RETIRE_AGE) {
    return log({ ...g, player: { ...p, office: null, campaign: null, retired: true } }, `${p.name} retires from public life at ${p.age}${p.office ? ` after serving as ${OFFICE_NAMES[p.office]}` : ''}.`);
  }
  const done: string[] = [];
  const kind = kindOf(p.office);

  let world = g;
  if (kind === 'cabinet' && p.ministry) {
    const t = tickMinistry({ ...g, player: p }, rng);
    world = t.game; p = t.game.player!;
    done.push(...t.lines);
  } else if (kind === 'head' && p.nation) {
    const t = tickNation({ ...g, player: p }, rng);
    world = t.game; p = t.game.player!;
    done.push(...t.lines);
    // Voters and insiders tire of a leader who stays too long.
    const yearsTop = (p.history?.monthsByOffice?.[p.office!] ?? p.monthsInOffice) / 12;
    if (yearsTop >= FATIGUE_YEARS) {
      const f = Math.min(2.5, (yearsTop - FATIGUE_YEARS + 1) * 0.3);
      p = { ...p, popularity: clamp(p.popularity - f, 0, 100), loyalty: clamp(p.loyalty - f * 0.8, 0, 100) };
      if (Math.abs(yearsTop - FATIGUE_YEARS) < 1 / 24) done.push(`After ${FATIGUE_YEARS} years in power, people are growing tired of ${p.name}.`);
    }
  } else if (kind === 'legislative' && p.seat) {
    const t = tickSeat(p, rng);
    p = t.player;
    done.push(...t.lines);
  } else if (kind === 'regional' && p.region) {
    const region = tickRegion(p.region, country, p.popularity, rng);
    p = { ...p, region, popularity: clamp(p.popularity + (region.happiness - p.popularity) * 0.15, 0, 100) };
  } else if (p.office && p.city) {
    const built = tickBuilds(tickCity(p.city, country, rng));
    const city = tickCouncil(built.city, p.popularity);
    p = { ...p, city, popularity: clamp(p.popularity + (city.happiness - p.popularity) * 0.15, 0, 100) };
    for (const proj of built.finished) {
      p = applyEffects(p, { groups: proj.groups, popularity: 4 });
      done.push(`${p.name} cuts the ribbon on the ${proj.name}.`);
    }
  } else {
    p = { ...p, popularity: clamp(p.popularity - 0.3, 0, 100) };
  }
  // People, faith and your system's rules keep moving whether or not you hold office.
  {
    const tc = tickContacts({ ...world, player: p }, rng);
    p = tickFaith({ ...world, player: tc.player });
    done.push(...tc.lines);
    const ts = tickSystem({ ...world, player: p }, officeHappiness(p), rng);
    world = ts.game; p = ts.game.player!;
    done.push(...ts.lines);
  }
  if (p.office) p = { ...p, termMonthsLeft: p.termMonthsLeft - 1, monthsInOffice: p.monthsInOffice + 1 };
  // Lawmakers, ministers and leaders move their voter groups in their own ticks.
  if (kind === 'local' || kind === 'regional' || !kind) p = tickGroups(p, kind === 'regional' && p.region ? regionGroupTargets(p) : undefined);
  let next: GameState = { ...world, player: p };
  if (kind && !p.office) {
    // Fired from cabinet, or removed from power.
    for (const line of done) next = log(next, line);
    return next;
  }
  for (const line of done) next = log(next, line);

  const termLimited = sys.termLimit !== null && p.termsInOffice >= sys.termLimit;
  const appointed = !!p.office && isAppointed(next, p);
  if (p.campaign) {
    const rival = { ...p.campaign.rival, popularity: clamp(p.campaign.rival.popularity + rng() * 2.5, 0, 95), funds: p.campaign.rival.funds + Math.round(rng() * 15) };
    const campaign = { ...p.campaign, rival, monthsLeft: p.campaign.monthsLeft - 1 };
    p = { ...p, campaign: { ...campaign, poll: pollShare(next, p, campaign, rng) } };
    next = { ...next, player: p };
    if (campaign.monthsLeft <= 0) next = resolveElection(next, rng);
  } else if (p.office && p.termMonthsLeft <= 0 && appointed && !termLimited && keepsAppointment(next, p).ok) {
    // Appointed jobs aren't elected: the leader, party or board keeps you on if you still have their backing.
    const by = kind === 'cabinet' ? country.leader.name : sys.advancement === 'shares' ? 'The board' : 'The party congress';
    next = log({ ...next, player: { ...p, termMonthsLeft: sys.termYears * 12, termsInOffice: p.termsInOffice + 1, record: { ...p.record, won: p.record.won + 1 } } },
      `${by} ${kind === 'cabinet' ? 'keeps' : 'reconfirms'} ${p.name} as ${OFFICE_NAMES[p.office]} for another term.`);
  } else if (p.office && p.termMonthsLeft <= 0) {
    // Term over with no campaign (term-limited, dropped from cabinet, or didn't run higher): leave this office.
    const retired = atTop(next, p);
    const why = appointed && !termLimited ? (kind === 'cabinet' ? ' The leader drops them in a reshuffle.' : ' They lose the backing to stay on.') : '';
    next = log({ ...next, player: { ...p, office: null, termsInOffice: 0, monthsInOffice: 0, retired } },
      `${p.name} leaves office as ${OFFICE_NAMES[p.office]} at the end of the term.${why}${retired ? ' The career is over.' : ''}`);
  } else if (p.office && p.termMonthsLeft === CAMPAIGN_MONTHS && termLimited) {
    next = log(next, `${p.name} is term-limited as ${OFFICE_NAMES[p.office]}. ${nextUp(next) ? 'Run for higher office now, or leave' : 'This is the final stretch: the career ends'} when the term ends.`);
  } else if (p.office && p.termMonthsLeft === CAMPAIGN_MONTHS && appointed) {
    next = log(next, `Your term ends in ${CAMPAIGN_MONTHS} months: keep ${keepsAppointment(next, p).need} to stay on${nextUp(next) ? ', or run for higher office' : ''}.`);
  } else if (p.office && p.termMonthsLeft <= CAMPAIGN_MONTHS && !termLimited && !appointed) {
    p = { ...p, campaign: makeCampaign(next, p, p.office, true, rng) };
    next = log({ ...next, player: p }, `Re-election season: ${p.campaign!.rival.name} (${p.campaign!.rival.party}) challenges ${p.name}. You can also run for higher office instead.`);
  }

  p = next.player!;
  const roll = rng();
  if (!p.retired && !p.pendingEvent && next.turn - p.lastEventTurn >= EVENT_GAP && roll < (p.office ? EVENT_CHANCE : EVENT_CHANCE * 0.5)) {
    const pool = eventPool(next).filter((e) => !p.recentEvents.includes(e.id));
    if (pool.length) {
      const ev = prepareEvent(next, pick(pool, rng), rng);
      next = { ...next, player: { ...p, pendingEvent: ev, recentEvents: [ev.id, ...p.recentEvents].slice(0, EVENT_MEMORY), lastEventTurn: next.turn } };
    }
  }
  return next;
}
