import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid
} from 'recharts';

// Summary JSON 期待型 (aggregate.ts 出力)
interface SummaryData {
  games: number;
  players: number;
  seedBase?: number;
  avgVP: number[];
  vpVar?: number[];
  winRate: number[];
  firstPlayerWinRate: number;
  actionTagHistogram: Record<string, number>;
  generatedAt: string;
  // 拡張 (存在すれば利用)
  perRoundVP?: number[][];
  perRoundBuildCounts?: number[][];
  perRoundGears?: number[][]; // 平均ギア
  perRoundFood?: number[][];  // 平均食料
  perRoundFreeLeaders?: number[][]; // 平均フリー指導者数
  perRoundAvailableCost?: number[][]; // 平均利用可能コスト
}

const COLORS = ['#3366cc','#dc3912','#ff9900','#109618','#990099','#0099c6'];

async function fetchJSON(path: string) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`fetch failed: ${path}`);
  return res.json();
}

export const MetricsDashboard: React.FC<{ summaryPath: string; }> = ({ summaryPath }) => {
  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetchJSON(summaryPath)
      .then(json => { if (!cancel) { setData(json); setError(null);} })
      .catch(e => !cancel && setError(e.message))
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [summaryPath]);

  const vpRows = useMemo(() => data ? data.avgVP.map((v,i) => ({ player: `P${i}`, avgVP: v, winRate: data.winRate[i] })) : [], [data]);
  const actionPieData = useMemo(() => data ? Object.entries(data.actionTagHistogram || {}).map(([k,v]) => ({ name: k, value: v })) : [], [data]);

  const perRoundVP = useMemo(() => {
    if (!data?.perRoundVP) return [];
    return data.perRoundVP.map((row, r) => {
      const o: any = { round: r+1 };
      row.forEach((v,i) => { o[`P${i}`] = v; });
      return o;
    });
  }, [data]);

  const perRoundBuilds = useMemo(() => {
    if (!data?.perRoundBuildCounts) return [];
    return data.perRoundBuildCounts.map((row, r) => {
      const o: any = { round: r+1 };
      row.forEach((v,i) => { o[`P${i}`] = v; });
      return o;
    });
  }, [data]);

  const perRoundGears = useMemo(() => {
    if (!data?.perRoundGears) return [];
    return data.perRoundGears.map((row, r) => {
      const o: any = { round: r+1 };
      row.forEach((v,i) => { o[`P${i}`] = v; });
      return o;
    });
  }, [data]);

  const perRoundFood = useMemo(() => {
    if (!data?.perRoundFood) return [];
    return data.perRoundFood.map((row, r) => {
      const o: any = { round: r+1 };
      row.forEach((v,i) => { o[`P${i}`] = v; });
      return o;
    });
  }, [data]);

  const perRoundFreeLeaders = useMemo(() => {
    if (!data?.perRoundFreeLeaders) return [];
    return data.perRoundFreeLeaders.map((row, r) => {
      const o: any = { round: r+1 };
      row.forEach((v,i) => { o[`P${i}`] = v; });
      return o;
    });
  }, [data]);

  const perRoundAvailableCost = useMemo(() => {
    if (!data?.perRoundAvailableCost) return [];
    return data.perRoundAvailableCost.map((row, r) => {
      const o: any = { round: r+1 };
      row.forEach((v,i) => { o[`P${i}`] = v; });
      return o;
    });
  }, [data]);

  if (loading) return <div style={{padding:16}}>Loading metrics...</div>;
  if (error) return <div style={{padding:16, color:'red'}}>Error: {error}</div>;
  if (!data) return null;

  return (
    <div style={{ fontFamily:'sans-serif', padding:16, display:'grid', gap:24 }}>
      <h2>Simulation Metrics Dashboard</h2>
      <div style={{fontSize:12, opacity:0.8}}>Games: {data.games} / Players: {data.players} / SeedBase: {data.seedBase ?? '-'} / Generated: {data.generatedAt}</div>

      <section style={{display:'grid', gap:24, gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))'}}>
        <div>
          <h3>平均VP & 勝率</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={vpRows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="player" />
              <YAxis yAxisId="vp" label={{ value: 'Avg VP', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="win" orientation="right" domain={[0,1]} tickFormatter={(v)=> (v*100).toFixed(0)+'%'} label={{ value: 'Win %', angle: 90, position: 'insideRight' }} />
              <Tooltip formatter={(val:any, key:any)=> key==='winRate' ? [(val*100).toFixed(1)+'%','winRate'] : [val,key]} />
              <Legend />
              <Bar yAxisId="vp" dataKey="avgVP" fill="#4285F4" name="Avg VP" />
              <Bar yAxisId="win" dataKey="winRate" fill="#DB4437" name="Win Rate" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3>アクション頻度</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={actionPieData} dataKey="value" nameKey="name" outerRadius={90} label>
                {actionPieData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      {perRoundVP.length > 0 && (
        <section>
          <h3>ラウンド別 VP 推移</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={perRoundVP}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="round" />
              <YAxis />
              <Tooltip />
              <Legend />
              {data.avgVP.map((_,i) => <Line key={i} type="monotone" dataKey={`P${i}`} stroke={COLORS[i%COLORS.length]} dot={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {perRoundBuilds.length > 0 && (
        <section>
          <h3>ラウンド別 新規建築枚数</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={perRoundBuilds}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="round" />
              <YAxis />
              <Tooltip />
              <Legend />
              {data.avgVP.map((_,i) => <Bar key={i} dataKey={`P${i}`} stackId="b" fill={COLORS[i%COLORS.length]} />)}
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {(perRoundGears.length > 0 || perRoundFood.length > 0) && (
        <section style={{display:'grid', gap:24, gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))'}}>
          {perRoundGears.length > 0 && (
            <div>
              <h3>ラウンド別 ギア生産 (平均)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={perRoundGears}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="round" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {data.avgVP.map((_,i) => <Line key={i} type="monotone" dataKey={`P${i}`} stroke={COLORS[i%COLORS.length]} dot={false} />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {perRoundFood.length > 0 && (
            <div>
              <h3>ラウンド別 食料生産 (平均)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={perRoundFood}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="round" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {data.avgVP.map((_,i) => <Line key={i} type="monotone" dataKey={`P${i}`} stroke={COLORS[i%COLORS.length]} dot={false} />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {perRoundFreeLeaders.length > 0 && (
            <div>
              <h3>ラウンド別 フリー指導者数 (平均)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={perRoundFreeLeaders}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="round" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {data.avgVP.map((_,i) => <Line key={i} type="monotone" dataKey={`P${i}`} stroke={COLORS[i%COLORS.length]} dot={false} />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {perRoundAvailableCost.length > 0 && (
            <div>
              <h3>ラウンド別 利用可能コスト (平均)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={perRoundAvailableCost}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="round" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {data.avgVP.map((_,i) => <Line key={i} type="monotone" dataKey={`P${i}`} stroke={COLORS[i%COLORS.length]} dot={false} />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
