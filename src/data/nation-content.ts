import type { GroupId, PendingEvent } from '../sim/types';

export type NationalPriority = 'defense' | 'welfare' | 'health' | 'education' | 'infrastructure';

export const PRIORITY_LABEL: Record<NationalPriority, string> = {
  defense: 'Defense', welfare: 'Welfare', health: 'Health care', education: 'Education', infrastructure: 'Infrastructure',
};

/** Lasting shifts to where the national economy settles while a law is active. */
export interface NationalTargets { growth?: number; unemployment?: number; inflation?: number; stability?: number; spending?: number }

export interface NationalLawDef { id: string; name: string; blurb: string; targets: NationalTargets; groups: Partial<Record<GroupId, number>> }

export const NATIONAL_LAWS: NationalLawDef[] = [
  { id: 'n-health', name: 'Universal Health Care', blurb: 'Everyone is covered by a public plan.', targets: { stability: 4, spending: 3 }, groups: { workers: 10, retirees: 8, business: -8 } },
  { id: 'n-corptax', name: 'Corporate Tax Reform', blurb: 'Lower rates, fewer loopholes.', targets: { growth: 0.4 }, groups: { business: 10, workers: -4, students: -2 } },
  { id: 'n-green', name: 'Green Investment Plan', blurb: 'Wind, solar and rail across the country.', targets: { growth: 0.2, unemployment: -0.3, spending: 2 }, groups: { students: 10, workers: 3, business: -4 } },
  { id: 'n-military', name: 'Military Expansion', blurb: 'Bigger army, navy and air force.', targets: { stability: 3, spending: 2 }, groups: { retirees: 6, business: 2, students: -6 } },
  { id: 'n-pension', name: 'Pension Reform', blurb: 'Retirement age rises by two years.', targets: { spending: -2 }, groups: { retirees: -12, business: 6, students: 2 } },
  { id: 'n-anticorrupt', name: 'Anti-Corruption Commission', blurb: 'An independent watchdog with real teeth.', targets: { stability: 3, growth: 0.1 }, groups: { students: 6, workers: 4, business: -2 } },
  { id: 'n-minwage', name: 'National Minimum Wage Rise', blurb: 'Up 20% over three years.', targets: { unemployment: 0.3, inflation: 0.2 }, groups: { workers: 12, students: 5, business: -10 } },
  { id: 'n-housing', name: 'National Housing Program', blurb: 'A million affordable homes.', targets: { unemployment: -0.3, spending: 2 }, groups: { workers: 8, students: 8, business: 2 } },
];

/** National crises. A negative `treasury` here is $ billions of new public spending, which adds to the national debt. */
export const NATIONAL_EVENTS: PendingEvent[] = [
  { id: 'n-recession', title: 'Recession Warning', text: 'Economists say a recession is coming within the year.', choices: [
    { label: 'Stimulus package (adds to debt)', effects: { treasury: -40, popularity: 3, groups: { workers: 5, business: 3 } }, log: 'A stimulus package is rushed through.' },
    { label: 'Tighten the belt', effects: { popularity: -4, groups: { business: 3, workers: -5 } }, log: 'The government holds spending flat.' },
  ] },
  { id: 'n-pandemic', title: 'Flu Outbreak', text: 'A dangerous flu strain is spreading fast.', choices: [
    { label: 'Free vaccines and sick pay (adds to debt)', effects: { treasury: -25, popularity: 4, groups: { retirees: 8, workers: 4 } }, log: 'The outbreak is contained quickly.' },
    { label: 'Keep everything open', effects: { popularity: -6, groups: { retirees: -8, business: 4 } }, log: 'Hospitals fill up. Business stays open.' },
  ] },
  { id: 'n-protests', title: 'Mass Protests', text: 'Hundreds of thousands march against the cost of living.', choices: [
    { label: 'Meet the organizers', effects: { popularity: 2, loyalty: -3, groups: { workers: 5, students: 5 } }, log: 'The leader meets protest organizers.' },
    { label: 'Send in riot police', effects: { popularity: -6, loyalty: 3, groups: { retirees: 3, students: -10 } }, log: 'Clashes with police make world news.' },
  ] },
  { id: 'n-quake', title: 'Earthquake', text: 'A major earthquake hits a populated region.', choices: [
    { label: 'Full national response (adds to debt)', effects: { treasury: -30, popularity: 6, groups: { workers: 3, retirees: 4 } }, log: 'Rescue teams arrive within hours.' },
    { label: 'Let the region handle it', effects: { popularity: -8 }, log: 'The slow response is widely criticized.' },
  ] },
  { id: 'n-cyber', title: 'Cyberattack', text: 'Hackers knock out the national tax website and leak data.', choices: [
    { label: 'Blame a foreign power publicly', effects: { popularity: 3, groups: { retirees: 3, students: -2 } }, log: 'The leader points the finger abroad.' },
    { label: 'Quietly fix it and invest in security (adds to debt)', effects: { treasury: -8, groups: { business: 3 } }, log: 'A new cyber defense agency is created.' },
  ] },
  { id: 'n-scandal', title: 'Cabinet Scandal', text: 'Your interior minister is caught taking bribes.', choices: [
    { label: 'Fire them today', effects: { popularity: 2, loyalty: -4 }, log: 'The minister is fired within the hour.' },
    { label: 'Stand by them', effects: { popularity: -7, loyalty: 4 }, log: 'The scandal dominates the news for weeks.' },
  ] },
  { id: 'n-currency', title: 'Currency Slide', text: 'Your currency falls 10% in a week. Prices are rising.', choices: [
    { label: 'Raise interest rates', effects: { popularity: -3, groups: { retirees: 4, business: -4, workers: -2 } }, log: 'The central bank hikes rates.' },
    { label: 'Wait it out', effects: { popularity: -2, groups: { retirees: -4 } }, log: 'Prices keep climbing.' },
  ] },
  { id: 'n-olympics', title: 'Olympic Bid', text: 'Your capital can bid to host the Olympics.', choices: [
    { label: 'Bid (adds to debt)', effects: { treasury: -15, popularity: 4, groups: { business: 5, students: 3 } }, log: 'The country launches an Olympic bid.' },
    { label: 'Pass', effects: { groups: { workers: 1 } }, log: 'The government passes on the Olympics.' },
  ] },
];

export const LEADER_FIRST = ['Adrian', 'Beatriz', 'Chen', 'Darius', 'Esther', 'Farid', 'Greta', 'Hiro', 'Imani', 'Jonas', 'Katya', 'Leon', 'Marisol', 'Nikolai', 'Olu', 'Paz'];
export const LEADER_LAST = ['Arden', 'Baptiste', 'Castellan', 'Dragan', 'Eriksen', 'Fontaine', 'Gallo', 'Hartmann', 'Iwu', 'Jovanovic', 'Kowal', 'Lund', 'Marchetti', 'Nakamura', 'Okafor', 'Petrov'];
