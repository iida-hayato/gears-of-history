/** ゲーム終了時の単一ゲームメトリクス抽出 */
import { GState, totalVP, AnyCard } from '../game/types';
import { createHash } from 'crypto';
// package.json から version 読み込み（ビルド時解決）
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pkg from '../../package.json';

export const METRICS_SCHEMA_VERSION = 2;

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

export interface ExtendedGameMetrics extends SingleGameMetrics {
  schemaVersion: number;
  engineVersion: string;
  perRoundVP: number[][];
  perRoundBuildCounts: number[][];
  perRoundGears: number[][];
  perRoundFood: number[][];
  snapshotHash: string;
}

export function buildGameMetrics(G: GState, seed: number, actionHistogram: Record<string, number> = {}): ExtendedGameMetrics {
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
  // 内部収集データ
  const perRoundVP = G._metrics?.perRoundVP ? [...G._metrics.perRoundVP] : [];
  const perRoundBuildCounts = G._metrics?.perRoundBuildCounts ? [...G._metrics.perRoundBuildCounts] : [];
  const perRoundGears = G._metrics?.perRoundGears ? [...G._metrics.perRoundGears] : [];
  const perRoundFood = G._metrics?.perRoundFood ? [...G._metrics.perRoundFood] : [];
  if (perRoundVP.length && perRoundVP[perRoundVP.length - 1].length === playerVP.length) {
    const last = perRoundVP[perRoundVP.length - 1];
    // 最終行と playerVP が一致しない場合は playerVP を優先（設計上は一致するはず）
    const mismatch = last.some((v,i) => v !== playerVP[i]);
    if (mismatch) perRoundVP.push([...playerVP]);
  } else if (perRoundVP.length === 0) {
    perRoundVP.push([...playerVP]);
  }
  const snapshotHash = stableHashState(stablePruneState(G));
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
    schemaVersion: METRICS_SCHEMA_VERSION,
    engineVersion: (pkg?.version ?? '0.0.0'),
    perRoundVP,
    perRoundBuildCounts,
    perRoundGears,
    perRoundFood,
    snapshotHash,
  };
}

// 安定化: _ で始まるキー除外・キーソート・純データ化
function stablePruneState(G: GState): any {
  const clone: any = {};
  const allowKeys = Object.keys(G).filter(k => !k.startsWith('_'));
  for (const k of allowKeys.sort()) {
    clone[k] = (G as any)[k];
  }
  return clone;
}

function stableNormalize(value: any): any {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stableNormalize);
  const keys = Object.keys(value).filter(k => !k.startsWith('_')).sort();
  const out: any = {};
  for (const k of keys) out[k] = stableNormalize(value[k]);
  return out;
}

export function stableHashState(obj: any): string {
  const norm = stableNormalize(obj);
  const json = JSON.stringify(norm);
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}
