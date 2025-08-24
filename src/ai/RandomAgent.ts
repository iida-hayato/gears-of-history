/** ランダム方針エージェント (基礎ベースライン)
 * 同一 seed で完全再現可能。
 */
import { IAgent, AgentContext } from './IAgent';
import { BuildType, GState, PlayerID } from '../game/types';

const BUILD_TYPES: BuildType[] = ['Land','FoodFacility','ProdFacility','Infrastructure','Government'];

export class RandomAgent implements IAgent {
  readonly id: PlayerID;
  constructor(id: PlayerID) { this.id = id; }

  actPolicy(state: GState, moves: any, ctx: AgentContext): void {
    // 50%: 投資(1)して移動 / 50%: 何もしない
    if (ctx.rng() < 0.5 && moves.investAndMove) {
      moves.investAndMove(1);
    } else if (moves.endPolicyTurn) {
      moves.endPolicyTurn();
    }
  }

  actInvention(state: GState, moves: any, ctx: AgentContext): void {
    // 発明回数が0なら即終了
    let remain: number = (state as any)._inventRemaining?.[this.id] ?? 0;
    if (remain <= 0) { moves.endInventionTurn?.(); return; }
    for (let i = 0; i < remain; i++) {
      const t = BUILD_TYPES[Math.floor(ctx.rng()*BUILD_TYPES.length)];
      moves.inventType?.(t);
    }
    // 最後の inventType が残回数0到達で endTurn 済みなので追加で呼ばない
  }

  actBuild(state: GState, moves: any, ctx: AgentContext): void {
    let remain: number = (state as any)._buildRemaining?.[this.id] ?? 0;
    if (remain <= 0) { moves.endBuildTurn?.(); return; }
    let safety = 50;
    while (safety-- > 0 && remain > 0) {
      const budget: number = (state as any)._buildBudget?.[this.id] ?? 0;
      const tech = state.market.techMarket.filter(c => c.cost <= budget);
      const wonders = state.market.wonderMarket.filter(c => c.cost <= budget);
      const all = [...tech, ...wonders];
      if (!all.length) break;
      const pick = all[Math.floor(ctx.rng()*all.length)];
      if ((pick as any).era) moves.buildWonderFromMarket?.(pick.id); else moves.buildFromMarket?.(pick.id);
      // 残回数再取得
      remain = (state as any)._buildRemaining?.[this.id] ?? 0;
      if (ctx.rng() < 0.15) break; // たまに早期終了
    }
    moves.endBuildTurn?.();
  }

  actCleanup(_state: GState, moves: any, _ctx: AgentContext): void {
    moves.finalizeCleanup?.();
  }
}
