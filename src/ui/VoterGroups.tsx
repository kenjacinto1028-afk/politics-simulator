import { useGame } from '../store';
import { GROUPS } from '../data/city-content';
import { GROUP_IDS } from '../sim/mayor';
import { Stat } from './Stat';

export function VoterGroups() {
  const { game, meetGroup } = useGame();
  const p = game.player!;
  const blocked = p.actionsLeft <= 0 || !!p.pendingEvent;
  return (
    <div className="panel">
      <h3>Voter groups</h3>
      <div className="card-grid">
        {GROUP_IDS.map((g) => (
          <div key={g} className="card">
            <Stat label={GROUPS[g].name} value={p.groups[g]} wide />
            <p className="muted small-text">Cares about: {GROUPS[g].cares}</p>
            <button className="small" disabled={blocked} onClick={() => meetGroup(g)}>Meet</button>
          </div>
        ))}
      </div>
    </div>
  );
}
