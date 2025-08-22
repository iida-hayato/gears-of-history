import React from 'react'
import { Client } from 'boardgame.io/react'
import { GearsOfHistory } from './game/game'
import Board from './ui/Board'

const BGClient = Client({ game: GearsOfHistory, board: Board, numPlayers: 4 })
export default function App(){ return <BGClient playerID={'0'} /> }