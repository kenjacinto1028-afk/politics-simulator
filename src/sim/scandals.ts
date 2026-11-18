import { clamp } from './city';
import { kindOf } from './offices';
import { personName } from './names';
import { readValue } from './society';
import { repOf } from './reputation';
import type { Rng } from './rng';
import type { Effects, GameState, PendingEvent, Player, ScandalState, Secret } from './types';

// Scandals: favors owed to donors, side deals and slip-ups that can come out at the worst time.

const pick = <T,>(arr: readonly T[], rng: Rng) => arr[Math.floor(rng() * arr.length)];
export const scandalOf = (p: Player): ScandalState => p.scandal ?? { heat: 0, secrets: [], exposed: 0, nextId: 1 };

/** Donor favor sizes scale with the office. */
export function stakes(p: Player): number {
  const k = kindOf(p.office);
  return k === 'head' || k === 'cabinet' ? 60 : k === 'regional' || k === 'legislative' ? 35 : 20;
}

const FAVORS = [
  'a zoning change for a new tower', 'a no-bid road contract', 'a tax break for their company', 'a job for their nephew',
  'looser rules on their factory', 'a seat on a public board', 'a quiet word with the regulator', 'a permit for a beachfront hotel',
];
const DONOR_KIND = ['developer', 'mining boss', 'shipping magnate', 'bank owner', 'casino owner', 'property tycoon', 'media owner', 'contractor'];

/** Store a new secret on the player. */
export function addSecret(g: GameState, p: Player, s: NonNullable<Effects['secret']>): Player {
  const sc = scandalOf(p);
  const secret: Secret = { id: `s${sc.nextId}`, turn: g.turn, ...s, sev: clamp(Math.round(s.sev), 1, 3) };
  return { ...p, scandal: { ...sc, nextId: sc.nextId + 1, secrets: [...sc.secrets, secret].slice(-8) } };
}

/** Applies scandal parts of a choice: heat, new secrets, and what happens to the secret in play. */
export function applyScandalEffects(g: GameState, p: Player, e: Effects, secretId?: string): Player {
  let q = p;
  if (e.secret) q = addSecret(g, q, e.secret);
  let sc = scandalOf(q);
  if (e.heat) sc = { ...sc, heat: clamp(sc.heat + e.heat, 0, 100) };
  if (secretId && e.onSecret) {
    const s = sc.secrets.find((x) => x.id === secretId);
    if (s) {
      const rest = sc.secrets.filter((x) => x.id !== secretId);
      if (e.onSecret === 'settle') sc = { ...sc, secrets: rest };
      else if (e.onSecret === 'delay') sc = { ...sc, secrets: [...rest, { ...s, due: g.turn + 4 }] };
      else if (e.onSecret === 'bury') sc = { ...sc, secrets: [...rest, { ...s, buriedUntil: g.turn + 12, due: undefined }] };
      else if (e.onSecret === 'deny') sc = { ...sc, secrets: [...rest, { ...s, denied: (s.denied ?? 0) + 1, sev: Math.min(3, s.sev + 1), due: undefined, buriedUntil: g.turn + 6 }] };
    }
  }
  return { ...q, scandal: sc };
}

// ---------- Events ----------

const sc3 = (n: number) => Math.max(1, Math.round(n));

/** A donor who gave with strings attached. Offered after some fundraisers. */
export function donorOffer(g: GameState, rng: Rng): PendingEvent {
  const p = g.player!;
  const who = `${personName(p.countryId, rng)}, a ${pick(DONOR_KIND, rng)}`;
  const favor = pick(FAVORS, rng);
  const amt = stakes(p);
  return {
    id: 'sc-donor', title: 'Money With Strings',
    text: `${who}, offers $${amt}k for your campaign. Later, they will want ${favor}.`,
    choices: [
      { label: `Take it (+$${amt}k, you owe a favor)`, effects: { funds: amt, heat: 6, secret: { text: `took $${amt}k from ${who} for ${favor}`, sev: amt >= 50 ? 2 : 1, donor: who, favor, amount: amt, due: g.turn + 4 + Math.floor(rng() * 6) }, rep: { integrity: -4 } }, log: `${p.name} takes a large check from ${who}.` },
      { label: `Take half, promise nothing (+$${Math.round(amt / 2)}k)`, effects: { funds: Math.round(amt / 2), heat: 3, groups: { business: -1 } }, log: `${p.name} takes a smaller check with no promises.` },
      { label: 'Turn it down', effects: { groups: { business: -2 }, loyalty: -1, rep: { integrity: 4 } }, log: `${p.name} turns down a donor's money.` },
    ],
  };
}

