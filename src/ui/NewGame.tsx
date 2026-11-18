import { HallOfFame } from './Career';
import { useState } from 'react';
import { useGame } from '../store';
import { OFFICE_NAMES, SYSTEMS } from '../data/systems';
import { WORLD_SIZES, WORLD_SIZE_LABELS, type WorldSize } from '../data/countries';
import { SaveMenu } from './SaveMenu';
import { FAITHS, SYSTEM_RULES, FOCUSES, TRAITS } from '../data/people';
import type { FaithId } from '../sim/types';
import { countryLabel } from '../data/local-names';

export function NewGame() {
  const { game, setWorldSize, startCareer } = useGame();
  const countries = game.countries;
  const [name, setName] = useState('Alex Rivera');
  const [countryId, setCountryId] = useState('usa');
  const country = countries[countryId] ?? Object.values(countries)[0];
  const sys = SYSTEMS[country.systemId];
  const [faithPick, setFaithPick] = useState<FaithId | null>(null);
  const faith: FaithId = faithPick && (!FAITHS[faithPick].fantasy || faithPick === country.faith || country.fantasy) ? faithPick : country.faith;
  const faithIds = (Object.keys(FAITHS) as FaithId[]).filter((f) => !FAITHS[f].fantasy || country.fantasy || f === country.faith);
  const level = country.religiosity >= 65 ? 'high' : country.religiosity >= 35 ? 'medium' : 'low';
  const ld = country.leader;

  return (
    <>
      <div className="panel">
        <h1>Politics Simulator</h1>
        <label>Your name <input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>World size
          <select value={game.worldSize} onChange={(e) => setWorldSize(Number(e.target.value) as WorldSize)}>
            {WORLD_SIZES.map((n) => <option key={n} value={n}>{WORLD_SIZE_LABELS[n]}</option>)}
          </select>
        </label>
        <label>Nation
          <select value={country.id} onChange={(e) => { setCountryId(e.target.value); setFaithPick(null); }}>
            {Object.values(countries).map((c) => (
              <option key={c.id} value={c.id}>{countryLabel(c)}{c.fantasy ? ' (fantasy)' : ''}</option>
            ))}
          </select>
        </label>
        <p><strong>{sys.name}</strong>: {sys.signature}</p>
        <p className="small-text">{SYSTEM_RULES[country.systemId].rule}</p>
        <p className="small-text">Main faith: <b>{FAITHS[country.faith].name}</b> · How religious: {level}</p>
        <p className="small-text">Leader: <b>{ld.name}</b> · {ld.traits.map((t) => TRAITS[t].name).join(', ')} · Focus: {FOCUSES[ld.focus].name}</p>
        <label>Your faith
          <select value={faith} onChange={(e) => setFaithPick(e.target.value as FaithId)}>
            {faithIds.map((f) => <option key={f} value={f}>{FAITHS[f].name}</option>)}
          </select>
        </label>
        <p className="muted">Career path: {sys.ladder.map((o) => OFFICE_NAMES[o]).join(' → ')}</p>
        <button onClick={() => startCareer(name, country.id, faith)} disabled={!name.trim()}>
          Run for {OFFICE_NAMES[sys.ladder[0]]}
        </button>
      </div>
      <SaveMenu canSave={false} />
      <HallOfFame />
    </>
  );
}
