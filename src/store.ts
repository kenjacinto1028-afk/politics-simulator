import { create } from 'zustand';
import { advanceMonth, newGame, rngFor } from './sim/engine';
import { doAction, resolveEvent, runAgain, setBudget, startCareer, ACTIONS_PER_MONTH, type CampaignAction } from './sim/career';
import { browserKV, deserialize, loadFrom, saveTo, serialize, type SlotId } from './sim/save';
import type { GameState, SpendKey } from './sim/types';
import type { WorldSize } from './data/countries';

const kv = browserKV();
const freshSeed = () => (Math.random() * 2 ** 31) >>> 0;

interface Store {
  game: GameState;
  /** Bumps whenever saves change so the save menu re-reads slots. */
  saveRev: number;
  message: string | null;
  setWorldSize: (size: WorldSize) => void;
  startCareer: (name: string, countryId: string) => void;
  nextTurn: () => void;
  act: (a: CampaignAction) => void;
  setBudget: (taxRate: number, spending: Record<SpendKey, number>) => void;
  resolveEvent: (i: number) => void;
  runAgain: () => void;
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
  startCareer: (name, countryId) => set((s) => ({ game: startCareer(s.game, name, countryId, rngFor(s.game, 99)) })),
  nextTurn: () => {
    const g = get().game;
    if (g.player?.pendingEvent) return;
    const game = advanceMonth(g, rngFor(g));
    if (kv) saveTo(kv, 'autosave', game);
    set((s) => ({ game, saveRev: s.saveRev + 1 }));
  },
  act: (a) => set((s) => {
    const used = ACTIONS_PER_MONTH - (s.game.player?.actionsLeft ?? 0);
    return { game: doAction(s.game, a, rngFor(s.game, 10 + used)) };
  }),
  setBudget: (t, sp) => set((s) => ({ game: setBudget(s.game, t, sp) })),
  resolveEvent: (i) => set((s) => ({ game: resolveEvent(s.game, i) })),
  runAgain: () => set((s) => ({ game: runAgain(s.game, rngFor(s.game, 50)) })),
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
