import { DataTable, type Column } from './DataTable';
import type { Country } from '../sim/types';
import { useState } from 'react';
import { useGame } from '../store';
import { NATIONAL_LAWS, PRIORITY_LABEL, type NationalPriority } from '../data/nation-content';
import { ADDRESS_COOLDOWN, TRADE_MIN_RELATION, WAR_MAX_RELATION, canAddress, deficit, SUMMIT_COOLDOWN, allianceBlocker, canHostSummit, forecastNationalLaw, peaceChance, relationWith, removalRisk, totalSpending } from '../sim/nation';
import type { Nation as NationT } from '../sim/types';
import { Effects } from './effects';
import { Stat } from './Stat';
import { parliamentShift } from '../sim/systems';
import { TRAITS } from '../data/people';
import { countryLabel } from '../data/local-names';
import { Flag } from './Flag';
import { LeaderLink } from './LeaderCard';
import { SpyWatch } from './Abroad';
import { armsBlocker, armsCost, inviteBlocker, nuclearShield, TIERS, tierOf } from '../sim/geo';
import { BLOCS, RESOURCES } from '../data/geo';
import { AllyCallCard, AlliesCard, BlocActions, OfferCard } from './WorldPower';
import { PolicyPanel, SpyRow } from './Society';

const f1 = (n: number) => n.toFixed(1);
const n0 = (n: number) => Math.round(n).toString();
const PRIORITIES = Object.keys(PRIORITY_LABEL) as NationalPriority[];

function useBlocked() {
  const p = useGame((s) => s.game.player)!;
  return p.actionsLeft <= 0 || !!p.pendingEvent;
}

function Economy() {
  const { game } = useGame();
  const p = game.player!;
  const c = game.countries[p.countryId];
  const e = c.economy;
  return (
    <div className="panel">
      <h3>The economy of {c.name}</h3>
      <div className="cols">
        <div>
          <p>Growth <b className={e.growth < 0 ? 'neg' : ''}>{f1(e.growth)}%</b> · Unemployment <b>{f1(e.unemployment)}%</b> · Inflation <b>{f1(e.inflation)}%</b></p>
          <p>Debt <b>{n0(e.debtToGdp)}%</b> of GDP · GDP <b>${n0(e.gdpBn)}bn</b></p>
        </div>
        <Stat label="Stability" value={c.stability} />
      </div>
    </div>
  );
}

function BudgetPanel({ nation }: { nation: NationT }) {
  const setNationalBudget = useGame((s) => s.setNationalBudget);
  const [tax, setTax] = useState(nation.taxRate);
  const [sp, setSp] = useState(nation.spending);
  const [pr, setPr] = useState(nation.priorities);
  const total = PRIORITIES.reduce((a, k) => a + pr[k], 0) || 1;
  const dirty = tax !== nation.taxRate || sp !== nation.spending || PRIORITIES.some((k) => pr[k] !== nation.priorities[k]);
  const draft = { ...nation, taxRate: tax, spending: sp };
  const d = deficit(draft);
  return (
    <div className="panel">
      <h3>National budget</h3>
      <div className="cols">
        <div>
          <label>Taxes {tax}% of the economy
            <input type="range" min={10} max={55} value={tax} onChange={(e) => setTax(Number(e.target.value))} />
          </label>
          <label>Spending {sp}% of the economy
            <input type="range" min={10} max={60} value={sp} onChange={(e) => setSp(Number(e.target.value))} />
          </label>
          <p>Total spending (with laws) <b>{f1(totalSpending(draft))}%</b> · Yearly {d > 0 ? 'deficit' : 'surplus'} <b className={d > 0 ? 'neg' : 'pos'}>{f1(Math.abs(d))}%</b></p>
          <p className="muted small-text">A deficit adds to the national debt. Higher taxes hurt growth and mood.</p>
        </div>
        <div>
          {PRIORITIES.map((k) => (
            <label key={k}>{PRIORITY_LABEL[k]} {Math.round((pr[k] / total) * 100)}%
              <input type="range" min={0} max={60} value={pr[k]} onChange={(e) => setPr({ ...pr, [k]: Number(e.target.value) })} />
            </label>
          ))}
        </div>
      </div>
      <button className="small" disabled={!dirty} onClick={() => setNationalBudget(tax, sp, pr)}>Apply budget</button>
    </div>
  );
}

