/** ゲーム終了時の単一ゲームメトリクス抽出 */
import { GState, totalVP, AnyCard } from '../game/types';

export interface SingleGameMetrics {
  seed: number;
  players: number;
  winnerIds: string[];
  playerVP: number[];
  firstPlayerId: string;
  turnCount: number; // 実ラウンド数
  builtCount: number[]; // 各プレイヤー表+裏+pending を含まない最終 built 合計
  wonderCount: number[];
  actionTagHistogram: Record<string, number>; // build / invent / policyMove など
}

export function buildGameMetrics(G: GState, seed: number, actionHistogram: Record<string, number>): SingleGameMetrics {
  const order = G.order;
  const playerVP = order.map(pid => totalVP(G.players[pid], G.cardById as Record<string, AnyCard>));
  const maxVP = Math.max(...playerVP);
  const winnerIds = order.filter((_, i) => playerVP[i] === maxVP);
  const builtCount = order.map(pid => G.players[pid].built.length + G.players[pid].builtFaceDown.length);
  const wonderCount = order.map(pid => {
    const p = G.players[pid];
    const all = [...p.built, ...p.builtFaceDown];
    return all.filter(cid => (G.cardById[cid] as AnyCard)?.kind === 'Wonder').length;
  });
  return {
    seed,
    players: order.length,
    winnerIds,
    playerVP,
    firstPlayerId: order[0],
    turnCount: G.round - 1, // round>10で終了後+1されている
    builtCount,
    wonderCount,
    actionTagHistogram: { ...actionHistogram },
  };
}

