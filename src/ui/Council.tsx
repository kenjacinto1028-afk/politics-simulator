import { useGame } from '../store';
import { GROUPS } from '../data/city-content';
import { SYSTEMS } from '../data/systems';
import { COUNCIL_LABEL, DEAL_COST } from '../sim/mayor';
import { Stat } from './Stat';

export function Council() {
  const { game, lobby, cutDeal } = useGame();
  const p = game.player!;
  const city = p.city!;
  const mode = SYSTEMS[game.countries[p.countryId].systemId].advancement;
  const blocked = p.actionsLeft <= 0 || !!p.pendingEvent;
  return (
    <div className="panel">
      <h3>{COUNCIL_LABEL[mode]}</h3>
      <p className="muted">Proposals need 4 of 7 votes. Members who like you vote yes more often.</p>
      <div className="card-grid">
        {city.council.map((m, i) => (
          <div key={i} className="card">
            <b>{m.name}</b>
            <p className="muted small-text">Leans toward {GROUPS[m.leans].name}</p>
            <Stat label="Likes you" value={m.relationship} wide />
            <div className="row">
              <button className="small" disabled={blocked} onClick={() => lobby(i)}>Lobby</button>
              <button className="small secondary" disabled={blocked || p.funds < DEAL_COST} onClick={() => cutDeal(i)}>Cut a deal (${DEAL_COST}k)</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
