// Simple flags drawn in code. Real flags are simplified; fantasy ones are invented.

type Mark = { k: 'disc' | 'star' | 'crescent' | 'crown'; c: string; x: number; y: number; r: number };
type Spec = {
  t: 'h' | 'v' | 'nordic' | 'swiss' | 'union' | 'plain';
  c: string[];
  cross?: string; inner?: string;
  canton?: string; cantonW?: number; cantonH?: number;
  tri?: string; triW?: number;
  diamond?: string;
  marks?: Mark[];
};

const R = '#d52b1e', W = '#ffffff', K = '#111111', SKY = '#74acdf';

const FLAGS: Record<string, Spec> = {
  usa: { t: 'h', c: ['#b22234', W, '#b22234', W, '#b22234', W, '#b22234'], canton: '#3c3b6e', cantonW: 12, cantonH: 10.8, marks: [{ k: 'star', c: W, x: 6, y: 5.4, r: 2.5 }] },
  chn: { t: 'plain', c: ['#de2910'], marks: [{ k: 'star', c: '#ffde00', x: 6, y: 6, r: 3.5 }] },
  deu: { t: 'h', c: ['#000000', '#dd0000', '#ffce00'] },
  fra: { t: 'v', c: ['#0055a4', W, '#ef4135'] },
  gbr: { t: 'union', c: ['#012169'], cross: '#c8102e', inner: W },
  phl: { t: 'h', c: ['#0038a8', '#ce1126'], tri: W, triW: 13, marks: [{ k: 'disc', c: '#fcd116', x: 5, y: 10, r: 2.2 }] },
  che: { t: 'swiss', c: ['#da291c'], cross: W },
  jpn: { t: 'plain', c: [W], marks: [{ k: 'disc', c: '#bc002d', x: 15, y: 10, r: 6 }] },
  ind: { t: 'h', c: ['#ff9933', W, '#138808'], marks: [{ k: 'disc', c: '#000080', x: 15, y: 10, r: 2.4 }] },
  bra: { t: 'plain', c: ['#009c3b'], diamond: '#ffdf00', marks: [{ k: 'disc', c: '#002776', x: 15, y: 10, r: 4.6 }] },
  rus: { t: 'h', c: [W, '#0039a6', '#d52b1e'] },
  kor: { t: 'plain', c: [W], marks: [{ k: 'disc', c: '#0047a0', x: 15, y: 10, r: 5 }, { k: 'disc', c: '#cd2e3a', x: 15, y: 8.6, r: 3.7 }] },
  mex: { t: 'v', c: ['#006847', W, '#ce1126'], marks: [{ k: 'disc', c: '#8c5a2b', x: 15, y: 10, r: 2.4 }] },
  can: { t: 'v', c: [R, W, W, R], marks: [{ k: 'star', c: R, x: 15, y: 10, r: 4.2 }] },
  ita: { t: 'v', c: ['#009246', W, '#ce2b37'] },
  esp: { t: 'h', c: ['#aa151b', '#f1bf00', '#f1bf00', '#aa151b'] },
  aus: { t: 'plain', c: ['#012169'], marks: [{ k: 'star', c: W, x: 8, y: 15, r: 2.6 }, { k: 'star', c: W, x: 22, y: 5, r: 1.4 }, { k: 'star', c: W, x: 25, y: 10, r: 1.4 }, { k: 'star', c: W, x: 22, y: 16, r: 1.4 }] },
  idn: { t: 'h', c: ['#ce1126', W] },
  tur: { t: 'plain', c: ['#e30a17'], marks: [{ k: 'crescent', c: W, x: 11, y: 10, r: 5 }, { k: 'star', c: W, x: 17, y: 10, r: 2 }] },
  nga: { t: 'v', c: ['#008751', W, '#008751'] },
  arg: { t: 'h', c: [SKY, W, SKY], marks: [{ k: 'disc', c: '#f6b40e', x: 15, y: 10, r: 2.2 }] },
  zaf: { t: 'h', c: ['#e03c31', '#007749', '#001489'], tri: K, triW: 9 },
  egy: { t: 'h', c: ['#ce1126', W, '#000000'], marks: [{ k: 'disc', c: '#c09300', x: 15, y: 10, r: 2 }] },
  vnm: { t: 'plain', c: ['#da251d'], marks: [{ k: 'star', c: '#ffff00', x: 15, y: 10, r: 5 }] },
  pol: { t: 'h', c: [W, '#dc143c'] },
  nld: { t: 'h', c: ['#ae1c28', W, '#21468b'] },
  swe: { t: 'nordic', c: ['#006aa7'], cross: '#fecc00' },
  ukr: { t: 'h', c: ['#0057b7', '#ffd700'] },
  col: { t: 'h', c: ['#fcd116', '#fcd116', '#003893', '#ce1126'] },
  chl: { t: 'h', c: [W, '#d52b1e'], canton: '#0039a6', cantonW: 10, cantonH: 10, marks: [{ k: 'star', c: W, x: 5, y: 5, r: 2.6 }] },
  per: { t: 'v', c: ['#d91023', W, '#d91023'] },
  tha: { t: 'h', c: ['#a51931', W, '#2d2a4a', '#2d2a4a', W, '#a51931'] },
  mys: { t: 'h', c: ['#cc0001', W, '#cc0001', W, '#cc0001', W, '#cc0001'], canton: '#010066', cantonW: 15, cantonH: 11.4, marks: [{ k: 'crescent', c: '#ffcc00', x: 6, y: 5.7, r: 3.6 }, { k: 'star', c: '#ffcc00', x: 11, y: 5.7, r: 2 }] },
  pak: { t: 'v', c: [W, '#01411c', '#01411c', '#01411c'], marks: [{ k: 'crescent', c: W, x: 18, y: 10, r: 5 }, { k: 'star', c: W, x: 22, y: 7, r: 1.6 }] },
  bgd: { t: 'plain', c: ['#006a4e'], marks: [{ k: 'disc', c: '#f42a41', x: 13.5, y: 10, r: 6 }] },
  ken: { t: 'h', c: ['#000000', '#bb0000', '#006600'], marks: [{ k: 'disc', c: '#bb0000', x: 15, y: 10, r: 3 }] },
  eth: { t: 'h', c: ['#078930', '#fcdd09', '#da121a'], marks: [{ k: 'disc', c: '#0f47af', x: 15, y: 10, r: 3.6 }, { k: 'star', c: '#fcdd09', x: 15, y: 10, r: 2.4 }] },
  nor: { t: 'nordic', c: ['#ba0c2f'], cross: W, inner: '#00205b' },
  grc: { t: 'h', c: ['#0d5eaf', W, '#0d5eaf', W, '#0d5eaf', W, '#0d5eaf', W, '#0d5eaf'], canton: '#0d5eaf', cantonW: 11.1, cantonH: 11.1, marks: [] },
  prt: { t: 'v', c: ['#006600', '#006600', '#ff0000', '#ff0000', '#ff0000'], marks: [{ k: 'disc', c: '#ffcc00', x: 12, y: 10, r: 3.4 }] },
  isr: { t: 'h', c: [W, '#0038b8', W, W, W, '#0038b8', W], marks: [{ k: 'star', c: '#0038b8', x: 15, y: 10, r: 3.4 }] },
  nzl: { t: 'plain', c: ['#012169'], marks: [{ k: 'star', c: '#c8102e', x: 22, y: 5, r: 1.6 }, { k: 'star', c: '#c8102e', x: 25, y: 9, r: 1.6 }, { k: 'star', c: '#c8102e', x: 20, y: 11, r: 1.4 }, { k: 'star', c: '#c8102e', x: 22, y: 16, r: 1.8 }] },
  cub: { t: 'h', c: ['#002a8f', W, '#002a8f', W, '#002a8f'], tri: '#cf142b', triW: 12, marks: [{ k: 'star', c: W, x: 4.5, y: 10, r: 2.6 }] },
  // Fantasy countries.
  aurex: { t: 'h', c: ['#1b1b1b', '#c9a227', '#1b1b1b'], marks: [{ k: 'disc', c: '#c9a227', x: 15, y: 10, r: 3 }] },
  eldmar: { t: 'plain', c: ['#4b2a7b'], marks: [{ k: 'crown', c: '#e8c547', x: 15, y: 10, r: 5 }] },
  tarvos: { t: 'v', c: ['#7a1f1f', '#d9d9d9', '#7a1f1f'], marks: [{ k: 'star', c: '#7a1f1f', x: 15, y: 10, r: 3.5 }] },
  myrr: { t: 'h', c: ['#1d7fa6', '#f2e3b3', '#1d7fa6'], marks: [{ k: 'disc', c: '#f28c28', x: 15, y: 10, r: 3 }] },
  halvane: { t: 'nordic', c: ['#0f5c4d'], cross: '#e6b422' },
  vorlund: { t: 'h', c: ['#2b2b2b', '#6b6b6b'], tri: '#a3122a', triW: 10, marks: [{ k: 'star', c: W, x: 4, y: 10, r: 2.2 }] },
  duskmoor: { t: 'plain', c: ['#2a2350'], marks: [{ k: 'crescent', c: '#e6e1ff', x: 15, y: 10, r: 4.5 }] },
};

