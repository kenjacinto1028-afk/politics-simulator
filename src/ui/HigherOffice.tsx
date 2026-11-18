import { useGame } from '../store';
import { OFFICE_NAMES, SYSTEMS } from '../data/systems';
import { higherOfficeBlocker, nextOffice } from '../sim/mayor';

export function HigherOffice() {
  const { game, runForHigher } = useGame();
  const p = game.player!;
  const next = nextOffice(game);
  const ladder = SYSTEMS[game.countries[p.countryId].systemId].ladder;
  const beyondFirst = !!p.office && ladder[0] !== p.office;
  const blocker = higherOfficeBlocker(game);
  return (
    <div className="panel">
      <h3>Next step in your career</h3>
      {next ? (
        <>
          <button disabled={!!blocker || !!p.pendingEvent} onClick={runForHigher}>Run for {OFFICE_NAMES[next]}</button>
          {blocker && <span className="muted"> {blocker}</span>}
        </>
      ) : <p className="muted">You are at the top of the ladder.</p>}
      {beyondFirst && (
        <p className="muted">Full gameplay for {OFFICE_NAMES[p.office!]} is coming in the next update. For now you still manage your home city.</p>
      )}
    </div>
  );
}
