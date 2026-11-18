import { useState } from 'react';
import { useGame } from '../store';
import { MAX_SISTERS, counterIntel, counterIntelBlocker, sisterBlocker, spyThreats, tripBlocker, tripChance, tripCost, COUNTER_INTEL_COST } from '../sim/abroad';
import { countryLabel } from '../data/local-names';
import { Flag } from './Flag';

/** Sister cities and trade trips, for mayors and governors. */
export function WorldContact() {
  const { game, sisterCity, tradeTrip } = useGame();
  const p = game.player!;
  const others = Object.values(game.countries).filter((c) => c.id !== p.countryId).sort((a, b) => (b.relations[p.countryId] ?? 0) - (a.relations[p.countryId] ?? 0));
  const [pickId, setPick] = useState(others[0]?.id ?? '');
  const id = game.countries[pickId] ? pickId : others[0]?.id;
  if (!id) return null;
  const blocked = p.actionsLeft <= 0 || !!p.pendingEvent;
  const sisters = p.abroad?.sisters ?? [];
  const sWhy = sisterBlocker(game, id);
  const tWhy = tripBlocker(game, id);
  return (
    <div className="panel">
      <h3>Abroad</h3>
      <p className="small-text">
        Sister places ({sisters.length}/{MAX_SISTERS}): {sisters.length ? sisters.map((s) => <span key={s} className="tag"><Flag id={s} size={12} /> {game.countries[s]?.name}</span>) : <span className="muted">none yet</span>}
      </p>
      <label>Country
        <select value={id} onChange={(e) => setPick(e.target.value)}>
          {others.map((c) => <option key={c.id} value={c.id}>{countryLabel(c)} (relations {Math.round(c.relations[p.countryId] ?? 0)})</option>)}
        </select>
      </label>
      <div className="row">
        <button className="action" disabled={blocked || !!sWhy} onClick={() => sisterCity(id)}>Sister city<small>{sWhy ?? 'Culture, students and goodwill'}</small></button>
        <button className="action" disabled={blocked || !!tWhy} onClick={() => tradeTrip(id)}>Trade trip<small>{tWhy ?? `$${tripCost(p)}k · ${Math.round(tripChance(game, id) * 100)}% chance of new jobs`}</small></button>
      </div>
      <p className="muted small-text">Sister places make trade trips likelier to work, and their companies may come to invest. Investors from countries your national government distrusts can cost you standing at home.</p>
    </div>
  );
}

/** Who is spying on you, and a sweep to catch them. For the national leader. */
export function SpyWatch() {
  const { game, counterIntelSweep } = useGame();
  const threats = spyThreats(game);
  const why = counterIntelBlocker(game);
  const running = (game.player?.nation?.counterIntelUntil ?? -1) > game.turn;
  return (
    <div className="card">
      <p><b>Foreign spies</b> · chance to catch them <b>{Math.round(counterIntel(game) * 100)}%</b>{running && <span className="badge good">Sweep running</span>}</p>
      <p className="small-text">{threats.length ? <>Likely spying on you: {threats.map((t) => <span key={t.id} className="tag"><Flag id={t.id} size={12} /> {game.countries[t.id].name}</span>)}</> : <span className="muted">No hostile country is spying on you right now.</span>}</p>
      <button className="small" disabled={!!why} title={why ?? ''} onClick={counterIntelSweep}>Counter-intelligence sweep (${COUNTER_INTEL_COST}bn){why && !running ? ` (${why})` : ''}</button>
      <p className="muted small-text">Hostile countries steal secrets (slower growth and tech) and spread rumors during national elections. Better intelligence, the spying policy and sweeps help you catch them.</p>
    </div>
  );
}
