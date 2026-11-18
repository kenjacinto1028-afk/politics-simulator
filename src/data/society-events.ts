import type { EventDef, Effects } from '../sim/types';

const C = (label: string, effects: Effects, log: string) => ({ label, effects, log });
type Tags = Omit<EventDef, 'id' | 'title' | 'text' | 'choices'>;
const E = (id: string, title: string, text: string, choices: ReturnType<typeof C>[], tags: Tags = {}): EventDef =>
  ({ id: 's-' + id, title, text, choices, ...tags });

export const SOCIETY_EVENTS: EventDef[] = [
  // ---------- LOCAL (8) ----------
  E('loc-newcomers', 'Newcomers Arrive', 'Many new families are moving to {city}. Schools and flats are filling up.', [
    C('Open a welcome office (-$25k)', { treasury: -25, services: 4, happiness: 3, groups: { business: 3, workers: 2 } }, 'A welcome office helps new families settle.'),
    C('Leave it to landlords', { services: -3, happiness: -2, funds: 5, groups: { workers: -3, business: 3 } }, 'The city leaves newcomers to the rental market.'),
  ], { kinds: ['local'], when: { stat: 'migration', above: 3 } }),
  E('loc-seniorhall', 'Senior Hall', 'More than one resident in five is over 65. The old hall is too small.', [
    C('Build a new senior hall (-$40k)', { treasury: -40, happiness: 4, services: 3, groups: { retirees: 8, students: -2 } }, 'A new senior hall opens in {city}.'.replace('{city}', 'town')),
    C('Share the youth center', { culture: 1, groups: { retirees: -3, students: -3 }, popularity: -2 }, 'Seniors and teens must share one center.'),
  ], { kinds: ['local'], when: { stat: 'elderly', above: 20 } }),
  E('loc-clinic', 'Clinic Closing', 'The only clinic in the east of {city} may close. Doctors are leaving.', [
    C('Pay doctors extra (-$35k)', { treasury: -35, services: 5, happiness: 3, groups: { retirees: 6, workers: 3 } }, 'The city pays extra to keep the east clinic open.'),
    C('Let it close', { treasury: 10, services: -5, happiness: -4, groups: { retirees: -6, workers: -3 } }, 'The east clinic closes its doors.'),
  ], { kinds: ['local'], when: { stat: 'health', below: 45 } }),
  E('loc-schoolroof', 'Leaking School Roof', 'Rain pours into classrooms at the {city} high school. Parents are angry.', [
    C('Fix the roof now (-$30k)', { treasury: -30, services: 4, happiness: 2, groups: { students: 6, workers: 2 } }, 'The school roof is repaired.'),
    C('Wait for next year\'s budget', { services: -3, groups: { students: -5, workers: -2 }, popularity: -2 }, 'The school roof repair is put off.'),
  ], { kinds: ['local'], when: { stat: 'education', below: 45 } }),
  E('loc-patrols', 'Night Patrols', 'Gangs are active after dark. Shop owners want more police on the street.', [
    C('Fund night patrols (-$30k)', { treasury: -30, crime: -6, happiness: 2, groups: { business: 5, retirees: 5, students: -3 } }, 'Night patrols begin in {city}.'.replace('{city}', 'town')),
    C('Start youth programs instead (-$30k)', { treasury: -30, crime: -3, culture: 3, jobs: 2, groups: { students: 5, business: -2 } }, 'The city starts youth programs to fight crime.'),
    C('Do nothing', { crime: 4, happiness: -3, popularity: -3 }, 'The city does nothing as gangs spread.'),
  ], { kinds: ['local'], when: { stat: 'crime', above: 55 } }),
  E('loc-rents', 'Rent Spike', 'Rents in {city} jumped again. Young workers say they cannot stay.', [
    C('Cap rent increases', { happiness: 3, jobs: -2, groups: { workers: 6, students: 6, business: -6 } }, 'The city caps rent increases.'),
    C('Zone more land for homes (-$20k)', { treasury: -20, jobs: 3, services: -1, groups: { business: 4, workers: 3, retirees: -3 } }, 'The city opens new land for homes.'),
  ], { kinds: ['local'], when: { stat: 'housing', below: 40 } }),
  E('loc-crowds', 'Tourist Crowds', 'Visitors pack the old town. Shops love it. Residents cannot get to the bakery.', [
    C('Add a visitor tax', { treasury: 20, happiness: 3, jobs: -2, groups: { business: -4, retirees: 4 } }, 'A small visitor tax is added in the old town.'),
    C('Welcome them all', { jobs: 4, happiness: -3, funds: 5, groups: { business: 6, retirees: -5 } }, 'The old town stays open to every visitor.'),
  ], { kinds: ['local'], when: { stat: 'tourism', above: 65 } }),
  E('loc-festival', 'Arts Festival', 'Artists want to hold a big festival in {city}. It needs money and street closures.', [
    C('Back the festival (-$25k)', { treasury: -25, culture: 7, happiness: 4, jobs: 2, groups: { students: 6, business: 2 } }, 'The arts festival fills the streets.'),
    C('Let them pay for it', { culture: 2, funds: 3, groups: { students: -2 } }, 'The festival goes ahead on a small budget.'),
  ], { kinds: ['local'], when: { stat: 'culture', above: 65 } }),

  // ---------- REGIONAL (8) ----------
  E('reg-youthflight', 'Young People Leave', 'Many young people are leaving the state for the capital and abroad.', [
    C('Offer start-up grants (-$60k)', { treasury: -60, jobs: 5, happiness: 3, groups: { students: 7, business: 3, retirees: -2 } }, 'The state offers grants to keep young people.'),
    C('Cut taxes for new firms', { treasury: -25, jobs: 4, services: -2, groups: { business: 6, workers: 2 } }, 'The state cuts taxes for new firms.'),
  ], { kinds: ['regional'], when: { stat: 'migration', below: -2 } }),
  E('reg-smog', 'Smog Over the Valley', 'Thick smog hangs over the state\'s factory valley. Hospitals report more coughs.', [
    C('Force factories to clean up (-$30k)', { treasury: -30, happiness: 3, jobs: -3, groups: { business: -6, students: 5, retirees: 4 } }, 'Valley factories must install clean filters.'),
    C('Ask them to cut back voluntarily', { happiness: -3, funds: 5, groups: { business: 3, retirees: -4, students: -3 } }, 'The state asks factories to cut smoke on their own.'),
  ], { kinds: ['regional'], when: { stat: 'pollution', above: 60 } }),
  E('reg-flood', 'River Flood Warning', 'Heavy rain is raising the main river. Towns downstream may flood.', [
    C('Build flood walls (-$90k)', { treasury: -90, services: 5, happiness: 3, groups: { workers: 4, retirees: 5 } }, 'The state builds flood walls along the river.'),
    C('Prepare evacuation plans (-$20k)', { treasury: -20, services: 2, happiness: 1, popularity: 1 }, 'The state prepares evacuation plans.'),
    C('Hope for dry weather', { services: -4, happiness: -3, popularity: -4, funds: 5 }, 'The state gambles on dry weather.'),
  ], { kinds: ['regional'], when: { stat: 'climate', above: 40 } }),
  E('reg-heating', 'Heating Bills', 'Energy prices are high. Families cannot pay for winter heating.', [
    C('Pay heating aid (-$50k)', { treasury: -50, happiness: 4, groups: { workers: 6, retirees: 7, business: -3 } }, 'The state pays heating aid to families.'),
    C('Cap prices for businesses (-$30k)', { treasury: -30, jobs: 3, groups: { business: 6, workers: 2, retirees: -3 } }, 'The state caps energy prices for firms.'),
  ], { kinds: ['regional'], when: { stat: 'energyPrice', above: 130 } }),
  E('reg-rail', 'Rail Line Decay', 'Trains on the main state line run late every day. Commuters are furious.', [
    C('Rebuild the line (-$100k)', { treasury: -100, services: 6, jobs: 4, groups: { workers: 5, students: 5, business: 3 } }, 'The state rebuilds the main rail line.'),
    C('Sell it to a private operator', { treasury: 30, services: -2, jobs: -2, groups: { business: 6, workers: -5, students: -3 } }, 'The state sells the rail line to a private firm.'),
  ], { kinds: ['regional'], when: { stat: 'infrastructure', below: 40 } }),
  E('reg-harvest', 'Failed Harvest', 'Drought has hurt the harvest. Food prices climb in the state\'s markets.', [
    C('Buy grain and sell at cost (-$60k)', { treasury: -60, happiness: 4, groups: { workers: 6, retirees: 4, business: -2 } }, 'The state sells grain at cost to calm prices.'),
    C('Pay farmers directly (-$40k)', { treasury: -40, jobs: 3, groups: { workers: 3, business: 4, retirees: -2 } }, 'The state pays farmers hurt by the drought.'),
  ], { kinds: ['regional'], when: { stat: 'food', below: 40 } }),
  E('reg-strike', 'Regional Strike', 'Transit and hospital staff walk out together. Streets are full of marchers.', [
    C('Meet their pay demands (-$50k)', { treasury: -50, services: 3, happiness: 3, groups: { workers: 8, business: -5 } }, 'The state gives in to strikers.'),
    C('Hold firm', { services: -4, happiness: -3, crime: 2, groups: { workers: -7, business: 5, retirees: -2 } }, 'The state holds firm against the strike.'),
  ], { kinds: ['regional'], when: { stat: 'unrest', above: 50 } }),
  E('reg-visitors', 'Empty Hotels', 'Few visitors come to the state. Hotels and guides are struggling.', [
    C('Run an ad campaign (-$40k)', { treasury: -40, jobs: 4, culture: 2, groups: { business: 6, workers: 3 } }, 'The state runs a big tourism campaign.'),
    C('Cut hotel taxes', { treasury: -15, jobs: 2, groups: { business: 5, retirees: -2 } }, 'The state cuts hotel taxes.'),
  ], { kinds: ['regional'], when: { stat: 'tourism', below: 30 } }),

  // ---------- LEGISLATIVE (6) ----------
  E('leg-pressbill', 'Media Control Bill', 'Your allies propose a bill to license all news outlets. Critics call it censorship.', [
    C('Vote yes', { popularity: -4, loyalty: 4, funds: 8, groups: { students: -6, business: 2 } }, 'You vote for the media license bill.'),
    C('Vote no', { popularity: 4, loyalty: -4, groups: { students: 6 } }, 'You vote against the media license bill.'),
  ], { kinds: ['legislative'], when: { stat: 'press', below: 35 } }),
  E('leg-ethics', 'Ethics Bill', 'A bill would make officials publish their gifts and income. Many colleagues hate it.', [
    C('Vote yes', { popularity: 5, loyalty: -4, groups: { workers: 3, students: 4, business: -2 } }, 'You vote for the ethics bill.'),
    C('Vote no', { popularity: -4, loyalty: 3, funds: 8, groups: { business: 3, students: -4 } }, 'You vote against the ethics bill.'),
    C('Skip the vote', { popularity: -2, loyalty: 1 }, 'You miss the ethics vote.'),
  ], { kinds: ['legislative'], when: { stat: 'corruption', above: 55 } }),
  E('leg-wealthtax', 'Wealth Levy', 'A new levy on the richest 1% would pay for schools and clinics.', [
    C('Vote yes', { popularity: 3, loyalty: -2, funds: -8, groups: { workers: 6, students: 4, business: -8 } }, 'You vote for the wealth levy.'),
    C('Vote no', { popularity: -2, loyalty: 2, funds: 10, groups: { workers: -5, business: 7 } }, 'You vote against the wealth levy.'),
  ], { kinds: ['legislative'], when: { stat: 'inequality', above: 55 } }),
  E('leg-tuition', 'Tuition Bill', 'Schools are strong. Students want free tuition. Business says it costs too much.', [
    C('Vote yes', { popularity: 3, loyalty: 1, groups: { students: 8, business: -4, retirees: -2 } }, 'You vote for free tuition.'),
    C('Vote no', { popularity: -2, funds: 6, groups: { students: -7, business: 4 } }, 'You vote against free tuition.'),
  ], { kinds: ['legislative'], when: { stat: 'education', above: 75 } }),
  E('leg-maskrule', 'Health Emergency Powers', 'With a pandemic spreading, the government wants powers to close venues quickly.', [
    C('Vote yes', { popularity: 2, loyalty: 3, groups: { retirees: 7, business: -5, students: -3 } }, 'You vote for emergency health powers.'),
    C('Vote no', { popularity: -2, loyalty: -3, groups: { business: 5, retirees: -6, students: 2 } }, 'You vote against emergency health powers.'),
  ], { kinds: ['legislative'], when: { stat: 'outbreak', above: 0 } }),
  E('leg-snoop', 'Spy Powers Bill', 'The spy agency wants to read private messages to catch foreign agents.', [
    C('Vote yes', { popularity: -2, loyalty: 4, groups: { retirees: 4, students: -7, business: 2 } }, 'You vote to widen spy powers.'),
    C('Vote no', { popularity: 3, loyalty: -3, groups: { students: 6, retirees: -3 } }, 'You vote against wider spy powers.'),
  ], { kinds: ['legislative'], when: { stat: 'intel', above: 60 } }),

  // ---------- CABINET (6) ----------
  E('cab-aiLab', 'National Research Lab', 'Scientists want a big public lab for new computing and robots.', [
    C('Fund it (-$70k)', { treasury: -70, jobs: 4, culture: 2, popularity: 3, groups: { students: 7, business: 4, workers: -3 } }, 'The ministry funds a national research lab.'),
    C('Let firms lead (-$15k)', { treasury: -15, jobs: 2, groups: { business: 6, students: -2 } }, 'The ministry offers tax breaks for private research.'),
  ], { kinds: ['cabinet'], when: { stat: 'tech', above: 70 } }),
  E('cab-gasdeal', 'Gas Supply Deal', 'A neighbor offers cheap gas, but the deal ties you to its politics.', [
    C('Sign the deal', { treasury: 20, services: 3, loyalty: -2, groups: { business: 5, workers: 4, students: -4 } }, 'The ministry signs a long gas deal.'),
    C('Build wind and solar (-$80k)', { treasury: -80, jobs: 4, services: 2, groups: { students: 7, business: -2, workers: 3 } }, 'The ministry builds wind and solar farms.'),
  ], { kinds: ['cabinet'], when: { stat: 'energy', below: 35 } }),
  E('cab-spybudget', 'Spy Agency Budget', 'Your spy agency is weak and foreign agents move freely. The chief asks for money.', [
    C('Boost the budget (-$50k)', { treasury: -50, crime: -2, loyalty: 3, groups: { retirees: 3, students: -3 } }, 'The ministry boosts the spy agency budget.'),
    C('Refuse', { treasury: 10, loyalty: -3, popularity: -1, groups: { students: 2 } }, 'The ministry refuses more spy money.'),
  ], { kinds: ['cabinet'], when: { stat: 'intel', below: 30 } }),
  E('cab-hospitals', 'Hospital Funds', 'Waiting lists are long. The health ministry has money for one big project.', [
    C('New hospital wing (-$70k)', { treasury: -70, services: 6, happiness: 4, groups: { retirees: 8, workers: 3, business: -2 } }, 'A new hospital wing is approved.'),
    C('Pay for more nurses (-$40k)', { treasury: -40, services: 4, jobs: 3, groups: { workers: 5, retirees: 4 } }, 'The ministry hires more nurses.'),
  ], { kinds: ['cabinet'], when: { stat: 'health', below: 45 } }),
  E('cab-prisons', 'Overfull Prisons', 'Crime is high and prisons are packed. The justice ministry must act.', [
    C('Build more prisons (-$60k)', { treasury: -60, crime: -4, jobs: 2, groups: { retirees: 5, students: -4 } }, 'The ministry builds more prisons.'),
    C('Fund community courts (-$25k)', { treasury: -25, crime: -2, happiness: 2, groups: { students: 5, retirees: -3 } }, 'The ministry funds community courts.'),
  ], { kinds: ['cabinet'], when: { stat: 'crime', above: 55 } }),
  E('cab-homes', 'Social Housing Plan', 'Homes are too expensive. Planners propose public flats on state land.', [
    C('Build public flats (-$80k)', { treasury: -80, jobs: 4, happiness: 4, groups: { workers: 6, students: 6, business: -3 } }, 'The ministry starts a public housing plan.'),
    C('Ease building rules', { jobs: 3, culture: -2, groups: { business: 6, students: 3, retirees: -3 } }, 'The ministry eases building rules.'),
  ], { kinds: ['cabinet'], when: { stat: 'housing', below: 40 } }),

  // ---------- HEAD (12) ----------
  E('hd-pandemic', 'Pandemic Response', 'A new disease is spreading around the world. Your health chiefs want to act early.', [
    C('Close borders and venues (-$50k)', { treasury: -50, happiness: -3, jobs: -4, groups: { retirees: 8, business: -7, students: -3 } }, 'The government closes borders and venues.'),
    C('Advice only', { happiness: 2, jobs: 1, groups: { business: 4, retirees: -7 } }, 'The government gives health advice only.'),
    C('Fund tests and shots (-$30k)', { treasury: -30, services: 4, happiness: 1, groups: { retirees: 5, workers: 3 } }, 'The government funds tests and vaccines.'),
  ], { kinds: ['head'], when: { stat: 'outbreak', above: 0 } }),
  E('hd-storm', 'Great Storm', 'A huge storm hits the coast of {country}. Thousands are without homes.', [
    C('Launch a rescue fund (-$100k)', { treasury: -100, popularity: 6, services: 4, happiness: 3, groups: { workers: 4, retirees: 4 } }, 'The government launches a storm rescue fund.'),
    C('Rely on charities', { treasury: 10, popularity: -6, happiness: -4, groups: { workers: -4, retirees: -4 } }, 'The government leaves storm relief to charities.'),
  ], { kinds: ['head'], when: { stat: 'climate', above: 35 } }),
  E('hd-marches', 'Mass Marches', 'Huge crowds fill the capital to protest prices and low pay.', [
    C('Meet the leaders and offer pay rises (-$60k)', { treasury: -60, popularity: 4, happiness: 4, groups: { workers: 8, business: -5 } }, 'The leader meets marchers and offers pay rises.'),
    C('Send in police', { popularity: -6, crime: 3, happiness: -4, loyalty: 3, groups: { workers: -7, students: -6, business: 3 } }, 'Police clear the marchers from the streets.'),
    C('Wait it out', { popularity: -3, happiness: -2 }, 'The leader waits for the marches to fade.'),
  ], { kinds: ['head'], when: { stat: 'unrest', above: 50 } }),
  E('hd-expose', 'Press Exposé', 'A free newspaper reveals your minister took gifts from a big firm.', [
    C('Fire the minister', { popularity: 5, loyalty: -4, groups: { students: 4, business: -2 } }, 'The leader fires the minister named in the exposé.'),
    C('Defend the minister', { popularity: -5, loyalty: 4, groups: { students: -4, business: 3 } }, 'The leader defends the minister.'),
  ], { kinds: ['head'], when: { stat: 'press', above: 75 } }),
  E('hd-graft', 'Graft in the Ministries', 'Auditors find bribes in building contracts. Friends of yours are involved.', [
    C('Order a full purge', { popularity: 6, loyalty: -6, funds: -5, groups: { workers: 4, students: 4, business: -4 } }, 'The leader orders a purge of corrupt officials.'),
    C('Bury the report', { popularity: -6, loyalty: 4, funds: 15, groups: { business: 4, students: -5, workers: -3 } }, 'The leader buries the audit report.'),
  ], { kinds: ['head'], when: { stat: 'corruption', above: 55 } }),
  E('hd-gap', 'The Wealth Gap', 'A report shows the rich getting richer while wages stand still.', [
    C('Raise taxes on top earners', { treasury: 40, popularity: 3, groups: { workers: 7, students: 4, business: -8 } }, 'The leader raises taxes on top earners.'),
    C('Cut taxes to boost growth', { treasury: -30, jobs: 3, popularity: -3, groups: { business: 8, workers: -5, students: -3 } }, 'The leader cuts taxes to boost growth.'),
  ], { kinds: ['head'], when: { stat: 'inequality', above: 55 } }),
  E('hd-pricesurge', 'Energy Price Shock', 'Energy prices have jumped. Factories and homes both feel it.', [
    C('Cap prices and pay the gap (-$80k)', { treasury: -80, popularity: 5, happiness: 3, groups: { workers: 5, retirees: 5, business: 2 } }, 'The government caps energy prices.'),
    C('Let the market adjust', { treasury: 10, popularity: -5, happiness: -3, jobs: -3, groups: { workers: -5, retirees: -5, business: 3 } }, 'The government lets energy prices run.'),
  ], { kinds: ['head'], when: { stat: 'energyPrice', above: 130 } }),
  E('hd-hunger', 'Hunger Warning', 'Food stocks are low and prices are rising. Aid groups warn of hunger.', [
    C('Open state food stores (-$60k)', { treasury: -60, popularity: 5, happiness: 3, groups: { workers: 6, retirees: 5, business: -3 } }, 'The government opens state food stores.'),
    C('Import food and cut duties', { treasury: -25, popularity: 2, jobs: -2, groups: { workers: 4, business: 3, retirees: 2 } }, 'The government imports food and cuts duties.'),
  ], { kinds: ['head'], when: { stat: 'food', below: 40 } }),
  E('hd-spycase', 'Spy Caught', 'Your agency caught a spy working for {power}. The press wants a name and a punishment.', [
    C('Expel their diplomats', { popularity: 4, loyalty: 2, funds: -5, groups: { retirees: 4, business: -3 } }, 'The leader expels diplomats of {power}.'.replace('{power}', 'a foreign power')),
    C('Quiet talks', { popularity: -2, loyalty: 2, funds: 5, groups: { business: 3, students: -2 } }, 'The leader raises the spy case in private.'),
  ], { kinds: ['head'], when: { stat: 'intel', above: 60 } }),
  E('hd-border', 'Border Surge', 'Many more people are arriving at the border of {country}. Opinion is split.', [
    C('Open more routes and help them settle (-$50k)', { treasury: -50, jobs: 4, happiness: 1, popularity: -2, groups: { business: 5, students: 4, workers: -5 } }, 'The government opens routes for newcomers.'),
    C('Tighten the border (-$30k)', { treasury: -30, crime: -2, popularity: 2, groups: { workers: 5, retirees: 4, business: -4, students: -5 } }, 'The government tightens border controls.'),
  ], { kinds: ['head'], when: { stat: 'migration', above: 3 } }),
  E('hd-pensions', 'Pension Gap', 'The country is old and pension costs are rising fast.', [
    C('Raise the retirement age', { treasury: 40, popularity: -5, groups: { retirees: -4, workers: -7, business: 5 } }, 'The government raises the retirement age.'),
    C('Raise payroll taxes', { treasury: 30, jobs: -3, popularity: -2, groups: { workers: -4, business: -6, retirees: 6 } }, 'The government raises payroll taxes for pensions.'),
    C('Borrow for now', { treasury: -30, popularity: 2, loyalty: -2, groups: { retirees: 4 } }, 'The government borrows to cover pensions.'),
  ], { kinds: ['head'], when: { stat: 'elderly', above: 20 } }),
  E('hd-bigcup', 'Hosting Bid', 'Your country can bid to host a big sports tournament. It would boost pride and cost a lot.', [
    C('Bid to host (-$90k)', { treasury: -90, culture: 6, happiness: 5, jobs: 4, popularity: 5, groups: { students: 4, business: 4, retirees: -3 } }, 'The government bids to host the tournament.'),
    C('Pass, fund local clubs (-$20k)', { treasury: -20, culture: 3, happiness: 2, groups: { students: 3, workers: 2 } }, 'The government funds local clubs instead of a bid.'),
  ], { kinds: ['head'], when: { stat: 'culture', above: 65 } }),
];
