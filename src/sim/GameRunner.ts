/** GameRunner: 単一ゲーム(最大10ラウンド)をシード付きで実行しメトリクス返却 */
import { Client } from 'boardgame.io';
import { performance } from 'perf_hooks';
import { GearsOfHistory } from '../game/game';
import { RandomAgent } from '../ai/RandomAgent';
import { IAgent } from '../ai/IAgent';
import { createRng } from './rng';
import { setCardsRng } from '../game/cards';
import { buildGameMetrics, ExtendedGameMetrics } from '../metrics/buildGameMetrics';

export interface RunGameParams { seed: number; players: number; AgentClass?: new(id: string)=>IAgent; }
export interface RunGameResult { finalState: any; metrics: ExtendedGameMetrics; durationMs: number; }

/**
 * runGame
 * 入力: seed, players
 * 出力: 最終 state とメトリクス/所要時間
 * 失敗: 例外 throw（上位で捕捉しエラーログ化）
 */
export function runGame({ seed, players, AgentClass = RandomAgent }: RunGameParams): RunGameResult {
  const t0 = performance.now();
  const rng = createRng(seed);
  setCardsRng(rng);
  const client = Client({ game: GearsOfHistory, numPlayers: players, setupData: { seed } });
  client.start();
  const agents: IAgent[] = Array.from({ length: players }, (_, i) => new AgentClass(String(i)));

  let safety = 20000; // フェーズターン総上限
  while (safety-- > 0) {
    const state: any = client.getState();
    if (!state) continue;
    if (state.ctx?.gameover) break;
    const phase = state.ctx?.phase;
    const current = state.ctx?.currentPlayer;
    const agent = agents.find(a => a.id === current);
    if (!agent) throw new Error(`agentMissing:${current}`);
    const moves = client.moves as any;
    try {
      switch (phase) {
        case 'policy': agent.actPolicy(state.G, moves, { rng }); break;
        case 'invention': agent.actInvention(state.G, moves, { rng }); break;
        case 'build': agent.actBuild(state.G, moves, { rng }); break;
        case 'cleanup': agent.actCleanup(state.G, moves, { rng }); break;
        default: throw new Error(`unknownPhase:${phase}`);
      }
    } catch (e: any) {
      const info = { seed, round: state.G?.round, phase, player: current, message: e?.message };
      throw new Error('phaseError:' + JSON.stringify(info));
    }
    if (state.G?.round > 11) {
      throw new Error('roundOverflow');
    }
  }
  if (safety <= 0) throw new Error('loopGuardExceeded');
  const finalState: any = client.getState();
  if (!finalState?.ctx?.gameover) throw new Error('notFinished');
  const histogram = finalState.G?._metrics?.actionTagHistogram ?? {};
  const metrics = buildGameMetrics(finalState.G, seed, histogram);
  if (metrics.playerVP.length !== players) throw new Error('vpLengthMismatch');
  const t1 = performance.now();
  return { finalState, metrics, durationMs: +(t1 - t0).toFixed(3) };
}
