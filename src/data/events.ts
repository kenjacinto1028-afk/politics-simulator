import type { PendingEvent } from '../sim/types';

// Local events for city-level offices. Kept short and punchy; add more freely (Haiku-friendly).
export const CITY_EVENTS: PendingEvent[] = [
  { id: 'pothole', title: 'Pothole Crisis', text: 'A viral video shows a bus stuck in a giant pothole on Main Street.', choices: [
    { label: 'Emergency road repairs (-40k treasury)', effects: { treasury: -40, services: 6, popularity: 3 }, log: 'Crews patch Main Street overnight.' },
    { label: 'Blame the previous administration', effects: { popularity: -2, loyalty: 2 }, log: 'The mayor points fingers; voters roll their eyes.' },
  ] },
  { id: 'strike', title: 'Sanitation Strike', text: 'Garbage collectors walk out demanding a 10% raise. Trash is piling up.', choices: [
    { label: 'Give them the raise (-60k)', effects: { treasury: -60, happiness: 4, loyalty: 3 }, log: 'The strike ends; unions praise the mayor.' },
    { label: 'Hold firm and hire temps', effects: { services: -6, happiness: -4, funds: 10 }, log: 'Business donors cheer as the strike drags on.' },
  ] },
  { id: 'festival', title: 'Festival Pitch', text: 'Promoters want to host a music festival downtown. It could draw tourists, or chaos.', choices: [
    { label: 'Approve and co-sponsor (-30k)', effects: { treasury: -30, culture: 8, jobs: 3, crime: 2, popularity: 4 }, log: 'The festival is a hit with 80,000 visitors.' },
    { label: 'Decline', effects: { culture: -2 }, log: 'The festival moves to a rival city.' },
  ] },
  { id: 'scandal', title: 'Aide Scandal', text: 'Your deputy chief of staff is caught using a city car for personal trips.', choices: [
    { label: 'Fire them publicly', effects: { popularity: 2, loyalty: -3 }, log: 'The mayor fires an aide over misuse of city property.' },
    { label: 'Quietly reprimand', effects: { popularity: -5, loyalty: 2 }, log: 'Reporters smell a cover-up.' },
  ] },
  { id: 'factory', title: 'Factory Offer', text: 'A manufacturer will build a plant here if you grant a 10-year tax break.', choices: [
    { label: 'Grant the tax break', effects: { jobs: 10, treasury: -20, popularity: 3 }, log: 'A new plant promises 2,000 jobs.' },
    { label: 'Negotiate harder', effects: { jobs: 3, funds: 5 }, log: 'A smaller deal is signed after tense talks.' },
    { label: 'Refuse', effects: { jobs: -2, culture: 1 }, log: 'The plant goes elsewhere.' },
  ] },
  { id: 'flood', title: 'Flash Flood', text: 'Heavy rain floods the riverside district. Hundreds are displaced.', choices: [
    { label: 'Full emergency response (-80k)', effects: { treasury: -80, happiness: 5, popularity: 6 }, log: 'The mayor is seen in waders handing out supplies.' },
    { label: 'Wait for national aid', effects: { happiness: -8, popularity: -6 }, log: 'Residents fume as aid is slow to arrive.' },
  ] },
  { id: 'crime-wave', title: 'Burglary Spike', text: 'Break-ins are up 30% this quarter and the local paper is on it.', choices: [
    { label: 'Fund extra patrols (-35k)', effects: { treasury: -35, crime: -8, popularity: 2 }, log: 'Night patrols double across the city.' },
    { label: 'Launch youth programs (-25k)', effects: { treasury: -25, crime: -3, happiness: 3 }, log: 'New after-school programs open.' },
  ] },
  { id: 'donor', title: 'Generous Donor', text: 'A developer offers a big campaign donation, hoping for a zoning favor later.', choices: [
    { label: 'Accept (+60k funds)', effects: { funds: 60, popularity: -3 }, log: 'Rumors swirl about the mayor and a developer.' },
    { label: 'Decline politely', effects: { popularity: 1 }, log: 'The mayor turns down a controversial donation.' },
  ] },
  { id: 'stadium', title: 'Stadium Demands', text: 'The local football club threatens to leave unless the city funds a new stadium.', choices: [
    { label: 'Fund it (-120k)', effects: { treasury: -120, culture: 6, jobs: 4, popularity: 5 }, log: 'Fans celebrate a new stadium deal.' },
    { label: 'Call their bluff', effects: { popularity: -2, treasury: 0 }, log: 'The club grumbles but stays, for now.' },
  ] },
  { id: 'party-ask', title: 'Party Favor', text: 'Party leaders ask you to campaign for their candidate in a neighboring district.', choices: [
    { label: 'Spend a weekend campaigning', effects: { loyalty: 6, popularity: -1 }, log: 'The mayor stumps for a party ally.' },
    { label: 'Too busy governing', effects: { loyalty: -4, happiness: 1 }, log: 'Party bosses note the mayor\'s absence.' },
  ] },
  { id: 'heatwave', title: 'Heatwave', text: 'Temperatures hit record highs. Elderly residents are at risk.', choices: [
    { label: 'Open cooling centers (-20k)', effects: { treasury: -20, happiness: 4, popularity: 3 }, log: 'Cooling centers open citywide.' },
    { label: 'Issue advisories only', effects: { happiness: -3 }, log: 'The city urges residents to stay indoors.' },
  ] },
  { id: 'transit', title: 'Transit Fare Hike', text: 'The transit agency needs money. They propose a 20% fare increase.', choices: [
    { label: 'Approve the hike', effects: { treasury: 30, happiness: -5, services: 3 }, log: 'Bus fares rise; commuters grumble.' },
    { label: 'Subsidize from the budget (-50k)', effects: { treasury: -50, services: 4, happiness: 2 }, log: 'The city covers the transit shortfall.' },
  ] },
];

export const CITY_NAMES = ['Port Halden', 'Riverton', 'Ashbury', 'Marlow Bay', 'Kestrel Falls', 'Northgate', 'Valecrest', 'Stonebridge', 'Larkspur', 'Eastmere', 'Granton', 'Willowford'];

export const RIVAL_FIRST = ['Morgan', 'Dana', 'Victor', 'Elena', 'Marcus', 'Priya', 'Tomas', 'Ingrid', 'Rafael', 'Mei', 'Owen', 'Nadia'];
export const RIVAL_LAST = ['Calloway', 'Brennan', 'Duarte', 'Okoye', 'Lindgren', 'Varga', 'Sato', 'Whitfield', 'Moreno', 'Kessler', 'Abara', 'Quinn'];
export const RIVAL_PARTIES = ['Civic Alliance', 'Progress Party', 'People First', 'Heritage League', 'Reform Movement', 'Green Union'];
