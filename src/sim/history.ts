import { OFFICE_NAMES, SYSTEMS } from '../data/systems';
import { kindOf } from './offices';
import type { CareerHistory, GameState, Moment, Player, RunSummary, YearSnap } from './types';

// The story of a playthrough: what happened, how the country changed, and a final score.

export const MONTHS_OUT_LIMIT = 96;
const MAX_MOMENTS = 300;

const date = (g: GameState) => `${g.year}-${String(g.month).padStart(2, '0')}`;

export function newHistory(g: GameState): CareerHistory {
  return { moments: [], years: [], monthsByOffice: {}, logMark: g.log[0] ?? '', startYear: g.year, startTurn: g.turn, monthsOut: 0, scandals: 0, warsWon: 0, warsLost: 0, removed: false };
}

const KINDS: [Moment['kind'], RegExp][] = [
  ['scandal', /scandal|removed from power|purged|ousted|impeach|no-confidence/i],
  ['war', /declares war|victory:|defeat:|peace deal|ceasefire|sends troops|arms to the/i],
  ['election', /re-elected|becomes .* with|loses the race|reconfirm|keeps the job|wins/i],
  ['policy', /sets .* policy|becomes law|passes|signs a|takes .* into the|pulls .* out of|joins your/i],
];

function classify(line: string, p: Player, countryName: string): Moment['kind'] | null {
  const mine = line.includes(p.name) || /\byour\b|\byou\b/i.test(line) || (line.includes(countryName) && /war|disease|strikes|sanction/i.test(line));
  if (!mine) return null;
  for (const [k, re] of KINDS) if (re.test(line)) return k;
  return null;
}

function snapshot(g: GameState, p: Player): YearSnap {
  const c = g.countries[p.countryId];
  const r = (v: number, d = 0) => { const x = Math.round(v * 10 ** d) / 10 ** d; return x === 0 ? 0 : x; };
  return {
    year: g.year, age: p.age, office: p.office, popularity: r(p.popularity),
    rung: p.office ? SYSTEMS[c.systemId].ladder.indexOf(p.office) : -1,
    gdpBn: r(c.economy.gdpBn), growth: r(c.economy.growth, 1), stability: r(c.stability),
    health: r(c.society?.health ?? 50), education: r(c.society?.education ?? 50), crime: r(c.society?.crime ?? 40),
  };
}

const COUNTRY_KEYS = ['health', 'education', 'crime', 'corruption', 'inequality', 'pollution'] as const;
function countryScores(g: GameState, p: Player): Record<string, number> {
  const c = g.countries[p.countryId];
  const out: Record<string, number> = { stability: c.stability, gdpBn: c.economy.gdpBn };
  for (const k of COUNTRY_KEYS) out[k] = c.society?.[k] ?? 50;
  return out;
}

