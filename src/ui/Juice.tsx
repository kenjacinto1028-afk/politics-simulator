import { useEffect, useRef, useState } from 'react';
import { useGame } from '../store';
import { getSettings, play, setMood, setSettings, unlock, type AudioSettings } from '../audio/sound';
import type { GameState } from '../sim/types';

// Sound, music moods, screen effects and event pictures.

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const effectsOn = () => getSettings().effects && !reducedMotion();

/** Taps anywhere unlock sound (browsers need a tap first), and buttons click softly. */
export function useTapSounds() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      unlock();
      const el = (e.target as HTMLElement | null)?.closest('button');
      if (el && !(el as HTMLButtonElement).disabled) play('click');
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);
}

const RUNGS = (g: GameState) => g.player?.highestRung ?? 0;

/** Watches the game and reacts: sounds, music mood, confetti and red flashes. */
export function Reactions() {
  const game = useGame((s) => s.game);
  const prev = useRef<GameState | null>(null);
  const [fx, setFx] = useState<{ kind: 'confetti' | 'flash'; key: number } | null>(null);

  useEffect(() => {
    const p = game.player;
    const before = prev.current;
    prev.current = game;
    // Music mood follows the situation.
    if (p) {
      const crisis = !!p.nation?.war || (p.nation?.offer && (p.nation.offer.kind === 'tribute' || p.nation.offer.kind === 'cut-trade')) || (game.countries[p.countryId]?.society?.unrest ?? 0) > 70;
      setMood(crisis ? 'crisis' : p.campaign ? 'campaign' : 'calm');
    } else setMood('calm');
    if (!before || !p || !before.player || before.player.name !== p.name) return;
    const bp = before.player;
    const fire = (kind: 'confetti' | 'flash') => { if (effectsOn()) setFx({ kind, key: Date.now() }); };
    const newLines = game.log.slice(0, Math.max(0, game.log.indexOf(before.log[0]))) ;
    const won = (p.office && p.office !== bp.office && RUNGS(game) >= RUNGS(before)) || p.record.won > bp.record.won;
    const lost = p.record.lost > bp.record.lost;
    const warStarted = (!!p.nation?.war && !bp.nation?.war) || newLines.some((l) => /Coup in|invades/.test(l));
    if (won) { play('win'); fire('confetti'); }
    else if (lost) play('lose');
    else if (warStarted) { play('alarm'); fire('flash'); }
    else if ((p.pendingEvent && !bp.pendingEvent) || (p.nation?.offer && !bp.nation?.offer) || (p.nation?.allyCall && !bp.nation?.allyCall)) play('news');
    else if (game.turn !== before.turn) play('month');
    else if (p.funds > bp.funds + 1) play('coin');
  }, [game]);

  useEffect(() => {
    if (!fx) return;
    const t = setTimeout(() => setFx(null), fx.kind === 'confetti' ? 2600 : 900);
    return () => clearTimeout(t);
  }, [fx]);

  if (!fx) return null;
  if (fx.kind === 'flash') return <div key={fx.key} className="fx-flash" aria-hidden />;
  return (
    <div key={fx.key} className="fx-confetti" aria-hidden>
      {Array.from({ length: 60 }, (_, i) => (
        <i key={i} style={{ left: `${(i * 37) % 100}%`, background: ['#ffcc00', '#4f8cff', '#ff5a5f', '#3ecf8e', '#ffffff'][i % 5], animationDelay: `${(i % 12) * 0.06}s`, animationDuration: `${1.6 + (i % 7) * 0.12}s`, transform: `rotate(${i * 29}deg)` }} />
      ))}
    </div>
  );
}

/** A number that counts up or down to its new value. */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (!effectsOn() || Math.abs(value - from.current) < 0.5) { from.current = value; setShown(value); return; }
    const start = performance.now(), a = from.current, b = value;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 500);
      setShown(a + (b - a) * (1 - (1 - k) ** 3));
      if (k < 1) raf = requestAnimationFrame(step); else from.current = b;
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); from.current = b; };
  }, [value]);
  return <>{format(shown)}</>;
}

