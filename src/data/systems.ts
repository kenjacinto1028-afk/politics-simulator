import type { PoliticalSystem, SystemId } from '../sim/types';

export const SYSTEMS: Record<SystemId, PoliticalSystem> = {
  presidential: { id: 'presidential', name: 'Presidential Republic', ladder: ['mayor', 'governor', 'legislator', 'vice-president', 'president'], termYears: 4, termLimit: 2, electoralFreedom: 0.9 },
  parliamentary: { id: 'parliamentary', name: 'Parliamentary Republic', ladder: ['mayor', 'legislator', 'minister', 'prime-minister'], termYears: 5, termLimit: null, electoralFreedom: 0.9 },
  'semi-presidential': { id: 'semi-presidential', name: 'Semi-Presidential Republic', ladder: ['mayor', 'legislator', 'minister', 'prime-minister', 'president'], termYears: 5, termLimit: 2, electoralFreedom: 0.85 },
  'constitutional-monarchy': { id: 'constitutional-monarchy', name: 'Constitutional Monarchy', ladder: ['mayor', 'legislator', 'minister', 'prime-minister'], termYears: 4, termLimit: null, electoralFreedom: 0.9 },
  'one-party': { id: 'one-party', name: 'One-Party State', ladder: ['mayor', 'governor', 'minister', 'party-secretary'], termYears: 5, termLimit: null, electoralFreedom: 0.1 },
};
