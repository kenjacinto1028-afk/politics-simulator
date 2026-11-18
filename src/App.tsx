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
  return (
    <main>
      {message && <div className="toast" onClick={dismiss}>{message} <span className="muted">(dismiss)</span></div>}
      {player ? <Game /> : <NewGame />}
      <Reactions />
      <AchievementWatcher />
    </main>
  );
}
