import { useGame } from '../store';
import { PROJECTS } from '../data/city-content';
import { canPropose, forecast } from '../sim/mayor';
import { Effects, Forecast } from './effects';
import { k } from './money';

export function Projects() {
  const { game, proposeProject } = useGame();
  const p = game.player!;
  const city = p.city!;
  const blocked = p.actionsLeft <= 0 || !!p.pendingEvent;
  const name = (id: string) => PROJECTS.find((x) => x.id === id)?.name ?? id;
  const available = PROJECTS.filter((x) => !city.built.includes(x.id) && !city.building.some((b) => b.id === x.id));
  return (
    <div className="panel">
      <h3>Projects</h3>
      <p className="muted">The city pays from its treasury (${Math.round(city.treasury)}k now). Up to 2 can be built at once.</p>
      {city.building.length > 0 && (
        <>
          <h4>Under construction</h4>
          <ul className="plain">{city.building.map((b) => <li key={b.id}>{name(b.id)} <span className="muted">· {b.monthsLeft} month{b.monthsLeft === 1 ? '' : 's'} left</span></li>)}</ul>
        </>
      )}
      {city.built.length > 0 && (
        <>
          <h4>Built</h4>
          <ul className="plain">{city.built.map((id) => <li key={id}>{name(id)}</li>)}</ul>
        </>
      )}
      <h4>Available</h4>
      {available.length === 0 && <p className="muted">Everything has been built or started.</p>}
      <div className="card-grid">
        {available.map((proj) => {
          const reason = canPropose(p, proj);
          return (
            <div key={proj.id} className="card">
              <b>{proj.name}</b>
              <p className="muted small-text">{proj.blurb}</p>
              <p className="small-text">${proj.cost}k from treasury · {proj.months} months</p>
              <p className="small-text">Treasury after: <b className={city.treasury - proj.cost < 0 ? 'neg' : ''}>{k(city.treasury - proj.cost)}</b></p>
              <Effects stats={proj.stats} groups={proj.groups} />
              <Forecast yes={forecast(city, proj).likelyYes} />
              <button className="small" disabled={!!reason || blocked} onClick={() => proposeProject(proj.id)}>Propose</button>
              {reason && <span className="muted small-text"> {reason}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
