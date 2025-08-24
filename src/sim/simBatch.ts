/** バッチシミュレーション CLI
 * usage: tsx src/sim/simBatch.ts --games 500 --seedBase 1000 --players 4
 * 出力: logs/run-YYYYMMDD-HHMMSS.jsonl
 */
import { mkdirSync, writeFileSync } from 'fs';
import { appendFileSync, existsSync } from 'fs';
import { runBatch } from './BatchRunner';
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
  const results = runBatch({ games: args.games, seedBase: args.seedBase, numPlayers: args.players });
  for (const r of results) {
    appendFileSync(path, JSON.stringify(r) + '\n');
  }
  const t1 = performance.now();
  const avg = (t1 - t0) / args.games;
  console.log(JSON.stringify({ file: path, games: args.games, msTotal: +(t1 - t0).toFixed(1), msPerGame: +avg.toFixed(3) }));
}

main().catch(e => { console.error(e); process.exit(1); });

