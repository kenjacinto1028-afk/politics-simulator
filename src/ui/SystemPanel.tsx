import { useGame } from '../store';
import { SYSTEMS } from '../data/systems';
import { SYSTEM_RULES } from '../data/people';
import { BUYBACK_COST, EXEC_ORDER_COST, PURGE_EVERY, REFERENDUM_COST, DECREE_RISK_MONTHS, executiveOrderBlocker, lawBook, referendumBlocker, referendumChance } from '../sim/systems';
import { contactById } from '../sim/people';
import { kindOf } from '../sim/offices';
import { Stat } from './Stat';

export function SystemPanel() {
  const g = useGame();
  const { game } = g;
  const p = game.player!;
  if (p.retired) return null;
  const sid = game.countries[p.countryId].systemId;
  const rules = SYSTEM_RULES[sid];
  const busy = p.actionsLeft <= 0 || !!p.pendingEvent;
  const kind = kindOf(p.office);
  const book = lawBook(p);
  const open = book ? book.defs.filter((l) => !book.ids.includes(l.id)) : [];
  const patron = contactById(p, p.sys.patronId ?? undefined);
  const why = (r: string | null, fallback: string) => r ?? fallback;
  const noOffice = !p.office ? 'Hold office first' : null;
  return (
    <div className="panel">
      <h3>How power works here <span className="muted">({SYSTEMS[sid].name})</span></h3>
      <p>{rules.rule}</p>
      <Stat label={rules.meter} value={p.sys.meter} wide />
      <p className="muted small-text">{rules.meterBlurb}</p>

      {sid === 'presidential' && (
        <div>
          <h4>Executive orders <span className="muted">({EXEC_ORDER_COST} political capital each)</span></h4>
          <p className="muted small-text">Courts may strike an order down within {DECREE_RISK_MONTHS} months.{p.sys.decrees.length > 0 && ` Pending: ${p.sys.decrees.map((d) => book?.defs.find((l) => l.id === d.id)?.name ?? d.id).join(', ')}.`}</p>
          {!book && <p className="muted small-text">Needs an executive office.</p>}
          <div className="card-grid">
            {open.map((l) => {
              const r = executiveOrderBlocker(game, l.id);
              return (
                <div key={l.id} className="card"><b>{l.name}</b><br />
                  <button className="small" disabled={busy || !!r} title={r ?? ''} onClick={() => g.executiveOrder(l.id)}>Executive order ({EXEC_ORDER_COST})</button>
                  {r && <span className="muted small-text"> {r}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sid === 'parliamentary' && <div className="row"><button className="action" disabled={busy || !!noOffice} title={why(noOffice, '')} onClick={g.consultCoalition}>Consult coalition<small>{noOffice ?? 'Keeps your partner happy'}</small></button></div>}

      {sid === 'semi-presidential' && (
        <div className="row">
          <button className="action" disabled={busy || !!noOffice} onClick={g.negotiateUnions}>Negotiate with unions<small>{noOffice ?? 'Restores public patience'}</small></button>
          {p.sys.cohabitation && <span className="badge warn">Cohabitation: a rival shares power</span>}
        </div>
      )}

      {sid === 'constitutional-monarchy' && (
        <div className="row">
          <button className="action" disabled={busy || p.funds < 5} onClick={g.royalOccasion}>Royal occasion<small>{p.funds < 5 ? 'Needs $5k' : '$5k · wins royal favor'}</small></button>
          {p.sys.knighted && <span className="badge good">Knighted</span>}
        </div>
      )}

      {sid === 'one-party' && (
        <div>
          <p>Your patron: <b>{patron ? `${patron.name} (${patron.role})` : 'No patron yet: pick one in Politicians'}</b></p>
          <button className="small" disabled={busy || !patron} title={patron ? '' : 'Pick a patron first'} onClick={g.payRespects}>Pay respects to patron</button>
          <p className="muted small-text">Anti-corruption purges come every {PURGE_EVERY} months.</p>
        </div>
      )}

      {sid === 'federal' && (
        <div className="row">
          {kind === 'head' || !p.office ? <p className="muted small-text">{kind === 'head' ? 'Heads of government deal with governors instead.' : 'Hold office first.'}</p> : (
            <>
              <button className="action" disabled={busy} onClick={g.lobbyCapital}>Lobby the capital<small>Better ties, more grants</small></button>
              <button className="action" disabled={busy} onClick={g.defyCapital}>Defy the capital<small>Local fans, worse ties</small></button>
            </>
          )}
        </div>
      )}

      {sid === 'direct-democracy' && (
        <div>
          <h4>Call a referendum <span className="muted">(${REFERENDUM_COST}k each)</span></h4>
          {!book && <p className="muted small-text">Needs a city, state or national office.</p>}
          <div className="card-grid">
            {open.map((l) => {
              const r = referendumBlocker(game, l.id);
              return (
                <div key={l.id} className="card"><b>{l.name}</b>
                  <p className="small-text">Chance citizens say yes: <b>{Math.round(referendumChance(p, l.id) * 100)}%</b></p>
                  <button className="small" disabled={busy || !!r} title={r ?? ''} onClick={() => g.callReferendum(l.id)}>Referendum (${REFERENDUM_COST}k)</button>
                  {r && <span className="muted small-text"> {r}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sid === 'corporate-state' && (
        <div>
          <button className="small" disabled={busy || p.funds < BUYBACK_COST} title={p.funds < BUYBACK_COST ? `Needs $${BUYBACK_COST}k` : ''} onClick={g.buyback}>Share buyback (${BUYBACK_COST}k)</button>
          <p className="muted small-text">Dividends are paid to you every month. A buyback lifts the share value.</p>
        </div>
      )}
    </div>
  );
}
