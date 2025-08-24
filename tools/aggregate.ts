/** JSONL ゲームメトリクスを集計し summary 出力 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';

interface SingleGameMetrics { playerVP: number[]; winnerIds: string[]; players: number; actionTagHistogram: Record<string, number>; firstPlayerId: string; }

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

function loadLines(path: string): SingleGameMetrics[] {
  const raw = readFileSync(path,'utf-8').trim().split(/\n+/).filter(Boolean);
  return raw.map(l => JSON.parse(l));
}

function aggregate(ms: SingleGameMetrics[]) {
  if (!ms.length) throw new Error('no metrics');
  const players = ms[0].players;
  const games = ms.length;
  const sumVP = Array(players).fill(0);
  const sumVP2 = Array(players).fill(0);
  const wins = Array(players).fill(0);
  const actionHist: Record<string, number> = {};
  let minSeed = Infinity;
  for (const g of ms) {
    // @ts-ignore seed フィールド存在 (型補完簡略)
    const seed = (g as any).seed as number | undefined;
    if (typeof seed === 'number' && seed < minSeed) minSeed = seed;
    g.playerVP.forEach((v,i) => { sumVP[i]+=v; sumVP2[i]+=v*v; });
    g.winnerIds.forEach(id => { const idx = +id; if (!isNaN(idx)) wins[idx] += 1; });
    for (const [k,v] of Object.entries(g.actionTagHistogram)) actionHist[k] = (actionHist[k] ?? 0) + v;
  }
  const avgVP = sumVP.map(s => s/games);
  const vpVar = sumVP.map((_,i) => (sumVP2[i]/games) - avgVP[i]*avgVP[i]);
  const winRate = wins.map(w => w/games);
  const firstPlayerWinRate = winRate[0] ?? 0;
  const summary = {
    games, players, seedBase: (minSeed===Infinity?undefined:minSeed), avgVP, vpVar, winRate, firstPlayerWinRate,
    actionTagHistogram: actionHist,
    generatedAt: new Date().toISOString(),
  };
  return summary;
}

function stamp() { const d=new Date(); const p=(n:number)=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; }

function main() {
  const args = parseArgs();
  const file = args.file || latestRunFile();
  if (!file) throw new Error('log file not found');
  const ms = loadLines(file);
  const summary = aggregate(ms);
  try { mkdirSync('metrics'); } catch {}
  const outPath = `metrics/summary-${stamp()}.json`;
  writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ file: outPath, ...summary }));
}

main();
