import { CHAMBERS, COMMITTEES, FLOOR_BILLS, SPONSOR_BILLS, type CommitteeId, type FloorBillDef, type SponsorBillDef } from '../data/legislature-content';
import { GROUPS } from '../data/city-content';
import { clamp } from './city';
import { kindOf } from './offices';
import type { Rng } from './rng';
import type { GameState, GroupId, OfficeId, Player, Seat } from './types';

const GROUP_IDS = Object.keys(GROUPS) as GroupId[];
export const CHAIR_INFLUENCE = 70;
export const FUNDING_COST = 12;
export const COSPONSOR_SHARE = 0.2;
const pick = <T,>(arr: readonly T[], rng: Rng) => arr[Math.floor(rng() * arr.length)];
const stamp = (g: GameState) => `${g.year}-${String(g.month).padStart(2, '0')}`;
const log = (g: GameState, line: string): GameState => ({ ...g, log: [`${stamp(g)}: ${line}`, ...g.log].slice(0, 200) });

export function newSeat(office: OfficeId, rng: Rng): Seat {
  const c = CHAMBERS[office] ?? { name: 'Legislature', seats: 100, district: 'District' };
  return {
    chamber: c.name, seats: c.seats, yourParty: Math.round(c.seats * (0.4 + rng() * 0.2)), committee: null,
    influence: 15, acrossAisle: 40, districtFunding: 0, pendingVote: null, recentVotes: [], voteCooldown: 1,
    sponsoring: null, passed: [], votesWithParty: 0, votesAgainstParty: 0,
  };
}

export const isChair = (s: Seat) => s.influence >= CHAIR_INFLUENCE;
export const cosponsorsNeeded = (s: Seat) => Math.ceil(s.seats * COSPONSOR_SHARE);
export const floorBill = (id: string | undefined): FloorBillDef | undefined => FLOOR_BILLS.find((b) => b.id === id);
export const sponsorBill = (id: string | undefined): SponsorBillDef | undefined => SPONSOR_BILLS.find((b) => b.id === id);

/** Chance a sponsored bill passes the floor, 0..1. */
export function floorChance(s: Seat, bill: SponsorBillDef): number {
  return clamp(0.12 + (s.yourParty / s.seats) * 0.6 + s.acrossAisle / 250 + s.influence / 300 - bill.difficulty * 0.5, 0.05, 0.9);
}

/** Chance a sponsored bill clears committee in a month, 0..1. */
export function committeeChance(s: Seat, bill: SponsorBillDef): number {
  if (s.committee === bill.committee || isChair(s)) return 1;
  return clamp(0.3 + s.influence / 200, 0, 0.9);
}