const hash = (s: string) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const PALETTE = ['#b22234', '#0a3a8c', '#00843d', '#fcd116', '#111111', '#ffffff', '#74acdf', '#6b2fa0', '#e86a17'];
function fallback(id: string): Spec {
  const h = hash(id);
  const c = [0, 1, 2].map((i) => PALETTE[(h >> (i * 4)) % PALETTE.length]);
  return { t: h % 2 ? 'h' : 'v', c };
}

function starPath(x: number, y: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    pts.push(`${(x + Math.cos(a) * rr).toFixed(2)},${(y + Math.sin(a) * rr).toFixed(2)}`);
  }
  return pts.join(' ');
}

function MarkSvg({ m, bg }: { m: Mark; bg: string }) {
  if (m.k === 'disc') return <circle cx={m.x} cy={m.y} r={m.r} fill={m.c} />;
  if (m.k === 'star') return <polygon points={starPath(m.x, m.y, m.r)} fill={m.c} />;
  if (m.k === 'crescent') return <g><circle cx={m.x} cy={m.y} r={m.r} fill={m.c} /><circle cx={m.x + m.r * 0.35} cy={m.y} r={m.r * 0.8} fill={bg} /></g>;
  const { x, y, r } = m;
  return <polygon points={`${x - r},${y + r * 0.6} ${x - r},${y - r * 0.4} ${x - r * 0.5},${y} ${x},${y - r * 0.7} ${x + r * 0.5},${y} ${x + r},${y - r * 0.4} ${x + r},${y + r * 0.6}`} fill={m.c} />;
}

