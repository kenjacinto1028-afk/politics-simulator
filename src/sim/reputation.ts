import { clamp } from './city';
import { kindOf } from './offices';
import type { Contact, Effects, GameState, Home, OfficeId, Player, Rep, TraitId } from './types';

// Your reputation (how your choices make people see you) and your home turf.

export const REP_ZERO: Rep = { integrity: 0, party: 0, people: 0, bold: 0 };
export const repOf = (p: Player): Rep => p.rep ?? REP_ZERO;

export const REP_AXES: { id: keyof Rep; plus: string; minus: string; blurb: string }[] = [
  { id: 'integrity', plus: 'Honest', minus: 'Shady', blurb: 'Turning down dirty money and owning mistakes vs. side deals and cover-ups.' },
  { id: 'party', plus: 'Team player', minus: 'Maverick', blurb: 'Siding with your party vs. going your own way.' },
  { id: 'people', plus: 'For the people', minus: 'For business', blurb: 'Workers, students and retirees vs. business owners.' },
  { id: 'bold', plus: 'Bold', minus: 'Cautious', blurb: 'Big swings and spending vs. playing it safe.' },
];

/** Moves reputation, slower the further out it already is. */
export function nudgeRep(p: Player, d: Partial<Rep>): Player {
  const r = { ...repOf(p) };
  for (const k of Object.keys(d) as (keyof Rep)[]) {
    const v = d[k] ?? 0;
    if (!v) continue;
    const room = v > 0 ? 1 - Math.max(0, r[k]) / 120 : 1 - Math.max(0, -r[k]) / 120;
    r[k] = clamp(Math.round((r[k] + v * room) * 10) / 10, -100, 100);
  }
  return { ...p, rep: r };
}

const sum = (o?: Partial<Record<string, number>>) => Object.values(o ?? {}).reduce((a: number, b) => a + (b ?? 0), 0);

/** What a decision says about you, read from its effects. */
export function repFromChoice(e: Effects, label = ''): Partial<Rep> {
  const d: Partial<Rep> = { ...e.rep };
  const add = (k: keyof Rep, v: number) => { d[k] = (d[k] ?? 0) + v; };
  // Money in exchange for public anger reads as a dirty deal; giving money back reads as clean.
  if ((e.funds ?? 0) >= 10 && ((e.popularity ?? 0) < 0 || (e.groups?.workers ?? 0) < 0)) add('integrity', -5);
  if (e.secret) add('integrity', -6);
  if (/\b(return|refuse|decline|reject|turn down|apologi[sz]e|come clean|disclose)\b/i.test(label) && (e.funds ?? 0) <= 0) add('integrity', 3);
  if (/\b(cover|hide|bury|deny|blame|spin|leak)\b/i.test(label)) add('integrity', -3);
  if (e.loyalty) add('party', clamp(e.loyalty, -6, 6));
  const people = (e.groups?.workers ?? 0) + (e.groups?.students ?? 0) + (e.groups?.retirees ?? 0);
  const biz = e.groups?.business ?? 0;
  if (people || biz) add('people', clamp(Math.round(people / 2 - biz), -6, 6));
  const size = Math.abs(e.popularity ?? 0) + Math.abs(e.treasury ?? 0) / 10 + Math.abs(sum(e.groups)) + Math.abs(e.jobs ?? 0) + Math.abs(e.culture ?? 0);
  if (size >= 16) add('bold', 3);
  else if (size <= 4) add('bold', -3);
  return d;
}

/** Short labels for the clearest sides of your reputation. */
export function repLabels(p: Player): string[] {
  const r = repOf(p);
  return REP_AXES.filter((a) => Math.abs(r[a.id]) >= 20).sort((a, b) => Math.abs(r[b.id]) - Math.abs(r[a.id]))
    .map((a) => `${Math.abs(r[a.id]) >= 55 ? 'Very ' : ''}${r[a.id] > 0 ? a.plus : a.minus}`.replace('Very For', 'Strongly for'));
}

// ---------- How other politicians see you ----------

const LIKES: Partial<Record<TraitId, [keyof Rep, number, string, string][]>> = {
  reformer: [['integrity', 0.5, 'likes your honesty', 'hates your shady deals']],
  corrupt: [['integrity', -0.35, 'thinks you play the game', 'finds you too clean to trust']],
  populist: [['people', 0.4, 'likes that you side with ordinary people', 'thinks you serve the rich']],
  generous: [['people', 0.3, 'likes your care for ordinary people', 'thinks you are cold']],
  technocrat: [['bold', -0.25, 'likes your careful approach', 'thinks you are reckless'], ['integrity', 0.2, 'trusts your numbers', 'doubts your numbers']],
  cautious: [['bold', -0.4, 'likes that you play it safe', 'thinks you are reckless']],
  hawk: [['bold', 0.3, 'likes your nerve', 'thinks you are soft']],
  dove: [['bold', -0.2, 'likes your calm', 'finds you hot-headed']],
  charismatic: [['bold', 0.25, 'enjoys your style', 'finds you dull']],
  vain: [['bold', 0.2, 'likes the spotlight you bring', 'finds you dull']],
};

