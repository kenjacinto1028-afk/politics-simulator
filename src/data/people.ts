import type { FaithId, FocusId, SystemId, TraitId } from '../sim/types';

export const TRAITS: Record<TraitId, { name: string; blurb: string }> = {
  hawk: { name: 'Hawk', blurb: 'Talks tough abroad. Picks fights with rivals.' },
  dove: { name: 'Peacemaker', blurb: 'Prefers deals and summits to threats.' },
  populist: { name: 'Populist', blurb: 'Plays to the crowd. Wants loud public support.' },
  technocrat: { name: 'Technocrat', blurb: 'Judges people by results and numbers.' },
  pious: { name: 'Devout', blurb: 'Faith comes first. Close to religious leaders.' },
  secular: { name: 'Secular', blurb: 'Keeps religion out of politics.' },
  vain: { name: 'Vain', blurb: 'Hates being outshone by anyone.' },
  generous: { name: 'Loyal patron', blurb: 'Rewards people who stand by them.' },
  corrupt: { name: 'Corrupt', blurb: 'Every favor has a price.' },
  reformer: { name: 'Reformer', blurb: 'Wants big changes, fast.' },
  cautious: { name: 'Cautious', blurb: 'Slow to trust, slow to act.' },
  charismatic: { name: 'Charismatic', blurb: 'People like them instantly.' },
};

/** Traits that can't sit together on one person. */
export const OPPOSED: [TraitId, TraitId][] = [['hawk', 'dove'], ['pious', 'secular'], ['reformer', 'cautious'], ['populist', 'technocrat']];

export const FOCUSES: Record<FocusId, { name: string; portfolio: string }> = {
  economy: { name: 'Economy', portfolio: 'economy' },
  security: { name: 'Security', portfolio: 'interior' },
  welfare: { name: 'Welfare', portfolio: 'health' },
  faith: { name: 'Faith and family', portfolio: 'education' },
  diplomacy: { name: 'Diplomacy', portfolio: 'foreign' },
  environment: { name: 'Environment', portfolio: 'finance' },
};

export const FAITHS: Record<FaithId, { name: string; leader: string; fantasy?: boolean }> = {
  christian: { name: 'Christianity', leader: 'Bishop' },
  muslim: { name: 'Islam', leader: 'Grand Mufti' },
  hindu: { name: 'Hinduism', leader: 'Swami' },
  buddhist: { name: 'Buddhism', leader: 'Abbot' },
  jewish: { name: 'Judaism', leader: 'Chief Rabbi' },
  folk: { name: 'Folk traditions', leader: 'Elder' },
  secular: { name: 'No religion', leader: 'Humanist chair' },
  flame: { name: 'Order of the Flame', leader: 'High Keeper', fantasy: true },
  tide: { name: 'Church of the Tide Mother', leader: 'Tide Speaker', fantasy: true },
  ledger: { name: 'The Ledger', leader: 'Grand Auditor', fantasy: true },
};

/** Main faith and religiosity (0..100: how much faith shapes politics). Approximate. */
export const COUNTRY_FAITH: Record<string, [FaithId, number]> = {
  usa: ['christian', 55], chn: ['secular', 10], deu: ['christian', 25], fra: ['christian', 15], gbr: ['christian', 20],
  phl: ['christian', 85], che: ['christian', 25], aurex: ['ledger', 40], eldmar: ['flame', 65], tarvos: ['flame', 50],
  jpn: ['buddhist', 15], ind: ['hindu', 80], bra: ['christian', 70], rus: ['christian', 45], kor: ['christian', 35],
  mex: ['christian', 70], can: ['christian', 25], ita: ['christian', 50], esp: ['christian', 35], aus: ['christian', 20],
  idn: ['muslim', 85], tur: ['muslim', 65], nga: ['muslim', 85], arg: ['christian', 55], myrr: ['tide', 60],
  zaf: ['christian', 70], egy: ['muslim', 85], vnm: ['secular', 20], pol: ['christian', 65], nld: ['secular', 15],
  swe: ['secular', 10], ukr: ['christian', 55], col: ['christian', 70], halvane: ['ledger', 35], vorlund: ['secular', 15],
  chl: ['christian', 45], per: ['christian', 70], tha: ['buddhist', 80], mys: ['muslim', 80], pak: ['muslim', 95],
  bgd: ['muslim', 90], ken: ['christian', 80], eth: ['christian', 85], nor: ['secular', 15], grc: ['christian', 65],
  prt: ['christian', 45], isr: ['jewish', 60], nzl: ['secular', 15], cub: ['secular', 25], duskmoor: ['tide', 45],
};

/** Each system's signature meter and its special actions. */
export const SYSTEM_RULES: Record<SystemId, { meter: string; meterBlurb: string; rule: string }> = {
  presidential: { meter: 'Political capital', meterBlurb: 'Spent on executive orders. Grows when you are popular.', rule: 'In office you can issue an executive order: enact a law without the council or legislature. Courts may strike it down within 6 months.' },
  parliamentary: { meter: 'Coalition', meterBlurb: 'Your coalition partner\'s patience. Each law you pass tests it.', rule: 'Your party needs a coalition partner. Keep them happy: a strong coalition helps you win higher office, and if it collapses while you lead, the government falls and a snap election is called.' },
  'semi-presidential': { meter: 'Public patience', meterBlurb: 'How much reform people will take before they strike.', rule: 'Every reform drains public patience. Let it run out and a general strike shuts the country down. At the top you may have to share power with a rival (cohabitation).' },
  'constitutional-monarchy': { meter: 'Royal favor', meterBlurb: 'The crown\'s goodwill. Helps in every election.', rule: 'The monarch has no real power, but royal favor sways voters. Earn enough and you are knighted.' },
  'one-party': { meter: 'Patron favor', meterBlurb: 'How much your patron in the party values you.', rule: 'Careers are made by patrons. Pick a senior figure to back you. Anti-corruption purges come every few years: with a weak patron or weak loyalty, you can be purged.' },
  federal: { meter: 'Ties to the capital', meterBlurb: 'Brings federal grants. Defying the capital wins local fans.', rule: 'Strong states and cities. Good ties to the capital bring a monthly federal grant. Defying the capital is popular at home but costs ties. At the top, governors can stall your laws.' },
  'direct-democracy': { meter: 'Citizen trust', meterBlurb: 'Higher trust means citizens back your referendums.', rule: 'Citizens can challenge any law you pass with a referendum. You can also call a referendum yourself to pass a law with no council or legislature vote.' },
  'corporate-state': { meter: 'Share value', meterBlurb: 'Rises with results. Pays you dividends every month.', rule: 'Your office is a business unit. Good results lift the share value, which pays you dividends. If it crashes, a hostile takeover can remove you.' },
};

