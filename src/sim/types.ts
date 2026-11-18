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
  popularity: number;   // 0..100
  funds: number;        // campaign money, thousands
  age: number;
}

export interface GameState {
  turn: number;        // 1 turn = 1 month
  worldSize: number;
  year: number;
  month: number;       // 1..12
  player: Player | null;
  countries: Record<string, Country>;
  log: string[];
}
