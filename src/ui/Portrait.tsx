import type { TraitId } from '../sim/types';

// A simple face for a politician, built from their name and personality. Same person, same face.

const hash = (s: string) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };
const SKIN = ['#f1c7a5', '#e0ac85', '#c68863', '#a86b48', '#7d4a2e', '#5a3420'];
const HAIR = ['#1b1410', '#3b2a1e', '#6b4a2b', '#a77b45', '#d9c08a', '#8a8a8a', '#e6e6e6'];
const SUIT = ['#24324f', '#2f2f36', '#3b2440', '#1f3d36', '#4a2a22', '#33405a'];

export function Portrait({ name, traits = [], junta = false, size = 40 }: { name: string; traits?: TraitId[]; junta?: boolean; size?: number }) {
  const h = hash(name);
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >>> 3) % HAIR.length];
  const suit = junta ? '#3d4a2a' : SUIT[(h >>> 6) % SUIT.length];
  const style = (h >>> 9) % 4;
  const bg = `hsl(${(h >>> 12) % 360} 30% 28%)`;
  const has = (t: TraitId) => traits.includes(t);
  const smile = has('charismatic') || has('generous') || has('populist');
  const frown = has('hawk') || has('corrupt');
  const mouth = smile ? 'M15 27 Q20 31 25 27' : frown ? 'M15 29 Q20 26 25 29' : 'M16 28 L24 28';
  return (
    <svg className="portrait" width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={`Portrait of ${name}`}>
      <rect width="40" height="40" rx="8" fill={bg} />
      {/* shoulders */}
      <path d="M4 40 Q6 31 20 31 Q34 31 36 40 Z" fill={suit} />
      <path d="M17 31 L20 36 L23 31 Z" fill={junta ? '#c9b458' : '#f2f2f2'} />
      {/* head */}
      {style === 3 && <rect x="9" y="12" width="22" height="16" rx="6" fill={hair} />}
      <ellipse cx="20" cy="20" rx="9" ry="10.5" fill={skin} />
      {style === 0 && <path d="M11 17 Q12 8 20 8 Q28 8 29 17 Q24 12 11 17 Z" fill={hair} />}
      {style === 1 && <path d="M11 18 Q10 7 20 7 Q30 7 29 18 L27 14 Q20 10 13 14 Z" fill={hair} />}
      {style === 2 && <path d="M12 14 Q20 8 28 14 Q24 11 12 14 Z" fill={hair} />}
      {style === 3 && <path d="M11 18 Q11 8 20 8 Q29 8 29 18 Q26 11 11 18 Z" fill={hair} />}
      {/* eyes and brows */}
      <circle cx="16.5" cy="20" r="1.2" fill="#1a1a1a" />
      <circle cx="23.5" cy="20" r="1.2" fill="#1a1a1a" />
      {frown ? <path d="M14 16.5 L18.5 17.5 M26 16.5 L21.5 17.5" stroke="#1a1a1a" strokeWidth="1" /> : <path d="M14.5 17 L18.5 17 M21.5 17 L25.5 17" stroke="#1a1a1a" strokeWidth="0.8" />}
      {has('technocrat') && <g fill="none" stroke="#dcdcdc" strokeWidth="0.8"><circle cx="16.5" cy="20" r="2.6" /><circle cx="23.5" cy="20" r="2.6" /><path d="M19.1 20 L20.9 20" /></g>}
      <path d={mouth} stroke="#5a2a22" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {has('vain') && <circle cx="31" cy="34" r="2" fill="#e8c547" />}
      {has('pious') && <path d="M31 32 L31 37 M29 33.5 L33 33.5" stroke="#e8c547" strokeWidth="1" />}
      {junta && <path d="M9 13 Q20 4 31 13 L31 15 L9 15 Z" fill="#3d4a2a" stroke="#c9b458" strokeWidth="0.6" />}
    </svg>
  );
}
