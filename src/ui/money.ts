import type { Country, Effects, Player } from '../sim/types';
import { kindOf } from '../sim/offices';

export const k = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n))}k`;

/** Which treasury a player's event money hits, with its name and balance. */
export function treasuryOf(p: Player): { label: string; value: number } | null {
  if (kindOf(p.office) === 'regional' && p.region) return { label: 'State treasury', value: p.region.treasury };
  if (p.city) return { label: 'City treasury', value: p.city.treasury };
  return null;
}

/** Plain-English lines like "City treasury $210k → $150k" for one event choice. */
export function moneyChange(p: Player, e: Effects, country?: Country): string[] {
  const out: string[] = [];
  const t = treasuryOf(p);
  const kind = kindOf(p.office);
  if (e.treasury && country && (kind === 'cabinet' || kind === 'head')) {
    const now = country.economy.debtToGdp;
    const next = Math.max(0, now - (e.treasury / country.economy.gdpBn) * 100);
    const amount = Math.abs(Math.round(e.treasury));
    out.push(`${e.treasury < 0 ? 'Adds' : 'Cuts'} $${amount}bn ${e.treasury < 0 ? 'to' : 'from'} national debt (debt ${Math.round(now)}% to ${Math.round(next)}% of GDP)`);
  } else if (e.treasury && t) out.push(`${t.label} ${k(t.value)} → ${k(t.value + e.treasury)}`);
  if (e.funds) out.push(`Campaign funds ${k(p.funds)} → ${k(p.funds + e.funds)}`);
  return out;
}
