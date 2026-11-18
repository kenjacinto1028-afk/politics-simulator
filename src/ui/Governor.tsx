import { useState } from 'react';
import { useGame } from '../store';
import { STATE_LAWS, STAT_LABEL, type StatePriority, type StateStat } from '../data/state-content';
import { GRANT_COST, billById, canGiveAddress, forecastLaw, regionPopulation, regionRevenue } from '../sim/governor';
import type { Region } from '../sim/types';
import { Effects } from './effects';
import { Stat } from './Stat';
import { k } from './money';

const n0 = (n: number) => Math.round(n).toString();
const popText = (k: number) => (k >= 1000 ? `${(k / 1000).toFixed(1)}M` : `${n0(k)}k`);

function useBlocked() {
  const p = useGame((s) => s.game.player)!;
  return p.actionsLeft <= 0 || !!p.pendingEvent || !!p.region?.pendingBill;
}

function StateBudgetEditor({ region }: { region: Region }) {
  const setStateBudget = useGame((s) => s.setStateBudget);
  const [tax, setTax] = useState(region.taxRate);
  const [bd, setBd] = useState(region.budget);
  const keys = Object.keys(bd) as StatePriority[];
  const total = keys.reduce((a, k) => a + bd[k], 0);
  const dirty = tax !== region.taxRate || keys.some((k) => bd[k] !== region.budget[k]);
  return (
    <div>
      <h4>State budget</h4>
      <label>State tax {tax.toFixed(1)}%
        <input type="range" min={0} max={10} step={0.5} value={tax} onChange={(e) => setTax(Number(e.target.value))} />
      </label>
      {keys.map((k) => (
        <label key={k}>{k} {Math.round((bd[k] / (total || 1)) * 100)}%
          <input type="range" min={0} max={60} value={bd[k]} onChange={(e) => setBd({ ...bd, [k]: Number(e.target.value) })} />
        </label>
      ))}
      <button className="small" disabled={!dirty} onClick={() => setStateBudget(tax, bd)}>Apply budget</button>
      <p className="muted">Higher tax pays for services but hurts the economy and mood.</p>
    </div>
  );
}

export function StateOverview() {
  const { game } = useGame();
  const r = game.player!.region!;
  return (
    <div className="panel">
      <h3>{r.name} <span className="muted">pop. {popText(regionPopulation(r))}</span></h3>
      <div className="cols">
        <div>
          <Stat label="Happiness" value={r.happiness} />
          {(Object.keys(STAT_LABEL) as StateStat[]).map((s) => <Stat key={s} label={STAT_LABEL[s]} value={r.stats[s]} />)}
          <p>Treasury <b className={r.treasury < 0 ? 'neg' : ''}>${n0(r.treasury)}k</b> · Revenue ${n0(regionRevenue(r))}k/mo · Tax {r.taxRate.toFixed(1)}%</p>
        </div>
        <StateBudgetEditor key={game.turn} region={r} />
      </div>
    </div>
  );
}

