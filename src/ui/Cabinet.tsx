import { useGame } from '../store';
import { PORTFOLIOS, type InitiativeDef, type NationalShift, type PortfolioId } from '../data/cabinet-content';
import { BUDGET_ASK_MIN_BOSS, FIRED_BELOW, cabinetAsk, initiativeCost } from '../sim/cabinet';
import { REAPPOINT_AT } from '../sim/career';
import { Effects } from './effects';
import { Stat } from './Stat';

const bn = (n: number) => `$${n.toFixed(1)}bn`;
const SHIFT_LABEL: Record<keyof NationalShift, { text: string; lowerIsBetter?: boolean; unit?: string }> = {
  growth: { text: 'growth', unit: ' pts' },
  unemployment: { text: 'unemployment', lowerIsBetter: true, unit: ' pts' },
  inflation: { text: 'inflation', lowerIsBetter: true, unit: ' pts' },
  stability: { text: 'stability' },
  tourism: { text: 'tourism' },
  culture: { text: 'culture' },
  relations: { text: 'relations with other countries' },
};

export function NationalEffects({ shift }: { shift: NationalShift }) {
  const items = (Object.keys(shift) as (keyof NationalShift)[]).filter((key) => shift[key]);
  if (!items.length) return null;
  return (
    <p className="effects">
      <span className="muted">Country: </span>
      {items.map((key, i) => {
        const v = shift[key]!;
        const info = SHIFT_LABEL[key];
        const good = info.lowerIsBetter ? v < 0 : v > 0;
        return <span key={key}>{i > 0 && <span className="muted"> · </span>}<span className={good ? 'pos' : 'neg'}>{v > 0 ? '+' : ''}{v}{info.unit ?? ''} {info.text}</span></span>;
      })}
    </p>
  );
}

