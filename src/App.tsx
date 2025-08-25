import React from 'react'
import {Client} from 'boardgame.io/react'
import {GearsOfHistory} from './game/game'
import Board from './ui/Board'
import {Debug} from "boardgame.io/debug";
import { MetricsDashboard } from './components/MetricsDashboard';

const url = new URL(window.location.href);
const enableDebug =
    url.searchParams.has('debug') ||
    import.meta.env.MODE !== 'production';
const playerCount = 
    parseInt(url.searchParams.get('player') ?? "4");

const BGClient = Client({
    game: GearsOfHistory,
    board: Board,
    numPlayers: playerCount,
    debug: enableDebug ? {impl: Debug} : false,
})
export default function App() {
    const isDashboard = url.searchParams.has('dashboard');
    if (isDashboard) {
        const [path, setPath] = React.useState('metrics/summary-latest.json');
        return (
          <div style={{padding:16}}>
            <h1 style={{marginTop:0}}>Gears Metrics</h1>
            <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:12}}>
              <label style={{fontSize:12}}>Summary JSON Path:</label>
              <input style={{flex:1}} value={path} onChange={e=>setPath(e.target.value)} placeholder="/metrics/summary-2025....json" />
              <button onClick={()=>setPath(path)}>Reload</button>
            </div>
            <MetricsDashboard summaryPath={path} />
            <div style={{marginTop:24, fontSize:12, opacity:0.6}}>
              URL に ?dashboard=1 を付けずにアクセスすると通常のゲームクライアントが表示されます。
            </div>
          </div>
        );
    }
    return <BGClient playerID={'0'}/>
}