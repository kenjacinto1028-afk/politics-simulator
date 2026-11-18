// Core domain types. Player nation is simulated in detail; others at a high level.

export type SystemId =
  | 'presidential' | 'parliamentary' | 'semi-presidential' | 'constitutional-monarchy' | 'one-party'
  | 'federal' | 'direct-democracy' | 'corporate-state';

/** How you climb: winning votes, party loyalty, or buying shares. */
export type AdvancementMode = 'election' | 'appointment' | 'shares';

export interface PoliticalSystem {
  id: SystemId;
  name: string;
  /** Career ladder offices from lowest to highest. */
  ladder: OfficeId[];
  termYears: number;
  termLimit: number | null;
  /** 0..1 — how free/fair elections are. */
  electoralFreedom: number;
  advancement: AdvancementMode;
  /** One-line hook that makes this system play differently. */
  signature: string;
  fantasyOnly?: boolean;
}

export type OfficeId =
  | 'mayor' | 'governor' | 'legislator' | 'minister' | 'prime-minister' | 'vice-president' | 'president' | 'party-secretary'
  | 'state-legislator' | 'senator'
  | 'cantonal-councillor' | 'federal-councillor' | 'council-president'
  | 'district-director' | 'board-member' | 'executive-director' | 'chairman';

export interface Economy {
  gdpBn: number;          // nominal GDP, billions USD
  growth: number;         // annual %, e.g. 2.1
  unemployment: number;   // %
  inflation: number;      // %
  debtToGdp: number;      // %
}

export interface Country {
  id: string;
  name: string;
  fantasy: boolean;
  systemId: SystemId;
  leader: { name: string; party: string; approval: number };
  population: number;      // millions
  economy: Economy;
  stability: number;       // 0..100
  tourism: number;         // 0..100 index
  culture: number;         // 0..100 soft-power index
  relations: Record<string, number>; // countryId -> -100..100
}

export interface Player {
  name: string;
  countryId: string;
  office: OfficeId | null;
  popularity: number;   // 0..100 — name recognition + favorability
  funds: number;        // campaign money, thousands
  age: number;
  /** 0..100 — standing with the party machine (matters most in one-party states). */
  loyalty: number;
  /** Actions left this month (campaigning, governing). */
  actionsLeft: number;
  campaign: Campaign | null;
  city: City | null;
  /** Your state/province once you are Governor. */
  region: Region | null;
  /** Your seat in a legislature once you are a lawmaker. */
  seat: Seat | null;
  /** Your ministry once you are in the cabinet. */
  ministry: Ministry | null;
  /** Your country, once you lead it. */
  nation: Nation | null;
  /** Set when your career at the top ends. */
  retired: boolean;
  /** Months until the current term ends. */
  termMonthsLeft: number;
  pendingEvent: PendingEvent | null;
  /** Recently seen event ids (newest first), so events don't repeat back to back. */
  recentEvents: string[];
  /** Turn of the last event, to space them out. */
  lastEventTurn: number;
  /** Elections won/lost, for the career summary. */
  record: { won: number; lost: number };
  /** Approval of you per voter group, 0..100. */
  groups: Record<GroupId, number>;
  monthsInOffice: number;
  /** Terms served in the current office (for term limits). */
  termsInOffice: number;
  /** Highest ladder index ever held, -1 if none. Sets which offices a comeback can target. */
  highestRung: number;
}

export interface Rival { name: string; party: string; popularity: number; funds: number }

export interface Campaign {
  office: OfficeId;
  monthsLeft: number;
  rival: Rival;
  /** Your polling share 0..100 vs rival (shown to player, noisy). */
  poll: number;
  incumbent: boolean;
}

export type SpendKey = 'police' | 'infrastructure' | 'welfare' | 'culture';

export type GroupId = 'workers' | 'business' | 'retirees' | 'students';

export interface CouncilMember {
  name: string;
  /** The voter group this member cares most about. */
  leans: GroupId;
  /** 0..100 — how much they like working with you. */
  relationship: number;
}

export interface ProjectBuild { id: string; monthsLeft: number }

