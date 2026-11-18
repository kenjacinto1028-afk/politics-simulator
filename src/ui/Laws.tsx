import { useGame } from '../store';
import { LAWS } from '../data/city-content';
import { forecast } from '../sim/mayor';
import { Effects, Forecast } from './effects';

export function Laws() {
  const { game, proposeLaw, repealLaw } = useGame();
  const p = game.player!;
  const city = p.city!;
  const blocked = p.actionsLeft <= 0 || !!p.pendingEvent;
  const active = LAWS.filter((l) => city.laws.includes(l.id));
  const available = LAWS.filter((l) => !city.laws.includes(l.id));
  return (
    <div className="panel">
      <h3>Laws</h3>
      <h4>Active laws</h4>
      {active.length === 0 && <p className="muted">No laws passed yet.</p>}
      <div className="card-grid">
        {active.map((l) => (
          <div key={l.id} className="card">
            <b>{l.name}</b>
            <p className="muted small-text">{l.blurb}</p>
            <Effects stats={l.stats} groups={l.groups} revenue={l.revenue} />
            <button className="small secondary" disabled={blocked} onClick={() => repealLaw(l.id)}>Repeal</button>
            <span className="muted small-text"> Costs a little popularity</span>
          </div>
        ))}
      </div>
      <h4>Available laws</h4>
      <div className="card-grid">
        {available.map((l) => (
          <div key={l.id} className="card">
            <b>{l.name}</b>
            <p className="muted small-text">{l.blurb}</p>
            <Effects stats={l.stats} groups={l.groups} revenue={l.revenue} />
            <Forecast yes={forecast(city, l).likelyYes} />
            <button className="small" disabled={blocked} onClick={() => proposeLaw(l.id)}>Propose</button>
          </div>
        ))}
      </div>
    </div>
  );
}
