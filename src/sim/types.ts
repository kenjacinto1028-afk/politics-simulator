import type { BlocId, RegionId, ResourceId } from '../data/geo';
import type { PolicyId, StatId } from '../data/society';
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
  leader: Leader;
  /** Main faith and how much religion matters in public life, 0..100. */
  faith: FaithId;
  religiosity: number;
  population: number;      // millions
  economy: Economy;
  stability: number;       // 0..100
  tourism: number;         // 0..100 index
  culture: number;         // 0..100 soft-power index
  relations: Record<string, number>; // countryId -> -100..100
  /** World power: region, bloc, armed strength 0..100, nuclear arms, main export. */
  region: RegionId;
  bloc: BlocId;
  military: number;
  nuclear: boolean;
  resource: ResourceId;
  /** Country scores 0..100 (elderly in %, migration per 1,000 a year). */
  society: Record<StatId, number>;
  /** AI-run countries: their current policies, recent decisions, next leadership vote, defense pacts, military rule. */
  policies?: Partial<Record<PolicyId, 0 | 1 | 2>>;
  decisions?: string[];
  nextVote?: number;
  pacts?: string[];
  junta?: boolean;
  /** Turn the current leader took power (unset: since the game began). */
  leaderSince?: number;
}

/** A war between two AI countries. score > 0: a is winning. */
export interface AIWar { a: string; b: string; months: number; score: number; backing?: number; playerSide?: string }

/** Something an AI country asks of you, as leader. */
export interface Offer {
  from: string;
  kind: 'trade' | 'alliance' | 'bloc' | 'tribute' | 'cut-trade';
  target?: string;
  amount?: number;
  monthsLeft: number;
  text: string;
}

/** Things every country shares. */
export interface WorldState {
  /** Global warming 0..100. Rises with pollution. */
  climate: number;
  /** World oil and gas price, 100 = normal. */
  energyPrice: number;
  /** Months left of a world outbreak; 0 = none. */
  outbreak: number;
}

/** An ally's request for help. Unanswered calls count as a refusal. */
export interface AllyCall {
  from: string;
  kind: 'aid' | 'troops';
  reason: string;
  /** Months left to answer. */
  monthsLeft: number;
  /** For troops: the civil war they are fighting in, if any. */
  conflict?: string;
  /** For troops: the country they are at war with. */
  warWith?: string;
}

/** A civil war where outside powers back opposite sides. */
export interface Conflict {
  country: string;
  /** Who arms the government and who arms the rebels. */
  govBacker: string | null;
  rebelBacker: string | null;
  months: number;
  /** >0 the government is winning, <0 the rebels. */
  score: number;
  /** The side your country backs, if any. */
  playerSide?: 'gov' | 'rebel';
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
  /** Your own faith, and how faith leaders feel about you (0..100). */
  faith: FaithId;
  clergy: number;
  /** Politicians in your country at every level. */
  contacts: Contact[];
  sys: SystemState;
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
  /** The story of this career, for the score and the history screen. */
  history?: CareerHistory;
  /** Sister cities and the last trade trip (mayors and governors). */
  abroad?: { sisters: string[]; lastTrip: number };
  /** Things this career has done, for achievements. */
  feats?: string[];
}

