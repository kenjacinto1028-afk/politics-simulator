import type { OfficeId, PoliticalSystem, SystemId } from '../sim/types';

export const SYSTEMS: Record<SystemId, PoliticalSystem> = {
  presidential: {
    id: 'presidential', name: 'Presidential Republic', advancement: 'election',
    ladder: ['mayor', 'governor', 'legislator', 'vice-president', 'president'], termYears: 4, termLimit: 2, electoralFreedom: 0.85,
    signature: 'Strong single executive; separate legislature can block you.',
  },
  parliamentary: {
    id: 'parliamentary', name: 'Parliamentary Republic', advancement: 'election',
    ladder: ['mayor', 'legislator', 'minister', 'prime-minister'], termYears: 5, termLimit: null, electoralFreedom: 0.9,
    signature: 'Power comes from your party and coalition; lose confidence, lose office.',
  },
  'semi-presidential': {
    id: 'semi-presidential', name: 'Semi-Presidential Republic', advancement: 'election',
    ladder: ['mayor', 'legislator', 'minister', 'prime-minister', 'president'], termYears: 5, termLimit: 2, electoralFreedom: 0.8,
    signature: 'President and PM share power; cohabitation with rivals is possible.',
  },
  'constitutional-monarchy': {
    id: 'constitutional-monarchy', name: 'Constitutional Monarchy', advancement: 'election',
    ladder: ['mayor', 'legislator', 'minister', 'prime-minister'], termYears: 4, termLimit: null, electoralFreedom: 0.9,
    signature: 'Figurehead monarch; royal favor and scandals swing public mood.',
  },
  'one-party': {
    id: 'one-party', name: 'One-Party State', advancement: 'appointment',
    ladder: ['mayor', 'governor', 'minister', 'party-secretary'], termYears: 5, termLimit: null, electoralFreedom: 0.1,
    signature: 'No real elections; climb through party loyalty, patrons and purges.',
  },
  federal: {
    id: 'federal', name: 'Federal Republic', advancement: 'election',
    ladder: ['mayor', 'state-legislator', 'governor', 'senator', 'president'], termYears: 4, termLimit: 2, electoralFreedom: 0.85,
    signature: 'Strong states: governors control budgets/police and can defy the capital.',
  },
  'direct-democracy': {
    id: 'direct-democracy', name: 'Direct Democracy', advancement: 'election',
    ladder: ['mayor', 'cantonal-councillor', 'federal-councillor', 'council-president'], termYears: 4, termLimit: null, electoralFreedom: 0.95,
    signature: 'Citizens can overturn any law by referendum; leadership is a rotating council.',
  },
  'corporate-state': {
    id: 'corporate-state', name: 'Corporate State', advancement: 'shares', fantasyOnly: true,
    ladder: ['district-director', 'board-member', 'executive-director', 'chairman'], termYears: 3, termLimit: null, electoralFreedom: 0.4,
    signature: 'Citizens are shareholders; votes scale with wealth and the board answers to profit.',
  },
};

export const OFFICE_NAMES: Record<OfficeId, string> = {
  mayor: 'Mayor', governor: 'Governor', legislator: 'Legislator', minister: 'Minister', 'prime-minister': 'Prime Minister',
  'vice-president': 'Vice President', president: 'President', 'party-secretary': 'General Secretary',
  'state-legislator': 'State Legislator', senator: 'Senator',
  'cantonal-councillor': 'Cantonal Councillor', 'federal-councillor': 'Federal Councillor', 'council-president': 'President of the Council',
  'district-director': 'District Director', 'board-member': 'Board Member', 'executive-director': 'Executive Director', chairman: 'Chairman of the Board',
};