/** A small flag for a country id. */
export function Flag({ id, size = 18 }: { id: string; size?: number }) {
  const f = FLAGS[id] ?? fallback(id);
  const w = 30, h = 20;
  const bands = f.c.length;
  const shapes: React.ReactNode[] = [];
  if (f.t === 'h') f.c.forEach((c, i) => shapes.push(<rect key={`b${i}`} x={0} y={(i * h) / bands} width={w} height={h / bands + 0.05} fill={c} />));
  else if (f.t === 'v') f.c.forEach((c, i) => shapes.push(<rect key={`b${i}`} x={(i * w) / bands} y={0} width={w / bands + 0.05} height={h} fill={c} />));
  else shapes.push(<rect key="bg" width={w} height={h} fill={f.c[0]} />);
  if (f.t === 'nordic') {
    shapes.push(<rect key="cx" x={8} y={0} width={5} height={h} fill={f.cross} />, <rect key="cy" x={0} y={7.5} width={w} height={5} fill={f.cross} />);
    if (f.inner) shapes.push(<rect key="ix" x={9.3} y={0} width={2.4} height={h} fill={f.inner} />, <rect key="iy" x={0} y={8.8} width={w} height={2.4} fill={f.inner} />);
  }
  if (f.t === 'swiss') shapes.push(<rect key="sx" x={13} y={4} width={4} height={12} fill={f.cross} />, <rect key="sy" x={9} y={8} width={12} height={4} fill={f.cross} />);
  if (f.t === 'union') {
    shapes.push(
      <line key="d1" x1={0} y1={0} x2={w} y2={h} stroke={f.inner} strokeWidth={4} />, <line key="d2" x1={w} y1={0} x2={0} y2={h} stroke={f.inner} strokeWidth={4} />,
      <line key="d3" x1={0} y1={0} x2={w} y2={h} stroke={f.cross} strokeWidth={1.4} />, <line key="d4" x1={w} y1={0} x2={0} y2={h} stroke={f.cross} strokeWidth={1.4} />,
      <rect key="wx" x={12} y={0} width={6} height={h} fill={f.inner} />, <rect key="wy" x={0} y={7} width={w} height={6} fill={f.inner} />,
      <rect key="rx" x={13.2} y={0} width={3.6} height={h} fill={f.cross} />, <rect key="ry" x={0} y={8.2} width={w} height={3.6} fill={f.cross} />,
    );
  }
  if (f.diamond) shapes.push(<polygon key="dm" points={`15,2 28,10 15,18 2,10`} fill={f.diamond} />);
  if (f.canton) {
    shapes.push(<rect key="ca" x={0} y={0} width={f.cantonW} height={f.cantonH} fill={f.canton} />);
    if (id === 'grc') shapes.push(<rect key="g1" x={4.4} y={0} width={2.2} height={11.1} fill={W} />, <rect key="g2" x={0} y={4.4} width={11.1} height={2.2} fill={W} />);
  }
  if (f.tri) shapes.push(<polygon key="tr" points={`0,0 ${f.triW},${h / 2} 0,${h}`} fill={f.tri} />);
  const bg = f.canton && f.marks?.[0] && f.marks[0].x < (f.cantonW ?? 0) ? f.canton : f.t === 'v' && bands > 2 ? f.c[Math.floor(bands / 2)] : f.c[0];
  (f.marks ?? []).forEach((m, i) => shapes.push(<MarkSvg key={`m${i}`} m={m} bg={m.k === 'crescent' && f.tri ? f.tri : bg} />));
  return (
    <svg className="flag" width={size * 1.5} height={size} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="flag">
      {shapes}
      <rect width={w} height={h} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={0.6} />
    </svg>
  );
}
