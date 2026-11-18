import type { GroupId, PendingEvent } from '../sim/types';

export type StateStat = 'education' | 'health' | 'infrastructure' | 'safety' | 'economy';
export type StatePriority = 'schools' | 'hospitals' | 'roads' | 'police' | 'development';

export const PRIORITY_STAT: Record<StatePriority, StateStat> = {
  schools: 'education', hospitals: 'health', roads: 'infrastructure', police: 'safety', development: 'economy',
};
export const STAT_LABEL: Record<StateStat, string> = {
  education: 'Education', health: 'Health care', infrastructure: 'Infrastructure', safety: 'Public safety', economy: 'Economy',
};

export const STATE_NAMES = ['Northmark', 'Silver Coast', 'High Plains', 'Lakeshire', 'Redwood Valley', 'Eastbrook', 'Sunreach', 'Granite Hills'];
export const STATE_CITY_NAMES = ['Fairhaven', 'Coldwater', 'Brightmoor', 'Pine Hollow', 'Mercer', 'Dunmore', 'Oakridge', 'Salt Creek', 'Harlow', 'Westfield'];

interface Shift { stats?: Partial<Record<StateStat, number>>; groups?: Partial<Record<GroupId, number>>; revenue?: number }

export interface StateLawDef extends Shift { id: string; name: string; blurb: string }

/** Laws the Governor can push through the legislature. Effects last while active. */
export const STATE_LAWS: StateLawDef[] = [
  { id: 'minwage', name: 'Raise the Minimum Wage', blurb: 'State minimum wage up 15%.', stats: { economy: -3 }, groups: { workers: 14, students: 6, business: -14 } },
  { id: 'taxcut', name: 'State Income Tax Cut', blurb: 'Cuts every bracket by one point.', stats: { economy: 5 }, groups: { business: 12, retirees: 4, students: -4 }, revenue: -0.12 },
  { id: 'prek', name: 'Free Pre-School', blurb: 'Free pre-school for every 4-year-old.', stats: { education: 7 }, groups: { workers: 8, students: 4, business: -4 }, revenue: -0.06 },
  { id: 'statepolice', name: 'Expand State Police', blurb: '2,000 new troopers on the roads.', stats: { safety: 8 }, groups: { retirees: 10, business: 4, students: -8 }, revenue: -0.05 },
  { id: 'greenenergy', name: 'Clean Energy Mandate', blurb: 'Half of state power from renewables by 2035.', stats: { economy: -2, health: 3 }, groups: { students: 12, business: -8, workers: -3 } },
  { id: 'medicaid', name: 'Expand Public Health Coverage', blurb: 'Covers 400,000 more residents.', stats: { health: 8 }, groups: { workers: 10, retirees: 6, business: -8 }, revenue: -0.08 },
];

export interface BillDef { id: string; title: string; text: string; sign: Shift; veto: Shift }

/** Bills the legislature sends to the Governor's desk. Vetoing also costs goodwill with the legislature. */
export const BILLS: BillDef[] = [
  { id: 'highway', title: 'Highway Expansion Bill', text: 'Widen the main interstate. Construction firms love it; nearby towns hate the noise.', sign: { stats: { infrastructure: 5 }, groups: { business: 6, workers: 3, students: -4 }, revenue: -0.03 }, veto: { groups: { students: 3, business: -4 } } },
  { id: 'teachers', title: 'Teacher Pay Raise', text: 'A 6% raise for public school teachers.', sign: { stats: { education: 5 }, groups: { workers: 6, students: 6, business: -3 }, revenue: -0.04 }, veto: { groups: { workers: -6, students: -5 } } },
  { id: 'casino', title: 'Casino Legalization', text: 'Allow three resort casinos. Big tax revenue, unhappy churches.', sign: { stats: { economy: 3, safety: -2 }, groups: { business: 6, retirees: -6 }, revenue: 0.05 }, veto: { groups: { retirees: 4, business: -4 } } },
  { id: 'prison', title: 'Prison Reform Act', text: 'Shorter sentences for minor drug offenses.', sign: { stats: { safety: -2 }, groups: { students: 8, retirees: -6 }, revenue: 0.02 }, veto: { groups: { retirees: 4, students: -6 } } },
  { id: 'broadband', title: 'Rural Broadband Act', text: 'Fast internet for every small town.', sign: { stats: { economy: 3, education: 2 }, groups: { workers: 4, students: 4 }, revenue: -0.03 }, veto: { groups: { workers: -4, students: -3 } } },
  { id: 'corptax', title: 'Corporate Tax Holiday', text: 'Two years of no state tax for new factories.', sign: { stats: { economy: 6 }, groups: { business: 10, workers: 2, students: -6 }, revenue: -0.06 }, veto: { groups: { business: -8, students: 3 } } },
  { id: 'ethics', title: 'Ethics Reform Bill', text: 'Bans gifts from lobbyists to state officials.', sign: { groups: { students: 5, workers: 3, business: -4 } }, veto: { groups: { students: -6, workers: -4 } } },
  { id: 'water', title: 'Water Rights Bill', text: 'Gives farms priority over cities in droughts.', sign: { stats: { economy: 2, health: -2 }, groups: { business: 5, workers: -3 } }, veto: { groups: { business: -4, workers: 2 } } },
];

