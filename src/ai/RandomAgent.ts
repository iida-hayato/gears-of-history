/** 改良版: 軽量ヒューリスティックエージェント
 * 仕様概要:
 * Policy: free<=0 で終了 / invest = 1..max(1,floor(free*0.6))
 * Invention: 希少タイプ(市場+自ボード保有) + 静的優先度 (Gov>Infra>Prod>Food>Land)
 * Build: Wonder 先。次に Tech を score = vp/cost + synergy(0.3) + cheap(0.1)
 *   synergy: 不足資源(gear vs food の小さい方)を恒久的に増やす persistent delta を含む
 *   cheap: cost <= floor(budget/2)
 *   同点: 低コスト -> id
 * Cleanup: finalizeCleanup のみ
 */
import { IAgent, AgentContext } from './IAgent';
import { BuildType, GState, PlayerID, AnyCard } from '../game/types';

export class RandomAgent implements IAgent {
  readonly id: PlayerID;
  constructor(id: PlayerID) { this.id = id; }

  // --- Policy Phase ---
  actPolicy(state: GState, moves: any, ctx: AgentContext): void {
    try {
      const p = state.players[this.id];
      if (!p) { moves?.endPolicyTurn?.(); return; }
      const free = this.freeLeaders(p);
      if (free <= 0) { moves?.endPolicyTurn?.(); return; }
      const investMax = Math.max(1, Math.floor(free * 0.6));
      const steps = 1 + Math.floor(ctx.rng() * investMax);
      moves?.investAndMove?.(Math.min(steps, free));
    } catch { /* 静かに */ }
  }

  // --- Invention Phase ---
  actInvention(state: GState, moves: any, ctx: AgentContext): void {
    try {
      let remain: number = (state as any)._inventRemaining?.[this.id] ?? 0;
      if (remain <= 0) { moves?.endInventionTurn?.(); return; }
      while (remain > 0) {
        const ordered = this.rankTypesByScarcity(state, ctx);
        let done = false;
        for (const t of ordered) {
          if (moves?.inventType) { moves.inventType(t); done = true; break; }
        }
        if (!done) { moves?.endInventionTurn?.(); return; }
        remain--; // 推定減算（正確値は state 側）
        if (remain <= 0) break;
      }
    } catch { /* 静かに */ }
  }

  // --- Build Phase ---
  actBuild(state: GState, moves: any, ctx: AgentContext): void {
    try {
      let remain: number = (state as any)._buildRemaining?.[this.id] ?? 0;
      if (remain <= 0) { moves?.endBuildTurn?.(); return; }
      while (remain > 0) {
        const budget: number = (state as any)._buildBudget?.[this.id] ?? 0;
        if (budget <= 0) { moves?.endBuildTurn?.(); return; }
        // 候補収集
        const wonders = state.market.wonderMarket.filter(w => w.cost <= budget && !this.hasWonderEra(state, this.id, (w as any).era));
        if (wonders.length > 0) {
          wonders.sort((a,b) => (b.vp / Math.max(1,b.cost)) - (a.vp/Math.max(1,a.cost)) || b.vp - a.vp || a.cost - b.cost || a.id.localeCompare(b.id));
          moves?.buildWonderFromMarket?.(wonders[0].id);
          remain--; continue;
        }
        const techs = state.market.techMarket.filter(t => t.cost <= budget);
        if (techs.length === 0) { moves?.endBuildTurn?.(); return; }
        const scored = techs.map(c => ({ c, s: this.scoreTech(c as AnyCard, state, budget) }));
        scored.sort((a,b) => b.s - a.s || a.c.cost - b.c.cost || a.c.id.localeCompare(b.c.id));
        moves?.buildFromMarket?.(scored[0].c.id);
        remain--;
      }
    } catch { /* 静かに */ }
  }

  // --- Cleanup Phase ---
  actCleanup(_state: GState, moves: any, _ctx: AgentContext): void {
    try { moves?.finalizeCleanup?.(); } catch { /* 静かに */ }
  }

  // ===== Helpers =====
  private freeLeaders(p: any): number {
    const reserved = (p.lockedLeaders ?? 0) + 1; // 1 = ring leader 常在
    return Math.max(0, (p.totalLeaders ?? 0) - reserved - (p.policySpent ?? 0));
  }
  private hasWonderEra(state: GState, pid: PlayerID, era: number): boolean {
    const p = state.players[pid];
    const all = [...p.built, ...p.builtFaceDown, ...p.pendingBuilt];
    return all.some(id => {
      const c = state.cardById[id];
      return c?.kind === 'Wonder' && (c as any).era === era;
    });
  }
  private scoreTech(c: AnyCard, state: GState, budget: number): number {
    // 基礎効率
    let score = c.vp / Math.max(1, (c as any).cost ?? 1);
    // シナジー: 不足資源増加 persistent 効果
    const p = state.players[this.id];
    const gear = p.base.gear + p.roundDelta.gear;
    const food = p.base.food + p.roundDelta.food;
    const lacking: 'gear' | 'food' | null = gear === food ? null : (gear < food ? 'gear' : 'food');
    if (lacking) {
      const adds = (c.effects||[]).some(ef => ef.scope === 'persistent' && ((lacking==='gear' && ef.tag==='gearDelta') || (lacking==='food' && ef.tag==='foodDelta')));
      if (adds) score += 0.3;
    }
    if (c.cost <= Math.floor(budget/2)) score += 0.1;
    return score;
  }
  private rankTypesByScarcity(state: GState, ctx: AgentContext): BuildType[] {
    const weights: Record<BuildType, number> = { Government:5, Infrastructure:4, ProdFacility:3, FoodFacility:2, Land:1 } as any;
    const counts: Record<BuildType, number> = { Land:0, FoodFacility:0, ProdFacility:0, Infrastructure:0, Government:0 };
    for (const t of state.market.techMarket) counts[(t.buildType as BuildType)] = (counts[t.buildType as BuildType] ?? 0) + 1;
    const p = state.players[this.id];
    for (const id of [...p.built, ...p.pendingBuilt]) {
      const card = state.cardById[id];
      if (card?.kind==='Tech') counts[(card as any).buildType as BuildType] += 1;
    }
    return (['Land','FoodFacility','ProdFacility','Infrastructure','Government'] as BuildType[])
      .sort((a,b) => (counts[a] - counts[b]) || (weights[b]-weights[a]) || (ctx.rng()<0.5?-1:1));
  }
}