export interface Opinion { score: number; reasons: string[] }

/** -50..50: what a politician thinks of the person you have become. */
export function opinionOf(p: Player, c: Pick<Contact, 'traits' | 'party' | 'rung'>): Opinion {
  const r = repOf(p);
  let score = 0;
  const parts: [number, string][] = [];
  for (const t of c.traits ?? []) {
    for (const [axis, w, good, bad] of LIKES[t] ?? []) {
      const v = r[axis] * w;
      score += v;
      if (Math.abs(v) >= 4) parts.push([v, v > 0 ? good : bad]);
    }
  }
  if (c.rung >= 0) {
    const v = c.party === 'yours' ? r.party * 0.3 : -r.party * 0.15;
    score += v;
    if (Math.abs(v) >= 4) parts.push([v, c.party === 'yours' ? (v > 0 ? 'values your party loyalty' : 'resents you going rogue') : (v > 0 ? 'respects your independence' : 'sees you as a party hack')]);
  }
  if ((p.scandal?.exposed ?? 0) > 0 && !(c.traits ?? []).includes('corrupt')) {
    const v = -Math.min(12, p.scandal!.exposed * 4);
    score += v;
    parts.push([v, 'is wary of your scandals']);
  }
  parts.sort((a, b) => Math.abs(b[0]) - Math.abs(a[0]));
  return { score: clamp(Math.round(score), -50, 50), reasons: parts.slice(0, 2).map(([, t]) => t) };
}

export const opinionWord = (s: number) => (s >= 20 ? 'Admires you' : s >= 7 ? 'Likes you' : s > -7 ? 'Neutral' : s > -20 ? 'Dislikes you' : 'Despises you');

/** Each month, politicians drift toward what they think of your reputation. */
export function driftRelations(p: Player): Player {
  return {
    ...p,
    contacts: p.contacts.map((c) => {
      const o = opinionOf(p, c).score;
      return o ? { ...c, relation: clamp(c.relation + o * 0.025, -100, 100) } : c;
    }),
  };
}

// ---------- Home turf ----------

export function homeOf(p: Player): Home {
  return p.home ?? { city: p.city?.name ?? 'your hometown', region: p.region?.name ?? 'your home region', pride: 55 };
}

/** Support in your home city, home region and the rest of the country (0..100). */
export function supportByArea(p: Player): { city: number; region: number; rest: number } {
  const h = homeOf(p);
  const d = h.pride - 50;
  return {
    city: clamp(Math.round(p.popularity + 6 + d * 0.6), 0, 100),
    region: clamp(Math.round(p.popularity + 3 + d * 0.3), 0, 100),
    rest: clamp(Math.round(p.popularity - 2 - Math.max(0, d) * 0.05), 0, 100),
  };
}

/** Vote points from your home turf in a race for this office. Wider races dilute it. */
export function homeEdge(p: Player, office: OfficeId): number {
  const d = homeOf(p).pride - 50;
  const k = kindOf(office);
  const w = k === 'local' ? 0.15 : k === 'regional' || k === 'legislative' ? 0.3 : 0.1;
  return Math.round(d * w * 10) / 10;
}

/** Monthly pride: serving home makes it proud, being far away lets it fade. */
export function tickHome(p: Player): Player {
  const h = homeOf(p);
  const k = kindOf(p.office);
  let d = -0.05;
  if (k === 'local' && p.city && p.city.name === h.city) d = 0.25 + (p.city.happiness - 50) * 0.01;
  else if (k === 'regional' && p.region && p.region.name === h.region) d = 0.15 + (p.region.happiness - 50) * 0.01;
  else if (k === 'legislative') d = 0.05;
  return { ...p, home: { ...h, pride: clamp(Math.round((h.pride + d) * 100) / 100, 0, 100) } };
}

export const HOMETOWN_COST = 5;

/** Visit your hometown: a cheap way to keep your base warm once you have moved up. */
export function hometownBlocker(p: Player | null): string | null {
  if (!p) return 'No career';
  if (kindOf(p.office) === 'local') return 'You already govern it';
  if (p.funds < HOMETOWN_COST) return `Needs $${HOMETOWN_COST}k`;
  return null;
}

export function visitHometown(g: GameState): GameState {
  const p = g.player;
  if (!p || p.actionsLeft <= 0 || p.pendingEvent || hometownBlocker(p)) return g;
  const h = homeOf(p);
  const gain = Math.max(1, Math.round(6 * (1 - h.pride / 120)));
  const player: Player = { ...p, actionsLeft: p.actionsLeft - 1, funds: p.funds - HOMETOWN_COST, popularity: clamp(p.popularity + 0.5, 0, 100), home: { ...h, pride: clamp(h.pride + gain, 0, 100) } };
  const stamp = `${g.year}-${String(g.month).padStart(2, '0')}`;
  return { ...g, player, log: [`${stamp}: ${p.name} goes home to ${h.city} for a weekend of handshakes (home pride +${gain}).`, ...g.log].slice(0, 200) };
}
