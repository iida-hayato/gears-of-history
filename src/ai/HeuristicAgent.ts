/** HeuristicAgent
 * 軽量ヒューリスティック:
 * - Policy: 利用可能コマ数から 1..max ランダム investAndMove
 * - Invention: 残回数 0 まで、市場で希少な buildType を優先公開
 * - Build: 残回数/予算の許す限り VP/Cost 高→低 (同率なら低コスト) で購入。先に Wonder を評価 (同時代未所持かつ高効率)
 * - Cleanup: finalizeCleanup のみ
 * end*Turn 系は基本呼ばず、残回数ゼロで moves 内部 endTurn に任せる。残回数>0で行動不能になった場合のみ保険で end*Turn 呼び出し。
 */
import { GState, PlayerID, BuildType, AnyCard } from '../game/types';
import { IAgent, AgentContext } from './IAgent';

const BUILD_TYPES: BuildType[] = ['Land','FoodFacility','ProdFacility','Infrastructure','Government'];

export class HeuristicAgent implements IAgent {
  readonly id: PlayerID;
  constructor(id: PlayerID) { this.id = id; }

  actPolicy(state: GState, moves: any, ctx: AgentContext): void {
    const p = state.players[this.id];
    // 利用可能コマ (free leaders) = total - locked - 1(リング)
    const free = Math.max(0, p.totalLeaders - p.lockedLeaders - 1);
    if (free <= 0) { moves.endPolicyTurn?.(); return; }
    const steps = 1 + Math.floor(ctx.rng() * free);
    moves.investAndMove?.(steps);
  }

  actInvention(state: GState, moves: any, ctx: AgentContext): void {
    let remain = state._inventRemaining[this.id] ?? 0;
    if (remain <= 0) { moves.endInventionTurn?.(); return; }
    // ループで残回数ゼロまで
    while (remain > 0) {
      const scarcity = this.rankBuildTypesByScarcity(state, ctx);
      const chosen = scarcity[0] ?? 'Land';
      moves.inventType?.(chosen);
      // 推定で1減る想定
      remain--;
      if (remain <= 0) break;
    }
  }

  actBuild(state: GState, moves: any, ctx: AgentContext): void {
    // 残回数と budget が尽きるまで
    let remain = state._buildRemaining[this.id] ?? 0;
    if (remain <= 0) { moves.endBuildTurn?.(); return; }
    while (remain > 0) {
      const budget = state._buildBudget[this.id] ?? 0;
      if (budget <= 0) { moves.endBuildTurn?.(); return; }
      // Wonder 候補 ( era 未重複 )
      const wonders = state.market.wonderMarket.filter(w => w.cost <= budget && !this.hasWonderEra(state, this.id, (w as any).era));
      wonders.sort((a,b) => (b.vp / b.cost) - (a.vp / a.cost) || a.cost - b.cost || a.id.localeCompare(b.id));
      if (wonders.length > 0) {
        moves.buildWonderFromMarket?.(wonders[0].id);
        remain--;
        continue;
      }
      // Tech 候補
      const techs = state.market.techMarket.filter(t => t.cost <= budget);
      if (techs.length === 0) { moves.endBuildTurn?.(); return; }
      techs.sort((a,b) => {
        const ra = a.vp / Math.max(1,a.cost);
        const rb = b.vp / Math.max(1,b.cost);
        if (rb !== ra) return rb - ra;
        if (a.cost !== b.cost) return a.cost - b.cost;
        return a.id.localeCompare(b.id);
      });
      moves.buildFromMarket?.(techs[0].id);
      remain--;
    }
  }

  actCleanup(_state: GState, moves: any, _ctx: AgentContext): void {
    moves.finalizeCleanup?.();
  }

  private rankBuildTypesByScarcity(state: GState, ctx: AgentContext): BuildType[] {
    const counts: Record<BuildType, number> = { Land:0, FoodFacility:0, ProdFacility:0, Infrastructure:0, Government:0 };
    for (const c of state.market.techMarket) {
      const t = (c.buildType ?? 'Land') as BuildType;
      counts[t] = (counts[t] ?? 0) + 1;
    }
    return [...BUILD_TYPES].sort((a,b) => counts[a] - counts[b] || (ctx.rng()<0.5 ? -1:1));
  }

  private hasWonderEra(state: GState, pid: PlayerID, era: number): boolean {
    const p = state.players[pid];
    const all = [...p.built, ...p.builtFaceDown, ...p.pendingBuilt];
    return all.some(id => (state.cardById[id] as AnyCard)?.kind === 'Wonder' && (state.cardById[id] as any).era === era);
  }
}

