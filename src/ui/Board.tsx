import React from 'react';
import type {BoardProps} from 'boardgame.io/react';
import type {GState} from '../game/types';
import {availableCost, buildActionsThisRound, inventActionsThisRound} from '../game/types';

export default function Board({G, ctx, moves, playerID}: BoardProps<GState>) {
    const myID = (playerID as string | undefined) ?? (ctx.currentPlayer as string | undefined) ?? '0';
    const me = G.players[myID];
    const ord = G.order;
    if (!me) return <div style={{padding: 16}}>Loading... (player={String(myID)})</div>;
    return (
        <div style={{padding: 16, fontFamily: 'system-ui, sans-serif'}}>
            $1
            <section>
                <h3>政策リング（start:{G.ring.startMarkerIndex}）</h3>
                <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                    {G.ring.policyDeck.map((c, i) => (
                        <div key={c.id} style={{border: '1px solid #888', padding: 8, borderRadius: 8, minWidth: 140}}>
                            <div><b>{i}</b> {c.name}</div>
                            <div>効果: {c.effects.map(e => e.tag).join(', ') || 'なし'}</div>
                            <div>占有: {ord.filter(pid => G.players[pid].policyPos === i).join(', ') || '-'}</div>
                        </div>
                    ))}
                </div>
                {ctx.phase === 'policy' && myID === ctx.currentPlayer && (
                    <div style={{marginTop: 8}}>
                        <b>政策フェーズ操作</b>
                        <div>
                            <button onClick={() => (moves as any).investAndMove(1)}>+1</button>
                            <button onClick={() => (moves as any).investAndMove(2)}>+2</button>
                            <button onClick={() => (moves as any).investAndMove(3)}>+3</button>
                            <button onClick={() => (moves as any).endPolicyTurn()}>確定</button>
                        </div>
                    </div>
                )}
            </section>
            <section>
                <h3>市場</h3>
                <div>
                    <b>Tech Market:</b>
                    <ul>
                        {G.market.techMarket.map(c => (
                            <li key={c.id}>
                                [{c.cost}] {c.name}
                                {ctx.phase === 'build' && playerID === ctx.currentPlayer && (
                                    <button onClick={() => (moves as any).buildFromMarket(c.id)}
                                            style={{marginLeft: 8}}>建築</button>
                                )}
                            </li>
                        ))}
                    </ul>
                    {ctx.phase === 'invention' && playerID === ctx.currentPlayer && (
                        <div>
                            <button onClick={() => (moves as any).inventToMarket(1)}>発明+1</button>
                            <button onClick={() => (moves as any).inventToMarket(2)}>発明+2</button>
                            <button onClick={() => (moves as any).endInventionTurn()}>確定</button>
                        </div>
                    )}
                </div>
            </section>

            <section>
                <h3>あなたの状態 (P{playerID})</h3>
                <div>利用可能コスト: {availableCost(me)}</div>
                <div>建築権(目安): {buildActionsThisRound(me)}</div>
                <div>発明権(目安): {inventActionsThisRound(me)}</div>
                <div>表: {me.built.join(', ') || '-'}</div>
                <div>pending: {me.pendingBuilt.join(', ') || '-'}</div>
                {ctx.phase === 'cleanup' && (
                    <button onClick={() => (moves as any).finalizeCleanup()}>クリンナップ確定</button>
                )}
            </section>

            <hr/>
            <div>phase: {ctx.phase} / turn: {ctx.turn} / current: P{ctx.currentPlayer}</div>
        </div>
    );
}
