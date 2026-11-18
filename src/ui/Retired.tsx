import { useGame } from '../store';
import { OFFICE_NAMES, SYSTEMS } from '../data/systems';

export function Retired() {
  const { game, quitToMenu } = useGame();
  const p = game.player!;
  const home = game.countries[p.countryId];
  const top = SYSTEMS[home.systemId].ladder[Math.max(0, p.highestRung)];
  return (
    <div className="grid">
      <div className="panel">
        <h2>The end of a career</h2>
        <p><b>{p.name}</b> of {home.name} retires at age {p.age}.</p>
        <p>Highest office reached: <b>{p.highestRung >= 0 ? OFFICE_NAMES[top] : 'none'}</b></p>
        <p>Elections: <b>{p.record.won}</b> won, <b>{p.record.lost}</b> lost</p>
        {p.nation && <p>Legacy score: <b>{Math.round(p.nation.legacy)}</b></p>}
        <ul className="news">{game.log.slice(0, 8).map((l, i) => <li key={i}>{l}</li>)}</ul>
        <div className="row"><button onClick={quitToMenu}>New game</button></div>
      </div>
    </div>
  );
}
