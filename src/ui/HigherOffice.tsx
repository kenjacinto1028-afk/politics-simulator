import { useGame } from '../store';
import { OFFICE_NAMES, SYSTEMS } from '../data/systems';
import { kindOf } from '../sim/offices';
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
          <p className="muted">In your last 6 months you can run for {OFFICE_NAMES[next]} instead of re-election. If you lose, you're out of office.</p>
          <button disabled={!!blocker || !!p.pendingEvent || !!p.region?.pendingBill} onClick={runForHigher}>Run for {OFFICE_NAMES[next]}</button>
          {blocker && <span className="muted"> {blocker}</span>}
        </>
      ) : <p className="muted">You are at the top of the ladder.</p>}
      {beyondFirst && kindOf(p.office) !== 'regional' && kindOf(p.office) !== 'local' && (
        <p className="muted">Full gameplay for {OFFICE_NAMES[p.office!]} is coming in the next update. For now you still manage your home city.</p>
      )}
    </div>
  );
}
