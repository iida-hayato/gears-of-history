/** ランダム方針エージェント (強化版: 軽量ヒューリスティック導入)
 * 方針:
 *  - Policy: 自由指導者数から 1..free ランダム investAndMove / 無ければ endPolicyTurn
 *  - Invention: 残回数 0 になるまでランダム BuildType を公開 (希少性簡易優先余地: 今は均等ランダム)
 *  - Build: Wonder>労働軽減>歯車/食料増>その他 の優先度で 1 枚購入。なければ endBuildTurn
 *  - Cleanup: finalizeCleanup のみ（将来 toggleFace 戦略用フックコメントあり）
 * 再現性: 乱数は全て ctx.rng()
 */
import { IAgent, AgentContext } from './IAgent';
import { BuildType, GState, PlayerID, AnyCard } from '../game/types';

const BUILD_TYPES: BuildType[] = ['Land','FoodFacility','ProdFacility','Infrastructure','Government'];

export class RandomAgent implements IAgent {
  readonly id: PlayerID;
  constructor(id: PlayerID) { this.id = id; }

  // --- Policy Phase ---
  actPolicy(state: GState, moves: any, ctx: AgentContext): void {
    const p = state.players[this.id];
    if (!p) { moves?.endPolicyTurn?.(); return; }
    const free = this.freeLeaders(p);
    if (free <= 0) { moves?.endPolicyTurn?.(); return; }
    const steps = 1 + Math.floor(ctx.rng() * free);
    if (moves?.investAndMove) moves.investAndMove(steps); else moves?.endPolicyTurn?.();
  }

  // --- Invention Phase ---
  actInvention(state: GState, moves: any, ctx: AgentContext): void {
    let remain: number = (state as any)._inventRemaining?.[this.id] ?? 0;
    if (remain <= 0) { moves?.endInventionTurn?.(); return; }
    // 残回数ゼロになるまで 1 つずつ inventType（boardgame.io 内部で残回数減+0で自動 endTurn）
    while (remain > 0) {
      const t = BUILD_TYPES[Math.floor(ctx.rng()*BUILD_TYPES.length)];
      if (moves?.inventType) moves.inventType(t); else { moves?.endInventionTurn?.(); return; }
      remain--; // ローカル推定（正確な残は state._inventRemaining )
      if (remain <= 0) break;
    }
  }

  // --- Build Phase ---
  actBuild(state: GState, moves: any, ctx: AgentContext): void {
    let remain: number = (state as any)._buildRemaining?.[this.id] ?? 0;
    if (remain <= 0) { moves?.endBuildTurn?.(); return; }
    const budget: number = (state as any)._buildBudget?.[this.id] ?? 0;
    if (budget <= 0) { moves?.endBuildTurn?.(); return; }

    // 候補列挙
    const wonders = state.market.wonderMarket.filter(w => w.cost <= budget && !this.hasWonderEra(state, this.id, (w as any).era));
    const techs = state.market.techMarket.filter(t => t.cost <= budget);
    if (!wonders.length && !techs.length) { moves?.endBuildTurn?.(); return; }

    // スコアリング: Wonder>laborReduce>gear>food>laborReqDelta / コスト低いほど僅かに優遇
    const scored: { card: AnyCard; isWonder: boolean; score: number }[] = [];
    for (const w of wonders) scored.push({ card: w as AnyCard, isWonder: true, score: this.scoreCard(w as AnyCard) });
    for (const c of techs) scored.push({ card: c as AnyCard, isWonder: false, score: this.scoreCard(c as AnyCard) });
    if (!scored.length) { moves?.endBuildTurn?.(); return; }
    let max = -Infinity;
    for (const s of scored) if (s.score > max) max = s.score;
    const top = scored.filter(s => s.score === max);
    const pick = top[Math.floor(ctx.rng()*top.length)];

    if (pick.isWonder) moves?.buildWonderFromMarket?.(pick.card.id); else moves?.buildFromMarket?.(pick.card.id);
    // 1枚取得のみ。残回数 >0 なら次サイクルで再度呼ばれる。
  }

  // --- Cleanup Phase ---
  actCleanup(_state: GState, moves: any, _ctx: AgentContext): void {
    // TODO(heuristic): 労働過多時に toggleFace で裏返し最適化など
    moves?.finalizeCleanup?.();
  }

  // ===== Helpers =====
  private freeLeaders(p: any): number {
    const reserved = (p.lockedLeaders ?? 0) + 1; // 1 = ring leader 常在
    return Math.max(0, (p.totalLeaders ?? 0) - reserved);
  }

  private hasWonderEra(state: GState, pid: PlayerID, era: number): boolean {
    const p = state.players[pid];
    const all = [...p.built, ...p.builtFaceDown, ...p.pendingBuilt];
    return all.some(id => {
      const c = state.cardById[id];
      return c?.kind === 'Wonder' && (c as any).era === era;
    });
  }

  private scoreCard(c: AnyCard): number {
    let s = 0;
    if (c.kind === 'Wonder') s += 100;
    for (const ef of c.effects ?? []) {
      if (ef.scope === 'persistent') {
        if (ef.tag === 'laborReduceDelta') s += 30;
        if (ef.tag === 'gearDelta') s += 15;
        if (ef.tag === 'foodDelta') s += 12;
        if (ef.tag === 'laborReqDelta') s += 8;
      }
    }
    // コスト小さいほど微加点 (最大 +10)
    // @ts-ignore
    if (typeof c.cost === 'number') s += Math.max(0, 10 - c.cost);
    return s;
  }
}
