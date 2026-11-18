import { POLICIES, POLICY_IDS, type PolicyId } from '../data/society';
import { BLOCS, isRival } from '../data/geo';
import { SYSTEMS } from '../data/systems';
import { clamp } from './city';
import { kindOf } from './offices';
import { has, makeCharacter } from './people';
import { partyName } from './names';
import { alliesOf, blocLeader, isMajor, nuclearShieldFor, protector, warPower } from './geo';
import { aiPolicies, devLevel, levelOf, societyEffects } from './society';
import type { Rng } from './rng';
import type { AIWar, Country, FocusId, GameState, Nation, Offer, Player, TraitId } from './types';

// AI countries govern, change leaders, make pacts, fight, and approach you.

type Lv = 0 | 1 | 2;
type Prefs = Partial<Record<PolicyId, Lv>>;

const TRAIT_PREFS: Record<TraitId, Prefs> = {
  hawk: { spying: 2, policing: 2, immigration: 0 },
  dove: { spying: 0, immigration: 2 },
  populist: { welfare: 2, housing: 2, healthcare: 2 },
  technocrat: { research: 2, schools: 2, corruption: 2 },
  pious: { culture: 0, immigration: 0, farming: 2 },
  secular: { schools: 2, press: 2 },
  vain: { building: 2, culture: 2 },
  generous: { welfare: 2, healthcare: 2 },
  corrupt: { corruption: 0, press: 0 },
  reformer: { climate: 2, corruption: 2, energy: 2 },
  cautious: {},
  charismatic: { tourism: 2, protest: 2 },
};
const FOCUS_PREFS: Record<FocusId, Prefs> = {
  economy: { building: 2, welfare: 0 }, security: { policing: 2, spying: 2 }, welfare: { healthcare: 2, welfare: 2 },
  faith: { culture: 0, farming: 2 }, diplomacy: { immigration: 2, tourism: 2 }, environment: { climate: 2, energy: 2 },
};

const authoritarian = (c: Country) => c.systemId === 'one-party' || !!c.junta || has(c.leader, 'corrupt');

/** The country's worst problems and the policy that answers each. */
function problems(c: Country): Prefs {
  const s = c.society;
  const out: Prefs = {};
  if (s.crime > 55) out.policing = 2;
  if (s.health < 45) out.healthcare = 2;
  if (s.pollution > 60) out.climate = 2;
  if (s.housing < 40) out.housing = 2;
  if (s.unrest > 50) { if (authoritarian(c)) out.protest = 0; else out.welfare = 2; }
  if (s.corruption > 55 && !has(c.leader, 'corrupt')) out.corruption = 2;
  if (s.food < 40) out.farming = 2;
  if (s.tech < 30) out.research = 2;
  if (s.infrastructure < 40) out.building = 2;
  if (s.education < 40) out.schools = 2;
  return out;
}

export const policiesOfCountry = (c: Country) => c.policies ?? aiPolicies(c);

/** Once a year a leader changes one policy (a reformer two) to fit their personality and fix problems. */
export function decidePolicies(c: Country, year: number, rng: Rng): { country: Country; changes: string[] } {
  const pol = { ...policiesOfCountry(c) };
  const score = new Map<string, number>();
  const bump = (id: PolicyId, lv: Lv, pts: number) => { if (levelOf(pol, id) !== lv) score.set(`${id}:${lv}`, (score.get(`${id}:${lv}`) ?? 0) + pts); };
  for (const t of c.leader.traits) for (const [id, lv] of Object.entries(TRAIT_PREFS[t] ?? {})) bump(id as PolicyId, lv!, 2);
  for (const [id, lv] of Object.entries(FOCUS_PREFS[c.leader.focus] ?? {})) bump(id as PolicyId, lv!, 1.5);
  for (const [id, lv] of Object.entries(problems(c))) bump(id as PolicyId, lv!, 3);
  // Cautious leaders drift back to the middle; deep debt makes everyone careful with spending.
  if (has(c.leader, 'cautious')) for (const id of POLICY_IDS) if (levelOf(pol, id) !== 1) bump(id, 1, 1.5);
  const ranked = [...score.entries()].map(([k, v]) => {
    const [id, lvS] = k.split(':');
    const lv = Number(lvS) as Lv;
    const spend = POLICIES[id as PolicyId].levels[lv].spend ?? 0;
    return { id: id as PolicyId, lv, pts: v + rng() * 1.5 - (c.economy.debtToGdp > 100 && spend > 0 ? 1.5 : 0) };
  }).filter((x) => x.pts > 2.5).sort((a, b) => b.pts - a.pts);
  const n = has(c.leader, 'reformer') ? 2 : 1;
  const changes: string[] = [];
  const done = new Set<PolicyId>();
  for (const x of ranked) {
    if (changes.length >= n) break;
    if (done.has(x.id)) continue;
    done.add(x.id);
    pol[x.id] = x.lv;
    changes.push(`${POLICIES[x.id].name}: ${POLICIES[x.id].levels[x.lv].name}`);
  }
  if (!changes.length) return { country: c, changes };
  const decisions = [...changes.map((t) => `${year}: ${t}`), ...(c.decisions ?? [])].slice(0, 6);
  return { country: { ...c, policies: pol, decisions }, changes };
}

