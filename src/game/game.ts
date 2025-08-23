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
  recomputePersistentProduction, applyCardEffects
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
        // 市場の回転とラウンド進行
        advanceRoundAndRotateMarkets(G);

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


// 優先順：表の知識庫 → 伏せ山（デッキ）
function drawNextTechOfType(G: GState, t: BuildType | undefined): TechCard | undefined {
  const want = (t ?? 'Land') as BuildType;
  const iOpen = G.market.techFaceUp.findIndex(c => (c.buildType ?? 'Land') === want);
  if (iOpen >= 0) {
    const [c] = G.market.techFaceUp.splice(iOpen, 1);
    return c as TechCard;
  }
  const iDeck = G.market.techDeck.findIndex(c => (c.buildType ?? 'Land') === want);
  if (iDeck >= 0) {
    const [c] = G.market.techDeck.splice(iDeck, 1);
    return c as TechCard;
  }
  return undefined;
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

// 追加：時代計算（ラウンド番号→時代）
function eraOfRound(r: number): 0|1|2|3 {
  if (r >= 8) return 3;
  if (r >= 5) return 2;
  if (r >= 2) return 1;
  return 0;
}

// 追加：ラウンドを進めつつ、市場を正しく回転
function advanceRoundAndRotateMarkets(G: GState) {
  const nextRound = (G.round ?? 1) + 1;
  const prevEra  = eraOfRound(G.round);
  const nextEra  = eraOfRound(nextRound);

  // ★ Tech：未建築は知識庫へ戻す（仕様通り、ここでのみクリア）
  if (G.market.techMarket.length) {
    G.market.techFaceUp.push(...G.market.techMarket);
    G.market.techMarket = [];
  }

  // ★ Wonder：時代が変わる時だけ公開リストを差し替える
  if (nextEra !== prevEra && nextEra !== 0) {
    // 新時代公開
    G.market.wonderMarket = [...G.market.wondersByEra[nextEra]];
    // 旧時代を陳腐化（完全除外）
    for (const e of [1,2,3] as const) {
      if (e < nextEra) G.market.wondersByEra[e] = [];
    }
  }
  // ラウンド進行は最後に
  G.round = nextRound;
}