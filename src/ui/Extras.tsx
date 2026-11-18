import { useEffect, useState } from 'react';
import { useGame } from '../store';
import { ACHIEVEMENTS, earned, loadUnlocked, unlock } from '../sim/achievements';
import { OFFICE_NAMES, SYSTEMS } from '../data/systems';
import { kindOf } from '../sim/offices';
import { play } from '../audio/sound';

// Achievements and the guided first game.

/** Watches the game, saves new badges and shows a small banner. */
export function AchievementWatcher() {
  const game = useGame((s) => s.game);
  const [shown, setShown] = useState<string[]>([]);
  useEffect(() => {
    if (!game.player) return;
    const fresh = unlock(earned(game), `${game.year}-${String(game.month).padStart(2, '0')}`);
    if (fresh.length) { setShown(fresh); play('win'); }
  }, [game]);
  useEffect(() => {
    if (!shown.length) return;
    const t = setTimeout(() => setShown([]), 4000);
    return () => clearTimeout(t);
  }, [shown]);
  if (!shown.length) return null;
  return (
    <div className="badge-toast" onClick={() => setShown([])}>
      {shown.map((id) => { const a = ACHIEVEMENTS.find((x) => x.id === id)!; return <div key={id}><span className="badge-icon">{a.icon}</span> <b>Achievement:</b> {a.name}</div>; })}
    </div>
  );
}

export function AchievementsPanel() {
  const game = useGame((s) => s.game);
  // Saved badges plus anything this game has already earned (in case saving was blocked).
  const have: Record<string, string> = { ...loadUnlocked() };
  for (const id of earned(game)) have[id] ??= 'now';
  const n = ACHIEVEMENTS.filter((a) => have[a.id]).length;
  return (
    <div className="panel">
      <h3>Achievements <span className="muted small-text">{n}/{ACHIEVEMENTS.length}</span></h3>
      <div className="badge-grid">
        {ACHIEVEMENTS.map((a) => (
          <div key={a.id} className={`ach${have[a.id] ? ' got' : ''}`} title={a.blurb}>
            <span className="badge-icon">{have[a.id] ? a.icon : '🔒'}</span>
            <div><b>{a.name}</b><br /><span className="muted small-text">{a.blurb}</span></div>
          </div>
        ))}
      </div>
      <p className="muted small-text">Badges count across all your games in this browser.</p>
    </div>
  );
}

// ---------- Tutorial ----------

const TUT_KEY = 'polsim:tutorial';
type Tut = { on: boolean; seen: string[] };
function loadTut(): Tut {
  try { return { on: false, seen: [], ...JSON.parse(localStorage.getItem(TUT_KEY) ?? '{}') }; } catch { return { on: false, seen: [] }; }
}
function saveTut(t: Tut) { try { localStorage.setItem(TUT_KEY, JSON.stringify(t)); } catch { /* private mode */ } }

/** First-time players get the tutorial unless they turn it off. */
export function tutorialDefault(): boolean {
  try { return localStorage.getItem(TUT_KEY) === null; } catch { return true; }
}
export function setTutorial(on: boolean) { saveTut({ on, seen: on ? [] : loadTut().seen }); }

type Tip = { id: string; title: string; text: string };

function nextTip(g: ReturnType<typeof useGame.getState>['game'], seen: string[], startTurn: number): Tip | null {
  const p = g.player!;
  const has = (id: string) => seen.includes(id);
  const tips: (Tip | false)[] = [
    !has('welcome') && { id: 'welcome', title: 'Welcome!', text: `You are ${p.name}, starting out in politics. The goal: climb all the way to ${OFFICE_NAMES[SYSTEMS[g.countries[p.countryId].systemId].ladder.at(-1)!]}. The numbers at the top are your popularity, money and more.` },
    !!p.pendingEvent && !has('event') && { id: 'event', title: 'Something happened', text: 'Events pop up as cards. Read it and pick a choice. Green notes are good for you, red ones are bad.' },
    !!p.campaign && !has('campaign') && { id: 'campaign', title: 'Your first campaign', text: 'You get 3 actions a month. Tap a campaign action like Run ads, Rally or Party work to raise your poll. The poll bar shows you against your rival.' },
    !!p.campaign && p.actionsLeft === 0 && !has('next') && { id: 'next', title: 'Out of actions', text: 'Press Next month to move time forward. You get fresh actions every month.' },
    !!p.campaign && g.turn > startTurn + 1 && !has('poll') && { id: 'poll', title: 'Election day is coming', text: `The vote is in ${p.campaign?.monthsLeft} month${p.campaign?.monthsLeft === 1 ? '' : 's'}. Keep campaigning, and raise funds if you run low.` },
    !!p.office && !has('office') && { id: 'office', title: `You are ${OFFICE_NAMES[p.office!]}!`, text: kindOf(p.office) === 'local' ? 'Your Job tab now shows your city: budget, council, projects and laws. Keep people happy and the city in good shape to win again.' : 'Your Job tab now shows the tools of this office. Keep people happy to stay in power.' },
    !!p.office && !has('tabs') && { id: 'tabs', title: 'Explore the tabs', text: 'Voters shows the groups who elect you. People shows allies and rivals. World shows other countries (tap a leader to learn about them). More has saves, sound and achievements.' },
    !!p.office && p.monthsInOffice >= 6 && !has('climb') && { id: 'climb', title: 'Climb higher', text: 'Near the end of your term, you can run for a higher office from the Job tab. Each step up brings new tools. Good luck!' },
  ];
  return tips.find((t): t is Tip => !!t) ?? null;
}

export function Coach() {
  const game = useGame((s) => s.game);
  const [tut, setTut] = useState<Tut>(loadTut);
  const [start] = useState(game.turn);
  if (!tut.on || !game.player || game.player.retired) return null;
  const tip = nextTip(game, tut.seen, start);
  if (!tip) return null;
  const done = (all: boolean) => {
    const next: Tut = all ? { on: false, seen: tut.seen } : { ...tut, seen: [...tut.seen, tip.id] };
    if (!all && tip.id === 'climb') next.on = false;
    saveTut(next); setTut(next);
  };
  return (
    <div className="coach" role="dialog" aria-label="Tutorial tip">
      <b>💡 {tip.title}</b>
      <p>{tip.text}</p>
      <div className="row">
        <button className="small" onClick={() => done(false)}>Got it</button>
        <button className="small secondary" onClick={() => done(true)}>Skip tutorial</button>
      </div>
    </div>
  );
}
