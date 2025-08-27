/**
 * ゲーム各フェーズでの行動を提供する AI インターフェース。
 * すべて同期処理（単純ランダム方針）。高度化時は Promise 化も可。
 */
import { GState, PlayerID } from '../game/types';

export type AgentContext = {
  /** 乱数 (0<=x<1) 再現性のため必ず注入 */
  rng: () => number;
};

export interface IAgent {
  /** プレイヤー ID */
  readonly id: PlayerID;
  /** 政策フェーズの行動。全ての行動が終わったら true を返す */
  actPolicy(state: GState, moves: any, ctx: AgentContext): void;
  /** 発明フェーズ: 残り発明回数が 0 になるまで inventType を呼び出すか何もしない */
  actInvention(state: GState, moves: any, ctx: AgentContext): void;
  /** 建築フェーズ */
  actBuild(state: GState, moves: any, ctx: AgentContext): void;
  /** クリンナップフェーズ */
  actCleanup(state: GState, moves: any, ctx: AgentContext): void;
}

