import { useState } from 'react';
import { useGame } from '../store';
import { OFFICE_NAMES, SYSTEMS } from '../data/systems';
import { WORLD_SIZES, WORLD_SIZE_LABELS, type WorldSize } from '../data/countries';

export function NewGame() {
  const { game, setWorldSize, startCareer } = useGame();
  const countries = game.countries;
  const [name, setName] = useState('Alex Rivera');
  const [countryId, setCountryId] = useState('usa');
  const country = countries[countryId] ?? Object.values(countries)[0];
  const sys = SYSTEMS[country.systemId];

  return (
    <div className="panel">
      <h1>Politics Simulator</h1>
      <label>Your name <input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>World size
        <select value={game.worldSize} onChange={(e) => setWorldSize(Number(e.target.value) as WorldSize)}>
          {WORLD_SIZES.map((n) => <option key={n} value={n}>{WORLD_SIZE_LABELS[n]}</option>)}
        </select>
      </label>
      <label>Nation
        <select value={country.id} onChange={(e) => setCountryId(e.target.value)}>
          {Object.values(countries).map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.fantasy ? ' (fantasy)' : ''}</option>
          ))}
        </select>
      </label>
      <p><strong>{sys.name}</strong>: {sys.signature}</p>
      <p>Career path: {sys.ladder.map((o) => OFFICE_NAMES[o]).join(' → ')}</p>
      <button onClick={() => startCareer(name, country.id)} disabled={!name.trim()}>
        Run for {OFFICE_NAMES[sys.ladder[0]]}
      </button>
    </div>
  );
}
