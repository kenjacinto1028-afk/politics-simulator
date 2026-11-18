import { GROUP_IDS } from './mayor';
import { kindOf } from './offices';
import type { Effects, GroupId, PendingEvent, Player } from './types';

// Makes every event choice a real trade-off, and adds more ways to answer.

type Choice = PendingEvent['choices'][number];
const NUM_KEYS = ['popularity', 'funds', 'loyalty', 'treasury', 'crime', 'services', 'jobs', 'happiness', 'culture', 'clergy', 'meter', 'contact'] as const;
type NumKey = (typeof NUM_KEYS)[number];

const hash = (s: string) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
/** Signed value of each change for you: crime and scandal heat are bad when they go up. */
const goodness = (k: string, v: number) => (k === 'crime' || k === 'heat' ? -v : v);

export function upsDowns(e: Effects): { up: number; down: number } {
  let up = 0, down = 0;
  const add = (k: string, v: number | undefined) => {
    if (!v) return;
    // Money is in $k (or $bn nationally): weigh it lightly against points.
    const w = k === 'funds' ? 0.3 : k === 'treasury' ? (Math.abs(v) < 5 ? 3 : 0.1) : 1;
    const g = goodness(k, v) * w;
    if (g > 0) up += g; else down -= g;
  };
  for (const k of NUM_KEYS) add(k, e[k]);
  for (const [, v] of Object.entries(e.groups ?? {})) add('group', v);
  add('heat', e.heat);
  if (e.secret) down += 3;
  return { up, down };
}

const COSTS: ((e: Effects, n: number, seed: number) => Effects)[] = [
  (e, n) => ({ ...e, loyalty: (e.loyalty ?? 0) - n }),
  (e, n) => ({ ...e, popularity: (e.popularity ?? 0) - Math.max(1, Math.round(n * 0.7)) }),
  (e, n) => ({ ...e, meter: (e.meter ?? 0) - n }),
  (e, n, seed) => {
    const gs = GROUP_IDS.filter((g) => !((e.groups?.[g] ?? 0) > 0));
    const g: GroupId = gs.length ? gs[seed % gs.length] : 'business';
    return { ...e, groups: { ...e.groups, [g]: (e.groups?.[g] ?? 0) - n - 1 } };
  },
  (e, n) => ({ ...e, funds: (e.funds ?? 0) - n * 3 }),
];
const PERKS: ((e: Effects, seed: number) => Effects)[] = [
  (e) => ({ ...e, loyalty: (e.loyalty ?? 0) + 2 }),
  (e) => ({ ...e, meter: (e.meter ?? 0) + 2 }),
  (e, seed) => {
    const gs = GROUP_IDS.filter((g) => !((e.groups?.[g] ?? 0) < 0));
    const g: GroupId = gs.length ? gs[seed % gs.length] : 'retirees';
    return { ...e, groups: { ...e.groups, [g]: (e.groups?.[g] ?? 0) + 3 } };
  },
  (e) => ({ ...e, funds: (e.funds ?? 0) + 5 }),
];

/** A choice with only upsides gets a cost; a choice with only downsides gets something back. */
export function tradeOff(e: Effects, seed: number): Effects {
  const { up, down } = upsDowns(e);
  // Try options in a seeded order until one actually adds the missing side.
  if (up > 0 && down === 0) {
    for (let i = 0; i < COSTS.length; i++) { const t = COSTS[(seed + i) % COSTS.length](e, Math.max(2, Math.min(6, Math.round(up * 0.35))), seed >>> 3); if (upsDowns(t).down > 0) return t; }
  }
  if (down > 0 && up === 0) {
    for (let i = 0; i < PERKS.length; i++) { const t = PERKS[(seed + i) % PERKS.length](e, seed >>> 3); if (upsDowns(t).up > 0) return t; }
  }
  return e;
}

