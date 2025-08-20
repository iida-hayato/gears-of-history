import type { Game } from 'boardgame.io';
import { TurnOrder } from 'boardgame.io/core';
import type { GState, PlayerID } from './types';
import { initPlayers, recomputeRoundBonuses, policyMoveAndCountSkips, recomputeLaborAndEnforceFreeLeaders, computeRoundTurnOrderByRing } from './logic';
import { samplePolicies, sampleTechDeck, sampleWondersByEra } from './cards';

export const GearsOfHistory: Game<GState> = {
  name: 'GearsOfHistory',
  setup: ({ ctx }): GState => {
    const order = Array.from({ length: ctx.numPlayers }, (_, i) => String(i));
    const players = initPlayers(order);

    // 政策リング初期化
    const policyDeck = samplePolicies(ctx.numPlayers);
    // 全員をリング上へ（インデックスを均等配置 or 0から順に配置）
    order.forEach((id, i) => { players[id].policyPos = i % policyDeck.length; });

    return {
      players,
      order,
      ring: { policyDeck, startMarkerIndex: 0 },
      market: {
        techDeck: sampleTechDeck(),
        wondersByEra: sampleWondersByEra(),
        techMarket: [],
        wonderMarket: [],
      },
      round: 1,
      maxBuildSlots: 20,
      _skipsThisPolicyPhase: 0,
    };
  },

  turn: {
    // フェーズ間で一巡のみさせるのに便利
    order: TurnOrder.ONCE,
  },

  phases: {
    policy: {
      start: true,
      moves: {
        investAndMove: ({ G, ctx, playerID }, steps: number) => {
          // steps >= 1 を推奨（投入コマ数）。ここでは検証簡略化のため制約緩く
          policyMoveAndCountSkips(G, playerID!, Math.max(1, Math.floor(steps)));
        },
        endPolicyTurn: ({ events }) => { events.endTurn(); },
      },
      onBegin: ({ G }) => { G._skipsThisPolicyPhase = 0; },
      endIf: ({ ctx }) => ctx.turn >= ctx.numPlayers, // 全員1回
      onEnd: ({ G }) => {
        // スキップ総数だけスタートコマを反時計回りに戻す
        const n = G.ring.policyDeck.length;
        G.ring.startMarkerIndex = (G.ring.startMarkerIndex - (G._skipsThisPolicyPhase % n) + n) % n;

        // 当ラウンドの一時効果を反映
        for (const p of Object.values(G.players)) {
          recomputeRoundBonuses(G, p);
        }
      },
      next: 'invention',
    },

    invention: {
      moves: {
        inventToMarket: ({ G, playerID }, count: number) => {
          const p = G.players[playerID!];
          const allow = Math.max(0, count);
          for (let i = 0; i < allow && G.market.techDeck.length > 0; i++) {
            const card = G.market.techDeck.shift()!;
            G.market.techMarket.push(card);
            // コスト昇順
            G.market.techMarket.sort((a,b) => a.cost - b.cost);
          }
        },
        endInventionTurn: ({ events }) => { events.endTurn(); },
      },
      turn: {
        // スタートコマから時計回りに近い順
        order: {
          first: ({ G }) => computeRoundTurnOrderByRing(G)[0] as unknown as number,
          next: ({ G, ctx }) => {
            const ord = computeRoundTurnOrderByRing(G);
            const idx = ord.indexOf(ctx.playOrder[ctx.playOrderPos]);
            const nextID = ord[(idx + 1) % ord.length];
            return Number(nextID);
          },
        },
      },
      next: 'build',
    },

    build: {
      moves: {
        buildFromMarket: ({ G, playerID }, cardID: string) => {
          const p = G.players[playerID!];
          const cardIdx = G.market.techMarket.findIndex(c => c.id === cardID) ?? -1;
          if (cardIdx < 0) return;
          const card = G.market.techMarket[cardIdx];
          const budget = Math.max(0, p.base.gear + p.roundDelta.gear, p.base.food + p.roundDelta.food);
          const cost = card.cost;
          if (Math.min(p.base.gear + p.roundDelta.gear, p.base.food + p.roundDelta.food) < cost) return; // 予算不足
          // 建築権の管理はUI/シミュで行い、本体はpendingへ
          p.pendingBuilt.push(card.id);
          G.market.techMarket.splice(cardIdx, 1);
        },
        demolish: ({ G, playerID }, cardID: string) => {
          const p = G.players[playerID!];
          // 7不思議は撤去不可（ここでは Tech のみ対象）
          const i = p.built.indexOf(cardID);
          if (i >= 0) p.built.splice(i, 1);
        },
        endBuildTurn: ({ events }) => { events.endTurn(); },
      },
      next: 'cleanup',
    },

    cleanup: {
      moves: {
        toggleFace: ({ G, playerID }, cardID: string) => {
          const p = G.players[playerID!];
          let i = p.built.indexOf(cardID);
          if (i >= 0) { p.built.splice(i,1); p.builtFaceDown.push(cardID); return; }
          i = p.builtFaceDown.indexOf(cardID);
          if (i >= 0) { p.builtFaceDown.splice(i,1); p.built.push(cardID); return; }
        },
        finalizeCleanup: ({ G, events }) => {
          // pending → built（上限超過なら pending のまま）
          for (const p of Object.values(G.players)) {
            while (p.pendingBuilt.length > 0 && p.built.length < G.maxBuildSlots) {
              const cid = p.pendingBuilt.shift()!;
              p.built.push(cid);
            }
            recomputeLaborAndEnforceFreeLeaders(p, G.maxBuildSlots);
          }
          events.endTurn();
        },
      },
      endIf: ({ ctx }) => ctx.turn >= ctx.numPlayers,
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
      },
      next: ({ G }) => (G.round > 10 ? undefined : 'policy'),
    },
  },

  endIf: ({ G }) => (G.round > 10 ? { winner: computeWinner(G) } : undefined),
};

function computeWinner(G: GState): { winnerIDs: PlayerID[]; scores: Record<PlayerID, number> } {
  const scores: Record<PlayerID, number> = {};
  for (const [id, p] of Object.entries(G.players)) {
    // 簡易: 表カードのみVPを数える（※仕様要確認）
    const vp = p.built.reduce((acc, cid) => acc + vpOf(G, cid), 0);
    scores[id] = vp;
  }
  const max = Math.max(...Object.values(scores));
  const winnerIDs = Object.entries(scores).filter(([,v]) => v === max).map(([k]) => k);
  return { winnerIDs, scores };
}

function vpOf(G: GState, cardID: string): number {
  const all = [...G.market.techDeck, ...G.market.techMarket, ...G.market.wonderMarket, ...G.ring.policyDeck];
  const c = all.find(c => c.id === cardID);
  return c?.vp ?? 0;
}