// ---------- Monthly ----------

const stamp = (g: GameState) => `${g.year}-${String(g.month).padStart(2, '0')}`;
const pick = <T,>(a: readonly T[], rng: Rng) => a[Math.floor(rng() * a.length)];
const hash = (s: string) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const ledBy = (g: GameState) => (g.player?.nation && kindOf(g.player.office) === 'head' ? g.player.countryId : null);

/** Worth a line in your news: big powers, and countries near or tied to you. */
function notable(g: GameState, c: Country) {
  if (!g.player) return isMajor(c);
  const mine = g.countries[g.player.countryId];
  return isMajor(c) || c.region === mine.region || Math.abs(mine.relations[c.id] ?? 0) >= 40;
}

function newLeader(c: Country, rng: Rng, party: string, traits?: TraitId[]): Country['leader'] {
  const ch = makeCharacter(c, rng);
  return { ...ch, traits: traits ?? ch.traits, party, approval: 55 };
}

export const MAX_AI_WARS = 2;

export function tickAI(g: GameState, rng: Rng): GameState {
  const led = ledBy(g);
  const countries = { ...g.countries };
  const lines: string[] = [];
  const ids = Object.keys(countries);

  for (const id of ids) {
    if (id === led) continue;
    let c = countries[id];
    const sys = SYSTEMS[c.systemId];

    // Yearly policy review, spread across the year.
    if ((g.turn + hash(id)) % 12 === 0) {
      const d = decidePolicies(c, g.year, rng);
      c = d.country;
      if (d.changes.length && notable(g, c)) lines.push(`${c.name}: ${c.leader.name} changes course (${d.changes.join('; ')}).`);
    }

    // Scores now shape how the country does.
    const fx = societyEffects(c, { policies: policiesOfCountry(c) } as Nation, g.world);
    const L = devLevel(c);
    const growthT = 2 + (1 - L) * 1.5 + fx.growth;
    const atWar = (g.wars ?? []).some((w) => w.a === id || w.b === id);
    c = {
      ...c,
      economy: { ...c.economy, growth: clamp(c.economy.growth + (growthT - c.economy.growth) * 0.04 - (atWar ? 0.15 : 0), -8, 12) },
      stability: clamp(c.stability + (55 + fx.stability * 2 + (c.leader.approval - 45) * 0.2 - c.stability) * 0.02 - (atWar ? 0.3 : 0), 0, 100),
      leader: { ...c.leader, approval: clamp(c.leader.approval + fx.mood * 0.02, 5, 95) },
    };

    // Changing leaders, each system its own way.
    if (c.nextVote === undefined) c = { ...c, nextVote: g.turn + 1 + (hash(id) % (sys.termYears * 12)) };
    if (c.junta) {
      if (rng() < 0.01) {
        c = { ...c, junta: false, leader: newLeader(c, rng, partyName(id, rng)), nextVote: g.turn + sys.termYears * 12 };
        lines.push(`${c.name}: the generals step aside. ${c.leader.name} wins the first free vote in years.`);
      }
    } else if (g.turn >= (c.nextVote ?? 0)) {
      c = { ...c, nextVote: g.turn + sys.termYears * 12 };
      if (sys.advancement === 'election') {
        const keep = clamp((c.leader.approval - 30) / 40, 0.1, 0.9) * sys.electoralFreedom + (1 - sys.electoralFreedom) * 0.9;
        if (rng() >= keep) {
          const old = c.leader;
          c = { ...c, leader: newLeader(c, rng, partyName(id, rng)) };
          if (notable(g, c)) lines.push(`${c.name} votes out ${old.name}. New leader: ${c.leader.name} (${c.leader.party}).`);
        } else if (notable(g, c)) lines.push(`${c.name} re-elects ${c.leader.name}.`);
      } else if (c.systemId === 'one-party' && c.leader.approval < 45) {
        const old = c.leader;
        c = { ...c, leader: newLeader(c, rng, old.party) };
        if (notable(g, c)) lines.push(`${c.name}'s party congress replaces ${old.name} with ${c.leader.name}.`);
      }
    }
    if (c.systemId === 'corporate-state' && !c.junta && c.economy.growth < 0 && c.leader.approval < 35 && rng() < 0.08) {
      const old = c.leader;
      c = { ...c, leader: newLeader(c, rng, old.party) };
      lines.push(`${c.name}'s board ousts ${old.name}. ${c.leader.name} takes the chair.`);
    }
    // Coups in countries falling apart.
    if (!c.junta && c.stability < 25 && c.society.unrest > 60 && rng() < 0.02) {
      const old = c.leader;
      c = { ...c, junta: true, leader: { ...newLeader(c, rng, 'Military Council', ['hawk', 'cautious']), approval: 40 }, stability: clamp(c.stability + 10, 0, 100), policies: { ...policiesOfCountry(c), press: 0, protest: 0, spying: 2 } };
      lines.push(`Coup in ${c.name}! The army removes ${old.name}. General ${c.leader.name} takes power.`);
      for (const o of ids) {
        const oc = countries[o];
        if (o !== id && oc && (oc.society?.press ?? 50) > 60) countries[o] = { ...oc, relations: { ...oc.relations, [id]: clamp((oc.relations[id] ?? 0) - 15, -100, 100) } };
      }
    }
    if (c.leader.name !== countries[id].leader.name) c = { ...c, leaderSince: g.turn };
    countries[id] = c;
  }

  // Defense pacts between close friends, broken when friendship fades.
  for (const id of ids) {
    if (id === led) continue;
    const c = countries[id];
    let pacts = (c.pacts ?? []).filter((o) => countries[o] && (c.relations[o] ?? 0) >= 5);
    if (pacts.length !== (c.pacts ?? []).length) {
      for (const gone of (c.pacts ?? []).filter((o) => !pacts.includes(o))) if (countries[gone]) countries[gone] = { ...countries[gone], pacts: (countries[gone].pacts ?? []).filter((x) => x !== id) };
      countries[id] = { ...countries[id], pacts };
    }
    if (rng() < 0.01) {
      const friend = ids.find((o) => o !== id && o !== led && !pacts.includes(o) && (c.relations[o] ?? 0) >= 35 && (countries[o].relations[id] ?? 0) >= 35);
      if (friend) {
        pacts = [...pacts, friend];
        countries[id] = { ...countries[id], pacts };
        countries[friend] = { ...countries[friend], pacts: [...(countries[friend].pacts ?? []), id] };
        if (notable(g, c) || notable(g, countries[friend])) lines.push(`${c.name} and ${countries[friend].name} sign a defense pact.`);
      }
    }
  }

  // Wars between AI countries.
  let wars: AIWar[] = [];
  const side = (id: string, foe: string) => {
    const c = countries[id];
    let p = warPower(c);
    for (const a of c.pacts ?? []) if (a !== foe && countries[a]) p += warPower(countries[a]) * 0.4;
    const l = protectorIn(countries, g, id);
    if (l && l !== foe) p += warPower(countries[l]) * 0.3;
    return p;
  };
  for (const w of g.wars ?? []) {
    const A = countries[w.a], B = countries[w.b];
    if (!A || !B) continue;
    const s = side(w.a, w.b) / (side(w.a, w.b) + side(w.b, w.a));
    const score = w.score + (s - 0.5) * 20 + (rng() - 0.5) * 10 + (w.backing ?? 0);
    const months = w.months + 1;
    if (Math.abs(score) < 30 && months < 12) { wars.push({ ...w, score, months, backing: 0 }); continue; }
    const [win, lose] = score >= 0 ? [A, B] : [B, A];
    countries[win.id] = { ...countries[win.id], leader: { ...countries[win.id].leader, approval: clamp(countries[win.id].leader.approval + 10, 5, 95) }, relations: { ...countries[win.id].relations, [lose.id]: -40 } };
    countries[lose.id] = { ...countries[lose.id], stability: clamp(countries[lose.id].stability - 10, 0, 100), economy: { ...countries[lose.id].economy, growth: clamp(countries[lose.id].economy.growth - 1, -8, 12) }, leader: { ...countries[lose.id].leader, approval: clamp(countries[lose.id].leader.approval - 20, 5, 95) }, relations: { ...countries[lose.id].relations, [win.id]: -40 } };
    lines.push(`The war between ${A.name} and ${B.name} ends. ${win.name} wins.`);
    if (w.playerSide && g.player) lines.push(`The side you armed (${countries[w.playerSide].name}) ${w.playerSide === win.id ? 'won' : 'lost'}.`);
  }
  if (wars.length < MAX_AI_WARS) {
    for (const id of ids) {
      const c = countries[id];
      if (id === led || !has(c.leader, 'hawk') || wars.some((w) => w.a === id || w.b === id) || rng() >= 0.01) continue;
      const foe = ids.find((o) => o !== id && o !== g.player?.countryId && ((c.relations[o] ?? 0) <= -35 || (isRival(id, o) && (c.relations[o] ?? 0) <= -15)) && !nuclearShieldFor(countries, g, o)
        && !wars.some((w) => w.a === o || w.b === o) && side(id, o) > side(o, id) * 1.1);
      if (!foe) continue;
      wars.push({ a: id, b: foe, months: 0, score: 0 });
      lines.push(`${c.name} invades ${countries[foe].name}! ${c.leader.name} blames border attacks.`);
      if (wars.length >= MAX_AI_WARS) break;
    }
  }
  wars = wars.filter((w) => countries[w.a] && countries[w.b]);

  let next: GameState = { ...g, countries, wars };
  for (const l of lines) next = { ...next, log: [`${stamp(next)}: ${l}`, ...next.log].slice(0, 200) };
  return offerTick(next, rng);
}

