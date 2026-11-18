import { create } from 'zustand';
import { useGame } from '../store';
import { FOCUSES, TRAITS } from '../data/people';
import { SYSTEMS } from '../data/systems';
import { BLOCS, isRival } from '../data/geo';
import { countryLabel } from '../data/local-names';
import { TIERS, tierOf } from '../sim/geo';
import { Flag } from './Flag';
import { Portrait } from './Portrait';
import type { Country, GameState } from '../sim/types';

// Tap a leader to see who they are and how they feel about you.

const useProfile = create<{ id: string | null; open: (id: string) => void; close: () => void }>((set) => ({
  id: null, open: (id) => set({ id }), close: () => set({ id: null }),
}));

/** A leader's face and name you can tap to open their profile. */
export function LeaderLink({ id, size = 32, name = true }: { id: string; size?: number; name?: boolean }) {
  const c = useGame((s) => s.game.countries[id]);
  const open = useProfile((s) => s.open);
  if (!c) return null;
  return (
    <button className="leader-link" onClick={() => open(id)} title={`About ${c.leader.name}`}>
      <Portrait name={c.leader.name} traits={c.leader.traits} junta={!!c.junta} size={size} />
      {name && <span>{c.leader.name}</span>}
    </button>
  );
}

function attitude(rel: number) {
  return rel >= 60 ? ['Close friend', 'pos'] : rel >= 25 ? ['Friendly', 'pos'] : rel > -25 ? ['Neutral', ''] : rel > -60 ? ['Cold', 'neg'] : ['Hostile', 'neg'];
}

function ties(g: GameState, c: Country): string[] {
  const p = g.player;
  if (!p) return [];
  const n = p.nation;
  const out: string[] = [];
  if (n?.alliances.includes(c.id)) out.push('Your ally');
  if (n?.tradeDeals.includes(c.id)) out.push('Trade deal with you');
  if (n?.war?.enemy === c.id) out.push('At war with you');
  if (isRival(c.id, p.countryId)) out.push('Old rival of your country');
  const me = g.countries[p.countryId];
  if (c.bloc !== 'none' && c.bloc === me.bloc) out.push(`Same bloc (${BLOCS[c.bloc].name})`);
  const f = n?.favors?.[c.id] ?? 0;
  if (f > 0) out.push(`Owes you ${f} favor${f === 1 ? '' : 's'}`);
  if (f < 0) out.push(`You owe them ${-f} favor${f === -1 ? '' : 's'}`);
  if (p.abroad?.sisters.includes(c.id)) out.push('Sister city of yours');
  for (const w of g.wars ?? []) if (w.a === c.id || w.b === c.id) out.push(`At war with ${g.countries[w.a === c.id ? w.b : w.a]?.name}`);
  if (c.pacts?.length) out.push(`Defense pacts: ${c.pacts.map((x) => g.countries[x]?.name).filter(Boolean).join(', ')}`);
  return out;
}

export function LeaderCardModal() {
  const { id, close } = useProfile();
  const game = useGame((s) => s.game);
  const c = id ? game.countries[id] : null;
  if (!c) return null;
  const p = game.player;
  const rel = p ? Math.round(c.relations[p.countryId] ?? 0) : 0;
  const [mood, cls] = attitude(rel);
  const years = c.leaderSince !== undefined ? Math.max(0, Math.floor((game.turn - c.leaderSince) / 12)) : null;
  const t = ties(game, c);
  return (
    <div className="modal" onClick={close}>
      <div className="panel leader-card" onClick={(e) => e.stopPropagation()}>
        <div className="with-face">
          <Portrait name={c.leader.name} traits={c.leader.traits} junta={!!c.junta} size={72} />
          <div>
            <h3 style={{ margin: '0 0 4px' }}>{c.leader.name}</h3>
            <p className="small-text" style={{ margin: 0 }}><Flag id={c.id} size={14} /> {countryLabel(c)} · {SYSTEMS[c.systemId].name}</p>
            <p className="small-text muted" style={{ margin: 0 }}>{c.junta ? 'Military Council (junta)' : c.leader.party} · {years === null ? 'in power since the game began' : years < 1 ? 'new in power' : `in power ${years} year${years === 1 ? '' : 's'}`}</p>
          </div>
        </div>
        <p>Toward you: <b className={cls}>{mood}</b> (relations {rel}) · Approval at home <b>{Math.round(c.leader.approval)}%</b> · <span className="badge">{TIERS[tierOf(c)].name}</span></p>
        <h4>Personality</h4>
        <ul className="news">
          {c.leader.traits.map((tr) => <li key={tr}><b>{TRAITS[tr].name}</b>: {TRAITS[tr].blurb}</li>)}
          <li><b>Cares about</b>: {FOCUSES[c.leader.focus].name}</li>
        </ul>
        {t.length > 0 && <><h4>Ties</h4><p className="small-text">{t.join(' · ')}</p></>}
        <h4>Recent decisions</h4>
        {c.decisions?.length ? <ul className="news">{c.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul> : <p className="muted small-text">No big changes yet.</p>}
        <div className="row"><button className="small secondary" onClick={close}>Close</button></div>
      </div>
    </div>
  );
}
