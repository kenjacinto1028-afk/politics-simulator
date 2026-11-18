import { useState } from 'react';
import { useGame } from '../store';
import { OFFICE_NAMES, SYSTEMS } from '../data/systems';
import { ACTION_INFO, STANDING_LABEL, availableActions } from '../sim/career';
import { cityRevenue } from '../sim/city';
import type { City, SpendKey } from '../sim/types';
import { SaveMenu } from './SaveMenu';

const n0 = (n: number) => Math.round(n).toString();
const fmt = (n: number, d = 1) => n.toFixed(d);

function Stat({ label, value, good = true }: { label: string; value: number; good?: boolean }) {
  const v = Math.round(value);
  const tone = (good ? v : 100 - v) >= 55 ? 'up' : (good ? v : 100 - v) <= 40 ? 'down' : '';
  return (
    <div className="stat">
      <span className="muted">{label}</span>
      <div className="bar"><div className={`fill ${tone}`} style={{ width: `${v}%` }} /></div>
      <span>{v}</span>
    </div>
  );
}

function BudgetEditor({ city }: { city: City }) {
  const setBudget = useGame((s) => s.setBudget);
  const [tax, setTax] = useState(city.taxRate);
  const [sp, setSp] = useState(city.spending);
  const total = Object.values(sp).reduce((a, b) => a + b, 0);
  const dirty = tax !== city.taxRate || (Object.keys(sp) as SpendKey[]).some((k) => sp[k] !== city.spending[k]);
  return (
    <div>
      <h4>Budget</h4>
      <label>Local tax {fmt(tax)}%
        <input type="range" min={0} max={15} step={0.5} value={tax} onChange={(e) => setTax(Number(e.target.value))} />
      </label>
      {(Object.keys(sp) as SpendKey[]).map((k) => (
        <label key={k}>{k} {Math.round((sp[k] / (total || 1)) * 100)}%
          <input type="range" min={0} max={60} value={sp[k]} onChange={(e) => setSp({ ...sp, [k]: Number(e.target.value) })} />
        </label>
      ))}
      <button className="small" disabled={!dirty} onClick={() => setBudget(tax, sp)}>Apply budget</button>
      <p className="muted">Higher tax funds departments but hurts jobs and mood.</p>
    </div>
  );
}

