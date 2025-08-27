import { GState, BuildType, TechCard, PlayerID } from './types';
import { cmpBuildType } from './types';
import { AnyCard } from './types';

// Tech 市場: 指定タイプの次カードを表→山の順で取得
export function drawNextTechOfType(G: GState, t: BuildType | undefined): TechCard | undefined {
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

// 並び替え（市場整列用）
export function sortTechForMarket(a: TechCard, b: TechCard): number {
  const t = cmpBuildType(a.buildType, b.buildType);
  if (t) return t;
  if (a.serial !== b.serial) return a.serial - b.serial;
  return a.id.localeCompare(b.id);
}

// 指定時代の Wonder を既に保有しているか
export function hasWonderInEra(G: GState, pid: PlayerID, era: 1|2|3): boolean {
  const p = G.players[pid];
  const all = [...p.built, ...p.builtFaceDown, ...p.pendingBuilt];
  return all.some(id => {
    const c = G.cardById[id];
    return c?.kind === 'Wonder' && (c as any).era === era;
  });
}

// ラウンド→時代
export function eraOfRound(r: number): 0|1|2|3 {
  if (r >= 9) return 3;
  if (r >= 6) return 2;
  if (r >= 3) return 1;
  return 0;
}

// ラウンド進行と市場回転
export function advanceRoundAndRotateMarkets(G: GState) {
  const nextRound = (G.round ?? 1) + 1;
  const prevEra  = eraOfRound(G.round);
  const nextEra  = eraOfRound(nextRound);

  // 未建築 Tech を知識庫へ戻す
  if (G.market.techMarket.length) {
    G.market.techFaceUp.push(...G.market.techMarket);
    G.market.techMarket = [];
  }

  // 時代遷移時のみ Wonder 市場差し替え
  if (nextEra !== prevEra && nextEra !== 0) {
    G.market.wonderMarket = [...G.market.wondersByEra[nextEra]];
    for (const e of [1,2,3] as const) {
      if (e < nextEra) G.market.wondersByEra[e] = [];
    }
  }
  G.round = nextRound;
}

// VP 計算（裏面も印刷 VP 有効）
export function totalVpForPlayer(G: GState, pid: PlayerID): number {
  const p = G.players[pid];
  return [...p.built, ...p.builtFaceDown]
    .reduce((acc, cid) => acc + (G.cardById[cid]?.vp ?? 0), 0);
}

