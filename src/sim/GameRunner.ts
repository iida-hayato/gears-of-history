/** 単一ゲーム実行ランナー */
import { Client } from 'boardgame.io';
import { GearsOfHistory } from '../game/game';
import { RandomAgent } from '../ai/RandomAgent';
import { IAgent } from '../ai/IAgent';
import { rngFromBase, RNG } from './rng';
import { setCardsRng } from '../game/cards';
import { buildGameMetrics, SingleGameMetrics } from '../metrics/buildGameMetrics';

export interface PlayOptions {
  seed: number;
  numPlayers: number;
  AgentClass?: new(id: string)=>IAgent;
}

export function playSingleGame(opts: PlayOptions): SingleGameMetrics {
  const { seed, numPlayers } = opts;
  const AgentClass = opts.AgentClass ?? RandomAgent;
  const rng: RNG = rngFromBase(seed, 0);
  setCardsRng(rng); // デッキ/政策シャッフル用 RNG

  const client = Client({ game: GearsOfHistory, numPlayers });
  client.start();

  const agents: IAgent[] = Array.from({ length: numPlayers }, (_, i) => new AgentClass(String(i)));
  const actionCountRaw: Record<string, number> = {};
  const wrapMoves = (moves: any) => {
    const wrapped: any = {};
    for (const k of Object.keys(moves)) {
      wrapped[k] = (...args: any[]) => {
        actionCountRaw[k] = (actionCountRaw[k] ?? 0) + 1;
        return (moves as any)[k](...args);
      };
    }
    return wrapped;
  };

  // 進行ループ
  let guard = 10000; // 無限ループ防止
  while (guard-- > 0) {
    const state = client.getState();
    if (!state) continue; // 初期nullガード
    const s = state; // 非null 変数
    if (s.ctx?.gameover) break;
    const phase = s.ctx?.phase;
    const current = s.ctx?.currentPlayer;
    const agent = agents.find(a => a.id === current);
    if (!agent) throw new Error('Agent not found for player ' + current);
    const moves = wrapMoves(client.moves);
    const ctx = { rng };
    switch (phase) {
      case 'policy': agent.actPolicy(s.G, moves, ctx); break;
      case 'invention': agent.actInvention(s.G, moves, ctx); break;
      case 'build': agent.actBuild(s.G, moves, ctx); break;
      case 'cleanup': agent.actCleanup(s.G, moves, ctx); break;
      default:
        throw new Error('Unknown phase ' + phase);
    }
  }
  if (guard <= 0) throw new Error('Guard exhausted (possible infinite loop)');

  const finalState = client.getState();
  if (!finalState?.ctx?.gameover) throw new Error('Game did not finish');

  // カテゴリ集計
  const histogram: Record<string, number> = {};
  const put = (k: string, v: number) => { histogram[k] = (histogram[k] ?? 0) + v; };
  put('policyMove', actionCountRaw['investAndMove'] ?? 0);
  put('invent', actionCountRaw['inventType'] ?? 0);
  put('build', (actionCountRaw['buildFromMarket'] ?? 0) + (actionCountRaw['buildWonderFromMarket'] ?? 0));

  return buildGameMetrics(finalState.G, seed, histogram);
}
