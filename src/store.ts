import { create } from 'zustand';
import { advanceMonth, newGame, rngFor } from './sim/engine';
import { blockingPrompt, doAction, resolveEvent, runAgain, runForHigher, setBudget, startCareer, ACTIONS_PER_MONTH, type CampaignAction } from './sim/career';
import { courtLegislature, decideBill, grantCity, proposeStateLaw, repealStateLaw, setStateBudget, stateAddress, visitCity } from './sim/governor';
import { castVote, chooseCommittee, crossAisle, dropBill, floorSpeech, gatherCosponsors, secureFunding, startSponsoring } from './sim/legislator';
import type { CommitteeId } from './data/legislature-content';
import { answerAsk, briefLeader, choosePortfolio, launchInitiative, mediaTour, requestBudget } from './sim/cabinet';
import { courtParliament, declareWar, nationalAddress, proposeNationalLaw, repealNationalLaw, sanction, seekPeace, setNationalBudget, stateVisit, tradeDeal } from './sim/nation';
import type { PortfolioId } from './data/cabinet-content';
import { askEndorsement, faithOutreach, feud, jointDeal, meetContact } from './sim/people';
import { buyback, callReferendum, choosePatron, consultCoalition, defyCapital, executiveOrder, lobbyCapital, negotiateUnions, payRespects, royalOccasion } from './sim/systems';
import { foreignAid, formAlliance, hostSummit } from './sim/nation';
import { cutDeal, lobbyMember, meetGroup, nextOffice, proposeLaw, proposeProject, repealLaw } from './sim/mayor';
import { browserKV, deserialize, loadFrom, saveTo, serialize, type SlotId } from './sim/save';
import type { FaithId, GameState, GroupId, Nation, OfficeId, Region, SpendKey } from './sim/types';
import type { WorldSize } from './data/countries';

const kv = browserKV();
const freshSeed = () => (Math.random() * 2 ** 31) >>> 0;
/** Each action in a month gets its own deterministic roll. */
const actionRng = (g: GameState) => rngFor(g, 10 + ACTIONS_PER_MONTH - (g.player?.actionsLeft ?? 0));

interface Store {
  game: GameState;
  /** Bumps whenever saves change so the save menu re-reads slots. */
  saveRev: number;
  message: string | null;
  setWorldSize: (size: WorldSize) => void;
  startCareer: (name: string, countryId: string, faith?: FaithId) => void;
  meetContact: (id: string) => void;
  askEndorsement: (id: string) => void;
  jointDeal: (id: string) => void;
  feud: (id: string) => void;
  faithOutreach: () => void;
  executiveOrder: (lawId: string) => void;
  consultCoalition: () => void;
  negotiateUnions: () => void;
  royalOccasion: () => void;
  choosePatron: (id: string) => void;
  payRespects: () => void;
  lobbyCapital: () => void;
  defyCapital: () => void;
  callReferendum: (lawId: string) => void;
  buyback: () => void;
  hostSummit: () => void;
  foreignAid: (countryId: string) => void;
  formAlliance: (countryId: string) => void;
  nextTurn: () => void;
  act: (a: CampaignAction) => void;
  setBudget: (taxRate: number, spending: Record<SpendKey, number>) => void;
  resolveEvent: (i: number) => void;
  runAgain: (office?: OfficeId) => void;
  visitCity: (i: number) => void;
  grantCity: (i: number) => void;
  courtLegislature: () => void;
  stateAddress: () => void;
  proposeStateLaw: (id: string) => void;
  repealStateLaw: (id: string) => void;
  decideBill: (sign: boolean) => void;
  setStateBudget: (taxRate: number, budget: Region['budget']) => void;
  castVote: (yes: boolean) => void;
  chooseCommittee: (id: CommitteeId) => void;
  floorSpeech: () => void;
  crossAisle: () => void;
  secureFunding: () => void;
  startSponsoring: (id: string) => void;
  gatherCosponsors: () => void;
  dropBill: () => void;
  choosePortfolio: (id: PortfolioId) => void;
  launchInitiative: (id: string) => void;
  briefLeader: () => void;
  mediaTour: () => void;
  requestBudget: () => void;
  answerAsk: (back: boolean) => void;
  nationalAddress: () => void;
  courtParliament: () => void;
  stateVisit: (countryId: string) => void;
  tradeDeal: (countryId: string) => void;
  sanction: (countryId: string) => void;
  declareWar: (countryId: string) => void;
  seekPeace: () => void;
  proposeNationalLaw: (id: string) => void;
  repealNationalLaw: (id: string) => void;
  setNationalBudget: (taxRate: number, spending: number, priorities: Nation['priorities']) => void;
  meetGroup: (g: GroupId) => void;
  lobby: (memberIndex: number) => void;
  cutDeal: (memberIndex: number) => void;
  proposeProject: (id: string) => void;
  proposeLaw: (id: string) => void;
  repealLaw: (id: string) => void;
  runForHigher: () => void;
  quitToMenu: () => void;
  save: (slot: SlotId) => void;
  load: (slot: SlotId) => void;
  exportSave: () => string;
  importSave: (text: string) => void;
  dismissMessage: () => void;
}

