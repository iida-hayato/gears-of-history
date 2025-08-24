# 開発用シミュレーション基盤 (dev-sim)

本書はランダム AI によるバッチシミュレーションとメトリクス集計・ベースライン比較手順をまとめたものです。

## 目的
- ランダム方針でのゲーム分布を早期に把握し、バランス調整の初期指針を得る
- 変更による統計的な回帰 / 退行を検知する

## コマンド一覧
| コマンド | 説明 |
|----------|------|
| `npm run sim:batch -- --games 500 --seedBase 1000 --players 4` | 500ゲームを実行し JSONL ログ生成 (logs/run-*.jsonl)。終了時に `{msPerGame}` を含む JSON を標準出力 (性能計測) |
| `npm run sim:agg` | 直近 run-*.jsonl を集計し metrics/summary-*.json 出力 |
| `npm run sim:diff` | 直近 summary と baseline を比較 (初回 baseline 作成) |

省略引数:
- `--games` (既定:10)
- `--seedBase` (既定:1000) 各ゲームで +i したシードを利用
- `--players` (既定:4)

## 出力構造
### 単一ゲーム (JSONL 1行)

```
{
  "seed": 1000,
  "players": 4,
  "winnerIds": ["2"],
  "playerVP": [7,6,8,5],
  "firstPlayerId": "0",
  "turnCount": 10,
  "builtCount": [12,11,13,10],
  "wonderCount": [1,0,1,0],
  "actionTagHistogram": {"policyMove":3,"invent":5,"build":9}
}
```

### 集計 summary (例)
```
{
  "games": 500,
  "players": 4,
  "seedBase": 1000,
  "avgVP": [7.2,7.1,7.0,7.3],
  "vpVar": [1.8,1.7,1.9,1.6],
  "winRate": [0.27,0.24,0.26,0.23],
  "firstPlayerWinRate": 0.27,
  "actionTagHistogram": {"build":1234,"invent":980,"policyMove":500},
  "generatedAt": "2025-08-23T09:00:00Z"
}
```

`sim:batch` 実行時の最後の標準出力例:
```
{"file":"logs/run-20250824-101530-seed1000.jsonl","games":50,"msTotal":4150.2,"msPerGame":83.004}
```

## 再現性
- すべての乱数は `src/sim/rng.ts (mulberry32)` を通す
- カードシャッフル: `setCardsRng` により差し替え
- `--seedBase` 固定で再実行すると JSONL の各行 (順序・値) が一致することを期待

## ベースライン比較
`npm run sim:diff` 実行時:
1. baseline 未存在 → `metrics/baseline.json` を現在 summary で作成
2. baseline 存在 → 差分 JSON を標準出力

差分構造 (一部):
```
{
  "diff": {
    "avgVP": [ {"base":7.2,"cur":7.3,"delta":0.1}, ...],
    "firstPlayerWinRate": {"base":0.27,"cur":0.26,"delta":-0.01}
  }
}
```

## メトリクス定義
- `avgVP`, `vpVar`: プレイヤー別平均 / 分散
- `winRate`: 勝率 (同点複勝を個別カウント)
- `firstPlayerWinRate`: 先手 (ID "0") の勝率
- `actionTagHistogram`: ゲーム内アクションの総発生数
- `builtCount`, `wonderCount`: 単一ゲームログのみ保持 (集計対象外, 必要なら拡張)
- `seedBase`: 集計対象ログの最小シード (バッチ開始シード)

## 追加検討 (次段)
- 行動多様性指標 (エントロピー)
- ヒューリスティック / 強化学習エージェント
- 並列実行 (Worker Threads) オプション

## トラブルシュート
| 症状 | 対処 |
|------|------|
| ゲームが終了しない | GameRunner の guard (10000) 到達。ルール無限ループ要調査 |
| 再現性が崩れる | Math.random 残存箇所検索 `grep Math.random` |
| baseline と何も差分が出ない | seedBase / games を増減、またはコード変更がメトリクスに影響していない |
