import type { Game } from 'boardgame.io';
import {INVALID_MOVE, TurnOrder} from 'boardgame.io/core';
import {
  GState,
  PlayerID,
  AnyCard,
  freeLeadersAvailable,
  BuildType,
  TechCard,
  inventActionsThisRound,
  buildActionsThisRound, availableCost, cmpBuildType
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

export const GearsOfHistory: Game<GState> = {
  name: 'GearsOfHistory',
  setup: ({ ctx }): GState => {
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
          const p = G.players[playerID!];
          const s = Math.max(1, Math.floor(steps));
          const max = freeLeadersAvailable(p);
          if (s > max) return; // INVALID_MOVEにしてもOK
          policyMoveAndCountSkips(G, playerID!, s);
          p.policySpent = (p.policySpent ?? 0) + s;
          events.endTurn();
        },
        endPolicyTurn: ({G, events}) => {
          events.endTurn();
        },
      },
      onBegin: ({G, ctx}) => {
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
          const pid = playerID!;
          const remain = G._inventRemaining[pid] ?? 0;
          if (remain <= 0) return INVALID_MOVE;
          const card = drawNextTechOfType(G, t);
          if (!card) return INVALID_MOVE;
          G.market.techMarket.push(card);
          // 同タイプ内の見た目順：UIがグルーピングするが、全体でも安定化
          G.market.techMarket.sort(sortTechForMarket);
          G._inventRemaining[pid] = remain - 1;
          if (remain - 1 <= 0) return events.endTurn();
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
          const pid = playerID!;
          if ((G._buildRemaining[pid] ?? 0) <= 0) return INVALID_MOVE;
          const p = G.players[pid];
          const idx = G.market.techMarket.findIndex(c => c.id === cardID);
          if (idx < 0) return INVALID_MOVE;
          const card = G.market.techMarket[idx];
          if ((G._buildBudget[pid] ?? 0) < card.cost) return INVALID_MOVE; // 残コスト不足
          p.pendingBuilt.push(card.id);
          G.market.techMarket.splice(idx, 1);
          G._buildRemaining[pid]--;
          G._buildBudget[pid] = Math.max(0, (G._buildBudget[pid] ?? 0) - card.cost); // ← 消費
        },
        buildWonderFromMarket: ({ G, playerID }, cardID: string) => {
          const pid = playerID!;
          if ((G._buildRemaining[pid] ?? 0) <= 0) return INVALID_MOVE;
          const p = G.players[pid];
          const idx = G.market.wonderMarket.findIndex(c => c.id === cardID);
          if (idx < 0) return INVALID_MOVE;
          const card = G.market.wonderMarket[idx];
          if ((G._buildBudget[pid] ?? 0) < card.cost) return INVALID_MOVE;
          if (hasWonderInEra(G, pid, (card as any).era)) return INVALID_MOVE;
          p.pendingBuilt.push(card.id);
          G.market.wonderMarket.splice(idx, 1);
          G._buildRemaining[pid]--;
          G._buildBudget[pid] = Math.max(0, (G._buildBudget[pid] ?? 0) - card.cost);
        },
        demolish: ({ G, playerID }, cardID: string) => {
          const pid = playerID!;
          if ((G._buildRemaining[pid] ?? 0) <= 0) return INVALID_MOVE;
          const p = G.players[pid];
          const kind = G.cardById[cardID]?.kind;
          if (kind === 'Wonder') return INVALID_MOVE;
          let i = p.built.indexOf(cardID);
          if (i >= 0) { p.built.splice(i, 1); G._buildRemaining[pid]--; return; }
          i = p.builtFaceDown.indexOf(cardID);
          if (i >= 0) { p.builtFaceDown.splice(i, 1); G._buildRemaining[pid]--; return; }
          return INVALID_MOVE;
        },
        endBuildTurn: ({ G, playerID, events }) => {
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
          const p = G.players[playerID!];
          const kind = G.cardById[cardID]?.kind;
          if (kind === 'Wonder') return; // 7不思議は裏面不可
          let i = p.built.indexOf(cardID);
          if (i >= 0) { p.built.splice(i,1); p.builtFaceDown.push(cardID); return; }
          i = p.builtFaceDown.indexOf(cardID);
          if (i >= 0) { p.builtFaceDown.splice(i,1); p.built.push(cardID); return; }
          recomputePersistentProduction(G, p);
          recomputeLaborAndEnforceFreeLeaders(p, G.maxBuildSlots);
        },
        finalizeCleanup: ({ G, playerID, events }) => {
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
        // 7不思議公開（ラウンド2,5,8）
        if ([2,5,8].includes(G.round as number)) {
          const era = (G.round === 2 ? 1 : G.round === 5 ? 2 : 3) as 1|2|3;
          G.market.wonderMarket = [...G.market.wondersByEra[era]];
          // 旧時代は陳腐化
          if (era > 1) G.market.wondersByEra[1] = [];
          if (era > 2) G.market.wondersByEra[2] = [];
        }
        // 技術市場の残カードは知識庫へ戻す
        G.market.techDeck.push(...G.market.techMarket);
        G.market.techMarket = [];

        // ラウンド進行
        G.round += 1;

        // ★ ラウンド限定効果をリセット（持ち越し禁止）
        for (const [pid, p] of Object.entries(G.players)) {
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
        for (const p of Object.values(G.players)) {
          recomputeLaborAndEnforceFreeLeaders(p, G.maxBuildSlots);
        }
      },
      onBegin: ({ G }) => {
        for (const [pid, p] of Object.entries(G.players)) {
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

  endIf: ({ G }) => (G.round > 10 ? { winner: computeWinner(G) } : undefined),
};

function computeWinner(G: GState): { winnerIDs: PlayerID[]; scores: Record<PlayerID, number> } {
  const scores: Record<PlayerID, number> = {};
  for (const [id, p] of Object.entries(G.players)) {
    // 裏面も印刷VPは有効
    const all = [...p.built, ...p.builtFaceDown];
    const vp = all.reduce((acc, cid) => acc + vpOf(G, cid), 0);
    scores[id] = vp;
  }
  const max = Math.max(...Object.values(scores));
  const winnerIDs = Object.entries(scores).filter(([,v]) => v === max).map(([k]) => k);
  return { winnerIDs, scores };
}

function vpOf(G: GState, cardID: string): number {
  return G.cardById[cardID]?.vp ?? 0;
}


// ヘルパ：指定タイプの次カードをデッキから引く（なければ undefined）
    function drawNextTechOfType(G: GState, t: BuildType | undefined): TechCard | undefined {
        const idx = G.market.techDeck.findIndex(c => (c.buildType ?? 'Land') === (t ?? 'Land'));
        if (idx < 0) return undefined;
        const [c] = G.market.techDeck.splice(idx, 1);
        return c as TechCard;
      }
// 比較：id
function sortTechForMarket(a: TechCard, b: TechCard): number {
  const t = cmpBuildType(a.buildType, b.buildType);
  if (t) return t;
  if (a.serial !== b.serial) return a.serial - b.serial;
  return a.id.localeCompare(b.id);
}

  // ヘルパ：指定時代の7不思議があるかどうか.各時代の七不思議は1つずつしか建てられない
function hasWonderInEra(G: GState, pid: PlayerID, era: 1|2|3): boolean {
  const p = G.players[pid];
  const all = [...p.built, ...p.builtFaceDown, ...p.pendingBuilt];
  return all.some(id => {
    const c = G.cardById[id];
    return c?.kind === 'Wonder' && (c as any).era === era;
  });
}