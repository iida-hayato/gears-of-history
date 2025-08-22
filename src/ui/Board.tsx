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
            <section>
                <h3>政策リング（start:{G.ring.startMarkerIndex}）</h3>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8}}>
                    {G.ring.policyDeck.map((card, idx) => {
                        const isStart = idx === G.ring.startMarkerIndex;
                        const occupants = Object.values(G.players).filter(p => p.policyPos === idx).map(p => p.id);
                        return (
                            <div
                                key={card.id}
                                style={{
                                    border: `2px solid ${isStart ? '#2b6cb0' : '#999'}`,
                                    padding: 8,
                                    borderRadius: 8,
                                    position: 'relative',
                                    background: isStart ? 'rgba(66,153,225,0.08)' : undefined,
                                }}
                            >
                                {isStart && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 6,
                                        right: 6,
                                        fontSize: 12,
                                        padding: '2px 6px',
                                        borderRadius: 12,
                                        border: '1px solid #2b6cb0'
                                    }}>
                                        START
                                    </div>
                                )}
                                <div><b>{idx}</b> {card.name}</div>
                                <div>
                                    {card.effects.map((e, i) => (
                                        <div key={i}>{JSON.stringify(e)}</div>
                                    ))}
                                </div>
                                <div>占有: {occupants.length ? occupants.join(', ') : '-'}</div>
                            </div>
                        );
                    })}
                </div>
                {ctx.phase === 'policy' && (
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
                                {ctx.phase === 'build' && myID === ctx.currentPlayer && (
                                    <button onClick={() => (moves as any).buildFromMarket(c.id)}
                                            style={{marginLeft: 8}}>建築</button>
                                )}
                            </li>
                        ))}
                    </ul>
                    {ctx.phase === 'invention' && myID === ctx.currentPlayer && (
                        <div>
                            <button onClick={() => (moves as any).inventToMarket(1)}>発明+1</button>
                            <button onClick={() => (moves as any).inventToMarket(2)}>発明+2</button>
                            <button onClick={() => (moves as any).endInventionTurn()}>確定</button>
                        </div>
                    )}
                </div>
            </section>

            <section>
                <h3>あなたの状態 (P{myID})</h3>
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
            <div>phase: {ctx.phase} / turn: {ctx.turn} / current: P{ctx.currentPlayer}さん</div>
        </div>
    );
}