export function Cities() {
  const { game, visitCity, grantCity } = useGame();
  const r = game.player!.region!;
  const blocked = useBlocked();
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'population' | 'happiness' | 'relation' | 'name'>('default');
  const needle = q.trim().toLowerCase();
  const shown = r.cities
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !needle || `${c.name} ${c.mayor}`.toLowerCase().includes(needle))
    .sort((a, b) => sortBy === 'population' ? b.c.population - a.c.population : sortBy === 'happiness' ? b.c.happiness - a.c.happiness : sortBy === 'relation' ? b.c.mayorRelationship - a.c.mayorRelationship : sortBy === 'name' ? a.c.name.localeCompare(b.c.name) : 0);
  return (
    <div className="panel">
      <h3>Cities</h3>
      {r.cities.length > 6 && (
        <div className="table-tools">
          <input type="search" value={q} placeholder="Filter by city or mayor" aria-label="Filter cities" onChange={(e) => setQ(e.target.value)} />
          <select aria-label="Sort cities" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
            <option value="default">Sort: default</option>
            <option value="population">Sort: population</option>
            <option value="happiness">Sort: happiness</option>
            <option value="relation">Sort: works with you</option>
            <option value="name">Sort: name</option>
          </select>
          <span className="count">{shown.length} of {r.cities.length}</span>
        </div>
      )}
      <div className="card-grid">
        {shown.map(({ c, i }) => (
          <div key={c.name} className="card">
            <b>{c.name}</b> {c.home && <span className="pos small-text">Home</span>}
            <p className="muted small-text">pop. {popText(c.population)} · Mayor {c.mayor}</p>
            <Stat label="Happiness" value={c.happiness} wide />
            <Stat label="Works with you" value={c.mayorRelationship} wide />
            <div className="row">
              <button className="small" disabled={blocked} onClick={() => visitCity(i)}>Tour city</button>
              <button className="small secondary" disabled={blocked || r.treasury < GRANT_COST} onClick={() => grantCity(i)}>Send grant (${GRANT_COST}k)</button>
            <p className="muted small-text">Treasury after: {k(r.treasury - GRANT_COST)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Legislature() {
  const { game, courtLegislature, stateAddress } = useGame();
  const leg = game.player!.region!.legislature;
  const blocked = useBlocked();
  const canAddress = canGiveAddress(game);
  return (
    <div className="panel">
      <h3>Legislature</h3>
      <p>Your party: <b>{leg.yourParty} of {leg.seats}</b> seats</p>
      <Stat label="Goodwill" value={leg.goodwill} wide />
      <div className="row">
        <button className="small" disabled={blocked} onClick={courtLegislature}>Host legislators</button>
        <button className="small" disabled={blocked || !canAddress} onClick={stateAddress}>State of the State address</button>
      </div>
      <p className="muted small-text">The address is available once a year.</p>
    </div>
  );
}

export function StateLaws() {
  const { game, proposeStateLaw, repealStateLaw } = useGame();
  const p = game.player!;
  const r = p.region!;
  const blocked = useBlocked();
  const active = STATE_LAWS.filter((l) => r.laws.includes(l.id));
  const available = STATE_LAWS.filter((l) => !r.laws.includes(l.id));
  return (
    <div className="panel">
      <h3>State laws</h3>
      <h4>Active laws</h4>
      {active.length === 0 && <p className="muted">No laws passed yet.</p>}
      <div className="card-grid">
        {active.map((l) => (
          <div key={l.id} className="card">
            <b>{l.name}</b>
            <p className="muted small-text">{l.blurb}</p>
            <Effects stats={l.stats} groups={l.groups} revenue={l.revenue} />
            <button className="small secondary" disabled={blocked} onClick={() => repealStateLaw(l.id)}>Repeal</button>
            <span className="muted small-text"> Costs a little popularity</span>
          </div>
        ))}
      </div>
      <h4>Available laws</h4>
      <div className="card-grid">
        {available.map((l) => {
          const f = forecastLaw(p, l);
          return (
            <div key={l.id} className="card">
              <b>{l.name}</b>
              <p className="muted small-text">{l.blurb}</p>
              <Effects stats={l.stats} groups={l.groups} revenue={l.revenue} />
              <p className="small-text">Legislature forecast: <b className={f.yes >= f.needed ? 'pos' : 'neg'}>{f.yes} of {r.legislature.seats} likely yes</b> (needs {f.needed})</p>
              <button className="small" disabled={blocked} onClick={() => proposeStateLaw(l.id)}>Propose</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BillModal() {
  const { game, decideBill } = useGame();
  const bill = billById(game.player!.region!.pendingBill);
  if (!bill) return null;
  const r = game.player!.region!;
  const change = (rev?: number) => (rev ? Math.round(rev * regionRevenue(r) * 12) : 0);
  const money = (rev?: number) => (rev ? <p className={`small-text ${change(rev) < 0 ? 'neg' : 'pos'}`}>State treasury {k(r.treasury)} → {k(r.treasury + change(rev))}</p> : null);
  return (
    <div className="modal">
      <div className="panel">
        <h3>Bill on your desk: {bill.title}</h3>
        <p>{bill.text}</p>
        <p className="money-line">State treasury: {k(r.treasury)}</p>
        <p className="small-text"><b>If you sign it</b></p>
        <Effects stats={bill.sign.stats} groups={bill.sign.groups} revenue={bill.sign.revenue} />
        {money(bill.sign.revenue)}
        <p className="small-text"><b>If you veto it</b></p>
        <Effects stats={bill.veto.stats} groups={bill.veto.groups} revenue={bill.veto.revenue} />
        {money(bill.veto.revenue)}
        <p className="muted small-text">Vetoing costs goodwill with the legislature.</p>
        <div className="actions">
          <button onClick={() => decideBill(true)}>Sign it</button>
          <button className="secondary" onClick={() => decideBill(false)}>Veto it</button>
        </div>
      </div>
    </div>
  );
}