function blend(a: Effects, b: Effects): Effects {
  const out: Effects = {};
  for (const k of NUM_KEYS) {
    const v = ((a[k] ?? 0) + (b[k] ?? 0)) / 2;
    const r = k === 'treasury' && Math.abs(v) < 5 ? Math.round(v * 10) / 10 : Math.round(v);
    if (r) (out as Record<NumKey, number>)[k] = r;
  }
  const groups: Partial<Record<GroupId, number>> = {};
  for (const g of GROUP_IDS) { const v = Math.round(((a.groups?.[g] ?? 0) + (b.groups?.[g] ?? 0)) / 2); if (v) groups[g] = v; }
  if (Object.keys(groups).length) out.groups = groups;
  return out;
}

const scale = (e: Effects, f: number): Effects => {
  const out: Effects = { ...e };
  for (const k of NUM_KEYS) if (e[k]) (out as Record<NumKey, number>)[k] = k === 'treasury' && Math.abs(e[k]!) < 5 ? Math.round(e[k]! * f * 10) / 10 : Math.round(e[k]! * f);
  if (e.groups) out.groups = Object.fromEntries(Object.entries(e.groups).map(([g, v]) => [g, Math.round((v ?? 0) * f)]));
  return out;
};

const DONOR_WORDS = new RegExp('\\b(take|accept|cash)\\b', 'i');
const sideCash = (p: Player) => { const k = kindOf(p.office); return k === 'head' || k === 'cabinet' ? 40 : k === 'regional' || k === 'legislative' ? 25 : 15; };

/** Every choice costs something, and most events get a middle ground and sometimes a shady way out. */
export function balanceEvent(ev: PendingEvent, p: Player, turn: number): PendingEvent {
  if (ev.id.startsWith('sc-')) return ev;
  const base = ev.choices.map((c, i) => {
    let effects = tradeOff(c.effects, hash(ev.id + i));
    // Big money from a donor always comes with a favor owed.
    if ((c.effects.funds ?? 0) >= 15 && DONOR_WORDS.test(c.label) && !effects.secret) {
      effects = { ...effects, heat: (effects.heat ?? 0) + 5, secret: { text: `took $${c.effects.funds}k from a donor who wants a favor`, sev: 1, donor: 'The donor', favor: 'a favor in return', amount: c.effects.funds, due: turn + 4 + (hash(ev.id) % 6) } };
    }
    return { ...c, effects };
  });
  const extra: Choice[] = [];
  const h = hash(ev.id);
  if (base.length === 2) {
    const mid = blend(base[0].effects, base[1].effects);
    const eff = { ...mid, meter: (mid.meter ?? 0) - 3 };
    if (upsDowns(eff).up > 0) extra.push({ label: 'Find a middle ground', effects: eff, log: 'A compromise leaves no one fully happy.' });
  }
  const money = ev.choices.some((c) => c.effects.funds || c.effects.treasury || c.effects.groups?.business);
  if (money && h % 3 !== 0) {
    // The tempting, dirty answer: most of the best outcome, plus cash, plus a secret.
    const best = base.reduce((a, b) => (upsDowns(b.effects).up - upsDowns(b.effects).down > upsDowns(a.effects).up - upsDowns(a.effects).down ? b : a));
    const cash = sideCash(p);
    extra.push({
      label: `Cut a quiet side deal (+$${cash}k)`,
      effects: { ...scale(best.effects, 0.6), funds: (best.effects.funds ?? 0) + cash, heat: 8, secret: { text: `took a side deal over "${ev.title}"`, sev: h % 4 === 0 ? 2 : 1 } },
      log: 'A quiet side deal is made behind closed doors.',
    });
  }
  if (base.length + extra.length < 4 && h % 2 === 0) {
    extra.push({ label: 'Put it off for now', effects: { popularity: -2, meter: 1, rep: { bold: -2 } }, log: 'The decision is put off. People notice.' });
  }
  return { ...ev, choices: [...base, ...extra].slice(0, 5) };
}
