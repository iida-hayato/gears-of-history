import { Bot } from 'boardgame.io/ai';
import type { BuildType, AnyCard, GState } from '../game/types';

// 簡易ランダム (列挙結果から均等選択)
export function createRandomBot(): Bot {
  return new class extends Bot {
    constructor() { super({ enumerate: (G, ctx, playerID) => (ctx as any).random?.Seed ? [] : [] }); }
    play(state: any, playerID: string) {
      const moves: any[] = (state?.ctx?.activePlayers ? [] : []); // placeholder (未使用)
      // boardgame.io の Bot API enumerate が内部で呼ばれるケース向け簡易 fallback
      // デバッグ用途: 現在フェーズに応じて名前パターンで選択
      const phase = state.ctx?.phase;
      const available: string[] = Object.keys(state?.G?._metrics?.actionTagHistogram || {}); // not real; fallback
      // 実際には enumerate を使うべきだが debug パネル上は play 未呼出時に組込みランダムが動く。
      // 最低限 finalizeCleanup などを呼ぶためフェーズ固有推測。
      let moveType: string | null = null;
      switch (phase) {
        case 'policy': moveType = 'endPolicyTurn'; break;
        case 'invention': moveType = 'endInventionTurn'; break;
        case 'build': moveType = 'endBuildTurn'; break;
        case 'cleanup': moveType = 'finalizeCleanup'; break;
        default: moveType = null; break;
      }
      if (!moveType) return { action: null } as any;
      return { action: { type: 'MAKE_MOVE', payload: { type: moveType, args: [] } } } as any;
    }
  }();
}

// Heuristic 風: 現在フェーズごとに 1 アクション選択
export function createHeuristicBot(): Bot {
  return new class extends Bot {
    constructor() { super({ enumerate: () => [] }); }

    play(state: any, playerID: string) {
      const G: GState = state.G;
      const phase = state.ctx?.phase;
      try {
        switch (phase) {
          case 'policy': return this.playPolicy(G, state, playerID);
          case 'invention': return this.playInvention(G, state, playerID);
          case 'build': return this.playBuild(G, state, playerID);
          case 'cleanup': return this.wrap('finalizeCleanup');
          default: return { action: null } as any;
        }
      } catch { return { action: null } as any; }
    }

    private playPolicy(G: GState, state: any, pid: string) {
      const p = G.players[pid];
      if (!p) return this.wrap('endPolicyTurn');
      const free = Math.max(0, p.totalLeaders - p.lockedLeaders - 1 - (p.policySpent ?? 0));
      if (free <= 0) return this.wrap('endPolicyTurn');
      const investMax = Math.max(1, Math.floor(free * 0.6));
      const steps = 1 + Math.floor(Math.random() * investMax);
      return this.wrap('investAndMove', Math.min(steps, free));
    }

    private playInvention(G: GState, state: any, pid: string) {
      const remain = (G as any)._inventRemaining?.[pid] ?? 0;
      if (remain <= 0) return this.wrap('endInventionTurn');
      const order = this.rankTypes(G);
      const pick = order[0] || 'Land';
      return this.wrap('inventType', pick);
    }

    private playBuild(G: GState, state: any, pid: string) {
      const remain = (G as any)._buildRemaining?.[pid] ?? 0;
      if (remain <= 0) return this.wrap('endBuildTurn');
      const budget = (G as any)._buildBudget?.[pid] ?? 0;
      if (budget <= 0) return this.wrap('endBuildTurn');
      const wonders = G.market.wonderMarket.filter(w => w.cost <= budget && !this.hasWonderEra(G, pid, (w as any).era));
      if (wonders.length > 0) {
        wonders.sort((a,b)=> (b.vp/Math.max(1,b.cost)) - (a.vp/Math.max(1,a.cost)) || b.vp - a.vp || a.cost - b.cost);
        return this.wrap('buildWonderFromMarket', wonders[0].id);
      }
      const techs = G.market.techMarket.filter(t => t.cost <= budget);
      if (!techs.length) return this.wrap('endBuildTurn');
      const scored = techs.map(c => ({ c, s: this.scoreTech(c as AnyCard, G, budget, pid) }));
      scored.sort((a,b)=> b.s - a.s || a.c.cost - b.c.cost || a.c.id.localeCompare(b.c.id));
      return this.wrap('buildFromMarket', scored[0].c.id);
    }

    private wrap(type: string, ...args: any[]) { return { action: { type: 'MAKE_MOVE', payload: { type, args } } } as any; }

    private rankTypes(G: GState): BuildType[] {
      const weights: Record<BuildType, number> = { Government:5, Infrastructure:4, ProdFacility:3, FoodFacility:2, Land:1 } as any;
      const counts: Record<BuildType, number> = { Land:0, FoodFacility:0, ProdFacility:0, Infrastructure:0, Government:0 };
      for (const t of G.market.techMarket) counts[t.buildType] = (counts[t.buildType]||0)+1;
      return (['Land','FoodFacility','ProdFacility','Infrastructure','Government'] as BuildType[])
        .sort((a,b)=> (counts[a]-counts[b]) || (weights[b]-weights[a]));
    }

    private scoreTech(c: AnyCard, G: GState, budget: number, pid: string) {
      let score = c.vp / Math.max(1,(c as any).cost||1);
      const p = G.players[pid];
      const gear = p.base.gear + p.roundDelta.gear; const food = p.base.food + p.roundDelta.food;
      const lacking = gear === food ? null : (gear < food ? 'gear':'food');
      if (lacking) {
        const adds = (c.effects||[]).some(ef => ef.scope==='persistent' && ((lacking==='gear' && ef.tag==='gearDelta')||(lacking==='food'&&ef.tag==='foodDelta')));
        if (adds) score += 0.3;
      }
      if (c.cost <= Math.floor(budget/2)) score += 0.1;
      return score;
    }
    private hasWonderEra(G: GState, pid: string, era: number) {
      const p = G.players[pid];
      const all = [...p.built, ...p.builtFaceDown, ...p.pendingBuilt];
      return all.some(id => { const card = G.cardById[id]; return card?.kind==='Wonder' && (card as any).era===era; });
    }
  }();
}

