/** 複数ゲーム直列実行ランナー */
import { playSingleGame } from './GameRunner';
import { RandomAgent } from '../ai/RandomAgent';

export interface BatchOptions {
  games: number;
  seedBase: number;
  numPlayers: number;
}

export function runBatch(opts: BatchOptions) {
  const { games, seedBase, numPlayers } = opts;
  const results = [];
  for (let i = 0; i < games; i++) {
    const seed = seedBase + i;
    const metrics = playSingleGame({ seed, numPlayers, AgentClass: RandomAgent });
    results.push(metrics);
  }
  return results;
}

