import { useGame } from './store';
import { NewGame } from './ui/NewGame';
import { Game } from './ui/Game';

export default function App() {
  const player = useGame((s) => s.game.player);
  const message = useGame((s) => s.message);
  const dismiss = useGame((s) => s.dismissMessage);
  return (
    <main>
      {message && <div className="toast" onClick={dismiss}>{message} <span className="muted">(dismiss)</span></div>}
      {player ? <Game /> : <NewGame />}
    </main>
  );
}