function protectorIn(countries: Record<string, Country>, g: GameState, id: string) {
  return protector({ ...g, countries }, id);
}

// ---------- Offers and demands to you ----------

export const OFFER_CHANCE = 0.05;
export const tributeOf = (me: Country) => Math.max(2, Math.round(me.economy.gdpBn * 0.003));

function offerTick(g: GameState, rng: Rng): GameState {
  let p = g.player;
  if (!p?.nation || kindOf(p.office) !== 'head') return g;
  const n = p.nation;
  if (n.offer) {
    if (n.offer.monthsLeft <= 1) return declineOffer({ ...g, player: { ...p, nation: { ...n, offer: null } } }, n.offer, true);
    return { ...g, player: { ...p, nation: { ...n, offer: { ...n.offer, monthsLeft: n.offer.monthsLeft - 1 } } } };
  }
  if (n.allyCall || rng() >= OFFER_CHANCE) return g;
  const me = g.countries[p.countryId];
  const others = Object.values(g.countries).filter((c) => c.id !== me.id && n.war?.enemy !== c.id);
  const rel = (c: Country) => c.relations[me.id] ?? 0;
  const myPower = warPower(me) + (protector(g, me.id) ? warPower(g.countries[protector(g, me.id)!]) * 0.3 : 0);
  const options: Offer[] = [];
  for (const c of others) {
    if ((isMajor(c) || has(c.leader, 'hawk')) && (rel(c) <= -30 || (isRival(c.id, me.id) && rel(c) <= -10)) && warPower(c) > myPower * 1.3) {
      const rival = n.tradeDeals.find((t) => (c.relations[t] ?? 0) <= -40);
      options.push(rival
        ? { from: c.id, kind: 'cut-trade', target: rival, monthsLeft: 3, text: `${c.leader.name} of ${c.name} demands you cancel your trade deal with ${g.countries[rival].name}, or face the consequences.` }
        : { from: c.id, kind: 'tribute', amount: tributeOf(me), monthsLeft: 3, text: `${c.leader.name} of ${c.name} demands $${tributeOf(me)}bn "for regional security", or else.` });
    }
  }
  const threats = options.length;
  for (const c of others) {
    if ((rel(c) >= 20 || (c.region === me.region && rel(c) >= 0)) && !n.tradeDeals.includes(c.id)) options.push({ from: c.id, kind: 'trade', monthsLeft: 3, text: `${c.leader.name} of ${c.name} offers a trade deal.` });
    if (rel(c) >= 55 && !n.alliances.includes(c.id)) options.push({ from: c.id, kind: 'alliance', monthsLeft: 3, text: `${c.leader.name} of ${c.name} proposes a defense alliance.` });
    if (me.bloc === 'none' && c.bloc !== 'none' && blocLeader(g, c.bloc) === c.id && rel(c) >= 45) options.push({ from: c.id, kind: 'bloc', monthsLeft: 3, text: `${c.leader.name} invites ${me.name} to join the ${BLOCS[c.bloc].name}.` });
  }
  if (!options.length) return g;
  const offer = threats && rng() < 0.4 ? options[Math.floor(rng() * threats)] : pick(options, rng);
  p = { ...p, nation: { ...n, offer } };
  return { ...g, player: p, log: [`${stamp(g)}: ${offer.text}`, ...g.log].slice(0, 200) };
}

