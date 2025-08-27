import type { Game } from 'boardgame.io';
import {
  GState,
  PlayerID,
  AnyCard,
  freeLeadersAvailable,
  BuildType,
  inventActionsThisRound,
  buildActionsThisRound, availableCost
} from './types';
import {
  initPlayers,
  recomputeRoundBonuses,
  policyMoveAndCountSkips,
  recomputeLaborAndEnforceFreeLeaders,
  computeRoundTurnOrderByRing,
  recomputePersistentProduction
} from './logic';
import {baseTechDeck, initialTechDeck, samplePolicies, sampleWondersByEra} from './cards';
import { totalVP } from './types';
import { drawNextTechOfType, sortTechForMarket, hasWonderInEra, advanceRoundAndRotateMarkets } from './roundHelpers';

export const GearsOfHistory: Game<GState> = {
  name: 'GearsOfHistory',
  setup: ({ ctx }, setupData): GState => {
    const seed = (setupData as any)?.seed as number | undefined;
    const aiMode = (setupData as any)?.aiMode === 'heuristic' ? 'heuristic' : 'random';
    const order = Array.from({ length: ctx.numPlayers }, (_, i) => String(i));
    const players = initPlayers(order);

    // 政策リング初期化
    const policyDeck = samplePolicies(ctx.numPlayers);
    // 全員をリング上へ（インデックスを均等配置 or 0から順に配置）
    order.forEach((id, i) => { players[id].policyPos = i % policyDeck.length; });
    // 全カード辞書を構築
    const techDeck = baseTechDeck();
    const wondersByEra = sampleWondersByEra();
    const cardById: Record<string, AnyCard> = {};
    for (const c of policyDeck) cardById[c.id] = c;
    for (const c of techDeck) cardById[c.id] = c;
    for (const era of [1, 2, 3] as const) for (const c of wondersByEra[era]) cardById[c.id] = c;
    for (const p of Object.values(players)) p.policySpent = 0;
    // 初期建築をプレイヤーに配布
    for (const id of order) {
      const p = players[id];
      // 初期建築カード3枚(固定)
      const initCards = initialTechDeck()
      // idを採番
      initCards.forEach((c, i) => {
        c.id = `${c.id}-P${i}`;
        cardById[c.id] = c;
        // Playerの建築済みエリアに追加
        p.built.push(c.id);
      });
    }

    return {
      players,
      order,
      ring: { policyDeck, startMarkerIndex: 0 },
      market: {
        techDeck,
        techFaceUp: [],
        wondersByEra,
        techMarket: [],
        wonderMarket: [],
      },
      round: 1,
      maxBuildSlots: 20,
      roundOrder: [...order],
      cardById,
      _inventRemaining: Object.fromEntries(order.map(id => [id, 0])),
      _buildRemaining: Object.fromEntries(order.map(id => [id, 0])),
      _buildBudget:   Object.fromEntries(order.map(id => [id, 0])),
      seed,
      aiMode,
      _metrics: {
        actionTagHistogram: { policy:0, invention:0, build:0, cleanup:0, internal:0 },
        perRoundVP: [],
        perRoundBuildCounts: [],
        perRoundGears: [],
        perRoundFood: [],
        perRoundFreeLeaders: [],
        perRoundAvailableCost: [],
        _prevBuiltCounts: order.map(pid => players[pid].built.length + players[pid].builtFaceDown.length),
      }
    };
  },


  phases: {
    policy: {
      start: true,
      // ★ roundOrder に従って1巡だけ回す
      turn: {
        order: {
          first: ({ G, ctx }) => {
            const idxs = G.roundOrder.map(pid => ctx.playOrder.indexOf(pid));
            return idxs[0] ?? 0;
          },
          next: ({ G, ctx }) => {
            const idxs = G.roundOrder.map(pid => ctx.playOrder.indexOf(pid));
            const i = idxs.indexOf(ctx.playOrderPos);
            return (i >= 0 && i + 1 < idxs.length) ? idxs[i + 1] : undefined; // 1巡で終了
          },
        },
      },
      moves: {
        investAndMove: ({G, ctx, playerID, events}, steps: number) => {
          G._metrics && (G._metrics.actionTagHistogram.policy++);
          const p = G.players[playerID!];
          const s = Math.max(1, Math.floor(steps));
          const max = freeLeadersAvailable(p);
          if (s > max) return; // INVALID_MOVEにしてもOK
          policyMoveAndCountSkips(G, playerID!, s);
          p.policySpent = (p.policySpent ?? 0) + s;
          events.endTurn();
        },
        endPolicyTurn: ({G, events}) => {
          G._metrics && (G._metrics.actionTagHistogram.policy++);
          events.endTurn();
        },
      },
      onBegin: ({G}) => { // ctx 未使用
        for (const p of Object.values(G.players)) p.policySpent = 0; // ラウンド頭でリセット
      },
      onEnd: ({G}) => {
        for (const p of Object.values(G.players)) recomputeRoundBonuses(G, p);
        G.roundOrder = computeRoundTurnOrderByRing(G);
      },
      next: 'invention',
    },

    invention: {
      // ★ roundOrder に従って1巡だけ回す
      turn: {
        order: {
          first: ({ G, ctx }) => {
            const idxs = G.roundOrder.map(pid => ctx.playOrder.indexOf(pid));
            return idxs[0] ?? 0;
          },
          next: ({ G, ctx }) => {
            const idxs = G.roundOrder.map(pid => ctx.playOrder.indexOf(pid));
            const i = idxs.indexOf(ctx.playOrderPos);
            return (i >= 0 && i + 1 < idxs.length) ? idxs[i + 1] : undefined; // 1巡で終了
          },
        },
      },
      moves: {
        // タイプを指定して公開（1回=1枚）
        inventType: ({ G, playerID, events }, t: BuildType) => {
          G._metrics && (G._metrics.actionTagHistogram.invention++);
          const pid = playerID!;
          const remain = G._inventRemaining[pid] ?? 0;
          if (remain <= 0) return;
          const card = drawNextTechOfType(G, t);
          if (!card) return;
          G.market.techMarket.push(card);
          // 同タイプ内の見た目順：UIがグルーピングするが、全体でも安定化
          G.market.techMarket.sort(sortTechForMarket);
          G._inventRemaining[pid] = remain - 1;
          if (remain - 1 <= 0) return events.endTurn();
        },
        endInventionTurn: ({ G, playerID, events }) => {
          if ((G._inventRemaining[playerID!] ?? 0) <= 0) { G._metrics && (G._metrics.actionTagHistogram.invention++); events.endTurn(); }
        },
      },
      onBegin: ({ G }) => {
        for (const [pid, p] of Object.entries(G.players)) {
          G._inventRemaining[pid] = inventActionsThisRound(p);
        }
      },
      next: 'build',
    },

    build: {
      // ★ roundOrder に従って1巡だけ回す
      turn: {
        order: {
          first: ({ G, ctx }) => {
            const idxs = G.roundOrder.map(pid => ctx.playOrder.indexOf(pid));
            return idxs[0] ?? 0;
          },
          next: ({ G, ctx }) => {
            const idxs = G.roundOrder.map(pid => ctx.playOrder.indexOf(pid));
            const i = idxs.indexOf(ctx.playOrderPos);
            return (i >= 0 && i + 1 < idxs.length) ? idxs[i + 1] : undefined; // 1巡で終了
          },
        },
      },
      onBegin: ({ G }) => {
        for (const [pid, p] of Object.entries(G.players)) {
          G._buildRemaining[pid] = buildActionsThisRound(p);
          G._buildBudget[pid]   = availableCost(p); // ← ラウンド開始時点の“利用可能コスト”を配布
        }
      },
      moves: {
        buildFromMarket: ({ G, playerID }, cardID: string) => {
          G._metrics && (G._metrics.actionTagHistogram.build++);
          const pid = playerID!;
          if ((G._buildRemaining[pid] ?? 0) <= 0) return;
          const p = G.players[pid];
          const idx = G.market.techMarket.findIndex(c => c.id === cardID);
          if (idx < 0) return;
          const card = G.market.techMarket[idx];
          if ((G._buildBudget[pid] ?? 0) < card.cost) return; // 残コスト不足
          p.pendingBuilt.push(card.id);
          G.market.techMarket.splice(idx, 1);
          G._buildRemaining[pid]--;
          G._buildBudget[pid] = Math.max(0, (G._buildBudget[pid] ?? 0) - card.cost); // ← 消費
        },
        buildWonderFromMarket: ({ G, playerID }, cardID: string) => {
          G._metrics && (G._metrics.actionTagHistogram.build++);
          const pid = playerID!;
          if ((G._buildRemaining[pid] ?? 0) <= 0) return;
          const p = G.players[pid];
          const idx = G.market.wonderMarket.findIndex(c => c.id === cardID);
          if (idx < 0) return;
          const card = G.market.wonderMarket[idx];
          if ((G._buildBudget[pid] ?? 0) < card.cost) return;
          if (hasWonderInEra(G, pid, (card as any).era)) return;
          p.pendingBuilt.push(card.id);
          G.market.wonderMarket.splice(idx, 1);
          G._buildRemaining[pid]--;
          G._buildBudget[pid] = Math.max(0, (G._buildBudget[pid] ?? 0) - card.cost);
        },
        demolish: ({ G, playerID }, cardID: string) => {
          G._metrics && (G._metrics.actionTagHistogram.build++);
          const pid = playerID!;
          if ((G._buildRemaining[pid] ?? 0) <= 0) return;
          const p = G.players[pid];
          const kind = G.cardById[cardID]?.kind;
          if (kind === 'Wonder') return;
          let i = p.built.indexOf(cardID);
          if (i >= 0) { p.built.splice(i, 1); G._buildRemaining[pid]--; return; }
          i = p.builtFaceDown.indexOf(cardID);
          if (i >= 0) { p.builtFaceDown.splice(i, 1); G._buildRemaining[pid]--; return; }
          return;
        },
        endBuildTurn: ({ G, playerID, events }) => {
          G._metrics && (G._metrics.actionTagHistogram.build++);
          G._buildRemaining[playerID!] = 0;
          events.endTurn();
        },
      },
      next: 'cleanup',
    },
    
    cleanup: {
      // ★ roundOrder に従って1巡だけ回す
      turn: {
        order: {
          first: ({ G, ctx }) => {
            const idxs = G.roundOrder.map(pid => ctx.playOrder.indexOf(pid));
            return idxs[0] ?? 0;
          },
          next: ({ G, ctx }) => {
            const idxs = G.roundOrder.map(pid => ctx.playOrder.indexOf(pid));
            const i = idxs.indexOf(ctx.playOrderPos);
            return (i >= 0 && i + 1 < idxs.length) ? idxs[i + 1] : undefined; // 1巡で終了
          },
        },
      },
      moves: {
        toggleFace: ({ G, playerID }, cardID: string) => {
          G._metrics && (G._metrics.actionTagHistogram.cleanup++);
          const p = G.players[playerID!];
          const kind = G.cardById[cardID]?.kind;
          if (kind === 'Wonder') return; // 7不思議は裏面不可
          let changed = false;
          let i = p.built.indexOf(cardID);
          if (i >= 0) { p.built.splice(i,1); p.builtFaceDown.push(cardID); changed = true; }
          else {
            i = p.builtFaceDown.indexOf(cardID);
            if (i >= 0) { p.builtFaceDown.splice(i,1); p.built.push(cardID); changed = true; }
          }
          if (!changed) return; // （見つからない時は無視 / INVALID_MOVEでもOK）
          recomputePersistentProduction(G, p);
          recomputeLaborAndEnforceFreeLeaders(p, G.maxBuildSlots);
        },
        finalizeCleanup: ({ G, playerID, events }) => {
          G._metrics && (G._metrics.actionTagHistogram.cleanup++);
          const p = G.players[playerID!];           // ← 現在手番のみ
          while (p.pendingBuilt.length > 0 && p.built.length < G.maxBuildSlots) {
            const cid = p.pendingBuilt.shift()!;
            p.built.push(cid);
          }
          recomputePersistentProduction(G, p);
          recomputeLaborAndEnforceFreeLeaders(p, G.maxBuildSlots);
          events.endTurn();
        },
      },
      onEnd: ({ G }) => {
        // ラウンドスナップショット収集 (advance 前)
        if (G._metrics) {
          const vpRow = G.order.map(pid => totalVP(G.players[pid], G.cardById));
          const builtCounts = G.order.map(pid => G.players[pid].built.length + G.players[pid].builtFaceDown.length);
          const builtDelta = builtCounts.map((c,i) => c - (G._metrics!._prevBuiltCounts[i] ?? 0));
          G._metrics.perRoundVP.push(vpRow);
          G._metrics.perRoundBuildCounts.push(builtDelta);
          G._metrics.perRoundGears.push(G.order.map(pid => G.players[pid].base.gear));
          G._metrics.perRoundFood.push(G.order.map(pid => G.players[pid].base.food));
          G._metrics.perRoundFreeLeaders?.push(G.order.map(pid => freeLeadersAvailable(G.players[pid])));
          G._metrics.perRoundAvailableCost?.push(G.order.map(pid => availableCost(G.players[pid])));
          G._metrics._prevBuiltCounts = builtCounts;
        }
        // 市場の回転とラウンド進行
        advanceRoundAndRotateMarkets(G);

        // ★ ラウンド限定効果をリセット（持ち越し禁止）
        for (const [_, p] of Object.entries(G.players)) {
          p.roundDelta.gear = 0;
          p.roundDelta.food = 0;
          p.roundLaborDelta.required = 0;
          p.roundLaborDelta.reduction = 0;
          p.roundBuildActionsBonus = 0;
          p.roundInventActionsBonus = 0;
        }
        for (const pid of G.order) {
          G._inventRemaining[pid] = 0;
          if (G._buildRemaining) G._buildRemaining[pid] = 0;
          if ((G as any)._buildBudget) (G as any)._buildBudget[pid] = 0;
        }
        for (const p of Object.values(G.players)) { // pid 未使用
          recomputeLaborAndEnforceFreeLeaders(p, G.maxBuildSlots);
        }
      },
      onBegin: ({ G }) => {
        for (const p of Object.values(G.players)) { // pid 未使用
          while (p.pendingBuilt.length > 0 && p.built.length < G.maxBuildSlots) {
            const cid = p.pendingBuilt.shift()!;
            p.built.push(cid);
          }
          recomputePersistentProduction(G, p);
          recomputeLaborAndEnforceFreeLeaders(p, G.maxBuildSlots);
        }
      },
      next: ({ G }) => (G.round > 10 ? undefined : 'policy'),
    },
  },

  endIf: ({ G }) => {
    if (G.round <= 10) return;
    const { winner, scores } = computeWinner(G);
    return { winner, scores };
  },
  // === Debug Bot 用 AI 列挙 ===
  // boardgame.io の Debug パネル / RandomBot / MCTSBot が利用できるよう
  // 現在プレイヤーが実行可能なムーブを網羅列挙する。
  ai: {
    enumerate: (G: GState, ctx, playerID?: string) => {
      const pid = playerID ?? ctx.currentPlayer;
      const moves: { move: string; args?: any[] }[] = [];
      if (!pid) return moves;
      const phase = ctx.phase;
      const p = G.players[pid];
      if (!p) return moves;
      const aiMode = G.aiMode === 'heuristic' ? 'heuristic' : 'random';

      // ヘルパ: 建築カードスコアリング (VP/Cost + 資源シナジー + 安価ボーナス)
      const scoreTech = (card: AnyCard, budget: number): number => {
        const cost = (card as any).cost ?? 0;
        let score = card.vp / Math.max(1, cost);
        const gear = p.base.gear + p.roundDelta.gear;
        const food = p.base.food + p.roundDelta.food;
        const lacking = gear === food ? null : (gear < food ? 'gear' : 'food');
        if (lacking) {
          const adds = (card.effects||[]).some(ef => ef.scope==='persistent' && ((lacking==='gear' && ef.tag==='gearDelta') || (lacking==='food' && ef.tag==='foodDelta')));
            if (adds) score += 0.3;
        }
        if (cost <= Math.floor(budget/2)) score += 0.1;
        return score;
      };
      const rankTypesByScarcity = (): BuildType[] => {
        const weights: Record<BuildType, number> = { Government:5, Infrastructure:4, ProdFacility:3, FoodFacility:2, Land:1 } as any;
        const counts: Record<BuildType, number> = { Land:0, FoodFacility:0, ProdFacility:0, Infrastructure:0, Government:0 };
        for (const c of G.market.techMarket) counts[c.buildType] = (counts[c.buildType] ?? 0) + 1;
        for (const id of [...p.built, ...p.pendingBuilt]) {
          const card = G.cardById[id];
          if (card?.kind==='Tech') counts[(card as any).buildType as BuildType] += 1;
        }
        return (['Land','FoodFacility','ProdFacility','Infrastructure','Government'] as BuildType[])
          .sort((a,b) => (counts[a]-counts[b]) || (weights[b]-weights[a]) || (Math.random()<0.5?-1:1));
      };

      switch (phase) {
        case 'policy': {
          const free = freeLeadersAvailable(p);
          if (aiMode === 'heuristic') {
            if (free > 0) {
              const invest = Math.min(free, Math.max(1, Math.floor(free * 0.6)));
              moves.push({ move: 'investAndMove', args: [invest] });
            }
            moves.push({ move: 'endPolicyTurn', args: [] });
          } else { // random: 全列挙
            for (let s = 1; s <= free; s++) moves.push({ move: 'investAndMove', args: [s] });
            moves.push({ move: 'endPolicyTurn', args: [] });
          }
          break;
        }
        case 'invention': {
          const remain = G._inventRemaining[pid] ?? 0;
          if (remain > 0) {
            if (aiMode === 'heuristic') {
              const order = rankTypesByScarcity();
              for (const bt of order) {
                const hasInDeck = G.market.techDeck.some(c => (c.buildType as BuildType) === bt);
                const hasFaceUp = (G.market.techFaceUp||[]).some(c => (c.buildType as BuildType) === bt);
                if (hasInDeck || hasFaceUp) { moves.push({ move: 'inventType', args: [bt] }); break; }
              }
            } else {
              const BUILD_TYPES: BuildType[] = ['Land','ProdFacility','FoodFacility','Infrastructure','Government'];
              for (const bt of BUILD_TYPES) {
                const hasInDeck = G.market.techDeck.some(c => (c.buildType as BuildType) === bt);
                const hasFaceUp = (G.market.techFaceUp||[]).some(c => (c.buildType as BuildType) === bt);
                if (hasInDeck || hasFaceUp) moves.push({ move: 'inventType', args: [bt] });
              }
            }
          }
          moves.push({ move: 'endInventionTurn', args: [] });
          break;
        }
        case 'build': {
          const remain = G._buildRemaining[pid] ?? 0;
            const budget = G._buildBudget[pid] ?? 0;
            if (remain > 0 && budget > 0) {
              if (aiMode === 'heuristic') {
                // Wonder 最高効率1件
                const wonders = G.market.wonderMarket.filter(w => w.cost <= budget && !hasWonderInEra(G, pid, (w as any).era));
                wonders.sort((a,b) => (b.vp/Math.max(1,b.cost)) - (a.vp/Math.max(1,a.cost)) || b.vp - a.vp || a.cost - b.cost);
                if (wonders[0]) moves.push({ move: 'buildWonderFromMarket', args: [wonders[0].id] });
                const techs = G.market.techMarket.filter(c => c.cost <= budget);
                const scored = techs.map(c => ({ c, s: scoreTech(c, budget) }))
                  .sort((a,b) => b.s - a.s || a.c.cost - b.c.cost)
                  .slice(0, 3);
                for (const sc of scored) moves.push({ move: 'buildFromMarket', args: [sc.c.id] });
                // 解体は抑制（不要なノイズ）
              } else {
                for (const c of G.market.techMarket) if (c.cost <= budget) moves.push({ move: 'buildFromMarket', args: [c.id] });
                for (const w of G.market.wonderMarket) if (w.cost <= budget && !hasWonderInEra(G, pid, (w as any).era)) moves.push({ move: 'buildWonderFromMarket', args: [w.id] });
                for (const cid of [...p.built, ...p.builtFaceDown]) {
                  const kind = G.cardById[cid]?.kind; if (kind !== 'Wonder') moves.push({ move: 'demolish', args: [cid] });
                }
              }
            }
            moves.push({ move: 'endBuildTurn', args: [] });
          break;
        }
        case 'cleanup': {
          if (aiMode === 'heuristic') {
            moves.push({ move: 'finalizeCleanup', args: [] });
          } else {
            for (const cid of p.built) if (G.cardById[cid]?.kind !== 'Wonder') moves.push({ move: 'toggleFace', args: [cid] });
            for (const cid of p.builtFaceDown) if (G.cardById[cid]?.kind !== 'Wonder') moves.push({ move: 'toggleFace', args: [cid] });
            moves.push({ move: 'finalizeCleanup', args: [] });
          }
          break;
        }
        default: break;
      }
      return moves;
    }
  }
};

function computeWinner(G: GState): { winner: PlayerID; scores: Record<PlayerID, number> } {
  const scores: Record<PlayerID, number> = {};
  for (const [id, p] of Object.entries(G.players)) {
    const all = [...p.built, ...p.builtFaceDown];
    scores[id] = all.reduce((acc, cid) => acc + vpOf(G, cid), 0);
  }
  const max = Math.max(...Object.values(scores));
  // 同点候補
  const tied: PlayerID[] = Object.entries(scores)
      .filter(([, v]) => v === max)
      .map(([id]) => id as PlayerID);

  // ラウンドの手番順（policy フェイズ後に決まる順）で最も早いもの
  let winner: PlayerID | undefined;
  for (const pid of G.roundOrder) {
    if (tied.includes(pid)) { winner = pid; break; }
  }
  // 念のため fallback（理論上不要）
  if (!winner) winner = tied[0];

  return { winner, scores };
}

function vpOf(G: GState, cardID: string): number {
  return G.cardById[cardID]?.vp ?? 0;
}
