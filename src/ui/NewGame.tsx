import { useState } from 'react';
import { useGame } from '../store';
import { SYSTEMS } from '../data/systems';

export function NewGame() {
  const countries = useGame((s) => s.game.countries);
  const startCareer = useGame((s) => s.startCareer);
  const [name, setName] = useState('Alex Rivera');
  const [countryId, setCountryId] = useState('usa');
  const sys = SYSTEMS[countries[countryId].systemId];

  return (
    <div className="panel">
      <h1>Politics Simulator</h1>
      <label>Your name <input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>Nation
        <select value={countryId} onChange={(e) => setCountryId(e.target.value)}>
          {Object.values(countries).map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.fantasy ? ' (fantasy)' : ''}</option>
          ))}
        </select>
      </label>
      <p>{sys.name} · Career path: {sys.ladder.join(' → ')}</p>
      <button onClick={() => startCareer(name, countryId)} disabled={!name.trim()}>Run for Mayor</button>
    </div>
  );
}