const setRel = (g: GameState, a: string, b: string, d: number): GameState => {
  const ca = g.countries[a], cb = g.countries[b];
  return { ...g, countries: { ...g.countries, [a]: { ...ca, relations: { ...ca.relations, [b]: clamp((ca.relations[b] ?? 0) + d, -100, 100) } }, [b]: { ...cb, relations: { ...cb.relations, [a]: clamp((cb.relations[a] ?? 0) + d, -100, 100) } } } };
};
const addLog = (g: GameState, line: string): GameState => ({ ...g, log: [`${stamp(g)}: ${line}`, ...g.log].slice(0, 200) });

/** Say yes or no to the card in front of you. */
export function answerOffer(g: GameState, accept: boolean): GameState {
  const p = g.player;
  if (!p?.nation?.offer || p.pendingEvent) return g;
  const o = p.nation.offer;
  const base = { ...g, player: { ...p, nation: { ...p.nation, offer: null } } };
  if (!g.countries[o.from]) return base;
  return accept ? acceptOffer(base, o) : declineOffer(base, o, false);
}

function acceptOffer(g: GameState, o: Offer): GameState {
  let p = g.player!;
  let n = p.nation!;
  const c = g.countries[o.from];
  const me = g.countries[p.countryId];
  let next = g;
  switch (o.kind) {
    case 'trade':
      n = { ...n, tradeDeals: [...n.tradeDeals, o.from] };
      next = setRel(next, me.id, o.from, 5);
      p = { ...p, groups: { ...p.groups, business: clamp(p.groups.business + 3, 0, 100) } };
      return addLog({ ...next, player: { ...p, nation: n } }, `${p.name} accepts a trade deal with ${c.name}.`);
    case 'alliance':
      n = { ...n, alliances: [...n.alliances, o.from] };
      next = setRel(next, me.id, o.from, 5);
      for (const id of Object.keys(g.countries)) if (id !== me.id && (c.relations[id] ?? 0) <= -50) next = setRel(next, me.id, id, -5);
      return addLog({ ...next, player: { ...p, nation: n } }, `${p.name} signs a defense alliance with ${c.name}.`);
    case 'bloc': {
      next = setRel(next, me.id, o.from, 10);
      const rival = BLOCS[c.bloc].rival ? blocLeader(g, BLOCS[c.bloc].rival!) : null;
      if (rival) next = setRel(next, me.id, rival, -20);
      next = { ...next, countries: { ...next.countries, [me.id]: { ...next.countries[me.id], bloc: c.bloc } } };
      return addLog({ ...next, player: { ...p, nation: n } }, `${me.name} joins the ${BLOCS[c.bloc].name}.`);
    }
    case 'tribute': {
      const bn = o.amount ?? tributeOf(me);
      const debt = me.economy.debtToGdp + (bn / me.economy.gdpBn) * 100;
      next = setRel(next, me.id, o.from, 15);
      next = { ...next, countries: { ...next.countries, [me.id]: { ...next.countries[me.id], economy: { ...me.economy, debtToGdp: clamp(debt, 0, 400) } } } };
      return addLog({ ...next, player: { ...p, popularity: clamp(p.popularity - 5, 0, 100) } }, `${p.name} pays $${bn}bn to ${c.name}. Critics call it humiliating.`);
    }
    case 'cut-trade':
      n = { ...n, tradeDeals: n.tradeDeals.filter((t) => t !== o.target) };
      next = setRel(setRel(next, me.id, o.from, 15), me.id, o.target!, -20);
      return addLog({ ...next, player: { ...p, nation: n, popularity: clamp(p.popularity - 3, 0, 100) } }, `${p.name} gives in to ${c.name} and cancels the trade deal with ${g.countries[o.target!]?.name}.`);
  }
}

