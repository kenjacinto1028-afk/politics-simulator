import { useGame } from '../store';
import { OFFICE_NAMES } from '../data/systems';
import { higherOfficeBlocker, nextOffice } from '../sim/mayor';

export function HigherOffice() {
  const { game, runForHigher } = useGame();
  const p = game.player!;
  const next = nextOffice(game);
  const blocker = higherOfficeBlocker(game);
  return (
    <div className="panel">
      <h3>Next step in your career</h3>
      {next ? (
        <>
          <p className="muted">In your last 6 months you can run for {OFFICE_NAMES[next]} instead of re-election. If you lose, you're out of office.</p>
          <button disabled={!!blocker || !!p.pendingEvent || !!p.region?.pendingBill || !!p.seat?.pendingVote || !!p.ministry?.pendingAsk} onClick={runForHigher}>Run for {OFFICE_NAMES[next]}</button>
          {blocker && <span className="muted"> {blocker}</span>}
        </>
      ) : <p className="muted">You are at the top of the ladder.</p>}
    </div>
  );
}
