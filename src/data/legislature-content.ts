import type { GroupId, OfficeId, PendingEvent } from '../sim/types';

export type CommitteeId = 'finance' | 'health' | 'education' | 'infrastructure' | 'security';

export const COMMITTEES: Record<CommitteeId, { name: string; perk: string }> = {
  finance: { name: 'Finance', perk: 'Lobbyists pay more when you fundraise.' },
  health: { name: 'Health', perk: 'Health bills you sponsor clear committee.' },
  education: { name: 'Education', perk: 'Education bills you sponsor clear committee.' },
  infrastructure: { name: 'Infrastructure', perk: 'District funding requests cost less influence.' },
  security: { name: 'Public Safety', perk: 'Safety bills you sponsor clear committee.' },
};

/** The chamber each legislative office sits in. */
export const CHAMBERS: Partial<Record<OfficeId, { name: string; seats: number; district: string }>> = {
  'state-legislator': { name: 'State Assembly', seats: 80, district: 'Assembly District' },
  legislator: { name: 'National Assembly', seats: 300, district: 'Congressional District' },
  senator: { name: 'Senate', seats: 100, district: 'State' },
  'cantonal-councillor': { name: 'Cantonal Council', seats: 60, district: 'Canton ward' },
  'federal-councillor': { name: 'Federal Assembly', seats: 200, district: 'Canton' },
  'board-member': { name: 'Board of Directors', seats: 15, district: 'Shareholder bloc' },
};

export interface FloorBillDef {
  id: string; title: string; text: string;
  /** How your district reacts if you vote yes (a no vote gives roughly the opposite, halved). */
  groups: Partial<Record<GroupId, number>>;
  /** Chance your party leadership wants a yes. */
  partyYes: number;
}

export const FLOOR_BILLS: FloorBillDef[] = [
  { id: 'budget', title: 'Annual Budget', text: 'The yearly spending plan. A no vote risks a shutdown.', groups: { workers: 2, business: 2 }, partyYes: 0.9 },
  { id: 'minwage', title: 'Minimum Wage Increase', text: 'Raise the minimum wage by 10% over two years.', groups: { workers: 8, students: 4, business: -8 }, partyYes: 0.5 },
  { id: 'taxcut', title: 'Income Tax Cut', text: 'Cut income taxes for every bracket.', groups: { business: 8, retirees: 3, students: -4, workers: -2 }, partyYes: 0.5 },
  { id: 'pension', title: 'Pension Reform', text: 'Raise the retirement age by two years to save money.', groups: { retirees: -10, business: 5, students: 2 }, partyYes: 0.4 },
  { id: 'tuition', title: 'Free Tuition Act', text: 'Free public university tuition.', groups: { students: 10, workers: 3, business: -5 }, partyYes: 0.45 },
  { id: 'police', title: 'Police Funding Boost', text: 'More money for police and courts.', groups: { retirees: 7, business: 3, students: -5 }, partyYes: 0.55 },
  { id: 'climate', title: 'Climate Action Bill', text: 'Carbon tax with rebates to households.', groups: { students: 9, business: -7, workers: -2 }, partyYes: 0.45 },
  { id: 'infra', title: 'Infrastructure Package', text: 'Roads, rail and bridges across the country.', groups: { workers: 6, business: 4 }, partyYes: 0.7 },
  { id: 'privacy', title: 'Data Privacy Act', text: 'Limits what tech companies can collect.', groups: { students: 5, business: -4 }, partyYes: 0.55 },
  { id: 'healthcare', title: 'Public Health Option', text: 'A government health plan anyone can buy.', groups: { workers: 7, retirees: 5, business: -7 }, partyYes: 0.45 },
  { id: 'immigration', title: 'Work Visa Expansion', text: 'More visas for farm and tech workers.', groups: { business: 7, workers: -5, students: 2 }, partyYes: 0.5 },
  { id: 'ethics', title: 'Lobbying Ban', text: 'Bans gifts from lobbyists to lawmakers.', groups: { students: 4, workers: 3 }, partyYes: 0.35 },
];

export interface SponsorBillDef {
  id: string; name: string; blurb: string; committee: CommitteeId;
  /** District reaction when it becomes law. */
  groups: Partial<Record<GroupId, number>>;
  /** How hard it is to pass the floor: 0 easy, 1 hard. */
  difficulty: number;
}