export function enumerateMoves(G: any, ctx: any, playerID: string) {
  const moves: { move: string; args?: any[] }[] = [];
  const phase = ctx?.phase;
  try {
    switch (phase) {
      case 'policy': {
        const p = G.players[playerID];
        if (p) {
          const free = Math.max(0, p.totalLeaders - p.lockedLeaders - 1 - (p.policySpent ?? 0));
          for (let s = 1; s <= Math.max(1, Math.floor(free * 0.6)); s++) if (s <= free) moves.push({ move: 'investAndMove', args: [s] });
        }
        moves.push({ move: 'endPolicyTurn' });
        break;
      }
      case 'invention': {
        const remain = G._inventRemaining?.[playerID] ?? 0;
        if (remain > 0) {
          const types: string[] = ['Land','FoodFacility','ProdFacility','Infrastructure','Government'];
            for (const t of types) moves.push({ move: 'inventType', args: [t] });
        }
        moves.push({ move: 'endInventionTurn' });
        break;
      }
      case 'build': {
        const budget = G._buildBudget?.[playerID] ?? 0;
        const remain = G._buildRemaining?.[playerID] ?? 0;
        if (budget > 0 && remain > 0) {
          for (const w of G.market.wonderMarket || []) if (w.cost <= budget) moves.push({ move: 'buildWonderFromMarket', args: [w.id] });
          for (const c of G.market.techMarket || []) if (c.cost <= budget) moves.push({ move: 'buildFromMarket', args: [c.id] });
        }
        moves.push({ move: 'endBuildTurn' });
        break;
      }
      case 'cleanup': {
        moves.push({ move: 'finalizeCleanup' });
        break;
      }
      default: break;
    }
  } catch { /* ignore */ }
  return moves;
}
