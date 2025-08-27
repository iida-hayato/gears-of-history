export type PlayerID = string; // '0' | '1' | ...

export type Resource = {
  gear: number;      // 歯車=生産力
  food: number;      // 食料=維持力
};

export type Labor = {
  required: number;  // 労働力要求の合計
  reduction: number; // 労働力削減の合計
};

export type CardKind = 'Policy' | 'Tech' | 'Wonder';

export type CardEffect =
  | { tag: 'gearDelta'; amount: number; scope: 'round' | 'persistent' }
  | { tag: 'foodDelta'; amount: number; scope: 'round' | 'persistent' }
  | { tag: 'laborReqDelta'; amount: number, scope: 'persistent'}
  | { tag: 'laborReduceDelta'; amount: number, scope: 'persistent'}
  | { tag: 'buildActionsDelta'; amount: number; scope: 'round' }
  | { tag: 'inventActionsDelta'; amount: number; scope: 'round' };

export interface BaseCard {
  id: string;
  name: string;
  description?: string; // 説明文（省略可）
  kind: CardKind;
  cost: number;            // 建築コスト（0可）
  vp: number;              // 勝利点（VP）
  effects: CardEffect[];   // 上記の簡易DSL。必要に応じて拡張
}

export interface TechCard extends BaseCard {
  kind: 'Tech';
  serial: number; // 並び順
  buildType: BuildType; 
}
export type BuildType = 'Land' | 'ProdFacility' | 'FoodFacility' | 'Infrastructure' | 'Government';
export const BUILD_TYPE_ORDER: Readonly<BuildType[]> = [
  'Land',
  'FoodFacility',
  'ProdFacility',
  'Infrastructure',
  'Government',
];

export const cmpBuildType = (a?: BuildType, b?: BuildType): number => {
  const idx = (t?: BuildType) => {
    const i = BUILD_TYPE_ORDER.indexOf((t ?? 'Land') as BuildType);
    return i < 0 ? 1e9 : i;
  };
  return idx(a) - idx(b);
};

    
export interface WonderCard extends BaseCard {
  kind: 'Wonder';
  era: 1 | 2 | 3;          // 時代
}

export interface PolicyCard extends BaseCard {
  kind: 'Policy';
}

export type AnyCard = TechCard | WonderCard | PolicyCard;

export interface PlayerState {
  id: PlayerID;
  // 自ボード
  built: string[];            // 配置済みカードID（表）
  builtFaceDown: string[];    // 裏向き
  pendingBuilt: string[];     // 当ラウンドに建築し、クリンナップまでに待機

  // リソース
  base: Resource;             // 初期/永続の出力
  roundDelta: Resource;       // ラウンド限定の出力加算（政策など）

  // 労働
  labor: Labor;               // 表カード由来の拘束/削減
  roundLaborDelta: Labor;     // ラウンド限定の拘束/削減

  // 指導者コマ
  totalLeaders: number;       // 原則7（うち1はリング上）
  lockedLeaders: number;      // 拘束されて盤面固定
  ringLeaderPlaced: boolean;  // リング上コマ設置済み
  policySpent: number; // 政策に投入して消費したコマ数
  
  // フェーズごとの追加行動（ラウンド限定）
  roundBuildActionsBonus: number;
  roundInventActionsBonus: number;

  // 政策リング上の位置（カードインデックス）。-1は未配置
  policyPos: number;
}

export interface MarketState {
  // 未開の知識庫（山札相当）
  techDeck: TechCard[];                 // タイプ分けは簡略化
  techFaceUp: TechCard[]; // 公開済みのカード
  wondersByEra: Record<1 | 2 | 3, WonderCard[]>; // 各時代の山

  // 技術市場（コスト昇順で並べる）
  techMarket: TechCard[];
  wonderMarket: WonderCard[];
}

export interface RingState {
  policyDeck: PolicyCard[]; // プレイヤー数+5枚
  startMarkerIndex: number; // スタートコマの位置（カードインデックス）
}

export type SimulationSeed = number;

export type ActionTag = 'policy' | 'invention' | 'build' | 'cleanup' | 'internal';

export interface RoundSnapshot {
  vp: number[];              // 各プレイヤーVP
  builtDelta: number[];      // 当ラウンド新規建築枚数
  gears?: number[];          // ギア生産(永続 base.gear)
  food?: number[];           // 食料生産(永続 base.food)
}

export interface GState {
  players: Record<PlayerID, PlayerState>;
  order: PlayerID[];            // プレイヤーID順（固定）
  ring: RingState;
  market: MarketState;
  round: number;                // 1..10
  maxBuildSlots: number;        // 20
  // 一時計算用のバッファ
  roundOrder: PlayerID[];
  cardById: Record<string, AnyCard>;
  _inventRemaining: Record<PlayerID, number>;  // 発明フェイズの残回数
  _buildRemaining: Record<PlayerID, number>; // 建築フェイズの残回数
  _buildBudget: Record<PlayerID, number>; // ← このラウンドの残り“利用可能コスト”
  seed?: SimulationSeed; // ← シミュレーション用シード保持
  aiMode?: 'heuristic' | 'random'; // ← デバッグボット列挙向け AI モード
  _metrics?: {
    actionTagHistogram: Record<ActionTag, number>;
    perRoundVP: number[][];
    perRoundBuildCounts: number[][];
    perRoundGears: number[][];
    perRoundFood: number[][];
    perRoundFreeLeaders?: number[][];
    perRoundAvailableCost?: number[][];
    _prevBuiltCounts: number[]; // 内部計算用
  };
}

export type MoveCtx = {
  G: GState;
  ctx: import('boardgame.io').Ctx;
  // @ts-ignore
  events: import('boardgame.io').EventsAPI;
  playerID: PlayerID;
  // @ts-ignore
  random: import('boardgame.io').RandomAPI;
};

// 派生: 利用可能歯車
export const availableCost = (p?: PlayerState): number => {
  if (!p) return 0;
  const gear = p.base.gear + p.roundDelta.gear;
  const food = p.base.food + p.roundDelta.food;
  return Math.max(0, Math.min(gear, food));
};

export const freeLeadersRaw = (p: PlayerState): number =>
      Math.max(0, p.totalLeaders - 1 /*リング*/ - p.lockedLeaders);

export const freeLeadersAvailable = (p: PlayerState): number =>
    Math.max(0, freeLeadersRaw(p) - (p.policySpent ?? 0));

export const buildActionsThisRound = (p: PlayerState): number =>
    freeLeadersAvailable(p) + p.roundBuildActionsBonus;

export const inventActionsThisRound = (p: PlayerState): number =>
    freeLeadersAvailable(p) + p.roundInventActionsBonus;


export const gearByPlayer = (p: PlayerState): number => 
    p.base.gear;
export const foodByPlayer = (p: PlayerState): number =>
    p.base.food;
export const laborRequiredByPlayer = (p: PlayerState): number =>
    p.labor.required - p.labor.reduction ;
    
export const persistentAvailableLeaderByPlayer = (p: PlayerState): number =>
    p.totalLeaders - 1 - laborRequiredByPlayer(p);

export const persistentAvailableCostByPlayer = (p: PlayerState): number =>
    Math.max(0, Math.min(gearByPlayer(p), foodByPlayer(p)));

export const totalVP = (p: PlayerState, cardById: Record<string, AnyCard>): number => 
    [...p.built,...p.builtFaceDown].reduce((sum, cid) => sum + (cardById[cid]?.vp ?? 0), 0);