export const useGame = create<Store>((set, get) => ({
  game: newGame(25, freshSeed()),
  saveRev: 0,
  message: null,
  setWorldSize: (size) => set({ game: newGame(size, freshSeed()) }),
  startCareer: (name, countryId, faith) => set((s) => ({ game: startCareer(s.game, name, countryId, rngFor(s.game, 99), faith) })),
  meetContact: (id) => set((s) => ({ game: meetContact(s.game, id, actionRng(s.game)) })),
  askEndorsement: (id) => set((s) => ({ game: askEndorsement(s.game, id) })),
  jointDeal: (id) => set((s) => ({ game: jointDeal(s.game, id) })),
  feud: (id) => set((s) => ({ game: feud(s.game, id) })),
  faithOutreach: () => set((s) => ({ game: faithOutreach(s.game, actionRng(s.game)) })),
  executiveOrder: (id) => set((s) => ({ game: executiveOrder(s.game, id) })),
  consultCoalition: () => set((s) => ({ game: consultCoalition(s.game, actionRng(s.game)) })),
  negotiateUnions: () => set((s) => ({ game: negotiateUnions(s.game, actionRng(s.game)) })),
  royalOccasion: () => set((s) => ({ game: royalOccasion(s.game, actionRng(s.game)) })),
  choosePatron: (id) => set((s) => ({ game: choosePatron(s.game, id) })),
  payRespects: () => set((s) => ({ game: payRespects(s.game, actionRng(s.game)) })),
  lobbyCapital: () => set((s) => ({ game: lobbyCapital(s.game, actionRng(s.game)) })),
  defyCapital: () => set((s) => ({ game: defyCapital(s.game) })),
  callReferendum: (id) => set((s) => ({ game: callReferendum(s.game, id, actionRng(s.game)) })),
  buyback: () => set((s) => ({ game: buyback(s.game) })),
  hostSummit: () => set((s) => ({ game: hostSummit(s.game) })),
  foreignAid: (id) => set((s) => ({ game: foreignAid(s.game, id) })),
  formAlliance: (id) => set((s) => ({ game: formAlliance(s.game, id) })),
  nextTurn: () => {
    const g = get().game;
    if (blockingPrompt(g.player)) return;
    const game = advanceMonth(g, rngFor(g));
    if (kv) saveTo(kv, 'autosave', game);
    set((s) => ({ game, saveRev: s.saveRev + 1 }));
  },
  act: (a) => set((s) => ({ game: doAction(s.game, a, actionRng(s.game)) })),
  setBudget: (t, sp) => set((s) => ({ game: setBudget(s.game, t, sp) })),
  resolveEvent: (i) => set((s) => ({ game: resolveEvent(s.game, i) })),
  runAgain: (office) => set((s) => ({ game: runAgain(s.game, rngFor(s.game, 50), office) })),
  visitCity: (i) => set((s) => ({ game: visitCity(s.game, i, actionRng(s.game)) })),
  grantCity: (i) => set((s) => ({ game: grantCity(s.game, i) })),
  courtLegislature: () => set((s) => ({ game: courtLegislature(s.game, actionRng(s.game)) })),
  stateAddress: () => set((s) => ({ game: stateAddress(s.game) })),
  proposeStateLaw: (id) => set((s) => ({ game: proposeStateLaw(s.game, id, actionRng(s.game)) })),
  repealStateLaw: (id) => set((s) => ({ game: repealStateLaw(s.game, id) })),
  decideBill: (sign) => set((s) => ({ game: decideBill(s.game, sign) })),
  setStateBudget: (t, b) => set((s) => ({ game: setStateBudget(s.game, t, b) })),
  castVote: (yes) => set((s) => ({ game: castVote(s.game, yes) })),
  chooseCommittee: (id) => set((s) => ({ game: chooseCommittee(s.game, id) })),
  floorSpeech: () => set((s) => ({ game: floorSpeech(s.game, actionRng(s.game)) })),
  crossAisle: () => set((s) => ({ game: crossAisle(s.game, actionRng(s.game)) })),
  secureFunding: () => set((s) => ({ game: secureFunding(s.game, actionRng(s.game)) })),
  startSponsoring: (id) => set((s) => ({ game: startSponsoring(s.game, id) })),
  gatherCosponsors: () => set((s) => ({ game: gatherCosponsors(s.game, actionRng(s.game)) })),
  dropBill: () => set((s) => ({ game: dropBill(s.game) })),
  choosePortfolio: (id) => set((s) => ({ game: choosePortfolio(s.game, id) })),
  launchInitiative: (id) => set((s) => ({ game: launchInitiative(s.game, id) })),
  briefLeader: () => set((s) => ({ game: briefLeader(s.game, actionRng(s.game)) })),
  mediaTour: () => set((s) => ({ game: mediaTour(s.game, actionRng(s.game)) })),
  requestBudget: () => set((s) => ({ game: requestBudget(s.game) })),
  answerAsk: (back) => set((s) => ({ game: answerAsk(s.game, back) })),
  nationalAddress: () => set((s) => ({ game: nationalAddress(s.game) })),
  courtParliament: () => set((s) => ({ game: courtParliament(s.game, actionRng(s.game)) })),
  stateVisit: (id) => set((s) => ({ game: stateVisit(s.game, id, actionRng(s.game)) })),
  tradeDeal: (id) => set((s) => ({ game: tradeDeal(s.game, id) })),
  sanction: (id) => set((s) => ({ game: sanction(s.game, id) })),
  declareWar: (id) => set((s) => ({ game: declareWar(s.game, id) })),
  seekPeace: () => set((s) => ({ game: seekPeace(s.game, actionRng(s.game)) })),
  proposeNationalLaw: (id) => set((s) => ({ game: proposeNationalLaw(s.game, id, actionRng(s.game)) })),
  repealNationalLaw: (id) => set((s) => ({ game: repealNationalLaw(s.game, id) })),
  setNationalBudget: (t, sp, pr) => set((s) => ({ game: setNationalBudget(s.game, t, sp, pr) })),
  meetGroup: (grp) => set((s) => ({ game: meetGroup(s.game, grp, actionRng(s.game)) })),
  lobby: (i) => set((s) => ({ game: lobbyMember(s.game, i, actionRng(s.game)) })),
  cutDeal: (i) => set((s) => ({ game: cutDeal(s.game, i) })),
  proposeProject: (id) => set((s) => ({ game: proposeProject(s.game, id, actionRng(s.game)) })),
  proposeLaw: (id) => set((s) => ({ game: proposeLaw(s.game, id, actionRng(s.game)) })),
  repealLaw: (id) => set((s) => ({ game: repealLaw(s.game, id) })),
  runForHigher: () => set((s) => {
    const next = s.game.player && nextOffice(s.game);
    return next ? { game: runForHigher(s.game, next, actionRng(s.game)) } : {};
  }),
  quitToMenu: () => set({ game: newGame(25, freshSeed()) }),
  save: (slot) => {
    if (!kv) return set({ message: 'Saving is unavailable in this browser.' });
    saveTo(kv, slot, get().game);
    set((s) => ({ saveRev: s.saveRev + 1, message: `Saved to ${slot}.` }));
  },
  load: (slot) => {
    try {
      const game = kv && loadFrom(kv, slot);
      set(game ? { game, message: `Loaded ${slot}.` } : { message: 'That slot is empty.' });
    } catch (e) {
      set({ message: (e as Error).message });
    }
  },
  exportSave: () => serialize(get().game),
  importSave: (text) => {
    try {
      set({ game: deserialize(text), message: 'Save imported.' });
    } catch (e) {
      set({ message: (e as Error).message });
    }
  },
  dismissMessage: () => set({ message: null }),
}));