// ---------- Event pictures ----------

const ART: [RegExp, string, string][] = [
  [/war|invade|troop|army|coup|militar|border|missile|attack/i, '⚔️', '#5c2424'],
  [/church|mosque|temple|faith|relig|priest|imam|pope|bishop|bless/i, '🕊️', '#3b3b55'],
  [/flood|storm|quake|earthquake|hurricane|typhoon|wildfire|drought|disaster|heat/i, '🌪️', '#4a3a1f'],
  [/outbreak|disease|virus|hospital|health|doctor|nurse|pandemic|flu/i, '🏥', '#1f4a45'],
  [/protest|strike|riot|march|union|unrest/i, '✊', '#5c3a24'],
  [/scandal|leak|bribe|corrupt|affair|investigat|press|journalist|reporter/i, '📰', '#3a2f4a'],
  [/election|vote|ballot|poll|debate|campaign|rally/i, '🗳️', '#24324f'],
  [/money|budget|tax|bank|market|stock|debt|econom|business|factory|jobs/i, '💰', '#2a4a2a'],
  [/school|student|universit|teacher|education/i, '🎓', '#2a3f5c'],
  [/crime|police|gang|murder|theft|prison/i, '🚔', '#2a2f45'],
  [/climate|pollution|energy|oil|power|blackout|solar|green/i, '⚡', '#3f4a1f'],
  [/summit|ambassador|treaty|trade|foreign|diplomat|ally|alliance|bloc/i, '🤝', '#24404a'],
  [/king|queen|royal|crown|prince/i, '👑', '#4a3a1f'],
  [/spy|intel|hack|cyber/i, '🕵️', '#2a2a2a'],
  [/festival|sport|olymp|cup|culture|tourism|celebrat/i, '🎉', '#4a2a45'],
];

export function eventArt(title: string, text: string): { icon: string; color: string } {
  const s = `${title} ${text}`;
  for (const [re, icon, color] of ART) if (re.test(s)) return { icon, color };
  return { icon: '🏛️', color: '#2c303b' };
}

export function EventArt({ title, text }: { title: string; text: string }) {
  const a = eventArt(title, text);
  return <div className="event-art" style={{ background: `linear-gradient(135deg, ${a.color}, #1a1d25)` }} aria-hidden><span>{a.icon}</span></div>;
}

// ---------- Settings ----------

export function MuteButton() {
  const [s, setS] = useState<AudioSettings>(getSettings());
  return (
    <button className="small secondary mute" title={s.muted ? 'Sound off' : 'Sound on'} aria-label={s.muted ? 'Turn sound on' : 'Turn sound off'}
      onClick={() => { unlock(); const muted = !s.muted; setSettings({ muted }); setS({ ...s, muted }); }}>
      {s.muted ? '🔇' : '🔊'}
    </button>
  );
}

export function SoundSettings() {
  const [s, setS] = useState<AudioSettings>(getSettings());
  const set = (p: Partial<AudioSettings>) => { unlock(); setSettings(p); setS({ ...s, ...p }); };
  return (
    <div className="panel">
      <h3>Sound and effects</h3>
      <label><input type="checkbox" checked={!s.muted} onChange={(e) => set({ muted: !e.target.checked })} /> Sound on</label>
      <label>Volume <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => set({ volume: Number(e.target.value) })} /></label>
      <label><input type="checkbox" checked={s.music} onChange={(e) => set({ music: e.target.checked })} /> Music</label>
      <label><input type="checkbox" checked={s.sfx} onChange={(e) => set({ sfx: e.target.checked })} /> Sound effects</label>
      <label><input type="checkbox" checked={s.effects} onChange={(e) => set({ effects: e.target.checked })} /> Screen effects (confetti, flashes, counting numbers)</label>
      <p className="muted small-text">All sound is made by the game itself. Settings are saved in this browser.</p>
    </div>
  );
}