export interface Moment { turn: number; date: string; kind: 'office' | 'election' | 'war' | 'policy' | 'scandal' | 'end'; text: string }
export interface YearSnap {
  year: number; age: number; office: OfficeId | null; rung: number; popularity: number;
  gdpBn: number; growth: number; stability: number; health: number; education: number; crime: number;
}
export interface CareerHistory {
  moments: Moment[];
  years: YearSnap[];
  monthsByOffice: Partial<Record<OfficeId, number>>;
  /** Newest log line already read. */
  logMark: string;
  startYear: number;
  startTurn: number;
  /** Months in a row without office. */
  monthsOut: number;
  scandals: number;
  warsWon: number;
  warsLost: number;
  removed: boolean;
  endReason?: string;
  /** Country scores when you first led it, and now. */
  leaderStart?: Record<string, number>;
  leaderEnd?: Record<string, number>;
}
export interface RunSummary {
  id: string; name: string; countryId: string; countryName: string; systemId: SystemId;
  startYear: number; endYear: number; age: number; highestOffice: string;
  score: number; grade: string; title: string; lines: { label: string; points: number }[];
  endReason: string; record: { won: number; lost: number };
  moments: Moment[]; years: YearSnap[]; finishedAt: string;
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
  alliances: string[];
  lastSummitTurn: number;
  war: { enemy: string; months: number; score: number } | null;
  lastAddressTurn: number;
  /** Builds up while you lead; shown when your career ends. */
  legacy: number;
  /** Favors between you and each ally: >0 they owe you, <0 you owe them. */
  favors?: Record<string, number>;
  /** Last turn you asked each ally for help. */
  asked?: Record<string, number>;
  /** An ally asking you for help right now. */
  allyCall?: AllyCall | null;
  /** Counter-intelligence sweep runs until this turn. */
  counterIntelUntil?: number;
  /** An AI country's offer or demand waiting for your answer. */
  offer?: Offer | null;
  /** Your policy in each area: 0, 1 (default) or 2. */
  policies?: Partial<Record<PolicyId, 0 | 1 | 2>>;
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

export type TraitId = 'hawk' | 'dove' | 'populist' | 'technocrat' | 'pious' | 'secular' | 'vain' | 'generous' | 'corrupt' | 'reformer' | 'cautious' | 'charismatic';
export type FocusId = 'economy' | 'security' | 'welfare' | 'faith' | 'diplomacy' | 'environment';
export type FaithId = 'christian' | 'muslim' | 'hindu' | 'buddhist' | 'jewish' | 'folk' | 'secular' | 'flame' | 'tide' | 'ledger';

/** A character's personality: how they lead, what they care about, what they believe. */
export interface Character { name: string; traits: TraitId[]; focus: FocusId; faith: FaithId }

export interface Leader extends Character { party: string; approval: number }

/** A politician in your own country that you can work with or against. */
export interface Contact extends Character {
  id: string;
  /** Ladder rung they sit on (0 = your first rung). -1 = a faith leader. */
  rung: number;
  role: string;
  party: 'yours' | 'rival';
  relation: number;    // -100..100, how they feel about you
  endorsed: boolean;   // backing your current campaign
  dealUsed: boolean;   // a joint deal already done this term
}

/** Each system's signature rule, tracked across your whole career. */
export interface SystemState {
  /** The system's signature meter, 0..100 (political capital, coalition, royal favor, patron favor, capital ties, citizen trust, share value, public patience). */
  meter: number;
  patronId: string | null;     // one-party: who sponsors your career
  cohabitation: boolean;       // semi-presidential: the other top office is a rival
  knighted: boolean;           // constitutional monarchy: honored by the crown
  decrees: { id: string; turn: number }[]; // presidential: executive orders that courts may still strike down
  lastPurgeTurn: number;       // one-party
  reformsSeen: number;         // laws/initiatives already counted against coalition or patience
}

export interface Effects {
  groups?: Partial<Record<GroupId, number>>;
  /** Faith leaders' favor toward you. */
  clergy?: number;
  /** Your system's signature meter (see SystemState.meter). */
  meter?: number;
  /** Your relation with the politician the event is about. */
  contact?: number;
  popularity?: number; funds?: number; loyalty?: number;
  treasury?: number; crime?: number; services?: number; jobs?: number; happiness?: number; culture?: number;
  /** Marks an achievement-worthy deed (see Player.feats). */
  feat?: string;
}

export interface PendingEvent {
  id: string;
  title: string;
  text: string;
  choices: { label: string; effects: Effects; log: string }[];
  /** The politician this event is about, if any. */
  contactId?: string;
}

/** Event templates. Text may use {name} {role} {city} {country} {leader} {faith}. */
export interface EventDef extends PendingEvent {
  /** Which jobs see it ('out' = out of office). Omitted: any office. */
  kinds?: ('out' | 'local' | 'regional' | 'legislative' | 'cabinet' | 'head')[];
  /** Omitted: every system. */
  systems?: SystemId[];
  /** Only in countries at least this religious. */
  minReligiosity?: number;
  /** Only when a country score (or world value) is above/below a level. */
  when?: { stat: StatId | 'tourism' | 'culture' | 'climate' | 'outbreak' | 'energyPrice'; above?: number; below?: number };
  /** Picks a politician for {name}/{role}; `contact` effects change your relation with them. */
  about?: 'peer' | 'superior' | 'rival' | 'faith';
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
  conflicts: Conflict[];
  wars?: AIWar[];
  world: WorldState;
  log: string[];
}