export function Cabinet() {
  const { game, choosePortfolio, launchInitiative, briefLeader, mediaTour, requestBudget } = useGame();
  const p = game.player!;
  const m = p.ministry!;
  const leader = game.countries[p.countryId].leader;
  const blocked = p.actionsLeft <= 0 || !!p.pendingEvent || !!m.pendingAsk;
  const port = m.portfolio ? PORTFOLIOS[m.portfolio] : null;

  function why(def: InitiativeDef): string | null {
    const cost = initiativeCost(m, def);
    if (m.done.includes(def.id)) return 'Already done';
    if (m.running.some((r) => r.id === def.id)) return 'Running now';
    if (m.running.length >= 2) return 'Two projects already running';
    if (m.budget < cost) return 'Not enough budget';
    if (p.actionsLeft <= 0) return 'No actions left';
    if (m.pendingAsk || p.pendingEvent) return 'Answer the pending question first';
    return null;
  }

  const canSwitch = m.boss >= 60;
  return (
    <>
      <div className="panel">
        <h3>{port ? `Minister: ${port.name}` : 'Your ministry'}</h3>
        <div className="cols">
          <div>
            <p>Budget <b>{bn(m.budget)}</b> <span className="muted">(yearly base {bn(m.baseBudget)}, refills monthly up to {bn(m.baseBudget * 1.5)})</span></p>
            <Stat label="Performance" value={m.performance} />
            <Stat label="Leader's trust" value={m.boss} />
          </div>
          <div>
            <p className="small-text">Your boss, {leader.name}, decides your fate. If trust drops below <b>{FIRED_BELOW}</b> you are fired.</p>
            <p className="small-text muted">At the end of your term there is a reshuffle. Keep trust at <b>{REAPPOINT_AT}</b> or more to stay on.</p>
            {m.boss < FIRED_BELOW + 10 && <p className="neg small-text">Warning: the leader is close to firing you.</p>}
          </div>
        </div>
      </div>

      {!port && (
        <div className="panel">
          <h3>Choose your ministry</h3>
          <p className="muted">Pick the area you will run. The first choice is free (it uses one action). Switching later needs the leader's trust at 60 or more and drops any running work.</p>
          <div className="card-grid">
            {(Object.keys(PORTFOLIOS) as PortfolioId[]).map((id) => (
              <div key={id} className="card">
                <b>{PORTFOLIOS[id].name}</b>
                <p className="muted small-text">{PORTFOLIOS[id].initiatives.length} projects to choose from</p>
                <button className="small" disabled={blocked} onClick={() => choosePortfolio(id)}>Take this ministry</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {port && (
        <div className="panel">
          <h3>Projects</h3>
          {m.running.length > 0 && (
            <>
              <h4>Running</h4>
              <ul>
                {m.running.map((r) => {
                  const def = port.initiatives.find((i) => i.id === r.id);
                  return <li key={r.id}>{def?.name ?? r.id}: {r.monthsLeft} month{r.monthsLeft === 1 ? '' : 's'} left</li>;
                })}
              </ul>
            </>
          )}
          <div className="card-grid">
            {port.initiatives.map((def) => {
              const reason = why(def);
              return (
                <div key={def.id} className="card">
                  <b>{def.name}</b>
                  <p className="muted small-text">{def.blurb}</p>
                  <p className="small-text">Cost {bn(initiativeCost(m, def))} · {def.months} months</p>
                  <NationalEffects shift={def.national} />
                  <Effects groups={def.groups} />
                  <button className="small" disabled={!!reason} onClick={() => launchInitiative(def.id)}>Launch</button>
                  {reason && <span className="muted small-text"> {reason}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="panel">
        <h3>Ministry actions <span className="muted">({p.actionsLeft} left this month)</span></h3>
        <div className="actions">
          <button className="action" disabled={blocked} onClick={briefLeader}>Brief the leader<small>Wins the leader's trust</small></button>
          <button className="action" disabled={blocked} onClick={mediaTour}>Media tour<small>Gain popularity, but the leader may be annoyed if you outshine them</small></button>
          <button className="action" disabled={blocked} onClick={requestBudget}>Ask for more budget<small>{m.boss >= BUDGET_ASK_MIN_BOSS ? 'Extra money, small trust cost' : `Needs trust ${BUDGET_ASK_MIN_BOSS}+ or it backfires`}</small></button>
        </div>
        {port && <p className="muted small-text">{canSwitch ? 'You may switch ministry by picking another below.' : 'Switching ministry needs trust of 60 or more.'}</p>}
        {port && canSwitch && (
          <div className="row">
            {(Object.keys(PORTFOLIOS) as PortfolioId[]).filter((id) => id !== m.portfolio).map((id) => (
              <button key={id} className="small secondary" disabled={blocked} onClick={() => choosePortfolio(id)}>Switch to {PORTFOLIOS[id].name}</button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function AskModal() {
  const { game, answerAsk } = useGame();
  const ask = cabinetAsk(game.player!.ministry!.pendingAsk);
  if (!ask) return null;
  const refuse: Record<string, number> = {};
  for (const [key, v] of Object.entries(ask.groups)) refuse[key] = -(v ?? 0) / 2;
  return (
    <div className="modal">
      <div className="panel">
        <h3>{ask.title}</h3>
        <p>{ask.text}</p>
        <p className="small-text"><b>If you back the leader</b></p>
        <p className="effects"><span className="pos">+8 leader's trust</span></p>
        <Effects groups={ask.groups} />
        <p className="small-text"><b>If you refuse</b></p>
        <p className="effects"><span className="neg">-12 leader's trust</span> <span className="muted">·</span> <span className="pos">+2 popularity</span></p>
        <Effects groups={refuse} />
        <div className="actions">
          <button onClick={() => answerAsk(true)}>Back the leader</button>
          <button className="secondary" onClick={() => answerAsk(false)}>Refuse</button>
        </div>
      </div>
    </div>
  );
}
