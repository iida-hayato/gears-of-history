/** baseline との差分計算。初回は baseline を作成。
 * usage: tsx tools/compare-baseline.ts [--baseline metrics/baseline.json] [--summary metrics/summary-x.json]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';

function parseArgs() {
  const a = process.argv.slice(2);
  const out: any = { baseline: 'metrics/baseline.json' };
  for (let i=0;i<a.length;i++) if (a[i].startsWith('--')) { const k=a[i].slice(2); out[k]=a[i+1] && !a[i+1].startsWith('--') ? (a[++i]) : true; }
  return out;
}

function latestSummary(): string | null {
  try {
    const files = readdirSync('metrics').filter(f => f.startsWith('summary-') && f.endsWith('.json'));
    if (!files.length) return null;
    files.sort((a,b) => statSync(join('metrics', b)).mtimeMs - statSync(join('metrics', a)).mtimeMs);
    return join('metrics', files[0]);
  } catch { return null; }
}

function diffObj(base: any, cur: any) {
  const out: any = {};
  const keys = Array.from(new Set([...Object.keys(base), ...Object.keys(cur)]));
  for (const k of keys) {
    const bv = base[k];
    const cv = cur[k];
    if (Array.isArray(bv) && Array.isArray(cv)) {
      out[k] = bv.map((v,i) => ({ base: v, cur: cv[i], delta: (cv[i]??0) - v }));
    } else if (typeof bv === 'number' && typeof cv === 'number') {
      out[k] = { base: bv, cur: cv, delta: cv - bv };
    } else if (typeof bv === 'object' && typeof cv === 'object' && bv && cv) {
      const inner: any = {};
      const ks = Array.from(new Set([...Object.keys(bv), ...Object.keys(cv)]));
      for (const kk of ks) {
        if (typeof (bv as any)[kk] === 'number' && typeof (cv as any)[kk] === 'number') {
          inner[kk] = { base: (bv as any)[kk], cur: (cv as any)[kk], delta: (cv as any)[kk] - (bv as any)[kk] };
        }
      }
      out[k] = inner;
    }
  }
  return out;
}

function main() {
  const args = parseArgs();
  const summaryPath = args.summary || latestSummary();
  if (!summaryPath) throw new Error('summary not found');
  if (!existsSync(summaryPath)) throw new Error('summary file missing: '+summaryPath);
  const summary = JSON.parse(readFileSync(summaryPath,'utf-8'));
  const basePath = args.baseline;
  if (!existsSync(basePath)) {
    writeFileSync(basePath, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ baselineCreated: true, baseline: basePath }));
    return;
  }
  const baseline = JSON.parse(readFileSync(basePath,'utf-8'));
  const diff = diffObj(baseline, summary);
  console.log(JSON.stringify({ baselineCreated: false, baseline: basePath, summary: summaryPath, diff }));
}

main();

