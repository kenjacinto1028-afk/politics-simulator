import { useGame } from '../store';

const fmt = (n: number, d = 1) => n.toFixed(d);

export function Dashboard() {
  const { game, nextTurn } = useGame();
  const p = game.player!;
  const home = game.countries[p.countryId];
  return (
    <div className="grid">
      <div className="panel">
        <h2>{p.name}</h2>
        <p>{home.name} · {p.office ?? 'Candidate for Mayor'}</p>
        <p>Popularity {p.popularity} · Funds ${p.funds}k · Age {p.age}</p>
        <p>{game.year}-{String(game.month).padStart(2, '0')}</p>
        <button onClick={nextTurn}>Next month</button>
      </div>
      <div className="panel">
        <h3>World</h3>
        <table>
          <thead><tr><th>Country</th><th>Leader</th><th>Approval</th><th>GDP $bn</th><th>Growth</th><th>Unemp.</th></tr></thead>
          <tbody>
            {Object.values(game.countries).map((c) => (
              <tr key={c.id} className={c.id === p.countryId ? 'home' : ''}>
                <td>{c.name}</td><td>{c.leader.name}</td><td>{fmt(c.leader.approval, 0)}%</td>
                <td>{fmt(c.economy.gdpBn, 0)}</td><td>{fmt(c.economy.growth)}%</td><td>{fmt(c.economy.unemployment)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel">
        <h3>News</h3>
        <ul>{game.log.slice(0, 10).map((l, i) => <li key={i}>{l}</li>)}</ul>
      </div>
    </div>
  );
}
