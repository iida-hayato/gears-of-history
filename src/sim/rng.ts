/**
 * シード付き擬似乱数 (mulberry32)
 * 再現性確保のため、エージェント挙動・バッチ順序はこの RNG からのみ乱数を取得する。
 * boardgame.io の内部乱数は使用しない方針。
 */
export type RNG = () => number;

/** Mulberry32 実装 */
export function mulberry32(seed: number): RNG {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** 連番シードから RNG を生成するヘルパ */
export function rngFromBase(seedBase: number, index: number): RNG {
  return mulberry32((seedBase + index) >>> 0);
}

