import { CareerSoFar } from './Career';
import { CountryScores } from './Society';
import { WorldPower } from './WorldPower';
import { WorldTable } from './WorldTable';
import { HomeTurf, PlaytimePanel, Reputation, Skeletons } from './You';
import { scandalRisk } from '../sim/scandals';
import { formatPlaytime } from '../sim/playtime';
import { useEffect, useState } from 'react';
import { useGame } from '../store';
import { OFFICE_NAMES, SYSTEMS } from '../data/systems';
import { ACTION_INFO, STANDING_LABEL, availableActions, comebackOptions } from '../sim/career';
import { RESERVE_RATE, cityRevenue } from '../sim/city';
import { deficit } from '../sim/nation';
import { regionRevenue } from '../sim/governor';
import type { City, SpendKey } from '../sim/types';
import { campaignTip } from '../sim/mayor';
import { SaveMenu } from './SaveMenu';
import { Stat } from './Stat';
import { VoterGroups } from './VoterGroups';
import { Council } from './Council';
import { Projects } from './Projects';
import { Laws } from './Laws';
import { HigherOffice } from './HigherOffice';
import { kindOf } from '../sim/offices';
import { Legislator, VoteModal } from './Legislator';
import { k, moneyChange, treasuryOf } from './money';
import { Cabinet, AskModal } from './Cabinet';
import { Nation, Diplomacy } from './Nation';
import { Retired } from './Retired';
import { CountUp, EventArt, MuteButton, SoundSettings } from './Juice';
import { Flag } from './Flag';
import { Portrait } from './Portrait';
import { WorldContact } from './Abroad';
import { LeaderCardModal } from './LeaderCard';
import { AchievementsPanel, Coach } from './Extras';
import { BillModal, Cities, Legislature, StateLaws, StateOverview } from './Governor';
import { countryLabel } from '../data/local-names';
import { SYSTEM_RULES } from '../data/people';
import { People, FaithPanel } from './People';
import { SystemPanel } from './SystemPanel';
import { EffectLines, eventExtras } from './effects';
import { contactById } from '../sim/people';

function useIsPhone() {
  const q = '(max-width: 760px)';
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(q).matches);
  useEffect(() => {
    if (!window.matchMedia) return;
    const m = window.matchMedia(q);
    const on = () => setPhone(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return phone;
}

type Tab = 'job' | 'voters' | 'people' | 'you' | 'world' | 'more';
const TABS: [Tab, string][] = [['job', 'Job'], ['voters', 'Voters'], ['people', 'People'], ['you', 'You'], ['world', 'World'], ['more', 'More']];

const n0 = (n: number) => Math.round(n).toString();
const fmt = (n: number, d = 1) => n.toFixed(d);

function BudgetEditor({ city }: { city: City }) {
  const setBudget = useGame((s) => s.setBudget);
  const [tax, setTax] = useState(city.taxRate);
  const [sp, setSp] = useState(city.spending);
  const total = Object.values(sp).reduce((a, b) => a + b, 0);
  const dirty = tax !== city.taxRate || (Object.keys(sp) as SpendKey[]).some((k) => sp[k] !== city.spending[k]);
  return (
    <div>
      <h4>Budget</h4>
      <label>Local tax {fmt(tax)}%
        <input type="range" min={0} max={15} step={0.5} value={tax} onChange={(e) => setTax(Number(e.target.value))} />
      </label>
      {(Object.keys(sp) as SpendKey[]).map((k) => (
        <label key={k}>{k} {Math.round((sp[k] / (total || 1)) * 100)}%
          <input type="range" min={0} max={60} value={sp[k]} onChange={(e) => setSp({ ...sp, [k]: Number(e.target.value) })} />
        </label>
      ))}
      <button className="small" disabled={!dirty} onClick={() => setBudget(tax, sp)}>Apply budget</button>
      <p className="muted">Higher tax funds departments but hurts jobs and mood.</p>
    </div>
  );
}

type Sub = [string, string];

function SubTabs({ tabs, value, onChange }: { tabs: Sub[]; value: string; onChange: (v: string) => void }) {
  if (tabs.length < 2) return null;
  return (
    <div className="subtabs" role="tablist">
      {tabs.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={value === id} className={`subtab${value === id ? ' active' : ''}`} onClick={() => onChange(id)}>{label}</button>
      ))}
    </div>
  );
}

