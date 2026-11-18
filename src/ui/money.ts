import type { Effects, Player } from '../sim/types';
import { kindOf } from '../sim/offices';

export const k = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n))}k`;

/** Which treasury a player's event money hits, with its name and balance. */
export function treasuryOf(p: Player): { label: string; value: number } | null {
  if (kindOf(p.office) === 'regional' && p.region) return { label: 'State treasury', value: p.region.treasury };
  if (p.city) return { label: 'City treasury', value: p.city.treasury };
  return null;
}

/** Plain-English lines like "City treasury $210k → $150k" for one event choice. */
export function moneyChange(p: Player, e: Effects): string[] {
  const out: string[] = [];
  const t = treasuryOf(p);
  if (e.treasury && t) out.push(`${t.label} ${k(t.value)} → ${k(t.value + e.treasury)}`);
  if (e.funds) out.push(`Campaign funds ${k(p.funds)} → ${k(p.funds + e.funds)}`);
  return out;
}
