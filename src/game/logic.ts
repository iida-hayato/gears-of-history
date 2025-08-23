import type {GState, PlayerID, PlayerState, PolicyCard, AnyCard} from './types';

export function initPlayers(order: PlayerID[]): Record<PlayerID, PlayerState> {
    const players: Record<PlayerID, PlayerState> = {};
    for (const id of order) {
        players[id] = {
            id,
            built: [],
            builtFaceDown: [],
            pendingBuilt: [],
            base: {gear: 3, food: 2},  // 初期建築カードの値
            roundDelta: {gear: 0, food: 0},
            labor: {required: 3, reduction: 0},
            roundLaborDelta: {required: 0, reduction: 0},
            totalLeaders: 7,
            lockedLeaders: 3,        // 労働拘束3 → 盤面固定
            ringLeaderPlaced: true,  // リングに1個
            roundBuildActionsBonus: 0,
            roundInventActionsBonus: 0,
            policyPos: -1,           // 準備で置く
            policySpent: 0,          // 政策に投入したコマ数
        };
    }
    return players;
}

export function recomputeRoundBonuses(G: GState, p: PlayerState) {
    // ラウンド限定値の初期化
    p.roundDelta = {gear: 0, food: 0};
    p.roundLaborDelta = {required: 0, reduction: 0};
    p.roundBuildActionsBonus = 0;
    p.roundInventActionsBonus = 0;

    // 政策カード効果の適用（当ラウンドのみ）
    const policy = currentPolicyCardAt(G, p.policyPos);
    if (policy) applyCardEffects(G, p, policy, /*isRound*/ true);
}

export function currentPolicyCardAt(G: GState, index: number): PolicyCard | null {
    return G.ring.policyDeck[index] ?? null;
}

export function applyCardEffects(G: GState, p: PlayerState, card: AnyCard, isRound: boolean) {
    for (const ef of card.effects) {
        switch (ef.tag) {
            case 'gearDelta': {
                if (ef.scope === 'persistent' && !isRound) p.base.gear += ef.amount;
                if (ef.scope === 'round' && isRound) p.roundDelta.gear += ef.amount;
                break;
            }
            case 'foodDelta': {
                if (ef.scope === 'persistent' && !isRound) p.base.food += ef.amount;
                if (ef.scope === 'round' && isRound) p.roundDelta.food += ef.amount;
                break;
            }
            case 'laborReqDelta': {
                if (isRound) p.roundLaborDelta.required += ef.amount;
                else p.labor.required += ef.amount;
                break;
            }
            case 'laborReduceDelta': {
                if (isRound) p.roundLaborDelta.reduction += ef.amount;
                else p.labor.reduction += ef.amount;
                break;
            }
            case 'buildActionsDelta': {
                if (isRound) p.roundBuildActionsBonus += ef.amount;
                break;
            }
            case 'inventActionsDelta': {
                if (isRound) p.roundInventActionsBonus += ef.amount;
                break;
            }
        }
    }
}

export function policyMoveAndCountSkips(G: GState, playerID: PlayerID, steps: number) {
    // steps = 投入したコマ数。occupied をスキップしながら進む
    const p = G.players[playerID];
    let pos = p.policyPos;
    let skips = 0;
    for (let s = 0; s < steps; s++) {
        do {
            pos = (pos + 1) % G.ring.policyDeck.length;
            // Occupied?
            const occupied = Object.values(G.players).some(q => q.policyPos === pos);
            if (occupied) {
                skips += 1;
            } else {
                break;
            }
        } while (true);
    }
    p.policyPos = pos;
    if (skips > 0) {
        const n = G.ring.policyDeck.length;
        // ★ 各手番ごとに即時反映
        G.ring.startMarkerIndex = (G.ring.startMarkerIndex - (skips % n) + n) % n;
    }
}

export function recomputeLaborAndEnforceFreeLeaders(p: PlayerState, maxBuildSlots: number) {
    // クリンナップ時: 少なくとも自由コマ2を残すため、必要なら裏返す
    const required = Math.max(0, p.labor.required + p.roundLaborDelta.required);
    const reduced = Math.max(0, p.labor.reduction + p.roundLaborDelta.reduction);
    const lockedNeeded = Math.max(0, required - reduced);
    p.lockedLeaders = lockedNeeded;

    const free = Math.max(0, p.totalLeaders - 1 - p.lockedLeaders);
    if (free < 2) {
        // 裏返せるカードから労働要求を減らす（簡易: built → builtFaceDown に移す）
        while (p.built.length > 0 && Math.max(0, p.totalLeaders - 1 - p.lockedLeaders) < 2) {
            const cid = p.built.pop()!;
            p.builtFaceDown.push(cid);
            // 仮に裏返しで労働要求1減るとする（本実装ではカード由来の効果差分を正しく反映）
            p.lockedLeaders = Math.max(0, p.lockedLeaders - 1);
        }
    }
    // 建築上限: 20（7不思議を除く）
    if (p.built.length > maxBuildSlots) {
        // 余剰は pending のまま（= 自ボード横）
        const overflow = p.built.splice(maxBuildSlots);
        p.pendingBuilt.push(...overflow);
    }
}

export function computeRoundTurnOrderByRing(G: GState): PlayerID[] {
    // スタートコマから時計回りで近い順（各プレイヤーの policyPos に基づく）
    const marker = G.ring.startMarkerIndex;
    const entries = Object.values(G.players).map(p => ({id: p.id, pos: p.policyPos}));
    const dist = (a: number) => (a - marker + G.ring.policyDeck.length) % G.ring.policyDeck.length;
    return entries.sort((a, b) => dist(a.pos) - dist(b.pos)).map(e => e.id);
}

export function recomputePersistentProduction(G: GState, p: PlayerState) {
      let gear = 0;
      let food = 0;
      let laborReq = 0;
      let laborReduce = 0;

    for (const id of p.built) {
        const c = G.cardById[id] as AnyCard | undefined;
        if (!c || !('effects' in c) || !Array.isArray(c.effects)) continue;
        for (const ef of c.effects) {
            if (ef.scope === 'persistent') {
                if (ef.tag === 'gearDelta') gear += ef.amount ?? 0;
                if (ef.tag === 'foodDelta') food += ef.amount ?? 0;
                if (ef.tag === 'laborReqDelta') laborReq += ef.amount ?? 0;
                if (ef.tag === 'laborReduceDelta') laborReduce += ef.amount ?? 0
            }
        }
    }
    p.base.gear = Math.max(0, gear);
    p.base.food = Math.max(0, food);
    p.labor.required = Math.max(0, laborReq);
    p.labor.reduction = Math.max(0, laborReduce);
}