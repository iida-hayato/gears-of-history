/** 複数ゲーム直列実行ランナー */
import { runGame } from './GameRunner';
import { RandomAgent } from '../ai/RandomAgent';
import type { RunGameResult } from './GameRunner';

export interface BatchOptions {
  games: number;
  seedBase: number;
  numPlayers: number;
}

export function runBatch(opts: BatchOptions) {
  const { games, seedBase, numPlayers } = opts;
  const results: RunGameResult[] = [];
  // 再現性テスト（最初のシードで2回）
  if (games > 0) {
    const a = runGame({ seed: seedBase, players: numPlayers, AgentClass: RandomAgent });
    const b = runGame({ seed: seedBase, players: numPlayers, AgentClass: RandomAgent });
    const eq = JSON.stringify(a.metrics.playerVP) === JSON.stringify(b.metrics.playerVP);
    if (!eq) throw new Error('reproCheckFail');
    results.push(a); // 1回分のみ正式採用
  }
  for (let i = results.length; i < games; i++) {
    const seed = seedBase + i;
    const r = runGame({ seed, players: numPlayers, AgentClass: RandomAgent });
    results.push(r);
  }
  return results;
}
