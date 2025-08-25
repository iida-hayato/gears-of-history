/** バッチシミュレーション CLI
 * usage: tsx src/sim/simBatch.ts --games 500 --seedBase 1000 --players 4
 * 出力: logs/run-YYYYMMDD-HHMMSS.jsonl
 */
import { mkdirSync, writeFileSync } from 'fs';
import { appendFileSync, existsSync } from 'fs';
import { runBatch } from './BatchRunner';
import { runGame } from './GameRunner';
import { performance } from 'perf_hooks';

interface Args { games: number; seedBase: number; players: number; }

function parseArgs(): Args {
  const a = process.argv.slice(2);
  const out: any = { games: 10, seedBase: 1000, players: 4 };
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) {
      const key = a[i].slice(2);
      const val = a[i + 1];
      if (val && !val.startsWith('--')) { out[key] = Number(val); i++; }
      else { out[key] = true; }
    }
  }
  return out as Args;
}

function nowStamp() {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function main() {
  const args = parseArgs();
  if (!existsSync('logs')) mkdirSync('logs');
  const stamp = nowStamp();
  const path = `logs/run-${stamp}-seed${args.seedBase}.jsonl`;
  writeFileSync(path, '');
  const t0 = performance.now();
  let count = 0;
  try {
    for (let i = 0; i < args.games; i++) {
      const seed = args.seedBase + i;
      const gStart = performance.now();
      try {
        const r = runGame({ seed, players: args.players });
        const line = { gameId: i, seed, players: args.players, metrics: r.metrics, durationMs: r.durationMs };
        appendFileSync(path, JSON.stringify(line) + '\n');
        count++;
        if ((i+1) % Math.max(1, Math.floor(args.games/10)) === 0) {
          const elapsed = performance.now() - t0;
          process.stdout.write(JSON.stringify({ progress: i+1, games: args.games, msPerGame: +(elapsed/(i+1)).toFixed(2) }) + '\n');
        }
      } catch (e: any) {
        const stateDur = performance.now() - gStart;
        const errLine = { gameId: i, seed, error: e?.message || String(e), durationMs: +stateDur.toFixed(3) };
        appendFileSync(path, JSON.stringify(errLine) + '\n');
        throw e;
      }
    }
  } catch (e) {
    const total = performance.now() - t0;
    console.error(JSON.stringify({ status: 'failed', completed: count, error: (e as any)?.message }));
    console.error('logFile=' + path);
    process.exit(1);
  }
  const t1 = performance.now();
  const avg = (t1 - t0) / Math.max(1, count);
  console.log(JSON.stringify({ file: path, games: count, msTotal: +(t1 - t0).toFixed(1), msPerGame: +avg.toFixed(3) }));
}

main().catch(e => { console.error(e); process.exit(1); });