export const STATE_EVENTS: PendingEvent[] = [
  { id: 's-hurricane', title: 'Hurricane Landfall', text: 'A category 3 storm hits the coast. Thousands need shelter.', choices: [
    { label: 'Call in the National Guard (-$300k)', effects: { treasury: -300, popularity: 6, groups: { retirees: 5, workers: 4 } }, log: 'The Governor deploys the Guard within hours.' },
    { label: 'Ask the national government for aid', effects: { popularity: -5, groups: { retirees: -4 } }, log: 'Help is slow to arrive. Coastal towns are furious.' },
  ] },
  { id: 's-riot', title: 'Prison Riot', text: 'Inmates take over a wing of the state prison over conditions.', choices: [
    { label: 'Negotiate', effects: { popularity: -2, groups: { students: 4, retirees: -5 } }, log: 'Talks end the riot without bloodshed.' },
    { label: 'Send in the tactical team', effects: { popularity: 2, groups: { retirees: 6, students: -6 } }, log: 'The riot is ended by force.' },
  ] },
  { id: 's-teachers', title: 'Teachers Strike', text: 'Teachers in four cities walk out over class sizes.', choices: [
    { label: 'Fund smaller classes (-$200k)', effects: { treasury: -200, groups: { workers: 6, students: 6 } }, log: 'Schools reopen with more teachers.' },
    { label: 'Wait them out', effects: { popularity: -4, groups: { workers: -6, students: -4, business: 3 } }, log: 'The strike drags into its third week.' },
  ] },
  { id: 's-plant', title: 'Factory Closing', text: 'A car plant employing 6,000 announces it will close.', choices: [
    { label: 'Offer $250k in incentives to stay', effects: { treasury: -250, groups: { workers: 8, business: 3 } }, log: 'The plant agrees to stay for five more years.' },
    { label: 'Fund retraining instead (-$100k)', effects: { treasury: -100, groups: { workers: 2, students: 3 } }, log: 'The plant closes; retraining centers open.' },
  ] },
  { id: 's-fedcut', title: 'National Funding Cut', text: 'The national government cuts road money to your state by a third.', choices: [
    { label: 'Fill the gap from the state budget (-$200k)', effects: { treasury: -200, groups: { workers: 3 } }, log: 'The state covers the shortfall.' },
    { label: 'Publicly blast the capital', effects: { popularity: 3, loyalty: -5 }, log: 'The Governor\'s fiery speech goes viral.' },
  ] },
  { id: 's-probe', title: 'Corruption Probe', text: 'Prosecutors subpoena your former chief of staff over contracts.', choices: [
    { label: 'Cooperate fully', effects: { popularity: -2, groups: { students: 3 } }, log: 'The Governor pledges full cooperation.' },
    { label: 'Call it a political witch hunt', effects: { popularity: -5, loyalty: 4 }, log: 'The party rallies behind the Governor. Voters are less sure.' },
  ] },
  { id: 's-wildfire', title: 'Wildfire Season', text: 'Fires threaten three mountain towns.', choices: [
    { label: 'Evacuate and fund firefighters (-$150k)', effects: { treasury: -150, popularity: 4, groups: { retirees: 4 } }, log: 'Every town is evacuated safely.' },
    { label: 'Let local crews handle it', effects: { popularity: -4, groups: { retirees: -5 } }, log: 'One town loses 40 homes.' },
  ] },
  { id: 's-hq', title: 'Tech Headquarters Bid', text: 'A big tech company is choosing a new HQ. They want $300k in tax breaks.', choices: [
    { label: 'Make the offer', effects: { treasury: -300, groups: { students: 6, business: 6, workers: -2 } }, log: 'The company picks your state. 8,000 jobs promised.' },
    { label: 'Pass', effects: { groups: { workers: 2 } }, log: 'The HQ goes to a rival state.' },
  ] },
];