export function Game() {
  const { game, nextTurn, act, resolveEvent, runAgain, quitToMenu } = useGame();
  const [showWorld, setShowWorld] = useState(false);
  const p = game.player!;
  const home = game.countries[p.countryId];
  const sys = SYSTEMS[home.systemId];
  const c = p.campaign;
  const city = p.city;
  const actions = availableActions(sys.advancement, !!c, !!p.office);
  const title = p.office ? `${OFFICE_NAMES[p.office]} of ${city?.name}` : c ? `Candidate for ${OFFICE_NAMES[c.office]}` : 'Out of office';

  return (
    <div className="grid">
      <div className="panel header">
        <div>
          <h2>{p.name}</h2>
          <p>{title} · {home.name} <span className="muted">({sys.name})</span></p>
          <p className="muted">
            {game.year}-{String(game.month).padStart(2, '0')} · Age {p.age} · Record {p.record.won}W–{p.record.lost}L
            {p.office && ` · Term: ${p.termMonthsLeft} mo left`}
          </p>
        </div>
        <div className="kpis">
          <div><b>{n0(p.popularity)}</b><span>Popularity</span></div>
          <div><b>${n0(p.funds)}k</b><span>Funds</span></div>
          <div><b>{n0(p.loyalty)}</b><span>{STANDING_LABEL[sys.advancement]}</span></div>
          <div><b>{p.actionsLeft}</b><span>Actions</span></div>
        </div>
        <div className="row">
          <button onClick={nextTurn} disabled={!!p.pendingEvent}>Next month →</button>
          <button className="secondary small" onClick={quitToMenu}>Main menu</button>
        </div>
      </div>

      {c && (
        <div className="panel">
          <h3>Campaign: {OFFICE_NAMES[c.office]}{c.incumbent ? ' (re-election)' : ''}</h3>
          <p>{c.monthsLeft} month{c.monthsLeft === 1 ? '' : 's'} to {sys.advancement === 'election' ? 'election day' : sys.advancement === 'shares' ? 'the shareholder vote' : 'the party decision'}.</p>
          <div className="poll">
            <div className="you" style={{ width: `${c.poll}%` }}>You {fmt(c.poll, 0)}%</div>
            <div className="them">{c.rival.name} {fmt(100 - c.poll, 0)}%</div>
          </div>
          <p className="muted">Rival: {c.rival.name}, {c.rival.party} · popularity {n0(c.rival.popularity)} · funds ${n0(c.rival.funds)}k</p>
        </div>
      )}

      {!c && !p.office && (
        <div className="panel">
          <h3>You lost.</h3>
          <p>Politics is a long game. Rebuild and try again.</p>
          <button onClick={runAgain}>Run again</button>
        </div>
      )}

      <div className="panel">
        <h3>Actions <span className="muted">({p.actionsLeft} left this month)</span></h3>
        <div className="actions">
          {actions.map((a) => {
            const info = ACTION_INFO[a];
            const locked = a === 'debate' && (!c || c.monthsLeft > 2);
            return (
              <button key={a} className="action" disabled={p.actionsLeft <= 0 || p.funds < info.cost || locked || !!p.pendingEvent} onClick={() => act(a)}>
                {info.label}<small>{info.hint}{info.cost ? ` · $${info.cost}k` : ''}</small>
              </button>
            );
          })}
        </div>
      </div>

      {city && (
        <div className="panel">
          <h3>{city.name} <span className="muted">pop. {n0(city.population)}k</span></h3>
          <div className="cols">
            <div>
              <Stat label="Happiness" value={city.happiness} />
              <Stat label="Jobs" value={city.jobs} />
              <Stat label="Services" value={city.services} />
              <Stat label="Culture" value={city.culture} />
              <Stat label="Crime" value={city.crime} good={false} />
              <p>Treasury <b className={city.treasury < 0 ? 'neg' : ''}>${n0(city.treasury)}k</b> · Revenue ${n0(cityRevenue(city))}k/mo · Tax {fmt(city.taxRate)}%</p>
            </div>
            {p.office ? <BudgetEditor key={`${game.turn}`} city={city} /> : <p className="muted">Win office to set the city budget.</p>}
          </div>
        </div>
      )}

      <div className="panel">
        <h3>News</h3>
        <ul className="news">{game.log.slice(0, 12).map((l, i) => <li key={i}>{l}</li>)}</ul>
      </div>

      <div className="panel">
        <h3>World <button className="small secondary" onClick={() => setShowWorld(!showWorld)}>{showWorld ? 'Hide' : 'Show'}</button></h3>
        {showWorld && (
          <div className="scroll">
            <table>
              <thead><tr><th>Country</th><th>System</th><th>Leader</th><th>Approval</th><th>GDP $bn</th><th>Growth</th><th>Unemp.</th></tr></thead>
              <tbody>
                {Object.values(game.countries).map((x) => (
                  <tr key={x.id} className={x.id === p.countryId ? 'home' : ''}>
                    <td>{x.name}</td><td>{SYSTEMS[x.systemId].name}</td><td>{x.leader.name}</td><td>{fmt(x.leader.approval, 0)}%</td>
                    <td>{fmt(x.economy.gdpBn, 0)}</td><td>{fmt(x.economy.growth)}%</td><td>{fmt(x.economy.unemployment)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SaveMenu canSave />

      {p.pendingEvent && (
        <div className="modal">
          <div className="panel">
            <h3>{p.pendingEvent.title}</h3>
            <p>{p.pendingEvent.text}</p>
            <div className="actions">
              {p.pendingEvent.choices.map((ch, i) => <button key={i} onClick={() => resolveEvent(i)}>{ch.label}</button>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