/** The donor wants their favor now. */
function favorDue(g: GameState, s: Secret): PendingEvent {
  const p = g.player!;
  const amt = s.amount ?? stakes(p);
  return {
    id: 'sc-favor', secretId: s.id, title: 'A Favor Called In',
    text: `${s.donor ?? 'A donor'} gave you $${amt}k. Now they want ${s.favor ?? 'something back'}. If you refuse, they may talk.`,
    choices: [
      { label: 'Do the favor', effects: { groups: { business: 3, workers: -2 }, heat: 12, onSecret: 'settle', secret: { text: `gave ${s.donor ?? 'a donor'} ${s.favor ?? 'a favor'}`, sev: Math.min(3, s.sev + 1) }, rep: { integrity: -8, people: -3 } }, log: `${p.name} quietly delivers ${s.favor ?? 'a favor'} for a donor.` },
      { label: `Pay the money back (-$${amt}k)`, effects: { funds: -amt, heat: -6, onSecret: 'settle', rep: { integrity: 5 } }, log: `${p.name} returns a donor's money.` },
      { label: 'Refuse and risk it', effects: { heat: 10, groups: { business: -3 }, rep: { integrity: 4 }, onSecret: 'deny' }, log: `${p.name} refuses a donor's demand. The donor is furious.` },
      { label: 'Stall for a few months', effects: { heat: 4, onSecret: 'delay', popularity: -1 }, log: `${p.name} stalls a donor with vague promises.` },
    ],
  };
}

/** Someone who knows your secret wants something. */
function blackmail(g: GameState, s: Secret, holderName: string, holderId: string): PendingEvent {
  const p = g.player!;
  return {
    id: 'sc-blackmail', secretId: s.id, contactId: holderId, title: 'Leverage',
    text: `${holderName} knows that you ${s.text}. They want your backing on their plans, or the press gets the story.`,
    choices: [
      { label: 'Give them what they want', effects: { contact: 20, loyalty: -4, popularity: -1, onSecret: 'bury', rep: { integrity: -3, party: -3 } }, log: `${p.name} quietly backs ${holderName}'s plans.` },
      { label: `Pay for their silence (-$${stakes(p)}k)`, effects: { funds: -stakes(p), contact: 5, onSecret: 'bury', heat: 4, rep: { integrity: -5 } }, log: `Money changes hands to keep a story quiet.` },
      { label: 'Get ahead of it: confess', effects: { popularity: -3 * s.sev, heat: -15, contact: -10, onSecret: 'settle', rep: { integrity: 6 } }, log: `Scandal: ${p.name} admits they ${s.text} before a rival can leak it.` },
      { label: 'Call their bluff', effects: { contact: -25, heat: 8, onSecret: 'deny', rep: { bold: 4 } }, log: `${p.name} tells ${holderName} to do their worst.` },
    ],
  };
}

const RANDOM_SCANDALS: { text: string; sev: number; out?: boolean }[] = [
  { text: 'billed taxpayers for a luxury hotel stay', sev: 1 },
  { text: 'got your cousin a well-paid public job', sev: 1 },
  { text: 'let a senior aide bully junior staff for months', sev: 1 },
  { text: 'mocked voters in a leaked group chat', sev: 2 },
  { text: 'ran an old company that dodged taxes', sev: 2 },
  { text: 'copied a big speech from someone else', sev: 1, out: true },
  { text: 'let volunteers pad the voter rolls', sev: 2, out: true },
  { text: 'let your sibling use your name to win a contract', sev: 2 },
  { text: 'took a free holiday from a company you regulate', sev: 2 },
];

/** A secret comes out. How you answer decides how bad it gets. */
function exposure(g: GameState, s: Secret): PendingEvent {
  const p = g.player!;
  const hit = 3 * s.sev;
  const repeat = s.denied ? ' You denied it before, which makes it worse.' : '';
  const pay = 20 * s.sev;
  return {
    id: 'sc-exposed', secretId: s.id, title: 'Scandal!',
    text: `Reporters say you ${s.text}.${repeat}`,
    choices: [
      { label: 'Apologize and come clean', effects: { popularity: -hit - (s.denied ? 3 : 0), loyalty: -s.sev, heat: -25, onSecret: 'settle', rep: { integrity: 6 } }, log: `Scandal: ${p.name} apologizes after reports they ${s.text}.` },
      { label: 'Deny everything', effects: { popularity: -1, heat: 12, onSecret: 'deny', rep: { integrity: -6 } }, log: `Scandal: ${p.name} denies reports they ${s.text}. Reporters keep digging.` },
      { label: 'Blame a staffer', effects: { popularity: -sc3(hit / 2), loyalty: -3, heat: -8, onSecret: 'settle', rep: { integrity: -4 } }, log: `Scandal: ${p.name} fires an aide over reports they ${s.text}.` },
      { label: `Make it go away (-$${pay}k)`, effects: { funds: -pay, heat: 6, onSecret: 'bury', rep: { integrity: -7 } }, log: `${p.name}'s lawyers and friends make a story go quiet.` },
      { label: 'Attack the press', effects: { popularity: -sc3(hit / 2), loyalty: 3, groups: { students: -4, retirees: 2 }, heat: 4, onSecret: 'settle', rep: { party: 3, bold: 4, integrity: -2 } }, log: `Scandal: ${p.name} calls reports they ${s.text} a media witch hunt.` },
    ],
  };
}

