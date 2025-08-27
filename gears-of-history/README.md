# Gears of History (Prototype)

ブラウザで動作する *boardgame.io* ベースの文明発展ボードゲーム試作。React + TypeScript + Vite。

## GitHub Pages
デプロイ先（例）: https://iida-hayato.github.io/gears-of-history/

## URL パラメータ一覧
| パラメータ | 値                      | 例 | 説明 |
|------------|------------------------|----|------|
| `debug`    | bool                   | `?debug=1` | boardgame.io Debug パネル表示（生ログ/手軽な Bot 実行） |
| `player`   | 数値                     | `?player=4` | プレイヤー人数 (デフォルト 4) |
| `ai`       | `random` / `heuristic` | `?ai=heuristic` | Debug Bot / enumerate 用 AI 挙動切替。`heuristic` は簡易ヒューリスティックで候補を絞る。省略時 `random` |
| `dashboard`| `1`                    | `?dashboard=1` | メトリクスダッシュボード表示モード（通常ゲームUIではない） |

複数指定例: `https://.../index.html?debug=1&player=4&ai=heuristic&`

## 開発 / 起動
```bash
npm install
npm run dev
# http://localhost:5173/?debug=1&ai=heuristic などでアクセス
```

