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

  for (const raw of lines) {
    if (!raw) { skipped++; continue; }
    // 新/旧ログ形式対応: metrics ネストがあればそれを利用
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
    valid++;
  }

  if (valid === 0) throw new Error('no valid metrics lines (skipped=' + skipped + ')');
  const avgVP = sumVP.map(v => v/valid);
  const vpVar = sumVP.map((_,i) => (sumVP2[i]/valid) - avgVP[i]*avgVP[i]);
  const winRate = wins.map(w => w/valid);
  const firstPlayerWinRate = winRate[0] ?? 0;
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
  console.log(JSON.stringify({ file: outPath, ...summary }));
}

main();
