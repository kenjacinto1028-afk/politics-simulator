import { useState } from 'react';
import { useGame } from '../store';
import { FAITHS, FOCUSES, TRAITS } from '../data/people';
import { endorseBlocker, dealBlocker, currentRung, visibleContacts } from '../sim/people';
import { patronBlocker } from '../sim/systems';
import { kindOf } from '../sim/offices';
import type { Contact } from '../sim/types';
import { Stat } from './Stat';
import { Portrait } from './Portrait';

function RelBar({ value }: { value: number }) {
  const v = Math.max(-100, Math.min(100, value));
  const style = v >= 0 ? { left: '50%', width: `${v / 2}%` } : { left: `${50 + v / 2}%`, width: `${-v / 2}%` };
  return (
    <div title={`Relation ${Math.round(v)} (from -100 to 100)`}>
      <div className="relbar"><div className="mid" /><div className={`fillrel ${v >= 0 ? 'up' : 'down'}`} style={style} /></div>
    </div>
  );
}

const DEAL_NAME: Record<string, string> = {
  local: 'Sister-city pact',
  regional: 'Joint project',
  legislative: 'Co-sponsor a bill',
  cabinet: 'Joint program',
};

function ContactCard({ c, systemId }: { c: Contact; systemId: string }) {
  const { game, meetContact, askEndorsement, jointDeal, feud, choosePatron } = useGame();
  const p = game.player!;
  const busy = p.actionsLeft <= 0 || !!p.pendingEvent;
  const kind = kindOf(p.office);
  const endorse = endorseBlocker(p, c);
  const deal = dealBlocker(game, c);
  const patron = patronBlocker(game, c.id);
  const corrupt = c.traits.includes('corrupt');
  const dealName = (kind && DEAL_NAME[kind]) || 'Joint deal';
  return (
    <div className="card">
      <Portrait name={c.name} traits={c.traits} size={36} /> <b>{c.name}</b>
      {c.endorsed && <span className="badge good">Backing you</span>}
      {p.sys.patronId === c.id && <span className="badge good">Your patron</span>}
      <p className="muted small-text">{c.role} · {c.rung === -1 ? 'faith' : c.party === 'yours' ? 'your party' : 'rival party'}</p>
      <div>
        {c.traits.map((t) => <span key={t} className="tag" title={TRAITS[t].blurb}>{TRAITS[t].name}</span>)}
      </div>
      <p className="small-text">Cares about: {FOCUSES[c.focus].name} · Faith: {FAITHS[c.faith].name}</p>
      <RelBar value={c.relation} />
      <div className="row">
        <button className="small" disabled={busy} title={corrupt ? 'Expects a $10k gift' : undefined} onClick={() => meetContact(c.id)}>Meet{corrupt ? ' ($10k gift)' : ''}</button>
        {c.rung >= 0 && <button className="small" disabled={busy || !!endorse} title={endorse ?? 'Ask them to back your campaign'} onClick={() => askEndorsement(c.id)}>Ask for endorsement</button>}
        {c.rung >= 0 && c.rung === currentRung(game) && <button className="small" disabled={busy || !!deal} title={deal ?? dealName} onClick={() => jointDeal(c.id)}>{dealName}</button>}
        <button className="small secondary" disabled={busy || (c.id === 'leader' && kind === 'cabinet')} title={c.id === 'leader' && kind === 'cabinet' ? 'You serve in their cabinet' : 'Pleases your base, but makes an enemy'} onClick={() => feud(c.id)}>Attack publicly</button>
        {systemId === 'one-party' && <button className="small" disabled={busy || !!patron} title={patron ?? 'They will sponsor your career'} onClick={() => choosePatron(c.id)}>Make my patron</button>}
      </div>
      {c.rung >= 0 && (endorse || deal) && <p className="muted small-text">{[endorse && `Endorsement: ${endorse}`, deal && `Deal: ${deal}`].filter(Boolean).join(' · ')}</p>}
    </div>
  );
}

export function People() {
  const { game } = useGame();
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'relation' | 'name'>('default');
  const p = game.player!;
  if (p.retired) return null;
  const systemId = game.countries[p.countryId].systemId;
  const rung = currentRung(game);
  const everyone = visibleContacts(game);
  const needle = q.trim().toLowerCase();
  const all = everyone
    .filter((c) => !needle || `${c.name} ${c.role} ${c.party === 'yours' ? 'your party' : 'rival party'}`.toLowerCase().includes(needle))
    .slice()
    .sort((a, b) => (sortBy === 'relation' ? b.relation - a.relation : sortBy === 'name' ? a.name.localeCompare(b.name) : 0));
  const groups: [string, Contact[]][] = [
    ['At your level', all.filter((c) => c.rung >= 0 && c.rung === rung)],
    ['Above you', all.filter((c) => c.rung > rung)],
    ['Below you', all.filter((c) => c.rung >= 0 && c.rung < rung)],
    ['Faith leader', all.filter((c) => c.rung === -1)],
  ];
  return (
    <div className="panel">
      <h3>Politicians</h3>
      <p className="muted small-text">Build friendships, ask for backing in campaigns, sign deals with peers. Each costs an action. Attacking someone pleases your base but makes an enemy.</p>
      {everyone.length > 6 && (
        <div className="table-tools">
          <input type="search" value={q} placeholder="Filter by name, role or party" aria-label="Filter politicians" onChange={(e) => setQ(e.target.value)} />
          <select aria-label="Sort politicians" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
            <option value="default">Sort: default</option>
            <option value="relation">Sort: best relation</option>
            <option value="name">Sort: name</option>
          </select>
          <span className="count">{all.length} of {everyone.length}</span>
        </div>
      )}
      {groups.map(([title, list]) => list.length > 0 && (
        <div key={title}>
          <h4>{title}</h4>
          <div className="card-grid">{list.map((c) => <ContactCard key={c.id} c={c} systemId={systemId} />)}</div>
        </div>
      ))}
    </div>
  );
}

export function FaithPanel() {
  const { game, faithOutreach } = useGame();
  const p = game.player!;
  if (p.retired) return null;
  const home = game.countries[p.countryId];
  const busy = p.actionsLeft <= 0 || !!p.pendingEvent;
  const level = home.religiosity >= 65 ? 'high' : home.religiosity >= 35 ? 'medium' : 'low';
  return (
    <div className="panel">
      <h3>Faith</h3>
      <p>Your faith: <b>{FAITHS[p.faith].name}</b> · Main faith of {home.name}: <b>{FAITHS[home.faith].name}</b> (how religious: {level})</p>
      <Stat label="Faith leaders' favor" value={p.clergy} wide />
      <button className="small" disabled={busy} onClick={faithOutreach}>{p.faith === 'secular' ? 'Meet faith communities' : 'Attend services'}</button>
      <p className="muted small-text">Faith leaders sway voters, and it matters more in religious countries.</p>
    </div>
  );
}