function declineOffer(g: GameState, o: Offer, ignored: boolean): GameState {
  let p = g.player!;
  const c = g.countries[o.from];
  const me = g.countries[p.countryId];
  const how = ignored ? 'never answers' : 'turns down';
  if (o.kind === 'trade' || o.kind === 'alliance' || o.kind === 'bloc') {
    return addLog(setRel(g, me.id, o.from, -4), `${p.name} ${how} ${c.name}'s ${o.kind === 'bloc' ? 'bloc invitation' : o.kind === 'trade' ? 'trade offer' : 'alliance offer'}.`);
  }
  // Refusing a threat: you look strong at home, and they may make good on it.
  let next = setRel(g, me.id, o.from, -15);
  p = { ...p, popularity: clamp(p.popularity + 3, 0, 100) };
  let line = `${p.name} ${how} ${c.name}'s demand.`;
  if (isMajor(c) || has(c.leader, 'vain')) {
    const m = next.countries[me.id];
    next = { ...next, countries: { ...next.countries, [me.id]: { ...m, economy: { ...m.economy, growth: clamp(m.economy.growth - 0.5, -8, 12) } } } };
    p = { ...p, nation: { ...p.nation!, tradeDeals: p.nation!.tradeDeals.filter((t) => t !== o.from) } };
    line += ` ${c.name} answers with sanctions.`;
  }
  return addLog({ ...next, player: p }, line);
}

