/** JSONL ゲームメトリクスを集計し summary 出力 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';

interface GameMetricsLike { playerVP?: number[]; winnerIds?: string[]; players?: number; actionTagHistogram?: Record<string, number>; seed?: number; }

function latestRunFile(): string | null {
  try {
    const files = readdirSync('logs').filter(f => f.startsWith('run-') && f.endsWith('.jsonl'));
    if (!files.length) return null;
    files.sort((a,b) => statSync(join('logs',b)).mtimeMs - statSync(join('logs',a)).mtimeMs);
    return join('logs', files[0]);
  } catch { return null; }
}

function parseArgs() {
  const a = process.argv.slice(2);
  const out: any = {};
  for (let i=0;i<a.length;i++) if (a[i]==='--file') out.file = a[++i];
  return out;
}

function loadLines(path: string): any[] {
  const raw = readFileSync(path,'utf-8').split(/\n+/).filter(Boolean);
  return raw.map(l => { try { return JSON.parse(l); } catch { return null; } });
}

function aggregate(lines: any[]) {
  let players = 0;
  let sumVP: number[] = [];
  let sumVP2: number[] = [];
  let wins: number[] = [];
  const actionHist: Record<string, number> = {};
  let minSeed = Infinity;
  let valid = 0;
  let skipped = 0;
  // ラウンド別集計（平均算出用）
  let perRoundVPSums: number[][] = []; // [round][player]
  let perRoundBuildSums: number[][] = [];
  let perRoundCounts = 0; // ゲーム数（ラウンド配列統合に利用）

  for (const raw of lines) {
    if (!raw) { skipped++; continue; }
    const candidate: GameMetricsLike = raw.metrics && typeof raw.metrics === 'object' ? raw.metrics : raw;
    const pvp = candidate.playerVP;
    if (!Array.isArray(pvp) || pvp.length === 0) { skipped++; continue; }
    if (players === 0) {
      players = pvp.length;
      sumVP = Array(players).fill(0);
      sumVP2 = Array(players).fill(0);
      wins = Array(players).fill(0);
    }
    if (pvp.length !== players) { skipped++; continue; }

    pvp.forEach((v,i) => { sumVP[i]+=v; sumVP2[i]+=v*v; });
    if (Array.isArray(candidate.winnerIds)) {
      for (const id of candidate.winnerIds) {
        const idx = Number(id);
        if (!Number.isNaN(idx) && idx >=0 && idx < players) wins[idx] += 1;
      }
    }
    if (candidate.actionTagHistogram) {
      for (const [k,v] of Object.entries(candidate.actionTagHistogram)) {
        if (typeof v === 'number') actionHist[k] = (actionHist[k] ?? 0) + v;
      }
    }
    if (typeof candidate.seed === 'number' && candidate.seed < minSeed) minSeed = candidate.seed;

    // ラウンド別 (Extended metrics のみ)
    // candidate.perRoundVP: number[][]; candidate.perRoundBuildCounts: number[][]
    if (Array.isArray((candidate as any).perRoundVP)) {
      const rounds: number[][] = (candidate as any).perRoundVP;
      for (let r = 0; r < rounds.length; r++) {
        if (!Array.isArray(perRoundVPSums[r])) perRoundVPSums[r] = Array(players).fill(0);
        const row = rounds[r];
        if (Array.isArray(row)) {
          for (let i = 0; i < Math.min(players, row.length); i++) perRoundVPSums[r][i] += row[i];
        }
      }
    }
    if (Array.isArray((candidate as any).perRoundBuildCounts)) {
      const rounds: number[][] = (candidate as any).perRoundBuildCounts;
      for (let r = 0; r < rounds.length; r++) {
        if (!Array.isArray(perRoundBuildSums[r])) perRoundBuildSums[r] = Array(players).fill(0);
        const row = rounds[r];
        if (Array.isArray(row)) {
          for (let i = 0; i < Math.min(players, row.length); i++) perRoundBuildSums[r][i] += row[i];
        }
      }
    }
    // perRound 系は Extended ゲームを一つでも含む場合のみ平均を出すのでカウンタ更新
    if (Array.isArray((candidate as any).perRoundVP)) perRoundCounts++;

    valid++;
  }

  if (valid === 0) throw new Error('no valid metrics lines (skipped=' + skipped + ')');
  const avgVP = sumVP.map(v => v/valid);
  const vpVar = sumVP.map((_,i) => (sumVP2[i]/valid) - avgVP[i]*avgVP[i]);
  const winRate = wins.map(w => w/valid);
  const firstPlayerWinRate = winRate[0] ?? 0;

  // 平均ラウンド配列（Extendedがあった場合のみ）
  let perRoundVPAvg: number[][] | undefined;
  let perRoundBuildAvg: number[][] | undefined;
  if (perRoundCounts > 0) {
    perRoundVPAvg = perRoundVPSums.map(row => row.map(v => v / perRoundCounts));
    perRoundBuildAvg = perRoundBuildSums.map(row => row.map(v => v / perRoundCounts));
  }

  return {
    games: valid,
    skipped,
    players,
    seedBase: (minSeed===Infinity?undefined:minSeed),
    avgVP,
    vpVar,
    winRate,
    firstPlayerWinRate,
    actionTagHistogram: actionHist,
    perRoundVP: perRoundVPAvg,               // 追加
    perRoundBuildCounts: perRoundBuildAvg,    // 追加
    generatedAt: new Date().toISOString(),
  };
}

function stamp() { const d=new Date(); const p=(n:number)=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; }

function main() {
  const args = parseArgs();
  const file = args.file || latestRunFile();
  if (!file) throw new Error('log file not found');
  const lines = loadLines(file);
  const summary = aggregate(lines);
  try { mkdirSync('metrics'); } catch {}
  const outPath = `metrics/summary-${stamp()}.json`;
  writeFileSync(outPath, JSON.stringify(summary, null, 2));
  // 最新リンクファイル
  try { writeFileSync('metrics/summary-latest.json', JSON.stringify(summary, null, 2)); } catch {}
  console.log(JSON.stringify({ file: outPath, ...summary }));
}

main();
