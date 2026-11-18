import { useEffect } from 'react';
import { useGame } from './store';
import { NewGame } from './ui/NewGame';
import { Game } from './ui/Game';
import { Reactions, useTapSounds } from './ui/Juice';
import { AchievementWatcher } from './ui/Extras';

export default function App() {
  const player = useGame((s) => s.game.player);
  const message = useGame((s) => s.message);
  const dismiss = useGame((s) => s.dismissMessage);
  useTapSounds();
  const playing = !!player && !player.retired;
  // Count real time played while the page is open and visible.
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => { if (document.visibilityState === 'visible') useGame.getState().tickPlaytime(5); }, 5000);
    return () => clearInterval(t);
  }, [playing]);
  return (
    <main>
      {message && <div className="toast" onClick={dismiss}>{message} <span className="muted">(dismiss)</span></div>}
      {player ? <Game /> : <NewGame />}
      <Reactions />
      <AchievementWatcher />
    </main>
  );
}
