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
    try {
      const p = state.players[this.id];
      if (!p) { moves.endPolicyTurn?.(); return; }
      const free = Math.max(0, p.totalLeaders - p.lockedLeaders - 1 - (p.policySpent ?? 0));
      if (free <= 0) { moves.endPolicyTurn?.(); return; }
      const investMax = Math.max(1, Math.floor(free * 0.6));
      const steps = 1 + Math.floor(ctx.rng() * investMax);
      moves.investAndMove?.(Math.min(steps, free));
    } catch {/*noop*/}
  }

  actInvention(state: GState, moves: any, ctx: AgentContext): void {
    try {
      let remain = state._inventRemaining[this.id] ?? 0;
      if (remain <= 0) { moves.endInventionTurn?.(); return; }
      while (remain > 0) {
        const order = this.rankBuildTypesByScarcity(state, ctx);
        let acted = false;
        for (const t of order) {
          if (moves.inventType) { moves.inventType(t); acted = true; break; }
        }
        if (!acted) { moves.endInventionTurn?.(); return; }
        remain--; if (remain <= 0) break;
      }
    } catch {/*noop*/}
  }

  actBuild(state: GState, moves: any, ctx: AgentContext): void {
    try {
      let remain = state._buildRemaining[this.id] ?? 0;
      if (remain <= 0) { moves.endBuildTurn?.(); return; }
      while (remain > 0) {
        const budget = state._buildBudget[this.id] ?? 0;
        if (budget <= 0) { moves.endBuildTurn?.(); return; }
        const wonders = state.market.wonderMarket.filter(w => w.cost <= budget && !this.hasWonderEra(state, this.id, (w as any).era));
        if (wonders.length > 0) {
          wonders.sort((a,b) => (b.vp/Math.max(1,b.cost)) - (a.vp/Math.max(1,a.cost)) || b.vp - a.vp || a.cost - b.cost || a.id.localeCompare(b.id));
          moves.buildWonderFromMarket?.(wonders[0].id);
          remain--; continue;
        }
        const techs = state.market.techMarket.filter(t => t.cost <= budget);
        if (techs.length === 0) { moves.endBuildTurn?.(); return; }
        const scored = techs.map(c => ({ c, s: this.scoreTech(c as AnyCard, state, budget) }));
        scored.sort((a,b) => b.s - a.s || a.c.cost - b.c.cost || a.c.id.localeCompare(b.c.id));
        moves.buildFromMarket?.(scored[0].c.id);
        remain--;
      }
    } catch {/*noop*/}
  }

  actCleanup(_state: GState, moves: any, _ctx: AgentContext): void {
    try { moves.finalizeCleanup?.(); } catch {/*noop*/}
  }

  private rankBuildTypesByScarcity(state: GState, ctx: AgentContext): BuildType[] {
    const weights: Record<BuildType, number> = { Government:5, Infrastructure:4, ProdFacility:3, FoodFacility:2, Land:1 } as any;
    const counts: Record<BuildType, number> = { Land:0, FoodFacility:0, ProdFacility:0, Infrastructure:0, Government:0 };
    for (const c of state.market.techMarket) counts[c.buildType] = (counts[c.buildType] ?? 0) + 1;
    const p = state.players[this.id];
    for (const id of [...p.built, ...p.pendingBuilt]) {
      const card = state.cardById[id];
      if (card?.kind==='Tech') counts[(card as any).buildType as BuildType] += 1;
    }
    return [...BUILD_TYPES].sort((a,b) => (counts[a]-counts[b]) || (weights[b]-weights[a]) || (ctx.rng()<0.5?-1:1));
  }

  private scoreTech(c: AnyCard, state: GState, budget: number): number {
    let score = c.vp / Math.max(1, (c as any).cost ?? 1);
    const p = state.players[this.id];
    const gear = p.base.gear + p.roundDelta.gear;
    const food = p.base.food + p.roundDelta.food;
    const lacking: 'gear' | 'food' | null = gear === food ? null : (gear < food ? 'gear' : 'food');
    if (lacking) {
      const adds = (c.effects||[]).some(ef => ef.scope==='persistent' && ((lacking==='gear' && ef.tag==='gearDelta') || (lacking==='food' && ef.tag==='foodDelta')));
      if (adds) score += 0.3;
    }
    if (c.cost <= Math.floor(budget/2)) score += 0.1;
    return score;
  }

  private hasWonderEra(state: GState, pid: PlayerID, era: number): boolean {
    const p = state.players[pid];
    const all = [...p.built, ...p.builtFaceDown, ...p.pendingBuilt];
    return all.some(id => (state.cardById[id] as AnyCard)?.kind === 'Wonder' && (state.cardById[id] as any).era === era);
  }
}