/** Called after each month: adds the month's key moments and yearly snapshot, and ends careers that stalled. */
export function recordMonth(before: GameState, after: GameState): GameState {
  let p = after.player;
  if (!p) return after;
  const prev = before.player;
  // Saves from before history existed start from what the player record already knows.
  const h0 = p.history ?? prev?.history ?? (() => {
    const h = newHistory(before);
    if (prev?.office) h.monthsByOffice[prev.office] = prev.monthsInOffice;
    return h;
  })();
  const h: CareerHistory = { ...h0, moments: [...h0.moments], years: [...h0.years], monthsByOffice: { ...h0.monthsByOffice } };
  if (prev?.retired) return after;
  const c = after.countries[p.countryId];
  const add = (kind: Moment['kind'], text: string) => h.moments.push({ turn: after.turn, date: date(after), kind, text });

  // Fresh log lines since last month, oldest first.
  const markAt = h.logMark ? after.log.indexOf(h.logMark) : -1;
  const fresh = (markAt >= 0 ? after.log.slice(0, markAt) : after.log.slice(0, 12)).slice().reverse();
  for (const line of fresh) {
    const text = line.replace(/^\d{4}-\d{2}: /, '');
    const k = classify(text, p, c.name);
    if (k) add(k, text);
    if (/^Scandal|scandal/.test(text) && (text.includes(p.name) || /\byour\b/i.test(text))) h.scandals++;
    if (/^Victory:/.test(text)) h.warsWon++;
    if (/^Defeat:/.test(text)) h.warsLost++;
    if (/removed from power|is purged|ousted/i.test(text) && text.includes(p.name)) h.removed = true;
  }
  h.logMark = after.log[0] ?? h.logMark;

  // Office changes.
  if (prev && prev.office !== p.office) {
    if (p.office) add('office', `Took office as ${OFFICE_NAMES[p.office]}.`);
    else if (prev.office) add('office', `Left office as ${OFFICE_NAMES[prev.office]}.`);
  }
  if (p.office) { h.monthsByOffice[p.office] = (h.monthsByOffice[p.office] ?? 0) + 1; h.monthsOut = 0; } else h.monthsOut++;

  // Leading the country: remember how it looked at the start and now.
  if (kindOf(p.office) === 'head') {
    if (!h.leaderStart) h.leaderStart = countryScores(before, p);
    h.leaderEnd = countryScores(after, p);
  }

  if (after.month === 1 || !h.years.length) h.years.push(snapshot(after, p));

  // A career that has gone nowhere for too long ends.
  if (!p.retired && h.monthsOut >= MONTHS_OUT_LIMIT) {
    p = { ...p, retired: true, campaign: null };
    add('end', `${MONTHS_OUT_LIMIT / 12} years without office: ${p.name} leaves politics.`);
    h.endReason = 'Out of office too long';
  }
  if (p.retired && !h.endReason) h.endReason = endReason(after, p, h);
  if (p.retired && !h.moments.some((m) => m.kind === 'end')) add('end', `Career ends: ${h.endReason}.`);
  if (p.retired) h.years.push(snapshot(after, p));
  if (h.moments.length > MAX_MOMENTS) h.moments.splice(0, h.moments.length - MAX_MOMENTS);
  return { ...after, player: { ...p, history: h } };
}

function endReason(g: GameState, p: Player, h: CareerHistory): string {
  const recent = g.log.slice(0, 6).join(' ');
  if (h.removed) return 'Removed from power';
  if (/retires from public life/.test(recent)) return `Retired at ${p.age}`;
  if (/chooses to retire/.test(recent)) return 'Chose to retire';
  if (/loses the race/.test(recent)) return 'Lost an election at the top';
  return 'Left the top office';
}

/** Step down for good. */
export function retireNow(g: GameState): GameState {
  const p = g.player;
  if (!p || p.retired) return g;
  const next = { ...g, player: { ...p, office: null, campaign: null, retired: true }, log: [`${date(g)}: ${p.name} chooses to retire from politics.`, ...g.log].slice(0, 200) };
  return recordMonth(g, next);
}

// ---------- Score and rank ----------

export interface ScoreLine { label: string; points: number }
export const RANKS: [number, string, string][] = [
  [950, 'S', 'Legend'], [720, 'A', 'Statesman'], [500, 'B', 'Respected leader'], [300, 'C', 'Career politician'], [120, 'D', 'Forgettable'], [-Infinity, 'E', 'Footnote'],
];

export function rankOf(score: number, removed: boolean): { grade: string; title: string } {
  const [, grade, title] = RANKS.find(([min]) => score >= min)!;
  return { grade, title: removed ? 'Disgraced' : title };
}

