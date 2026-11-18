import { useGame } from './store';
import { NewGame } from './ui/NewGame';
import { Dashboard } from './ui/Dashboard';

export default function App() {
  const player = useGame((s) => s.game.player);
  return <main>{player ? <Dashboard /> : <NewGame />}</main>;
}
