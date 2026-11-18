import type { GroupId } from '../sim/types';

export type PortfolioId = 'finance' | 'health' | 'education' | 'interior' | 'foreign' | 'economy';

/** National numbers an initiative can nudge in your country. */
export interface NationalShift {
  growth?: number;        // GDP growth, percentage points
  unemployment?: number;  // percentage points
  inflation?: number;     // percentage points
  stability?: number;     // 0..100 points
  tourism?: number;       // 0..100 points
  culture?: number;       // 0..100 points
  relations?: number;     // added to every other country's relation with you
}

export interface InitiativeDef {
  id: string; name: string; blurb: string;
  /** Share of the ministry's annual budget it costs. */
  costShare: number;
  months: number;
  national: NationalShift;
  groups: Partial<Record<GroupId, number>>;
}

export const PORTFOLIOS: Record<PortfolioId, { name: string; initiatives: InitiativeDef[] }> = {
  finance: { name: 'Finance', initiatives: [
    { id: 'f-simplify', name: 'Simpler Tax Forms', blurb: 'A one-page tax return for most families.', costShare: 0.15, months: 4, national: { growth: 0.2 }, groups: { workers: 4, business: 4 } },
    { id: 'f-audit', name: 'Crack Down on Tax Evasion', blurb: 'More auditors for big companies and the rich.', costShare: 0.2, months: 6, national: { inflation: -0.3, stability: 2 }, groups: { workers: 6, business: -6 } },
    { id: 'f-bonds', name: 'Infrastructure Bonds', blurb: 'Borrow cheaply now to build roads and rail.', costShare: 0.3, months: 8, national: { growth: 0.4, unemployment: -0.4 }, groups: { workers: 5, business: 4 } },
  ] },
  health: { name: 'Health', initiatives: [
    { id: 'h-waits', name: 'Cut Hospital Wait Times', blurb: 'Extra staff and evening clinics.', costShare: 0.25, months: 6, national: { stability: 3 }, groups: { retirees: 8, workers: 4 } },
    { id: 'h-vaccines', name: 'National Vaccine Drive', blurb: 'Free shots at every pharmacy.', costShare: 0.15, months: 4, national: { stability: 2 }, groups: { retirees: 5, students: 3 } },
    { id: 'h-mental', name: 'Mental Health Hotline', blurb: '24-hour support, free for everyone.', costShare: 0.1, months: 3, national: { stability: 1 }, groups: { students: 7, workers: 3 } },
  ] },
  education: { name: 'Education', initiatives: [
    { id: 'e-teachers', name: 'Train 50,000 Teachers', blurb: 'Smaller classes in every school.', costShare: 0.25, months: 8, national: { growth: 0.2, culture: 2 }, groups: { workers: 4, students: 6 } },
    { id: 'e-coding', name: 'Coding in Every School', blurb: 'Computer science from age 10.', costShare: 0.15, months: 5, national: { growth: 0.2 }, groups: { students: 8, business: 3 } },
    { id: 'e-lunch', name: 'Free School Lunches', blurb: 'Hot meals for every child.', costShare: 0.2, months: 4, national: { stability: 2 }, groups: { workers: 7, business: -2 } },
  ] },
  interior: { name: 'Interior & Security', initiatives: [
    { id: 'i-police', name: 'Community Policing', blurb: 'Officers walk the same streets every day.', costShare: 0.2, months: 6, national: { stability: 4 }, groups: { retirees: 6, students: 2 } },
    { id: 'i-border', name: 'Border Modernization', blurb: 'Faster checkpoints and better screening.', costShare: 0.25, months: 7, national: { stability: 2, tourism: 3 }, groups: { retirees: 4, business: 3, students: -2 } },
    { id: 'i-disaster', name: 'Disaster Readiness', blurb: 'Stockpiles and drills in every region.', costShare: 0.15, months: 5, national: { stability: 3 }, groups: { retirees: 4, workers: 3 } },
  ] },
  foreign: { name: 'Foreign Affairs', initiatives: [
    { id: 'o-summit', name: 'Host a Regional Summit', blurb: 'Leaders from across the region come to you.', costShare: 0.2, months: 4, national: { relations: 8, tourism: 2 }, groups: { business: 4 } },
    { id: 'o-aid', name: 'Foreign Aid Program', blurb: 'Clean water projects abroad.', costShare: 0.25, months: 6, national: { relations: 10, culture: 2 }, groups: { students: 4, workers: -3 } },
    { id: 'o-visa', name: 'Visa-Free Travel Deals', blurb: 'Easier travel with neighbors.', costShare: 0.1, months: 4, national: { relations: 5, tourism: 5 }, groups: { students: 5, business: 3, retirees: -2 } },
  ] },
  economy: { name: 'Economy & Trade', initiatives: [
    { id: 'c-export', name: 'Export Push', blurb: 'Trade missions for small manufacturers.', costShare: 0.15, months: 5, national: { growth: 0.3, unemployment: -0.3 }, groups: { business: 6, workers: 3 } },
    { id: 'c-startup', name: 'Startup Visa and Grants', blurb: 'Seed money for new companies.', costShare: 0.2, months: 6, national: { growth: 0.3 }, groups: { students: 6, business: 5 } },
    { id: 'c-tourism', name: 'Tourism Campaign', blurb: 'Ads abroad for your country\'s best places.', costShare: 0.15, months: 4, national: { tourism: 6, growth: 0.1 }, groups: { business: 5 } },
  ] },
};

export interface CabinetAskDef { id: string; title: string; text: string; groups: Partial<Record<GroupId, number>> }

/** The leader asks you to publicly back a policy. Backing it pleases the leader; refusing pleases some voters. */
export const CABINET_ASKS: CabinetAskDef[] = [
  { id: 'a-austerity', title: 'Spending Cuts', text: 'The leader wants every ministry to cut 5%. Will you defend it on TV?', groups: { business: 4, workers: -5, retirees: -3 } },
  { id: 'a-tariffs', title: 'New Tariffs', text: 'The leader plans tariffs on imported goods and wants your public support.', groups: { workers: 4, business: -5 } },
  { id: 'a-surveillance', title: 'Surveillance Law', text: 'A bill lets police read private messages with a judge\'s approval.', groups: { retirees: 4, students: -7 } },
  { id: 'a-pension', title: 'Pension Freeze', text: 'Pensions won\'t rise with prices this year.', groups: { retirees: -8, business: 3 } },
  { id: 'a-stimulus', title: 'Stimulus Checks', text: 'Every adult gets a one-time payment.', groups: { workers: 6, students: 4, business: -3 } },
  { id: 'a-scandal', title: 'Defend a Colleague', text: 'A fellow minister is in a bribery scandal. The leader wants you to defend them.', groups: { students: -4, workers: -3 } },
];