/** Monthly seat update: influence, new floor votes, and your own bill moving through. */
export function tickSeat(p: Player, rng: Rng): { player: Player; lines: string[] } {
  let s = p.seat!;
  const lines: string[] = [];
  s = { ...s, influence: clamp(s.influence + 0.5, 0, 100), acrossAisle: clamp(s.acrossAisle + (40 - s.acrossAisle) * 0.04, 0, 100) };

  const roll = rng();
  if (!s.pendingVote && s.voteCooldown <= 0 && roll < 0.6) {
    const pool = FLOOR_BILLS.filter((b) => !s.recentVotes.includes(b.id));
    const b = pick(pool.length ? pool : FLOOR_BILLS, rng);
    s = { ...s, pendingVote: { billId: b.id, partyWantsYes: rng() < b.partyYes }, recentVotes: [b.id, ...s.recentVotes].slice(0, 6), voteCooldown: 1 };
  } else {
    s = { ...s, voteCooldown: s.voteCooldown - 1 };
  }

  let player: Player = { ...p, seat: s };
  const sp = s.sponsoring;
  if (sp) {
    const bill = sponsorBill(sp.billId)!;
    if (sp.stage === 'cosponsors' && sp.cosponsors >= cosponsorsNeeded(s)) {
      s = { ...s, sponsoring: { ...sp, stage: 'committee', months: 0 } };
      lines.push(`The ${bill.name} has enough co-sponsors and goes to the ${COMMITTEES[bill.committee].name} Committee.`);
    } else if (sp.stage === 'committee') {
      if (rng() < committeeChance(s, bill)) {
        s = { ...s, sponsoring: { ...sp, stage: 'floor', months: 0 } };
        lines.push(`The ${bill.name} clears committee. A floor vote is next month.`);
      } else if (sp.months >= 3) {
        s = { ...s, sponsoring: null };
        player = { ...player, popularity: clamp(player.popularity - 2, 0, 100) };
        lines.push(`The ${bill.name} dies in committee.`);
      } else {
        s = { ...s, sponsoring: { ...sp, months: sp.months + 1 } };
      }
    } else if (sp.stage === 'floor') {
      const yes = rng() < floorChance(s, bill);
      const share = Math.round(s.seats * (yes ? 0.5 + rng() * 0.15 : 0.35 + rng() * 0.14));
      if (yes) {
        s = { ...s, sponsoring: null, passed: [...s.passed, bill.id], influence: clamp(s.influence + 8, 0, 100) };
        const groups = { ...player.groups };
        for (const k of GROUP_IDS) groups[k] = clamp(groups[k] + (bill.groups[k] ?? 0), 0, 100);
        player = { ...player, groups, popularity: clamp(player.popularity + 4, 0, 100) };
        lines.push(`Your ${bill.name} passes, ${share}–${s.seats - share}! It becomes law.`);
      } else {
        s = { ...s, sponsoring: null };
        player = { ...player, popularity: clamp(player.popularity - 2, 0, 100) };
        lines.push(`Your ${bill.name} fails on the floor, ${share}–${s.seats - share}.`);
      }
    }
  }

  // Your district's mood fades toward neutral unless you keep delivering.
  const groups = { ...player.groups };
  for (const k of GROUP_IDS) groups[k] = groups[k] + (45 - groups[k]) * 0.05;
  const approval = GROUP_IDS.reduce((a, k) => a + groups[k] * GROUPS[k].weight, 0);
  player = { ...player, seat: s, groups, popularity: clamp(player.popularity + (approval - player.popularity) * 0.08, 0, 100) };
  return { player, lines };
}

// ---------- Actions ----------

const isLawmaker = (p: Player | null): p is Player => !!p && kindOf(p.office) === 'legislative' && !!p.seat;
const blocked = (p: Player) => p.actionsLeft <= 0 || !!p.pendingEvent || !!p.seat!.pendingVote;
const spend = (p: Player, seat: Seat, extra: Partial<Player> = {}): Player => ({ ...p, ...extra, seat, actionsLeft: p.actionsLeft - 1 });
const dim = (v: number, gain: number) => Math.max(1, Math.round(gain * (1 - v / 130)));

/** Vote on the bill on the floor. Free; your district and party both react. */
export function castVote(g: GameState, yes: boolean): GameState {
  const p = g.player;
  if (!isLawmaker(p) || !p.seat!.pendingVote) return g;
  const { billId, partyWantsYes } = p.seat!.pendingVote;
  const bill = floorBill(billId)!;
  const withParty = yes === partyWantsYes;
  const groups = { ...p.groups };
  for (const k of GROUP_IDS) groups[k] = clamp(groups[k] + (bill.groups[k] ?? 0) * (yes ? 1 : -0.5), 0, 100);
  const s = p.seat!;
  const seat: Seat = {
    ...s, pendingVote: null,
    votesWithParty: s.votesWithParty + (withParty ? 1 : 0), votesAgainstParty: s.votesAgainstParty + (withParty ? 0 : 1),
    acrossAisle: clamp(s.acrossAisle + (withParty ? 0 : 4), 0, 100),
  };
  const loyalty = clamp(p.loyalty + (withParty ? 2 : -6), 0, 100);
  return log({ ...g, player: { ...p, groups, loyalty, seat } }, `${p.name} votes ${yes ? 'yes' : 'no'} on the ${bill.title}${withParty ? '' : ', breaking with the party'}.`);
}