function Parliament() {
  const { game, courtParliament, nationalAddress } = useGame();
  const blocked = useBlocked();
  const p = game.player!;
  const n = p.nation!;
  const parl = n.parliament;
  const risk = removalRisk(game);
  const wait = ADDRESS_COOLDOWN - (game.turn - n.lastAddressTurn);
  return (
    <div className="panel">
      <h3>{parl.name}</h3>
      <div className="cols">
        <div>
          <p>Your party holds <b>{parl.yourParty}</b> of {parl.seats} seats</p>
          <Stat label="Goodwill" value={parl.goodwill} />
          <p className={risk.risk > 0 ? 'neg' : 'muted'}>
            {risk.risk > 0 ? `Danger: you are at risk of ${risk.label.toLowerCase()}.` : `Risk of ${risk.label.toLowerCase()}: low for now.`}
          </p>
        </div>
        <div className="row">
          <button className="action" disabled={blocked} onClick={courtParliament}>Court lawmakers<small>Builds goodwill</small></button>
          <button className="action" disabled={blocked || !canAddress(game)} onClick={nationalAddress}>Address the nation<small>{canAddress(game) ? 'Boosts popularity' : `Again in ${Math.max(1, wait)} month${wait === 1 ? '' : 's'}`}</small></button>
        </div>
      </div>
    </div>
  );
}

