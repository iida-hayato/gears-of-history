import type { Game } from 'boardgame.io';
import {INVALID_MOVE, TurnOrder} from 'boardgame.io/core';
import {GState, PlayerID, AnyCard, freeLeadersAvailable, BuildType, TechCard, inventActionsThisRound} from './types';
import { initPlayers, recomputeRoundBonuses, policyMoveAndCountSkips, recomputeLaborAndEnforceFreeLeaders, computeRoundTurnOrderByRing } from './logic';
import {baseTechDeck, samplePolicies, sampleWondersByEra} from './cards';

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
      _skipsThisPolicyPhase: 0,
      _policyTurnsLeft: ctx.numPlayers,
      cardById,
      _inventRemaining: Object.fromEntries(order.map(id => [id, 0])),
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
        investAndMove: ({G, ctx, playerID, events}, steps: number) => {
          const p = G.players[playerID!];
          const s = Math.max(1, Math.floor(steps));
          const max = freeLeadersAvailable(p);
          if (s > max) return; // INVALID_MOVEにしてもOK
          policyMoveAndCountSkips(G, playerID!, s);
          p.policySpent = (p.policySpent ?? 0) + s;
          G._policyTurnsLeft = Math.max(0, G._policyTurnsLeft - 1);
          events.endTurn();
        },
        endPolicyTurn: ({G, events}) => {
          G._policyTurnsLeft = Math.max(0, G._policyTurnsLeft - 1);
          events.endTurn();
        },
      },
      onBegin: ({G, ctx}) => {
        G._skipsThisPolicyPhase = 0;
        G._policyTurnsLeft = ctx.numPlayers;
        for (const p of Object.values(G.players)) p.policySpent = 0; // ラウンド頭でリセット
      },
      endIf: ({G}) => G._policyTurnsLeft <= 0,
      onEnd: ({G}) => {
        for (const p of Object.values(G.players)) recomputeRoundBonuses(G, p);
      },
      next: 'invention',
    },

    invention: {
      turn: { order: TurnOrder.ONCE }, // 1巡固定
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
          G.market.techMarket.sort(sortById);
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
          const kind = G.cardById[cardID]?.kind;
          if (kind === 'Wonder') return; // 7不思議は裏面不可
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
function sortById(a: TechCard, b: TechCard): number {
    return a.id.localeCompare(b.id);
  }