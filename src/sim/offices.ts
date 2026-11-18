import type { OfficeId } from './types';

/** What kind of job an office is. Each kind gets its own gameplay. */
export type OfficeKind = 'local' | 'regional' | 'legislative' | 'cabinet' | 'head';

export const OFFICE_KIND: Record<OfficeId, OfficeKind> = {
  mayor: 'local', 'district-director': 'local',
  governor: 'regional',
  'state-legislator': 'legislative', legislator: 'legislative', senator: 'legislative',
  'cantonal-councillor': 'legislative', 'federal-councillor': 'legislative', 'board-member': 'legislative',
  minister: 'cabinet', 'executive-director': 'cabinet', 'vice-president': 'cabinet',
  president: 'head', 'prime-minister': 'head', 'party-secretary': 'head', 'council-president': 'head', chairman: 'head',
};

/** Kinds that have full gameplay today. Others fall back to managing your home city. */
export const PLAYABLE_KINDS: OfficeKind[] = ['local', 'regional'];

export const kindOf = (o: OfficeId | null): OfficeKind | null => (o ? OFFICE_KIND[o] : null);