// ---------- Backing a side in an AI war ----------

export const WAR_BACK_COST = 5;

export function backWar(g: GameState, index: number, side: string): GameState {
  const p = g.player;
  if (!p?.nation || kindOf(p.office) !== 'head' || p.actionsLeft <= 0 || p.pendingEvent) return g;
  const w = (g.wars ?? [])[index];
  if (!w || w.playerSide || (side !== w.a && side !== w.b) || side === p.countryId) return g;
  const foe = side === w.a ? w.b : w.a;
  const push = 8;
  let next = setRel(setRel(g, p.countryId, side, 10), p.countryId, foe, -20);
  const me = next.countries[p.countryId];
  next = { ...next, countries: { ...next.countries, [me.id]: { ...me, economy: { ...me.economy, debtToGdp: clamp(me.economy.debtToGdp + (WAR_BACK_COST / me.economy.gdpBn) * 100, 0, 400) } } } };
  const wars = g.wars!.map((x, i) => (i === index ? { ...x, playerSide: side, backing: side === w.a ? push : -push, score: x.score + (side === w.a ? push : -push) } : x));
  return addLog({ ...next, wars, player: { ...p, actionsLeft: p.actionsLeft - 1 } as Player }, `${p.name} sends $${WAR_BACK_COST}bn in arms to ${g.countries[side].name}.`);
}

/** Your allies at war with someone else can call on you. */
export const allyAtWar = (g: GameState) => {
  const allies = alliesOf(g);
  return (g.wars ?? []).find((w) => allies.includes(w.a) || allies.includes(w.b));
};
