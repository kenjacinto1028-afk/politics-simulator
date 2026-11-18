import { useGame } from '../store';
import { REP_AXES, HOMETOWN_COST, homeOf, hometownBlocker, opinionOf, opinionWord, repLabels, repOf, supportByArea } from '../sim/reputation';
import { scandalOf, scandalRisk } from '../sim/scandals';
import { visibleContacts } from '../sim/people';
import { formatPlaytime, totalPlaySeconds } from '../sim/playtime';
import { Stat } from './Stat';

// The "You" tab: your reputation, your home turf and your skeletons.

function Axis({ value, plus, minus }: { value: number; plus: string; minus: string }) {
  const v = Math.max(-100, Math.min(100, value));
  const style = v >= 0 ? { left: '50%', width: `${v / 2}%` } : { left: `${50 + v / 2}%`, width: `${-v / 2}%` };
  return (
    <div className="axis">
      <span className={v < -19 ? 'on' : ''}>{minus}</span>
      <div className="relbar"><div className="mid" /><div className={`fillrel ${v >= 0 ? 'up' : 'down'}`} style={style} /></div>
      <span className={v > 19 ? 'on' : ''}>{plus}</span>
    </div>
  );
}

export function Reputation() {
  const { game } = useGame();
  const p = game.player!;
  const r = repOf(p);
  const labels = repLabels(p);
  const views = visibleContacts(game).filter((c) => c.rung >= 0).map((c) => ({ c, o: opinionOf(p, c) })).sort((a, b) => b.o.score - a.o.score);
  const fans = views.filter((v) => v.o.score >= 7);
  const foes = views.filter((v) => v.o.score <= -7).reverse();
  return (
    <div className="panel">
      <h3>Your reputation</h3>
      <p>{labels.length ? <>People see you as: {labels.map((l) => <span key={l} className="badge">{l}</span>)}</> : <span className="muted">No clear reputation yet. Your choices will shape it.</span>}</p>
      {REP_AXES.map((a) => <div key={a.id} title={a.blurb}><Axis value={r[a.id]} plus={a.plus} minus={a.minus} /></div>)}
      <p className="muted small-text">Every choice you make moves these. Politicians react to them each month, depending on their own personality.</p>
      <h4>How politicians see you</h4>
      <div className="cols">
        <div>
          <b className="pos">Like you</b>
          {fans.length ? <ul className="plain">{fans.slice(0, 5).map(({ c, o }) => <li key={c.id}>{c.name} <span className="muted small-text">({c.role}) {o.reasons[0] ?? opinionWord(o.score).toLowerCase()}</span></li>)}</ul> : <p className="muted small-text">Nobody yet.</p>}
        </div>
        <div>
          <b className="neg">Don't like you</b>
          {foes.length ? <ul className="plain">{foes.slice(0, 5).map(({ c, o }) => <li key={c.id}>{c.name} <span className="muted small-text">({c.role}) {o.reasons[0] ?? opinionWord(o.score).toLowerCase()}</span></li>)}</ul> : <p className="muted small-text">Nobody yet.</p>}
        </div>
      </div>
    </div>
  );
}

export function HomeTurf() {
  const { game, visitHometown } = useGame();
  const p = game.player!;
  const h = homeOf(p);
  const s = supportByArea(p);
  const block = hometownBlocker(p);
  return (
    <div className="panel">
      <h3>Home turf</h3>
      <p>You come from <b>{h.city}</b> in <b>{h.region}</b>. Your strongest support is at home.</p>
      <Stat label="Home pride" value={h.pride} wide />
      <h4>Support by area</h4>
      <Stat label={h.city} value={s.city} wide />
      <Stat label={h.region} value={s.region} wide />
      <Stat label="Rest of country" value={s.rest} wide />
      <p className="muted small-text">Home pride grows while you serve your home city or region, and fades slowly when you are away. It adds votes in races near home, and a little in national races.</p>
      <button className="small" disabled={!!block || p.actionsLeft <= 0 || !!p.pendingEvent} title={block ?? undefined} onClick={visitHometown}>
        Visit hometown (1 action, ${HOMETOWN_COST}k)
      </button>
      {block && <span className="muted small-text"> {block}</span>}
    </div>
  );
}

export function Skeletons() {
  const { game } = useGame();
  const p = game.player!;
  const sc = scandalOf(p);
  const risk = scandalRisk(p);
  const holder = (id?: string) => p.contacts.find((c) => c.id === id);
  return (
    <div className="panel">
      <h3>Scandal risk <span className={`badge ${risk >= 50 ? 'warn' : risk < 20 ? 'good' : ''}`}>{risk >= 50 ? 'High' : risk >= 20 ? 'Medium' : 'Low'}</span></h3>
      <Stat label="Risk" value={risk} good={false} wide />
      <p className="muted small-text">Donor money with strings, side deals and cover-ups raise your risk. A free press digs harder. Rivals use what they find in campaigns or to pressure you. Scandals exposed so far: <b>{sc.exposed}</b>.</p>
      <h4>Skeletons in your closet</h4>
      {sc.secrets.length === 0 ? <p className="muted">None. Keep it that way.</p> : (
        <ul className="plain">
          {sc.secrets.map((s) => {
            const who = holder(s.holder);
            return (
              <li key={s.id}>
                You {s.text}. <span className={s.sev >= 2 ? 'neg' : 'muted'}>{['', 'Minor', 'Serious', 'Career-ending'][s.sev]}</span>
                {s.favor && s.due !== undefined && <span className="muted small-text"> · they will call in the favor{s.due <= game.turn ? ' any time now' : ` in about ${s.due - game.turn} months`}</span>}
                {who && <span className="neg small-text"> · {who.name} knows</span>}
                {s.buriedUntil && s.buriedUntil > game.turn && <span className="muted small-text"> · kept quiet for now</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function PlaytimePanel() {
  const game = useGame((s) => s.game);
  return (
    <div className="panel">
      <h3>Time played</h3>
      <p>This save: <b>{formatPlaytime(game.playSeconds ?? 0)}</b> · All games: <b>{formatPlaytime(totalPlaySeconds())}</b></p>
    </div>
  );
}

/** One line on a politician card: what they think of you and why. */
export function OpinionLine({ id }: { id: string }) {
  const game = useGame((s) => s.game);
  const p = game.player!;
  const c = p.contacts.find((x) => x.id === id);
  if (!c || c.rung < 0) return null;
  const o = opinionOf(p, c);
  return <p className="small-text"><span className={o.score >= 7 ? 'pos' : o.score <= -7 ? 'neg' : 'muted'}>{opinionWord(o.score)}</span>{o.reasons.length > 0 && <span className="muted">: {o.reasons.join(', ')}</span>}</p>;
}