export function chooseCommittee(g: GameState, id: CommitteeId): GameState {
  const p = g.player;
  if (!isLawmaker(p) || blocked(p) || p.seat!.committee === id) return g;
  return log({ ...g, player: spend(p, { ...p.seat!, committee: id }) }, `${p.name} joins the ${COMMITTEES[id].name} Committee.`);
}

export function floorSpeech(g: GameState, rng: Rng): GameState {
  const p = g.player;
  if (!isLawmaker(p) || blocked(p)) return g;
  const gain = dim(p.popularity, 2 + rng() * 2);
  return log({ ...g, player: spend(p, { ...p.seat!, influence: clamp(p.seat!.influence + 1, 0, 100) }, { popularity: clamp(p.popularity + gain, 0, 100) }) }, `${p.name} gives a fiery floor speech (+${gain}).`);
}

export function crossAisle(g: GameState, rng: Rng): GameState {
  const p = g.player;
  if (!isLawmaker(p) || blocked(p)) return g;
  const gain = dim(p.seat!.acrossAisle, 6 + rng() * 4);
  return log({ ...g, player: spend(p, { ...p.seat!, acrossAisle: clamp(p.seat!.acrossAisle + gain, 0, 100) }, { loyalty: clamp(p.loyalty - 1, 0, 100) }) }, `${p.name} has lunch with the other party (+${gain}).`);
}

export const fundingCost = (s: Seat) => (s.committee === 'infrastructure' ? 7 : FUNDING_COST);

export function secureFunding(g: GameState, rng: Rng): GameState {
  const p = g.player;
  if (!isLawmaker(p) || blocked(p) || p.seat!.influence < fundingCost(p.seat!)) return g;
  const amount = Math.round(60 + rng() * 80);
  const groups = { ...p.groups };
  for (const k of GROUP_IDS) groups[k] = clamp(groups[k] + 1, 0, 100);
  const seat = { ...p.seat!, influence: p.seat!.influence - fundingCost(p.seat!), districtFunding: p.seat!.districtFunding + amount };
  return log({ ...g, player: spend(p, seat, { groups, popularity: clamp(p.popularity + 1, 0, 100) }) }, `${p.name} wins $${amount}k for the district.`);
}

export function startSponsoring(g: GameState, id: string): GameState {
  const p = g.player;
  if (!isLawmaker(p) || blocked(p) || p.seat!.sponsoring || p.seat!.passed.includes(id) || !sponsorBill(id)) return g;
  return log({ ...g, player: spend(p, { ...p.seat!, sponsoring: { billId: id, stage: 'cosponsors', cosponsors: 1, months: 0 } }) }, `${p.name} introduces the ${sponsorBill(id)!.name}.`);
}

export function gatherCosponsors(g: GameState, rng: Rng): GameState {
  const p = g.player;
  const sp = p?.seat?.sponsoring;
  if (!isLawmaker(p) || blocked(p) || !sp || sp.stage !== 'cosponsors') return g;
  const s = p.seat!;
  const gain = Math.max(1, Math.round(s.seats * (0.025 + rng() * 0.025) * (0.5 + s.influence / 100 + s.acrossAisle / 200)));
  const seat = { ...s, sponsoring: { ...sp, cosponsors: sp.cosponsors + gain } };
  return log({ ...g, player: spend(p, seat) }, `${p.name} signs up ${gain} co-sponsors.`);
}

export function dropBill(g: GameState): GameState {
  const p = g.player;
  if (!isLawmaker(p) || !p.seat!.sponsoring) return g;
  return log({ ...g, player: { ...p, seat: { ...p.seat!, sponsoring: null } } }, `${p.name} withdraws the ${sponsorBill(p.seat!.sponsoring.billId)!.name}.`);
}
