import type { EventDef, Effects } from '../sim/types';

const C = (label: string, effects: Effects, log: string) => ({ label, effects, log });
type Tags = Omit<EventDef, 'id' | 'title' | 'text' | 'choices'>;
const E = (id: string, title: string, text: string, choices: ReturnType<typeof C>[], tags: Tags = {}): EventDef =>
  ({ id: 'g-' + id, title, text, choices, ...tags });

export const GEO_EVENTS: EventDef[] = [
  // ---------- OUT OF OFFICE (3) ----------
  E('out-donor', 'Foreign Money', 'A company linked to {power} offers to pay for your ads in {city}. It asks for nothing, for now.', [
    C('Take the money', { funds: 25, popularity: -4, loyalty: -2, groups: { business: 4 } }, 'The candidate accepts money tied to {power}.'),
    C('Refuse it', { funds: -3, popularity: 3, loyalty: 3, groups: { students: 3 } }, 'The candidate refuses foreign campaign money.'),
  ], { kinds: ['out'] }),
  E('out-plant', 'Factory Promise', 'A {power} firm says it will build a factory near {city}, but only if your side wins.', [
    C('Promise to welcome it', { popularity: 4, groups: { workers: 7, retirees: -2 }, funds: 5 }, 'The candidate welcomes a foreign factory plan.'),
    C('Say jobs must be local first', { popularity: 1, groups: { workers: 3, business: -4 } }, 'The candidate demands local hiring from foreign firms.'),
  ], { kinds: ['out'] }),
  E('out-spy', 'Spy Rumor', 'A website says your top adviser met a {power} diplomat in secret. It may be true.', [
    C('Fire the adviser', { popularity: 2, loyalty: -4, funds: -5 }, 'The candidate drops an adviser after a spy rumor.'),
    C('Defend your team', { popularity: -4, loyalty: 4, groups: { students: -3 } }, 'The candidate stands by an adviser accused of spy links.'),
  ], { kinds: ['out'] }),

  // ---------- LOCAL (4) ----------
  E('loc-port', 'Port Deal', 'A {power} company wants to run the {city} port for 50 years. It will pay for new cranes.', [
    C('Sign the deal', { treasury: 40, jobs: 4, popularity: -2, groups: { business: 6, workers: 3, retirees: -4 } }, 'A foreign firm takes over the port.'),
    C('Keep the port city-owned', { treasury: -20, services: 2, groups: { retirees: 4, business: -4 } }, 'The city keeps control of its port.'),
  ], { kinds: ['local'] }),
  E('loc-students', 'Students Abroad', 'A {power} university offers 100 free places to students from {city}. Some fear a brain drain.', [
    C('Accept the offer', { culture: 3, happiness: 2, groups: { students: 8, retirees: -3 } }, 'Students from {city} win places abroad.'),
    C('Ask for local campuses instead (-$15k)', { treasury: -15, culture: 2, jobs: 2, groups: { students: 3, business: 2 } }, 'The city asks for a campus at home.'),
  ], { kinds: ['local'] }),
  E('loc-sanction', 'Sanctions Hit Local Firm', 'New {power} sanctions hit the biggest factory in {city}. 400 workers may lose jobs.', [
    C('Give the firm a loan (-$40k)', { treasury: -40, jobs: 4, groups: { workers: 7, business: 3, students: -2 } }, 'The city saves jobs at a sanctioned factory.'),
    C('Let the firm face it alone', { jobs: -5, popularity: -3, treasury: 5, groups: { workers: -7 } }, 'The city lets a sanctioned factory struggle.'),
  ], { kinds: ['local'] }),
  E('loc-5g', 'Network Vendor', 'The city must pick a vendor for its new fast network. {power} offers the cheapest price.', [
    C('Pick the cheap vendor', { treasury: 15, services: 3, loyalty: -2, groups: { business: 4, students: -4 } }, 'The city picks a cheap foreign network vendor.'),
    C('Pay more for a local vendor (-$30k)', { treasury: -30, jobs: 3, services: 1, groups: { workers: 4, business: 2 } }, 'The city picks a local network vendor.'),
  ], { kinds: ['local'] }),

  // ---------- REGIONAL (3) ----------
  E('reg-refugees', 'Refugees from a Proxy War', 'A war backed by {power} sends thousands of people toward your region. Camps are full.', [
    C('Open new shelters (-$90k)', { treasury: -90, popularity: 2, happiness: 2, groups: { students: 6, retirees: -4, workers: -3 } }, 'The region opens shelters for war refugees.'),
    C('Close the border posts', { popularity: -3, crime: 2, groups: { students: -6, retirees: 3, workers: 3 } }, 'The region limits entry for war refugees.'),
  ], { kinds: ['regional'] }),
  E('reg-zone', 'Special Industry Zone', '{power} offers to build an industrial zone in your region with its own workers and rules.', [
    C('Welcome the zone', { treasury: 30, jobs: 3, popularity: -2, groups: { business: 7, workers: -4 } }, 'A foreign industrial zone is approved.'),
    C('Demand local workers only', { jobs: 4, groups: { workers: 6, business: -4 }, treasury: -10 }, 'The region sets local hiring rules for a foreign zone.'),
  ], { kinds: ['regional'] }),
  E('reg-aid', 'Aid with Strings', '{power} offers $80k for roads, if its firms get the building contracts.', [
    C('Accept the aid', { treasury: 80, services: 3, popularity: -2, groups: { business: -4, workers: 3 } }, 'The region takes road aid with conditions.'),
    C('Refuse and build alone (-$60k)', { treasury: -60, popularity: 3, groups: { business: 4, workers: 4 } }, 'The region refuses aid and builds its own roads.'),
  ], { kinds: ['regional'] }),

  // ---------- LEGISLATIVE (2) ----------
  E('leg-lobby', 'Foreign Lobbyists', '{power} lobbyists are lunching with many members. A vote on a trade deal is near.', [
    C('Back the trade deal', { funds: 15, loyalty: 3, popularity: -2, groups: { business: 6, workers: -5 } }, 'The member votes for a trade deal favored by {power}.'),
    C('Vote it down', { loyalty: -4, popularity: 3, groups: { workers: 6, business: -4 } }, 'The member votes against the trade deal.'),
  ], { kinds: ['legislative'] }),
  E('leg-probe', 'Spy Scandal Probe', 'A {power} spy ring was found inside a ministry. A committee wants to hold a public probe.', [
    C('Push for a public probe', { popularity: 5, loyalty: -3, groups: { business: -3, students: 3 } }, 'The member pushes for an open spy probe.'),
    C('Keep it closed and quiet', { loyalty: 4, popularity: -3, funds: 5 }, 'The spy probe is held behind closed doors.'),
  ], { kinds: ['legislative'] }),

  // ---------- CABINET (2) ----------
  E('cab-arms', 'Arms Sale', 'A {power} firm offers fighter jets at a good price. Your generals love them. Others do not.', [
    C('Buy the jets (-$90k)', { treasury: -90, popularity: 2, loyalty: 4, groups: { business: 3, workers: 3, students: -4 } }, 'The ministry buys jets from {power}.'),
    C('Cancel the purchase', { loyalty: -4, treasury: 10, groups: { students: 4, retirees: 2, workers: -3 } }, 'The ministry cancels a big arms purchase.'),
  ], { kinds: ['cabinet'] }),
  E('cab-visa', 'Visa Quotas', '{power} asks for easy visas for its workers and tourists. In return it will buy more of your exports.', [
    C('Agree to easy visas', { treasury: 20, jobs: -2, groups: { business: 6, workers: -5 } }, 'The ministry eases visas for {power}.'),
    C('Keep visas strict', { popularity: 2, groups: { workers: 4, business: -4 } }, 'The ministry keeps strict visas.'),
  ], { kinds: ['cabinet'] }),

  // ---------- HEAD (4) ----------
  E('head-base', 'Base Request', '{power} asks to build a military base in {country}. It will pay well each year.', [
    C('Allow the base', { treasury: 60, popularity: -4, loyalty: 3, groups: { business: 4, students: -6, retirees: -3 } }, 'A foreign base is approved in {country}.'),
    C('Refuse politely', { popularity: 4, treasury: -15, groups: { students: 4, retirees: 3, business: -3 } }, '{leader} refuses a foreign military base.'),
    C('Offer a shared training site', { treasury: 15, popularity: 1, loyalty: -2, groups: { workers: 2 } }, '{leader} offers only a shared training site.'),
  ], { kinds: ['head'] }),
  E('head-summit', 'Bloc Summit', 'Two rival power blocs invite {leader} to their summits in the same week. You cannot attend both.', [
    C('Go to the {power} summit', { treasury: 30, popularity: -2, groups: { business: 5, students: -3 } }, '{leader} attends the {power} summit.'),
    C('Go to the rival summit', { treasury: 15, popularity: 2, groups: { students: 4, workers: 3, business: -3 } }, '{leader} attends the rival summit.'),
    C('Send a minister to both', { popularity: -3, loyalty: 3 }, '{leader} sends ministers to both summits.'),
  ], { kinds: ['head'] }),
  E('head-sanctions', 'Join the Sanctions?', '{power} wants {country} to join sanctions on a rival. Many of your firms trade with that rival.', [
    C('Join the sanctions', { treasury: 25, jobs: -4, popularity: -3, groups: { business: -6, workers: -4, students: 3 } }, '{country} joins sanctions led by {power}.'),
    C('Stay neutral', { treasury: -25, popularity: 2, groups: { business: 5, workers: 4 } }, '{country} refuses to join the sanctions.'),
  ], { kinds: ['head'] }),
  E('head-chip', 'Tech Choice', '{power} offers cheap phone and chip systems for all of {country}. Critics fear spying.', [
    C('Take the cheap offer', { treasury: 40, jobs: 2, loyalty: -3, groups: { business: 6, students: -6 } }, '{country} picks a cheap network from {power}.'),
    C('Build our own (-$70k)', { treasury: -70, jobs: 4, culture: 2, groups: { students: 6, workers: 4, business: -3 } }, '{leader} backs a home-made tech network.'),
  ], { kinds: ['head'] }),
];
