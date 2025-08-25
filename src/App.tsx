import React from 'react'
import {Client} from 'boardgame.io/react'
import {GearsOfHistory} from './game/game'
import Board from './ui/Board'
import {Debug} from "boardgame.io/debug";

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
    return <BGClient playerID={'0'}/>
}