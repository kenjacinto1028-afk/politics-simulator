import { CITY_EVENTS, CITY_NAMES, RIVAL_FIRST, RIVAL_LAST, RIVAL_PARTIES } from '../data/events';
import { SYSTEMS, OFFICE_NAMES } from '../data/systems';
import { clamp, newCity, normalizeSpending, tickCity } from './city';
import type { Rng } from './rng';
import type { AdvancementMode, Campaign, City, Effects, GameState, OfficeId, Player, Rival, SpendKey } from './types';

export const ACTIONS_PER_MONTH = 3;
export const CAMPAIGN_MONTHS = 6;
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
export function availableActions(mode: AdvancementMode, campaigning: boolean, inOffice: boolean): CampaignAction[] {
  const base: CampaignAction[] = ['fundraise'];
  if (mode === 'election') base.push('rally', 'ads', 'door-knock');
  if (mode === 'appointment') base.push('party-work', 'rally');
  if (mode === 'shares') base.push('buy-shares', 'ads');
  if (mode !== 'shares') base.push('party-work');
  if (campaigning && mode === 'election') base.push('debate');
  if (inOffice) base.push('town-hall');
  return [...new Set(base)];
}

/** What "standing" means per system, for UI labels. */
export const STANDING_LABEL: Record<AdvancementMode, string> = {
  election: 'Party support', appointment: 'Party standing', shares: 'Shareholder stake',
};

function newRival(rng: Rng, strength: number): Rival {
  return {
    name: `${pick(RIVAL_FIRST, rng)} ${pick(RIVAL_LAST, rng)}`, party: pick(RIVAL_PARTIES, rng),
    popularity: clamp(strength + rng() * 15, 5, 90), funds: Math.round(40 + rng() * 80),
  };
}

const modeOf = (g: GameState) => SYSTEMS[g.countries[g.player!.countryId].systemId].advancement;

