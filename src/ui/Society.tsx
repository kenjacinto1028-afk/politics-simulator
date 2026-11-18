import { useState } from 'react';
import { useGame } from '../store';
import { POLICIES, POLICY_IDS, STATS, type PolicyId, type StatId } from '../data/society';
import { kindOf } from '../sim/offices';
import { levelOf, spyBlocker, spyChance } from '../sim/society';

const GROUPS: [string, string][] = [['people', 'People'], ['safety', 'Safety and freedom'], ['economy', 'Economy'], ['planet', 'Planet']];

function tone(id: StatId, v: number) {
  const good = STATS[id].good;
  if (good === 'none') return '';
  const score = good === 'high' ? v : 100 - v;
  return score >= 60 ? 'up' : score < 40 ? 'down' : '';
}

/** Your country's scores, shown at every level. */
export function CountryScores() {
  const game = useGame((s) => s.game);
  const [open, setOpen] = useState<string | null>(null);
  const p = game.player!;
  const c = game.countries[p.countryId];
  const w = game.world;
  if (!c.society) return null;
  return (
    <div className="panel">
      <h3>{c.name} today</h3>
      <p className="small-text">
        Population <b>{c.population >= 10 ? Math.round(c.population) : c.population.toFixed(1)}M</b> · Tourism <b>{Math.round(c.tourism)}</b> · Culture <b>{Math.round(c.culture)}</b>
        <br />World: warming <b className={w.climate > 40 ? 'neg' : ''}>{Math.round(w.climate)}</b>/100 · energy price <b className={w.energyPrice > 130 ? 'neg' : ''}>{Math.round(w.energyPrice)}</b>{w.outbreak > 0 && <> · <b className="neg">world outbreak ({w.outbreak} mo)</b></>}
      </p>
      {GROUPS.map(([g, label]) => (
        <div key={g}>
          <h4>{label}</h4>
          {(Object.keys(STATS) as StatId[]).filter((k) => STATS[k].group === g).map((k) => {
            const v = c.society[k];
            const raw = k === 'migration' ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}` : k === 'elderly' ? `${Math.round(v)}%` : Math.round(v);
            const width = k === 'migration' ? Math.min(100, Math.abs(v) * 8) : k === 'elderly' ? v * 2.5 : v;
            return (
              <div key={k} onClick={() => setOpen(open === k ? null : k)} style={{ cursor: 'pointer' }}>
                <div className="stat">
                  <span>{STATS[k].name}</span>
                  <div className="bar"><div className={`fill ${k === 'migration' ? (v < 0 ? 'down' : 'up') : tone(k, v)}`} style={{ width: `${Math.max(0, width)}%` }} /></div>
                  <b>{raw}</b>
                </div>
                {open === k && <p className="muted small-text">{STATS[k].blurb}</p>}
              </div>
            );
          })}
        </div>
      ))}
      <p className="muted small-text">Tap a score to see what it means. {kindOf(p.office) === 'head' ? 'Your policies below move these over time.' : 'Once you lead the country you set the policies that move these.'}</p>
    </div>
  );
}

/** One three-way choice per area. Each change takes an action. */
export function PolicyPanel() {
  const { game, setPolicy } = useGame();
  const p = game.player!;
  const pol = p.nation?.policies ?? {};
  const blocked = p.actionsLeft <= 0 || !!p.pendingEvent;
  const [showAll, setShowAll] = useState(false);
  const ids = showAll ? POLICY_IDS : POLICY_IDS.slice(0, 6);
  return (
    <div className="panel dip">
      <h3>Policies</h3>
      <p className="muted small-text">One choice per area. Changing a policy takes an action, and the country shifts over the next months.</p>
      {ids.map((id: PolicyId) => {
        const d = POLICIES[id];
        const cur = levelOf(pol, id);
        const lv = d.levels[cur];
        const bits = [
          lv.spend ? `${lv.spend > 0 ? '+' : ''}${lv.spend}% GDP spending` : '',
          ...Object.entries(lv.stats ?? {}).map(([k, v]) => `${(STATS[k as StatId]?.name ?? k).toLowerCase()} ${v > 0 ? '+' : ''}${v}`),
          ...Object.entries(lv.groups ?? {}).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`),
        ].filter(Boolean);
        return (
          <div key={id} className="card">
            <p><b>{d.name}</b> <span className="muted small-text">· {d.area}</span></p>
            <div className="row">
              {d.levels.map((l, i) => (
                <button key={i} aria-pressed={i === cur} className={`small${i === cur ? '' : ' secondary'}`} disabled={blocked && i !== cur} onClick={() => i !== cur && setPolicy(id, i as 0 | 1 | 2)}>{i === cur ? '✓ ' : ''}{l.name}</button>
              ))}
            </div>
            <p className="muted small-text">{bits.length ? bits.join(' · ') : 'The middle way: no big effects.'}</p>
          </div>
        );
      })}
      <button className="small secondary" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show fewer' : `Show all ${POLICY_IDS.length} policies`}</button>
    </div>
  );
}

/** Spy operations against another country. */
export function SpyRow({ target }: { target: string }) {
  const { game, spyOp } = useGame();
  const p = game.player!;
  const why = spyBlocker(game, target);
  if (why === 'Not available') return null;
  const blocked = p.actionsLeft <= 0 || !!p.pendingEvent;
  const odds = why ? why : `${Math.round(spyChance(game, target) * 100)}%`;
  return (
    <>
      <button className="small secondary" disabled={blocked || !!why} title="Steal research: +tech if it works, scandal if caught" onClick={() => spyOp(target, 'steal')}>Steal tech ({odds})</button>
      <button className="small secondary" disabled={blocked || !!why} title="Sabotage: hurts their army and economy, scandal if caught" onClick={() => spyOp(target, 'sabotage')}>Sabotage ({odds})</button>
    </>
  );
}