/**
 * Monthly scandal step. Heat cools, rivals dig, and maybe something comes out.
 * Returns the updated game and, if one fires, a scandal event to show.
 */
export function tickScandal(g: GameState, rng: Rng): { game: GameState; event: PendingEvent | null; lines: string[] } {
  let p = g.player!;
  const lines: string[] = [];
  let sc = scandalOf(p);
  const rep = repOf(p);
  // Heat cools; honest politicians get the benefit of the doubt.
  sc = { ...sc, heat: clamp(sc.heat - (rep.integrity > 30 ? 1.5 : 1), 0, 100) };
  const live = sc.secrets.filter((s) => !s.buriedUntil || s.buriedUntil <= g.turn);
  // A hostile politician may learn one of your secrets.
  const enemies = p.contacts.filter((c) => c.relation < -20 && c.rung >= 0);
  const unknown = live.filter((s) => !s.holder);
  if (enemies.length && unknown.length && rng() < 0.06) {
    const s = pick(unknown, rng); const e = pick(enemies, rng);
    sc = { ...sc, secrets: sc.secrets.map((x) => (x.id === s.id ? { ...x, holder: e.id } : x)) };
  }
  // Rivals in a campaign use your record against you.
  if (p.campaign && (live.length || sc.heat > 30) && rng() < 0.08 * live.length + sc.heat / 400) {
    const hit = 2 + Math.round(rng() * 2);
    p = { ...p, popularity: clamp(p.popularity - hit, 0, 100), campaign: { ...p.campaign, rival: { ...p.campaign.rival, popularity: clamp(p.campaign.rival.popularity + 1, 0, 95) } } };
    const what = live.length ? `the rumors that you ${pick(live, rng).text}` : 'your shady reputation';
    lines.push(`${p.campaign!.rival.name} runs attack ads about ${what} (-${hit} popularity).`);
    sc = { ...sc, heat: clamp(sc.heat + 3, 0, 100) };
  }
  p = { ...p, scandal: sc };
  const game: GameState = { ...g, player: p };
  if (p.pendingEvent || p.retired) return { game, event: null, lines };

  // 1) A donor calls in a favor.
  const due = live.find((s) => s.favor && s.due !== undefined && s.due <= g.turn);
  if (due) return { game, event: favorDue(game, due), lines };
  // 2) Someone uses what they know.
  const held = live.filter((s) => s.holder && (p.contacts.find((c) => c.id === s.holder)?.relation ?? 0) < -10);
  if (held.length && rng() < 0.12) {
    const s = pick(held, rng); const c = p.contacts.find((x) => x.id === s.holder)!;
    return { game, event: blackmail(game, s, `${c.name} (${c.role})`, c.id), lines };
  }
  // 3) Something comes out. A free press digs harder.
  const press = readValue(g, g.countries[p.countryId], 'press') / 50;
  const weight = live.reduce((a, s) => a + s.sev * (1 + (s.denied ?? 0)), 0);
  const chance = (0.004 + sc.heat * 0.0011 + weight * 0.012 + (rep.integrity < -30 ? 0.01 : 0)) * (0.6 + press * 0.4);
  if (rng() < chance) {
    let s: Secret | undefined = live.length && rng() < 0.8 ? live.reduce((a, b) => (b.sev * (1 + (b.denied ?? 0)) > a.sev * (1 + (a.denied ?? 0)) ? b : a)) : undefined;
    let next = game;
    if (!s) {
      const pool = RANDOM_SCANDALS.filter((x) => !x.out || !p.office);
      const r = pick(pool.length ? pool : RANDOM_SCANDALS, rng);
      const q = addSecret(g, p, { text: r.text, sev: r.sev });
      s = scandalOf(q).secrets.at(-1)!;
      next = { ...game, player: q };
    }
    const sc2 = scandalOf(next.player!);
    next = { ...next, player: { ...next.player!, scandal: { ...sc2, exposed: sc2.exposed + 1 } } };
    return { game: next, event: exposure(next, s), lines };
  }
  return { game, event: null, lines };
}

/** 0..100 risk shown to the player. */
export function scandalRisk(p: Player): number {
  const sc = scandalOf(p);
  const weight = sc.secrets.reduce((a, s) => a + s.sev * (1 + (s.denied ?? 0)), 0);
  return clamp(Math.round(sc.heat * 0.7 + weight * 8), 0, 100);
}
