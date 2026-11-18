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
  return out;
}