function NationalLaws() {
  const { game, proposeNationalLaw, repealNationalLaw } = useGame();
  const blocked = useBlocked();
  const p = game.player!;
  const n = p.nation!;
  const active = NATIONAL_LAWS.filter((l) => n.laws.includes(l.id));
  const available = NATIONAL_LAWS.filter((l) => !n.laws.includes(l.id));
  return (
    <div className="panel">
      <h3>National laws</h3>
      <h4>Active laws</h4>
      {active.length === 0 && <p className="muted">No laws passed yet.</p>}
      <div className="card-grid">
        {active.map((l) => (
          <div key={l.id} className="card">
            <b>{l.name}</b>
            <p className="muted small-text">{l.blurb}</p>
            <Effects groups={l.groups} />
            <button className="small secondary" disabled={blocked} onClick={() => repealNationalLaw(l.id)}>Repeal</button>
            <span className="muted small-text"> Costs a little popularity</span>
          </div>
        ))}
      </div>
      <h4>Available laws</h4>
      <div className="card-grid">
        {available.map((l) => {
          const fc = forecastNationalLaw(p, l, parliamentShift(game));
          return (
            <div key={l.id} className="card">
              <b>{l.name}</b>
              <p className="muted small-text">{l.blurb}</p>
              <Effects groups={l.groups} />
              <p className="small-text">Forecast: <b className={fc.yes >= fc.needed ? 'pos' : 'neg'}>{fc.yes} of {n.parliament.seats} likely yes</b> (needs {fc.needed})</p>
              <button className="small" disabled={blocked} onClick={() => proposeNationalLaw(l.id)}>Propose</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Diplomacy() {
  const { game, stateVisit, tradeDeal, sanction, declareWar, seekPeace, hostSummit, foreignAid, formAlliance, armsDeal, inviteToBloc } = useGame();
  const blocked = useBlocked();
  const p = game.player!;
  const n = p.nation!;
  const others = Object.values(game.countries).filter((c) => c.id !== p.countryId);
  const war = n.war ? game.countries[n.war.enemy] : null;
  const cols: Column<Country>[] = [
    { key: 'country', label: 'Country', sort: (c) => countryLabel(c), filter: (c) => `${countryLabel(c)} ${BLOCS[c.bloc].name} ${TIERS[tierOf(c)].name}`, render: (c) => {
      const dealt = n.tradeDeals.includes(c.id);
      return <><Flag id={c.id} size={14} /> {countryLabel(c)} <span className="badge">{TIERS[tierOf(c)].name}</span><br /><span className="muted small-text">{BLOCS[c.bloc].name} · army {Math.round(c.military)}{c.nuclear ? ' · nuclear' : ''} · exports {RESOURCES[c.resource].name.toLowerCase()}</span>{dealt && <span className="pos small-text"> trade deal</span>}{n.alliances.includes(c.id) && <span className="badge good">Ally</span>}</>;
    } },
    { key: 'leader', label: 'Leader', className: 'small-text', sort: (c) => c.leader.name, filter: (c) => c.leader.name, render: (c) => <>
                <LeaderLink id={c.id} />{c.junta && <span className="badge warn">Military rule</span>}<br /><span className="muted">{c.leader.traits.map((t) => TRAITS[t].name).join(', ')}{c.decisions?.[0] && <><br />Latest: {c.decisions[0]}</>}</span>
</> },
    { key: 'rel', label: 'Relations', sort: (c) => relationWith(game, c.id), render: (c) => { const rel = relationWith(game, c.id); return <span className={rel >= 30 ? 'pos' : rel <= -30 ? 'neg' : ''}>{Math.round(rel)}</span>; } },
    { key: 'actions', label: 'Actions', render: (c) => {
              const rel = relationWith(game, c.id);
              const dealt = n.tradeDeals.includes(c.id);
              const canTrade = !dealt && rel >= TRADE_MIN_RELATION;
              const shield = nuclearShield(game, c.id);
              const canWar = !n.war && rel <= WAR_MAX_RELATION && !shield;
              const armsWhy = armsBlocker(game, c.id);
              const inviteWhy = inviteBlocker(game, c.id);
              const showInvite = inviteWhy !== 'Only the bloc leader can invite' && inviteWhy !== 'You are not in a bloc' && inviteWhy !== 'Already a member';
      return (
        <details>
                    <summary>Actions</summary>
                    <div className="row">
                      <button className="small" disabled={blocked} onClick={() => stateVisit(c.id)}>State visit</button>
                      <button className="small" disabled={blocked || !canTrade} title={dealt ? 'Already signed' : `Needs relations of ${TRADE_MIN_RELATION}+`} onClick={() => tradeDeal(c.id)}>Trade deal</button>
                      <button className="small" disabled={blocked} title="$10bn, +12 relations" onClick={() => foreignAid(c.id)}>Foreign aid</button>
                      <button className="small" disabled={blocked || !!allianceBlocker(game, c.id)} title={allianceBlocker(game, c.id) ?? 'Defense pact'} onClick={() => formAlliance(c.id)}>Alliance{allianceBlocker(game, c.id) && !n.alliances.includes(c.id) ? ` (${allianceBlocker(game, c.id)})` : ''}</button>
                      {!armsWhy && <button className="small" disabled={blocked} title={`$${armsCost(game.countries[p.countryId])}bn, stronger army`} onClick={() => armsDeal(c.id)}>Buy arms</button>}
                      {showInvite && <button className="small" disabled={blocked || !!inviteWhy} title={inviteWhy ?? 'Bring them into your bloc'} onClick={() => inviteToBloc(c.id)}>Invite to bloc{inviteWhy ? ` (${inviteWhy})` : ''}</button>}
                      <button className="small secondary" disabled={blocked} onClick={() => sanction(c.id)}>Sanction</button>
                      <SpyRow target={c.id} />
                      <button className="small secondary" disabled={blocked || !canWar} title={n.war ? 'You are already at war' : shield ?? `Needs relations of ${WAR_MAX_RELATION} or worse`} onClick={() => declareWar(c.id)}>Declare war{shield ? ' (nuclear deterrence)' : ''}</button>
                    </div>
                    </details>
      );
    } },
  ];
  return (
    <div className="panel dip">
      <h3>Diplomacy</h3>
      {n.war && war && (
        <div className="card">
          <p><b className="neg">At war with {war.name}</b> for {n.war.months} month{n.war.months === 1 ? '' : 's'}. War score: <b className={n.war.score < 0 ? 'neg' : 'pos'}>{n0(n.war.score)}</b></p>
          <button className="small" disabled={blocked} onClick={seekPeace}>Seek peace ({Math.round(peaceChance(game) * 100)}% chance)</button>
        </div>
      )}
      <BlocActions />
      <AlliesCard />
      <SpyWatch />
      <div className="row">
        <button className="action" disabled={blocked || !canHostSummit(game)} onClick={hostSummit}>Host summit<small>{canHostSummit(game) ? '$5bn · everyone warms to you' : `Once every ${SUMMIT_COOLDOWN} months (${Math.max(1, SUMMIT_COOLDOWN - (game.turn - n.lastSummitTurn))} to go)`}</small></button>
      </div>
      <DataTable
        rows={others}
        columns={cols}
        rowKey={(c) => c.id}
        filterPlaceholder="Filter by country, leader, bloc"
        extraFilter={{ label: 'Relations', options: [{ value: 'good', label: 'Friendly (30+)' }, { value: 'bad', label: 'Hostile (-30 or less)' }, { value: 'trade', label: 'Can sign trade deal' }, { value: 'allies', label: 'Allies' }], test: (c, v) => { const r = relationWith(game, c.id); return v === 'good' ? r >= 30 : v === 'bad' ? r <= -30 : v === 'allies' ? n.alliances.includes(c.id) : !n.tradeDeals.includes(c.id) && r >= TRADE_MIN_RELATION; } }}
      />
      <p className="muted small-text">Trade deals need relations of {TRADE_MIN_RELATION}+. War needs relations of {WAR_MAX_RELATION} or worse. Sanctions hurt relations and end trade deals. Trade deals bring in the partner's exports: oil cuts inflation, food adds stability, technology and minerals add growth, factories add jobs. Big powers win wars more easily, and nuclear powers can't be invaded.</p>
    </div>
  );
}

export function Nation({ part = 'all' }: { part?: 'all' | 'job' } = {}) {
  const { game } = useGame();
  const n = game.player!.nation;
  if (!n) return null;
  return (
    <>
      <AllyCallCard />
      <OfferCard />
      <Economy />
      <BudgetPanel key={game.turn} nation={n} />
      <Parliament />
      <NationalLaws />
      <PolicyPanel />
      {part === 'all' && <Diplomacy />}
      <div className="panel">
        <h3>Your legacy</h3>
        <p><b>{Math.round(n.legacy)}</b> points <span className="muted">(grows while you lead well)</span></p>
      </div>
    </>
  );
}