export interface StateCity {
  name: string;
  population: number;      // thousands
  happiness: number;       // 0..100
  mayor: string;
  /** 0..100 — how well this city's mayor works with you. */
  mayorRelationship: number;
  home: boolean;
}

export interface Seat {
  /** Chamber name, e.g. "Senate". */
  chamber: string;
  seats: number;
  /** Seats your party holds. */
  yourParty: number;
  committee: 'finance' | 'health' | 'education' | 'infrastructure' | 'security' | null;
  /** 0..100 — clout in the chamber. Grows with time served and laws passed. */
  influence: number;
  /** 0..100 — how well you work with the other party. */
  acrossAisle: number;
  /** Total public money you've won for your district, thousands. */
  districtFunding: number;
  pendingVote: { billId: string; partyWantsYes: boolean } | null;
  recentVotes: string[];
  voteCooldown: number;
  sponsoring: { billId: string; stage: 'cosponsors' | 'committee' | 'floor'; cosponsors: number; months: number } | null;
  passed: string[];
  votesWithParty: number;
  votesAgainstParty: number;
}

export interface Ministry {
  portfolio: 'finance' | 'health' | 'education' | 'interior' | 'foreign' | 'economy' | null;
  /** Spendable ministry money, $ billions. Refills monthly up to 1.5x the annual base. */
  budget: number;
  /** Annual base budget, $ billions. */
  baseBudget: number;
  /** 0..100 — how well your ministry is seen to be doing. */
  performance: number;
  /** 0..100 — how the head of government sees you. Below 15 and you're fired. */
  boss: number;
  running: { id: string; monthsLeft: number }[];
  done: string[];
  pendingAsk: string | null;
  askCooldown: number;
}

export interface Nation {
  /** Tax revenue, % of GDP. */
  taxRate: number;
  /** Public spending before laws, % of GDP. */
  spending: number;
  priorities: Record<'defense' | 'welfare' | 'health' | 'education' | 'infrastructure', number>; // sums to 100
  parliament: { name: string; seats: number; yourParty: number; goodwill: number };
  laws: string[];
  tradeDeals: string[];
  war: { enemy: string; months: number; score: number } | null;
  lastAddressTurn: number;
  /** Builds up while you lead; shown when your career ends. */
  legacy: number;
}

export interface Region {
  name: string;
  taxRate: number;                                   // % state tax, 0..10
  budget: Record<'schools' | 'hospitals' | 'roads' | 'police' | 'development', number>; // sums to 100
  treasury: number;                                  // thousands
  stats: Record<'education' | 'health' | 'infrastructure' | 'safety' | 'economy', number>;
  happiness: number;
  cities: StateCity[];
  legislature: { seats: number; yourParty: number; goodwill: number };
  laws: string[];
  /** Bill waiting for your signature or veto. */
  pendingBill: string | null;
  recentBills: string[];
  /** Months before another bill can arrive. */
  billCooldown: number;
  lastAddressTurn: number;
}

export interface City {
  name: string;
  population: number;          // thousands
  taxRate: number;             // % local tax, 0..15
  /** Share of budget by department, sums to 100. */
  spending: Record<SpendKey, number>;
  treasury: number;            // thousands
  crime: number;               // 0..100 (lower is better)
  services: number;            // 0..100 roads, transit, utilities
  jobs: number;                // 0..100 local economy
  happiness: number;           // 0..100
  culture: number;             // 0..100 events, tourism draw
  council: CouncilMember[];
  building: ProjectBuild[];
  built: string[];
  laws: string[];
}

export interface Effects {
  groups?: Partial<Record<GroupId, number>>;
  popularity?: number; funds?: number; loyalty?: number;
  treasury?: number; crime?: number; services?: number; jobs?: number; happiness?: number; culture?: number;
}

export interface PendingEvent {
  id: string;
  title: string;
  text: string;
  choices: { label: string; effects: Effects; log: string }[];
}

export interface GameState {
  turn: number;        // 1 turn = 1 month
  /** Base RNG seed; every random roll derives from seed + turn so saves replay identically. */
  seed: number;
  worldSize: number;
  year: number;
  month: number;       // 1..12
  player: Player | null;
  countries: Record<string, Country>;
  log: string[];
}