export function Game() {
  const { game, nextTurn, act, resolveEvent, runAgain, quitToMenu } = useGame();
  const phone = useIsPhone();
  const [tab, setTab] = useState<Tab>('job');
  const [subs, setSubs] = useState<Partial<Record<Tab, string>>>({});
  const p = game.player!;
  const home = game.countries[p.countryId];
  const sys = SYSTEMS[home.systemId];
  const c = p.campaign;
  const city = p.city;
  const kind = kindOf(p.office);
  const governor = kind === 'regional' && !!p.region;
  const bill = !!p.region?.pendingBill;
  const lawmaker = kind === 'legislative' && !!p.seat;
  const voting = !!p.seat?.pendingVote;
  const minister = kind === 'cabinet' && !!p.ministry;
  const asking = !!p.ministry?.pendingAsk;
  const leader = kind === 'head' && !!p.nation;
  function kpiMoney(): { label: string; value: number; perMonth?: number; bn?: boolean; debt?: boolean } | null {
    if (minister) return { label: 'Ministry budget', value: p.ministry!.budget, bn: true };
    if (leader) return { label: 'National debt (% of GDP)', value: home.economy.debtToGdp, debt: true };
    if (lawmaker) return { label: 'District funding won', value: p.seat!.districtFunding };
    if (governor) return { label: 'State treasury', value: p.region!.treasury, perMonth: regionRevenue(p.region!) * RESERVE_RATE };
    if (kind === 'local' && city && p.office) return { label: 'City treasury', value: city.treasury, perMonth: cityRevenue(city) * RESERVE_RATE };
    return null;
  }
  const actions = availableActions(sys.advancement, !!c, !!p.office, kind === 'local');
  const money = kpiMoney();
  const where = governor ? ` of ${p.region!.name}` : kindOf(p.office) === 'legislative' && p.seat ? `, ${p.seat.chamber}` : kindOf(p.office) === 'local' ? ` of ${city?.name}` : '';
  const title = p.office ? `${OFFICE_NAMES[p.office]}${where}` : c ? `Candidate for ${OFFICE_NAMES[c.office]}` : 'Out of office';

  if (p.retired) return <Retired />;
  const blockedNext = !!p.pendingEvent || bill || voting || asking;
  const needsAnswer = blockedNext;
  const localCity = !governor && !lawmaker && !minister && !leader && !!city;
  const abroad = !!p.office && (kind === 'local' || kind === 'regional');

  // Sub-tabs for each tab. The first one is the default.
  const jobSubs: Sub[] = governor ? [['main', 'State'], ['cities', 'Cities'], ['legis', 'Legislature'], ['laws', 'Laws']]
    : kind === 'local' && city ? [['main', 'City'], ['council', 'Council'], ['projects', 'Projects'], ['laws', 'Laws']]
    : leader ? [['main', 'Nation']] : [['main', lawmaker ? 'Your seat' : minister ? 'Ministry' : 'Overview']];
  if (abroad) jobSubs.push(['abroad', 'Abroad']);
  if (p.office) jobSubs.push(['next', 'Next step']);
  const SUBS: Record<Tab, Sub[]> = {
    job: jobSubs,
    voters: [['actions', 'Actions'], ['groups', 'Voter groups'], ['faith', 'Faith']],
    people: [['politicians', 'Politicians'], ['system', SYSTEM_RULES[home.systemId].meter]],
    you: [['rep', 'Reputation'], ['home', 'Home turf'], ['scandals', 'Scandals'], ['career', 'Career']],
    world: [['news', 'News'], ['countries', 'Countries'], ['power', 'Powers'], ['scores', 'Country scores'], ...(leader ? [['diplomacy', 'Diplomacy'] as Sub] : [])],
    more: [['saves', 'Saves'], ['achievements', 'Achievements'], ['settings', 'Sound & time']],
  };
  const sub = (t: Tab) => { const list = SUBS[t]; const v = subs[t]; return list.some(([id]) => id === v) ? v! : list[0][0]; };
  const s = sub(tab);
  const at = (t: Tab, id: string) => tab === t && s === id;
  const goTab = (t: Tab) => { setTab(t); window.scrollTo(0, 0); };

  return (
    <div className={phone ? 'grid phone' : 'grid'}>
      <div className="panel header">
        <div>
          <h2>{p.name} <MuteButton /></h2>
          <p>{title} · <Flag id={home.id} size={14} /> {countryLabel(home)} <span className="muted">({sys.name})</span></p>
          <p className="muted">
            {game.year}-{String(game.month).padStart(2, '0')} · Age {p.age} · Record {p.record.won}W–{p.record.lost}L
            {p.office && ` · Term: ${p.termMonthsLeft} mo left`} · Played {formatPlaytime(game.playSeconds ?? 0)}
          </p>
        </div>
        <div className="kpis">
          <div><b><CountUp value={p.popularity} format={n0} /></b><span>Popularity</span></div>
          <div><b>$<CountUp value={p.funds} format={n0} />k</b><span>Campaign funds</span></div>
          {money && <div><b className={money.value < 0 ? 'neg' : ''}>{money.bn ? `$${money.value.toFixed(1)}bn` : money.debt ? `${Math.round(money.value)}%` : k(money.value)}</b><span>{money.label}{money.debt && p.nation && ` · yearly ${deficit(p.nation) > 0 ? 'deficit' : 'surplus'} ${Math.abs(deficit(p.nation)).toFixed(1)}%`}{money.perMonth !== undefined && ` (+${k(money.perMonth)}/mo)`}</span></div>}
          <div title={SYSTEM_RULES[home.systemId].meterBlurb}><b>{n0(p.sys.meter)}</b><span>{SYSTEM_RULES[home.systemId].meter}</span></div>
          <div><b>{n0(p.loyalty)}</b><span>{STANDING_LABEL[sys.advancement]}</span></div>
          <div title="Chance a scandal hurts you. See the You tab."><b className={scandalRisk(p) >= 50 ? 'neg' : ''}>{scandalRisk(p)}</b><span>Scandal risk</span></div>
          <div><b>{p.actionsLeft}</b><span>Actions</span></div>
        </div>
      </div>

      {!phone && (
        <nav className="topbar">
          <div className="tabs-desk" role="tablist">
            {TABS.map(([t, label]) => (
              <button key={t} role="tab" aria-selected={tab === t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => goTab(t)}>
                {label}{t === 'job' && needsAnswer && ' •'}
              </button>
            ))}
          </div>
          <span style={{ flex: 1 }} />
          <button className="next" onClick={nextTurn} disabled={blockedNext}>Next month → <small>({p.actionsLeft} action{p.actionsLeft === 1 ? '' : 's'} left)</small></button>
          <button className="secondary" onClick={quitToMenu}>Main menu</button>
        </nav>
      )}

      <div className="tabpage">
        <SubTabs tabs={SUBS[tab]} value={s} onChange={(v) => setSubs({ ...subs, [tab]: v })} />

        {tab === 'job' && c && (
          <div className="panel">
            <h3>Campaign: {OFFICE_NAMES[c.office]}{c.incumbent ? ' (re-election)' : ''}</h3>
            <p>{c.monthsLeft} month{c.monthsLeft === 1 ? '' : 's'} to {sys.advancement === 'election' ? 'election day' : sys.advancement === 'shares' ? 'the shareholder vote' : 'the party decision'}.</p>
            <div className="poll">
              <div className="you" style={{ width: `${c.poll}%` }}>You {fmt(c.poll, 0)}%</div>
              <div className="them">{c.rival.name} {fmt(100 - c.poll, 0)}%</div>
            </div>
            <p className="muted"><Portrait name={c.rival.name} size={28} /> Rival: {c.rival.name}, {c.rival.party} · popularity {n0(c.rival.popularity)} · funds ${n0(c.rival.funds)}k</p>
            <p className="tip"><b>Tip:</b> {campaignTip(game)} Campaign actions are under <button className="linkish" onClick={() => { setSubs({ ...subs, voters: 'actions' }); goTab('voters'); }}>Voters → Actions</button>.</p>
          </div>
        )}

        {tab === 'job' && !c && !p.office && (
          <div className="panel">
            <h3>Out of office</h3>
            <p>You lost your last race, but politics is a long game. Build up your popularity and funds, then pick your next run.</p>
            <div className="actions">
              {comebackOptions(game).map((o) => <button key={o} onClick={() => runAgain(o)}>Run for {OFFICE_NAMES[o]}</button>)}
            </div>
          </div>
        )}

        {at('voters', 'actions') && <div className="panel">
          <h3>Actions <span className="muted">({p.actionsLeft} left this month)</span></h3>
          <div className="actions">
            {actions.map((a) => {
              const info = ACTION_INFO[a];
              const locked = a === 'debate' && (!c || c.monthsLeft > 2);
              return (
                <button key={a} className="action" disabled={p.actionsLeft <= 0 || p.funds < info.cost || locked || !!p.pendingEvent || bill || voting || asking} onClick={() => act(a)}>
                  {info.label}<small>{info.hint}{info.cost ? ` · $${info.cost}k` : ''}{a === 'fundraise' ? ' · some donors want favors' : ''}</small>
                </button>
              );
            })}
          </div>
        </div>}
        {at('voters', 'groups') && <VoterGroups />}
        {at('voters', 'faith') && <FaithPanel />}

        {at('people', 'politicians') && <People />}
        {at('people', 'system') && <SystemPanel />}

        {at('you', 'rep') && <Reputation />}
        {at('you', 'home') && <HomeTurf />}
        {at('you', 'scandals') && <Skeletons />}
        {at('you', 'career') && <CareerSoFar />}

        {governor && at('job', 'main') && <StateOverview />}
        {governor && at('job', 'cities') && <Cities />}
        {governor && at('job', 'legis') && <Legislature />}
        {governor && at('job', 'laws') && <StateLaws />}
        {lawmaker && at('job', 'main') && <Legislator />}
        {minister && at('job', 'main') && <Cabinet />}
        {leader && at('job', 'main') && <Nation part="job" />}
        {leader && at('world', 'diplomacy') && <Diplomacy />}

        {localCity && at('job', 'main') && (
          <div className="panel">
            <h3>{city!.name} <span className="muted">pop. {n0(city!.population)}k</span></h3>
            <div className="cols">
              <div>
                <Stat label="Happiness" value={city!.happiness} />
                <Stat label="Jobs" value={city!.jobs} />
                <Stat label="Services" value={city!.services} />
                <Stat label="Culture" value={city!.culture} />
                <Stat label="Crime" value={city!.crime} good={false} />
                <p>Treasury <b className={city!.treasury < 0 ? 'neg' : ''}>${n0(city!.treasury)}k</b> · Revenue ${n0(cityRevenue(city!))}k/mo · Tax {fmt(city!.taxRate)}%</p>
              </div>
              {p.office ? <BudgetEditor key={`${game.turn}`} city={city!} /> : <p className="muted">Win office to set the city budget.</p>}
            </div>
          </div>
        )}

        {kind === 'local' && city && at('job', 'council') && <Council />}
        {kind === 'local' && city && at('job', 'projects') && <Projects />}
        {kind === 'local' && city && at('job', 'laws') && <Laws />}
        {abroad && at('job', 'abroad') && <WorldContact />}
        {p.office && at('job', 'next') && <HigherOffice />}

        {at('world', 'news') && <div className="panel">
          <h3>News</h3>
          <ul className="news">{game.log.slice(0, 30).map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>}
        {at('world', 'countries') && <div className="panel"><h3>World</h3><p className="scroll-hint">Swipe the table sideways to see more. Tap a header to sort.</p><WorldTable /></div>}
        {at('world', 'power') && <WorldPower />}
        {at('world', 'scores') && <CountryScores />}

        {at('more', 'saves') && <SaveMenu canSave />}
        {at('more', 'achievements') && <AchievementsPanel />}
        {at('more', 'settings') && <><PlaytimePanel /><SoundSettings /></>}
      </div>

      {phone && (
        <nav className="bottombar">
          <div className="tabs">
            {TABS.map(([t, label]) => (
              <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => goTab(t)}>
                {label}{t === 'job' && needsAnswer && <i className="dot" />}
              </button>
            ))}
          </div>
          <div className="row nextrow">
            <button className="next" onClick={nextTurn} disabled={blockedNext}>Next month · {p.actionsLeft} action{p.actionsLeft === 1 ? '' : 's'} left</button>
            <button className="secondary menu" onClick={quitToMenu} aria-label="Main menu">Menu</button>
          </div>
        </nav>
      )}

      {p.pendingEvent ? (
        <div className="modal">
          <div className="panel">
            <EventArt title={p.pendingEvent.title} text={p.pendingEvent.text} />
            <h3>{p.pendingEvent.title}</h3>
            <p>{p.pendingEvent.text}</p>
            {p.pendingEvent.choices.some((ch) => ch.effects.treasury || ch.effects.funds) && (
              <p className="money-line">
                {[treasuryOf(p) && `${treasuryOf(p)!.label}: ${k(treasuryOf(p)!.value)}`, (minister || leader) && `National debt: ${home.economy.debtToGdp.toFixed(1)}% of GDP`, `Campaign funds: ${k(p.funds)}`].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="actions">
              {p.pendingEvent.choices.map((ch, i) => {
                const m = moneyChange(p, ch.effects, home);
                return <button key={i} className="action" onClick={() => resolveEvent(i)}>{ch.label}<EffectLines e={ch.effects} />{eventExtras(ch.effects, home.systemId, contactById(p, p.pendingEvent!.contactId)?.name).map((x) => <small key={x.text} className={x.good ? 'pos' : 'neg'}>{x.text}</small>)}{m.map((t) => <small key={t} className="money">{t}</small>)}</button>;
              })}
            </div>
          </div>
        </div>
      ) : null}
      <LeaderCardModal />
      <Coach />
      {p.pendingEvent ? null : governor && bill ? <BillModal /> : lawmaker && voting ? <VoteModal /> : minister && asking ? <AskModal /> : null}
    </div>
  );
}
