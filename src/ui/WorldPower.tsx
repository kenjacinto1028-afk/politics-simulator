import { useGame } from '../store';
import { BLOCS, REGIONS, RESOURCES, type BlocId } from '../data/geo';
import { aidAmount, alliesOf, askBlocker, blocLeader, blocMembers, helpChance, influence, joinBlocBlocker, TIERS, tierOf } from '../sim/geo';
import { kindOf } from '../sim/offices';

const tierClass = (t: string) => (t === 'super' || t === 'great' ? 'badge good' : t === 'regional' ? 'badge' : 'badge muted');

/** Your country's place in the world, the blocs, and live proxy wars. Shown at every level. */
export function WorldPower() {
  const { game, backSide } = useGame();
  const p = game.player!;
  const me = game.countries[p.countryId];
  const leading = kindOf(p.office) === 'head' && !!p.nation;
  const blocked = p.actionsLeft <= 0 || !!p.pendingEvent;
  const blocs = (Object.keys(BLOCS) as BlocId[]).filter((b) => blocMembers(game, b).length > 0);
  const t = tierOf(me);
  return (
    <div className="panel">
      <h3>World power</h3>
      <p>
        <b>{me.name}</b> <span className={tierClass(t)}>{TIERS[t].name}</span>
        <br /><span className="muted small-text">{TIERS[t].blurb}</span>
      </p>
      <p className="small-text">
        Army <b>{Math.round(me.military)}</b>/100{me.nuclear && <> · <b>nuclear</b></>} · Influence <b>{influence(game, me.id)}</b> · Bloc <b>{BLOCS[me.bloc].name}</b>
        <br />Region: {REGIONS[me.region]} · Main export: {RESOURCES[me.resource].name}
      </p>
      <h4>Blocs</h4>
      <ul className="news">
        {blocs.map((b) => {
          const l = blocLeader(game, b);
          return <li key={b}><b>{BLOCS[b].name}</b> · {blocMembers(game, b).length} {blocMembers(game, b).length === 1 ? 'country' : 'countries'}{l && <> · led by {game.countries[l].name}</>}<br /><span className="muted small-text">{BLOCS[b].blurb}</span></li>;
        })}
      </ul>
      <h4>Proxy wars</h4>
      {game.conflicts.length === 0 ? <p className="muted small-text">No civil wars right now.</p> : (
        <ul className="news">
          {game.conflicts.map((cf) => {
            const c = game.countries[cf.country];
            const gov = cf.govBacker ? game.countries[cf.govBacker].name : 'no one';
            const reb = cf.rebelBacker ? game.countries[cf.rebelBacker].name : 'no one';
            const lead = cf.score > 8 ? 'Government winning' : cf.score < -8 ? 'Rebels winning' : 'Stalemate';
            return (
              <li key={cf.country}>
                <b>Civil war in {c.name}</b> · month {cf.months} · {lead}
                <br /><span className="small-text">{gov} backs the government. {reb} backs the rebels.{cf.playerSide && <b> You back the {cf.playerSide === 'gov' ? 'government' : 'rebels'}.</b>}</span>
                {leading && !cf.playerSide && cf.country !== p.countryId && (
                  <div className="row">
                    <button className="small" disabled={blocked} title="$5bn in arms" onClick={() => backSide(cf.country, 'gov')}>Back government ($5bn)</button>
                    <button className="small secondary" disabled={blocked} title="$5bn in arms" onClick={() => backSide(cf.country, 'rebel')}>Back rebels ($5bn)</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!leading && <p className="muted small-text">Once you lead the country you can join blocs, buy arms and take sides in these wars.</p>}
    </div>
  );
}

/** Bloc moves for a national leader. */
export function BlocActions() {
  const { game, joinBloc, leaveBloc } = useGame();
  const p = game.player!;
  const me = game.countries[p.countryId];
  const blocked = p.actionsLeft <= 0 || !!p.pendingEvent;
  const open = (Object.keys(BLOCS) as BlocId[]).filter((b) => b !== 'none' && b !== me.bloc && blocMembers(game, b).length > 0);
  return (
    <div className="card">
      <p>Your bloc: <b>{BLOCS[me.bloc].name}</b>{me.bloc !== 'none' && blocLeader(game, me.bloc) === me.id && <span className="badge good">You lead it</span>}</p>
      <div className="row">
        {open.map((b) => <JoinButton key={b} bloc={b} blocked={blocked} onJoin={() => joinBloc(b)} />)}
        {me.bloc !== 'none' && <button className="small secondary" disabled={blocked} onClick={leaveBloc}>Leave bloc</button>}
      </div>
      <p className="muted small-text">A bloc's leader helps you in wars and its nuclear umbrella deters attacks. Joining angers the rival bloc.</p>
    </div>
  );
}

function JoinButton({ bloc, blocked, onJoin }: { bloc: BlocId; blocked: boolean; onJoin: () => void }) {
  const game = useGame((s) => s.game);
  const why = joinBlocBlocker(game, bloc);
  return <button className="small" disabled={blocked || !!why} title={why ?? ''} onClick={onJoin}>Join {BLOCS[bloc].name}{why ? ` (${why})` : ''}</button>;
}


/** An ally is asking for help. Shown on the leader's main screen. */
export function AllyCallCard() {
  const { game, answerAlly } = useGame();
  const p = game.player!;
  const call = p.nation?.allyCall;
  if (!call) return null;
  const a = game.countries[call.from];
  return (
    <div className="panel">
      <h3>{a.name} asks for help</h3>
      <p>{call.reason} {a.leader.name} asks you to send {call.kind === 'aid' ? 'money' : 'troops'}.</p>
      <p className="muted small-text">
        {call.kind === 'aid' ? 'Helping costs a few billion but wins trust and a favor you can call in later.' : 'Sending troops weakens your army a little and worries voters, but earns two favors.'}
        {' '}Saying no hurts relations and may end the alliance. {call.monthsLeft} month{call.monthsLeft === 1 ? '' : 's'} to answer.
      </p>
      <div className="row">
        <button className="small" disabled={!!p.pendingEvent} onClick={() => answerAlly(true)}>Send {call.kind === 'aid' ? 'aid' : 'troops'}</button>
        <button className="small secondary" disabled={!!p.pendingEvent} onClick={() => answerAlly(false)}>Refuse</button>
      </div>
    </div>
  );
}

/** Your allies and what you can ask of them. */
export function AlliesCard() {
  const { game, askAlly } = useGame();
  const p = game.player!;
  const blocked = p.actionsLeft <= 0 || !!p.pendingEvent;
  const allies = alliesOf(game);
  return (
    <div className="card">
      <p><b>Your allies</b></p>
      {allies.length === 0 ? <p className="muted small-text">No allies yet. Sign a defense alliance or join a bloc.</p> : (
        <ul className="news">
          {allies.map((id) => {
            const a = game.countries[id];
            const f = p.nation?.favors?.[id] ?? 0;
            const aidWhy = askBlocker(game, id, 'aid');
            const troopWhy = askBlocker(game, id, 'troops');
            return (
              <li key={id}>
                <b>{a.name}</b> <span className="muted small-text">{TIERS[tierOf(a)].name} · {f > 0 ? `owes you ${f} favor${f === 1 ? '' : 's'}` : f < 0 ? `you owe ${-f} favor${f === -1 ? '' : 's'}` : 'even'}</span>
                <div className="row">
                  <button className="small" disabled={blocked || !!aidWhy} title={aidWhy ?? ''} onClick={() => askAlly(id, 'aid')}>Ask for ${aidAmount(a)}bn aid ({aidWhy ?? `${Math.round(helpChance(game, id, 'aid') * 100)}%`})</button>
                  {p.nation?.war && <button className="small" disabled={blocked || !!troopWhy} title={troopWhy ?? ''} onClick={() => askAlly(id, 'troops')}>Ask for troops ({troopWhy ?? `${Math.round(helpChance(game, id, 'troops') * 100)}%`})</button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted small-text">Allies say yes more often when they like you and owe you favors. Each yes means you owe them.</p>
    </div>
  );
}
