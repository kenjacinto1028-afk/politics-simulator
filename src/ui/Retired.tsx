import { useGame } from '../store';
import { countryLabel } from '../data/local-names';
import { summarize } from '../sim/history';
import { CareerReport } from './Career';

export function Retired() {
  const { game, quitToMenu } = useGame();
  const p = game.player!;
  const home = game.countries[p.countryId];
  const run = summarize(game);
  return (
    <div className="grid">
      <div className="panel">
        <h2>The end of a career</h2>
        <p><b>{p.name}</b> of {countryLabel(home)} leaves public life at age {p.age}. {run.endReason}.</p>
        <CareerReport run={run} />
        <div className="row"><button onClick={quitToMenu}>New game</button></div>
        <p className="muted small-text">This run is saved in the Hall of Fame on the main menu.</p>
      </div>
    </div>
  );
}
