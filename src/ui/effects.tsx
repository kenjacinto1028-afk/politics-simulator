import { GROUPS } from '../data/city-content';
import { STAT_LABEL } from '../data/state-content';
import { SYSTEM_RULES } from '../data/people';
import type { Effects as EventEffectsT, GroupId, SystemId } from '../sim/types';

const STAT_NAMES: Record<string, string> = { happiness: 'happiness', jobs: 'jobs', services: 'services', culture: 'culture', crime: 'crime', ...Object.fromEntries(Object.entries(STAT_LABEL).map(([k, v]) => [k, v.toLowerCase()])) };

/** Colored list of what a project or law changes. For crime, lower is better. */
export function Effects({ stats, groups, revenue }: { stats?: Partial<Record<string, number>>; groups?: Partial<Record<GroupId, number>>; revenue?: number }) {
  const items: { text: string; good: boolean }[] = [];
  for (const [k, v] of Object.entries(stats ?? {})) {
    if (!v) continue;
    items.push({ text: `${v > 0 ? '+' : ''}${v} ${STAT_NAMES[k] ?? k}`, good: k === 'crime' ? v < 0 : v > 0 });
  }
  for (const [k, v] of Object.entries(groups ?? {})) {
    if (!v) continue;
    items.push({ text: `${GROUPS[k as GroupId].name} ${v > 0 ? '+' : ''}${v}`, good: v > 0 });
  }
  if (revenue) items.push({ text: `${revenue > 0 ? '+' : ''}${Math.round(revenue * 100)}% tax revenue`, good: revenue > 0 });
  return (
    <p className="effects">
      {items.map((it, i) => (
        <span key={i}>{i > 0 && <span className="muted"> · </span>}<span className={it.good ? 'pos' : 'neg'}>{it.text}</span></span>
      ))}
    </p>
  );
}

export function Forecast({ yes }: { yes: number }) {
  return <p className="small-text">Council forecast: <b className={yes >= 4 ? 'pos' : 'neg'}>{yes} of 7 likely yes</b></p>;
}

/** Faith, system-meter and relation changes from an event choice. */
export function eventExtras(e: EventEffectsT, systemId: SystemId, contactName?: string): { text: string; good: boolean }[] {
  const out: { text: string; good: boolean }[] = [];
  const sg = (v: number) => `${v > 0 ? '+' : ''}${v}`;
  if (e.clergy) out.push({ text: `Faith leaders ${sg(e.clergy)}`, good: e.clergy > 0 });
  if (e.meter) out.push({ text: `${SYSTEM_RULES[systemId].meter} ${sg(e.meter)}`, good: e.meter > 0 });
  if (e.contact) out.push({ text: `Relation with ${contactName ?? 'them'} ${sg(e.contact)}`, good: e.contact > 0 });
  if (e.secret?.favor) out.push({ text: 'You will owe a favor', good: false });
  else if (e.secret) out.push({ text: 'Leaves a secret that could come out', good: false });
  if (e.heat) out.push({ text: `Scandal risk ${e.heat > 0 ? 'up' : 'down'}`, good: e.heat < 0 });
  if (e.onSecret === 'settle') out.push({ text: 'Puts the matter to rest', good: true });
  if (e.onSecret === 'deny') out.push({ text: 'It may come back worse', good: false });
  if (e.onSecret === 'bury') out.push({ text: 'Quiet for now, not gone', good: false });
  if (e.onSecret === 'delay') out.push({ text: 'Buys a few months', good: true });
  if (e.pride) out.push({ text: `Home pride ${sg(e.pride)}`, good: e.pride > 0 });
  for (const [k, v] of Object.entries(e.rep ?? {})) {
    if (!v || Math.abs(v) < 3) continue;
    const names: Record<string, [string, string]> = { integrity: ['honest', 'shady'], party: ['a team player', 'a maverick'], people: ['for the people', 'for business'], bold: ['bold', 'cautious'] };
    out.push({ text: `Seen as more ${names[k][v > 0 ? 0 : 1]}`, good: k === 'integrity' ? v > 0 : true });
  }
  return out;
}

/** Popularity, standing, voter groups and local stats from an event choice, in one colored line. */
export function EffectLines({ e }: { e: EventEffectsT }) {
  const items: { text: string; good: boolean }[] = [];
  const sg = (v: number) => `${v > 0 ? '+' : ''}${v}`;
  if (e.popularity) items.push({ text: `Popularity ${sg(e.popularity)}`, good: e.popularity > 0 });
  if (e.loyalty) items.push({ text: `Party/insider standing ${sg(e.loyalty)}`, good: e.loyalty > 0 });
  for (const [g, v] of Object.entries(e.groups ?? {})) if (v) items.push({ text: `${GROUPS[g as GroupId].name} ${sg(v)}`, good: v > 0 });
  for (const key of ['happiness', 'jobs', 'services', 'culture', 'crime'] as const) {
    const v = e[key];
    if (v) items.push({ text: `${STAT_NAMES[key]} ${sg(v)}`, good: key === 'crime' ? v < 0 : v > 0 });
  }
  if (!items.length) return null;
  return (
    <small className="effect-line">
      {items.map((it, i) => <span key={i}>{i > 0 && ' · '}<span className={it.good ? 'pos' : 'neg'}>{it.text}</span></span>)}
    </small>
  );
}
