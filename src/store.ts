import { create } from 'zustand';
import { advanceMonth, newGame } from './sim/engine';
import { makeRng } from './sim/rng';
import type { GameState } from './sim/types';

const rng = makeRng(Date.now());

interface Store {
  game: GameState;
  startCareer: (name: string, countryId: string) => void;
  nextTurn: () => void;
}

export const useGame = create<Store>((set) => ({
  game: newGame(),
  startCareer: (name, countryId) =>
    set((s) => ({
      game: {
        ...s.game,
        player: { name, countryId, office: null, popularity: 10, funds: 50, age: 30 },
        log: [`${name} enters politics in ${s.game.countries[countryId].name}.`, ...s.game.log],
      },
    })),
  nextTurn: () => set((s) => ({ game: advanceMonth(s.game, rng) })),
}));