export const SPONSOR_BILLS: SponsorBillDef[] = [
  { id: 's-clinics', name: 'Rural Clinics Act', blurb: 'Funds 200 new clinics in small towns.', committee: 'health', groups: { retirees: 8, workers: 5 }, difficulty: 0.3 },
  { id: 's-insulin', name: 'Insulin Price Cap', blurb: 'Caps insulin at $35 a month.', committee: 'health', groups: { retirees: 8, workers: 4, business: -2 }, difficulty: 0.4 },
  { id: 's-schools', name: 'School Repair Fund', blurb: 'Fixes leaking roofs and broken heating in schools.', committee: 'education', groups: { workers: 4, students: 6 }, difficulty: 0.2 },
  { id: 's-loans', name: 'Student Loan Relief', blurb: 'Forgives part of every student loan.', committee: 'education', groups: { students: 12, business: -4 }, difficulty: 0.6 },
  { id: 's-bridge', name: 'Bridge Safety Act', blurb: 'Inspects and repairs every old bridge.', committee: 'infrastructure', groups: { workers: 5, business: 3 }, difficulty: 0.2 },
  { id: 's-broadband', name: 'Broadband for All', blurb: 'Fast internet in every home by 2030.', committee: 'infrastructure', groups: { students: 6, workers: 4, business: 2 }, difficulty: 0.4 },
  { id: 's-firstresp', name: 'First Responders Pay Act', blurb: 'Raises pay for firefighters and paramedics.', committee: 'security', groups: { retirees: 5, workers: 4 }, difficulty: 0.3 },
  { id: 's-smallbiz', name: 'Small Business Loans', blurb: 'Low-interest loans for firms under 20 staff.', committee: 'finance', groups: { business: 9, workers: 2 }, difficulty: 0.3 },
];

export const LEGISLATIVE_EVENTS: PendingEvent[] = [
  { id: 'l-lobby', title: 'Lobbyist Dinner', text: 'A pharmaceutical lobbyist offers to host a fundraiser for you.', choices: [
    { label: 'Accept (+$60k funds)', effects: { funds: 60, popularity: -3, groups: { workers: -2 } }, log: 'A lobbyist-hosted fundraiser draws headlines.' },
    { label: 'Decline', effects: { popularity: 1 }, log: 'The lawmaker turns down a lobbyist fundraiser.' },
  ] },
  { id: 'l-flip', title: 'Leadership Calls', text: 'Party leaders want your vote on a deal you dislike. They promise a favor later.', choices: [
    { label: 'Go along with them', effects: { loyalty: 8, popularity: -2 }, log: 'The lawmaker falls in line with party leaders.' },
    { label: 'Refuse', effects: { loyalty: -8, popularity: 3 }, log: 'The lawmaker bucks party leadership.' },
  ] },
  { id: 'l-hearing', title: 'Viral Hearing', text: 'You grill a CEO in a hearing. The clip is everywhere.', choices: [
    { label: 'Go on every talk show', effects: { popularity: 6, loyalty: -2 }, log: 'The lawmaker becomes a cable news regular.' },
    { label: 'Stay focused on work', effects: { popularity: 2, loyalty: 2 }, log: 'The lawmaker lets the clip speak for itself.' },
  ] },
  { id: 'l-shutdown', title: 'Shutdown Threat', text: 'The budget is stalled. Government offices close in a week unless a deal is struck.', choices: [
    { label: 'Broker a deal across the aisle', effects: { popularity: 4, loyalty: -3 }, log: 'The lawmaker helps end the standoff.' },
    { label: 'Hold the party line', effects: { loyalty: 5, popularity: -3, groups: { workers: -3 } }, log: 'The shutdown lasts nine days.' },
  ] },
  { id: 'l-scandal', title: 'Expense Scandal', text: 'Reporters find your office spent $8,000 on a staff retreat.', choices: [
    { label: 'Pay it back and apologize', effects: { funds: -10, popularity: -2 }, log: 'The lawmaker repays the retreat costs.' },
    { label: 'Defend it as team-building', effects: { popularity: -6 }, log: 'The retreat story runs for a week.' },
  ] },
  { id: 'l-factory', title: 'Plant in Your District', text: 'A company will build a plant in your district if you back their tax credit.', choices: [
    { label: 'Back the credit', effects: { groups: { workers: 6, business: 5, students: -3 }, popularity: 2 }, log: 'A new plant is announced in the district.' },
    { label: 'Stay neutral', effects: { groups: { workers: -2 } }, log: 'The company picks another district.' },
  ] },
];
