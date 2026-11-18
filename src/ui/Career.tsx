import { useState } from 'react';
import { useGame } from '../store';
import { SYSTEMS } from '../data/systems';
import { careerScore, summarize } from '../sim/history';
import type { Moment, RunSummary, YearSnap } from '../sim/types';

const KIND_LABEL: Record<Moment['kind'], string> = { office: 'Office', election: 'Election', war: 'War', policy: 'Decision', scandal: 'Scandal', end: 'End' };

/** Popularity (blue) and office level (gold) over the years. */
export function CareerChart({ years, rungs }: { years: YearSnap[]; rungs: number }) {
  if (years.length < 2) return <p className="muted small-text">The chart fills in as the years go by.</p>;
  const W = 300, H = 110;
  const x = (i: number) => (i / (years.length - 1)) * W;
  const pop = years.map((y, i) => `${x(i).toFixed(1)},${(H - (y.popularity / 100) * H).toFixed(1)}`).join(' ');
  const rung = years.map((y, i) => `${x(i).toFixed(1)},${(H - ((y.rung + 1) / Math.max(1, rungs)) * H).toFixed(1)}`).join(' ');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="120" preserveAspectRatio="none" role="img" aria-label="Popularity and office over time">
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#3a3f4b" strokeDasharray="3 3" />
        <polyline points={rung} fill="none" stroke="#c9a33a" strokeWidth="2" />
        <polyline points={pop} fill="none" stroke="#3b6cff" strokeWidth="2" />
      </svg>
      <p className="small-text muted"><span style={{ color: '#3b6cff' }}>━</span> Popularity <span style={{ color: '#c9a33a' }}>━</span> Office level · {years[0].year} to {years[years.length - 1].year}</p>
    </div>
  );
}

/** Score breakdown, chart and timeline for a run. */
export function CareerReport({ run, live = false }: { run: RunSummary; live?: boolean }) {
  const [all, setAll] = useState(false);
  const moments = all ? run.moments : run.moments.slice(-15);
  const rungs = SYSTEMS[run.systemId]?.ladder.length ?? 6;
  return (
    <>
      <p style={{ fontSize: 28, margin: '4px 0' }}><b>{run.grade}</b> <span style={{ fontSize: 18 }}>{run.title}</span></p>
      <p><b>{run.score}</b> points{live ? ' so far' : ''} · {run.highestOffice} · {run.countryName} · {run.startYear} to {run.endYear}{!live && <> · {run.endReason}</>}</p>
      <table>
        <tbody>
          {run.lines.map((l) => <tr key={l.label}><td>{l.label}</td><td className={l.points < 0 ? 'neg' : 'pos'} style={{ textAlign: 'right' }}>{l.points > 0 ? '+' : ''}{l.points}</td></tr>)}
        </tbody>
      </table>
      <h4>Over the years</h4>
      <CareerChart years={run.years} rungs={rungs} />
      <h4>Timeline</h4>
      {run.moments.length === 0 ? <p className="muted small-text">Nothing yet.</p> : (
        <ul className="news">
          {moments.slice().reverse().map((m, i) => <li key={i}><span className="muted small-text">{m.date} · {KIND_LABEL[m.kind]}</span><br />{m.text}</li>)}
        </ul>
      )}
      {run.moments.length > 15 && <button className="small secondary" onClick={() => setAll(!all)}>{all ? 'Show recent only' : `Show all ${run.moments.length}`}</button>}
    </>
  );
}

/** In-game: the score so far, and a way to step down. */
export function CareerSoFar() {
  const { game, retireNow } = useGame();
  const [sure, setSure] = useState(false);
  const run = summarize(game);
  const { total } = careerScore(game);
  return (
    <div className="panel">
      <h3>Career so far</h3>
      <CareerReport run={{ ...run, score: total }} live />
      <p className="muted small-text">The career ends when you retire at 75, leave the top office, are removed, or go 8 years without any office.</p>
      {!sure ? <button className="small secondary" onClick={() => setSure(true)}>Retire now</button> : (
        <div className="row">
          <button className="small" onClick={() => { setSure(false); retireNow(); }}>Yes, end my career</button>
          <button className="small secondary" onClick={() => setSure(false)}>Keep going</button>
        </div>
      )}
    </div>
  );
}

/** Past runs in this browser, best first. */
export function HallOfFame() {
  const runs = useGame((s) => s.runs);
  const [open, setOpen] = useState<string | null>(null);
  if (!runs.length) return null;
  return (
    <div className="panel">
      <h3>Hall of Fame</h3>
      <ul className="news">
        {runs.map((r, i) => (
          <li key={r.id}>
            <div onClick={() => setOpen(open === r.id ? null : r.id)} style={{ cursor: 'pointer' }}>
              <b>{i + 1}. {r.grade} · {r.name}</b> <span className="muted small-text">{r.title}</span>
              <br /><span className="small-text">{r.score} pts · {r.highestOffice}, {r.countryName} · {r.startYear} to {r.endYear}</span>
            </div>
            {open === r.id && <div className="card"><CareerReport run={r} /></div>}
          </li>
        ))}
      </ul>
      <p className="muted small-text">Saved in this browser. Tap a run to see its story.</p>
    </div>
  );
}