export function careerScore(g: GameState): { total: number; lines: ScoreLine[]; grade: string; title: string } {
  const p = g.player!;
  const h = p.history ?? newHistory(g);
  const ladder = SYSTEMS[g.countries[p.countryId].systemId].ladder;
  const lines: ScoreLine[] = [];
  const push = (label: string, points: number) => { if (Math.round(points) !== 0) lines.push({ label, points: Math.round(points) }); };
  push(`Highest office: ${p.highestRung >= 0 ? OFFICE_NAMES[ladder[p.highestRung]] : 'none'}`, ((p.highestRung + 1) / ladder.length) * 400);
  const months = Object.values(h.monthsByOffice).reduce((a, b) => a + (b ?? 0), 0);
  const yrs = months / 12;
  push(`Years in office: ${yrs.toFixed(1)}`, Math.min(yrs, 20) * 6 + Math.max(0, yrs - 20) * 2);
  const top = h.monthsByOffice[ladder[ladder.length - 1]] ?? 0;
  const topY = top / 12;
  push(`Years at the top: ${topY.toFixed(1)}`, Math.min(topY, 10) * 10 + Math.max(0, topY - 10) * 3);
  push(`Elections: ${p.record.won} won, ${p.record.lost} lost`, p.record.won * 15 - p.record.lost * 5);
  const served = h.years.filter((y) => y.office);
  if (served.length) {
    const avg = served.reduce((a, y) => a + y.popularity, 0) / served.length;
    push(`Average popularity in office: ${Math.round(avg)}%`, (avg - 50) * 2);
  }
  if (h.leaderStart && h.leaderEnd) {
    const s = h.leaderStart, e = h.leaderEnd;
    const better = (e.health - s.health) + (e.education - s.education) - (e.crime - s.crime) - (e.corruption - s.corruption) - (e.inequality - s.inequality) - (e.pollution - s.pollution) + (e.stability - s.stability);
    const growth = (e.gdpBn / Math.max(1, s.gdpBn) - 1) * 100;
    push('How the country changed under you', Math.max(-150, Math.min(200, better * 2 + growth)));
  }
  if (p.nation) push('Legacy', Math.min(150, p.nation.legacy));
  push(`Wars: ${h.warsWon} won, ${h.warsLost} lost`, h.warsWon * 30 - h.warsLost * 40);
  if (h.scandals) push(`Scandals: ${h.scandals}`, -15 * h.scandals);
  if (h.removed) push('Removed from power', -100);
  const total = lines.reduce((a, l) => a + l.points, 0);
  return { total, lines, ...rankOf(total, h.removed) };
}

/** A finished run for the Hall of Fame. */
export function summarize(g: GameState): RunSummary {
  const p = g.player!;
  const h = p.history ?? newHistory(g);
  const c = g.countries[p.countryId];
  const ladder = SYSTEMS[c.systemId].ladder;
  const s = careerScore(g);
  return {
    id: `${g.seed}-${h.startTurn}-${p.name}-${p.countryId}`, name: p.name, countryId: p.countryId, countryName: c.name, systemId: c.systemId,
    startYear: h.startYear, endYear: g.year, age: p.age, highestOffice: p.highestRung >= 0 ? OFFICE_NAMES[ladder[p.highestRung]] : 'None',
    score: s.total, grade: s.grade, title: s.title, lines: s.lines, endReason: h.endReason ?? 'Unfinished',
    record: p.record, moments: h.moments.slice(-80), years: h.years, finishedAt: new Date().toISOString(),
  };
}

// ---------- Hall of Fame (kept in this browser) ----------

interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void }
const HOF_KEY = 'polsim:hall-of-fame';
export const HOF_MAX = 30;

export function loadRuns(kv: KV | null): RunSummary[] {
  if (!kv) return [];
  try {
    const v = JSON.parse(kv.getItem(HOF_KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

export function addRun(kv: KV | null, run: RunSummary): RunSummary[] {
  const runs = loadRuns(kv).filter((r) => r.id !== run.id);
  const next = [...runs, run].sort((a, b) => b.score - a.score).slice(0, HOF_MAX);
  try { kv?.setItem(HOF_KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
  return next;
}
