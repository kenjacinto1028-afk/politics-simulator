import { useGame } from '../store';
import { COMMITTEES, SPONSOR_BILLS, type CommitteeId } from '../data/legislature-content';
import { CHAIR_INFLUENCE, committeeChance, cosponsorsNeeded, floorBill, floorChance, fundingCost, isChair, sponsorBill } from '../sim/legislator';
import type { GroupId } from '../sim/types';
import { Effects } from './effects';
import { Stat } from './Stat';

const pct = (x: number) => `${Math.round(x * 100)}%`;

function useBlocked() {
  const p = useGame((s) => s.game.player)!;
  return p.actionsLeft <= 0 || !!p.pendingEvent || !!p.seat!.pendingVote;
}

export function SeatPanel() {
  const p = useGame((s) => s.game.player)!;
  const s = p.seat!;
  const laws = s.passed.map((id) => sponsorBill(id)?.name).filter(Boolean);
  return (
    <div className="panel">
      <h3>Your seat: {s.chamber} {isChair(s) && <span className="pos small-text">Committee chair</span>}</h3>
      <p>Your party: <b>{s.yourParty} of {s.seats}</b> seats</p>
      <Stat label="Influence" value={s.influence} wide />
      {!isChair(s) && <p className="muted small-text">At {CHAIR_INFLUENCE} you become a committee chair.</p>}
      <Stat label="Across the aisle" value={s.acrossAisle} wide />
      <p>Voted with your party <b>{s.votesWithParty}</b> {s.votesWithParty === 1 ? 'time' : 'times'}, against it <b>{s.votesAgainstParty}</b> {s.votesAgainstParty === 1 ? 'time' : 'times'}.</p>
      <p className="small-text"><b>Laws you passed:</b> {laws.length ? laws.join(', ') : <span className="muted">none yet</span>}</p>
    </div>
  );
}

export function CommitteePanel() {
  const { game, chooseCommittee } = useGame();
  const s = game.player!.seat!;
  const blocked = useBlocked();
  return (
    <div className="panel">
      <h3>Committee</h3>
      <p>Your committee: <b>{s.committee ? COMMITTEES[s.committee].name : 'None yet'}</b></p>
      <div className="card-grid">
        {(Object.keys(COMMITTEES) as CommitteeId[]).map((id) => (
          <div key={id} className="card">
            <b>{COMMITTEES[id].name}</b>
            <p className="muted small-text">{COMMITTEES[id].perk}</p>
            <button className="small" disabled={blocked || s.committee === id} onClick={() => chooseCommittee(id)}>{s.committee === id ? 'Joined' : 'Join'}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LawmakerActions() {
  const { game, floorSpeech, crossAisle, secureFunding } = useGame();
  const s = game.player!.seat!;
  const blocked = useBlocked();
  const cost = fundingCost(s);
  return (
    <div className="panel">
      <h3>Lawmaker actions</h3>
      <div className="actions">
        <button className="action" disabled={blocked} onClick={floorSpeech}>Floor speech<small>More popularity and influence</small></button>
        <button className="action" disabled={blocked} onClick={crossAisle}>Lunch with the other party<small>Better ties across the aisle</small></button>
        <button className="action" disabled={blocked || s.influence < cost} onClick={secureFunding}>Win funding for your district<small>Costs {cost} influence</small></button>
      </div>
      <p className="muted small-text">District funding won so far: ${Math.round(s.districtFunding)}k</p>
    </div>
  );
}

const STEPS = [['cosponsors', 'Co-sponsors'], ['committee', 'Committee'], ['floor', 'Floor vote']] as const;

export function YourBill() {
  const { game, startSponsoring, gatherCosponsors, dropBill } = useGame();
  const s = game.player!.seat!;
  const blocked = useBlocked();
  const sp = s.sponsoring;
  const bill = sp ? sponsorBill(sp.billId) : undefined;
  if (sp && bill) {
    const need = cosponsorsNeeded(s);
    const cur = STEPS.findIndex(([id]) => id === sp.stage);
    return (
      <div className="panel">
        <h3>Your bill: {bill.name}</h3>
        <p className="muted small-text">{bill.blurb}</p>
        <div className="steps">
          {STEPS.map(([id, label], i) => <span key={id} className={`step${i === cur ? ' now' : i < cur ? ' done' : ''}`}>{i + 1}. {label}</span>)}
        </div>
        {sp.stage === 'cosponsors' && (
          <>
            <p>{Math.min(sp.cosponsors, need)} of {need} co-sponsors</p>
            <div className="bar"><div className="fill up" style={{ width: `${Math.min(100, (sp.cosponsors / need) * 100)}%` }} /></div>
            <div className="row"><button className="small" disabled={blocked} onClick={gatherCosponsors}>Gather co-sponsors</button></div>
          </>
        )}
        {sp.stage === 'committee' && <p className="small-text">Waiting in committee (month {sp.months + 1}). It dies if it is stuck too long.</p>}
        {sp.stage === 'floor' && <p className="small-text">The floor vote happens next month.</p>}
        <p className="small-text">Chance to clear committee each month: <b>{pct(committeeChance(s, bill))}</b> · Chance to pass the floor: <b>{pct(floorChance(s, bill))}</b></p>
        <button className="small secondary" onClick={dropBill}>Withdraw bill</button>
      </div>
    );
  }
  const available = SPONSOR_BILLS.filter((b) => !s.passed.includes(b.id));
  return (
    <div className="panel">
      <h3>Your bill</h3>
      <p className="muted">Pick one bill to push through the chamber. You can only carry one at a time.</p>
      {available.length === 0 && <p className="muted">You have passed every bill on offer.</p>}
      <div className="card-grid">
        {available.map((b) => (
          <div key={b.id} className="card">
            <b>{b.name}</b>
            <p className="muted small-text">{b.blurb}</p>
            <p className="small-text">Committee: {COMMITTEES[b.committee].name}</p>
            <Effects groups={b.groups} />
            <p className="small-text">Chance to pass the floor: <b>{pct(floorChance(s, b))}</b></p>
            <button className="small" disabled={blocked} onClick={() => startSponsoring(b.id)}>Introduce</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VoteModal() {
  const { game, castVote } = useGame();
  const s = game.player!.seat!;
  const pv = s.pendingVote;
  const bill = floorBill(pv?.billId);
  if (!pv || !bill) return null;
  const no: Partial<Record<GroupId, number>> = {};
  for (const [g, v] of Object.entries(bill.groups)) { const r = Math.round((v as number) * -0.5); if (r) no[g as GroupId] = r; }
  return (
    <div className="modal">
      <div className="panel">
        <h3>Floor vote: {bill.title}</h3>
        <p>{bill.text}</p>
        <p className={`party-line ${pv.partyWantsYes ? 'pos' : 'neg'}`}>Your party wants you to vote {pv.partyWantsYes ? 'YES' : 'NO'}</p>
        <p className="small-text"><b>If you vote yes, your district reacts:</b></p>
        <Effects groups={bill.groups} />
        <p className="small-text"><b>If you vote no:</b></p>
        <Effects groups={no} />
        <p className="muted small-text">Voting against your party lowers your party standing.</p>
        <div className="actions">
          <button onClick={() => castVote(true)}>Vote yes</button>
          <button className="secondary" onClick={() => castVote(false)}>Vote no</button>
        </div>
      </div>
    </div>
  );
}

export function Legislator() {
  return (
    <>
      <SeatPanel />
      <CommitteePanel />
      <LawmakerActions />
      <YourBill />
    </>
  );
}