/** Score used for the vote: what wins depends on the system. */
function scores(g: GameState, p: Player, c: Campaign) {
  const sys = SYSTEMS[g.countries[p.countryId].systemId];
  const r = c.rival;
  const incumbency = c.incumbent && p.city ? (p.city.happiness - 50) * 0.4 + 3 : 0;
  let you: number, them: number;
  if (sys.advancement === 'appointment') {
    you = p.loyalty * 1.2 + p.popularity * 0.3 + incumbency * 0.5;
    them = r.popularity * 1.2 + (c.incumbent ? 30 : 44);
  } else if (sys.advancement === 'shares') {
    you = p.loyalty * 1.2 + Math.sqrt(Math.max(0, p.funds)) * 1.5 + p.popularity * 0.3 + incumbency * 0.5;
    them = r.popularity * 1.2 + Math.sqrt(r.funds) * 1.5 + 18;
  } else {
    // Money matters through what it buys (ads, rallies); a small war-chest bonus remains.
    you = p.popularity + Math.sqrt(Math.max(0, p.funds)) * 0.5 + p.loyalty * 0.15 + incumbency;
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

function makeCampaign(g: GameState, p: Player, office: OfficeId, incumbent: boolean, rng: Rng): Campaign {
  const c: Campaign = { office, monthsLeft: CAMPAIGN_MONTHS, rival: newRival(rng, incumbent ? 15 + p.popularity * 0.65 + (100 - p.city!.happiness) * 0.3 : 21), poll: 50, incumbent };
  return { ...c, poll: pollShare(g, p, c, rng) };
}

export function startCareer(g: GameState, name: string, countryId: string, rng: Rng): GameState {
  const sys = SYSTEMS[g.countries[countryId].systemId];
  const city = newCity(pick(CITY_NAMES, rng), rng);
  const player: Player = {
    name, countryId, office: null, popularity: 12, funds: 50, age: 30, loyalty: 20, actionsLeft: ACTIONS_PER_MONTH,
    campaign: null, city, termMonthsLeft: 0, pendingEvent: null, record: { won: 0, lost: 0 },
  };
  player.campaign = makeCampaign(g, player, sys.ladder[0], false, rng);
  const verb = sys.advancement === 'election' ? 'announces a run' : sys.advancement === 'shares' ? 'seeks a board seat' : 'seeks party nomination';
  return log({ ...g, player }, `${name} ${verb} for ${OFFICE_NAMES[sys.ladder[0]]} of ${city.name}, ${g.countries[countryId].name}. Opponent: ${player.campaign.rival.name} (${player.campaign.rival.party}).`);
}

/** Start a fresh campaign after a loss. */
export function runAgain(g: GameState, rng: Rng): GameState {
  const p = g.player!;
  if (p.campaign || p.office) return g;
  const office = SYSTEMS[g.countries[p.countryId].systemId].ladder[0];
  const player = { ...p, campaign: makeCampaign(g, p, office, false, rng) };
  return log({ ...g, player }, `${p.name} launches a comeback bid against ${player.campaign.rival.name}.`);
}

export function applyEffects(p: Player, e: Effects): Player {
  const city: City | null = p.city ? {
    ...p.city,
    treasury: p.city.treasury + (e.treasury ?? 0),
    crime: clamp(p.city.crime + (e.crime ?? 0), 0, 100),
    services: clamp(p.city.services + (e.services ?? 0), 0, 100),
    jobs: clamp(p.city.jobs + (e.jobs ?? 0), 0, 100),
    happiness: clamp(p.city.happiness + (e.happiness ?? 0), 0, 100),
    culture: clamp(p.city.culture + (e.culture ?? 0), 0, 100),
  } : null;
  return {
    ...p, city,
    popularity: clamp(p.popularity + (e.popularity ?? 0), 0, 100),
    funds: Math.max(0, p.funds + (e.funds ?? 0)),
    loyalty: clamp(p.loyalty + (e.loyalty ?? 0), 0, 100),
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
    case 'fundraise': e = { funds: r(15, 30), popularity: -r(0, 1) }; msg = 'hosts a fundraising dinner'; break;
    case 'ads': e = { ...e, popularity: dim(p.popularity, 3, 6) }; msg = 'launches an ad blitz'; break;
    case 'door-knock': e = { popularity: dim(p.popularity, 1, 2) }; msg = 'knocks on doors all weekend'; break;
    case 'party-work': e = { loyalty: dim(p.loyalty, 3, 6) }; msg = 'works the party machine'; break;
    case 'buy-shares': e = { ...e, loyalty: dim(p.loyalty, 5, 9) }; msg = 'quietly buys voting shares'; break;
    case 'town-hall': e = { happiness: r(1, 3), popularity: r(1, 3) }; msg = 'holds a town hall'; break;
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
  return log({ ...g, player: { ...applyEffects(p, choice.effects), pendingEvent: null } }, `${ev.title}: ${choice.log}`);
}

function resolveElection(g: GameState, rng: Rng): GameState {
  const p = g.player!;
  const c = p.campaign!;
  const sys = SYSTEMS[g.countries[p.countryId].systemId];
  const share = pollShare(g, p, c, rng, 3);
  const won = share >= 50;
  const office = OFFICE_NAMES[c.office];
  const how = sys.advancement === 'election' ? `${share.toFixed(1)}% of the vote` : sys.advancement === 'shares' ? `${share.toFixed(1)}% of shareholder votes` : 'the party committee\'s decision';
  if (won) {
    const player: Player = {
      ...p, office: c.office, campaign: null, termMonthsLeft: sys.termYears * 12,
      record: { ...p.record, won: p.record.won + 1 }, popularity: clamp(p.popularity + 5, 0, 100),
    };
    return log({ ...g, player }, `${p.name} ${c.incumbent ? 'is re-elected' : 'becomes'} ${office} of ${p.city!.name} with ${how}.`);
  }
  const player: Player = { ...p, office: null, campaign: null, termMonthsLeft: 0, record: { ...p.record, lost: p.record.lost + 1 } };
  return log({ ...g, player }, `${p.name} loses to ${c.rival.name} (${how}).`);
}

/** Player-side monthly update; runs after the world tick. */
export function tickPlayer(g: GameState, rng: Rng): GameState {
  let p = g.player;
  if (!p) return g;
  const country = g.countries[p.countryId];
  p = { ...p, actionsLeft: ACTIONS_PER_MONTH, age: g.month === 1 ? p.age + 1 : p.age };

  if (p.office && p.city) {
    const city = tickCity(p.city, country, rng);
    p = { ...p, city, popularity: clamp(p.popularity + (city.happiness - p.popularity) * 0.08, 0, 100), termMonthsLeft: p.termMonthsLeft - 1 };
  } else {
    p = { ...p, popularity: clamp(p.popularity - 0.3, 0, 100) };
  }
  let next: GameState = { ...g, player: p };

  if (p.campaign) {
    const rival = { ...p.campaign.rival, popularity: clamp(p.campaign.rival.popularity + rng() * 2.5, 0, 95), funds: p.campaign.rival.funds + Math.round(rng() * 15) };
    const campaign = { ...p.campaign, rival, monthsLeft: p.campaign.monthsLeft - 1 };
    p = { ...p, campaign: { ...campaign, poll: pollShare(next, p, campaign, rng) } };
    next = { ...next, player: p };
    if (campaign.monthsLeft <= 0) next = resolveElection(next, rng);
  } else if (p.office && p.termMonthsLeft <= CAMPAIGN_MONTHS) {
    p = { ...p, campaign: makeCampaign(next, p, p.office, true, rng) };
    next = log({ ...next, player: p }, `Re-election season: ${p.campaign!.rival.name} (${p.campaign!.rival.party}) challenges ${p.name}.`);
  }

  p = next.player!;
  if (p.office && !p.pendingEvent && rng() < 0.35) {
    next = { ...next, player: { ...p, pendingEvent: pick(CITY_EVENTS, rng) } };
  }
  return next;
}
