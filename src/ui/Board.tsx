import React from 'react';
import type {BoardProps} from 'boardgame.io/react';
import {freeLeadersAvailable, GState} from '../game/types';
import {availableCost, buildActionsThisRound, inventActionsThisRound} from '../game/types';

export default function Board({G, ctx, moves, playerID}: BoardProps<GState>) {
    const myID = (playerID as string | undefined) ?? (ctx.currentPlayer as string | undefined) ?? '0';
    const me = G.players[myID];
    const ord = G.order;
    if (!me) return <div style={{padding: 16}}>Loading... (player={String(myID)})</div>;
    // プレイヤーごとの色（P0..）：色弱にもある程度配慮（青/緑/橙/赤/紫/青緑）
    const PLAYER_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];
    const colorByPlayer = React.useMemo(
        () => Object.fromEntries(G.order.map((pid, i) => [pid, PLAYER_COLORS[i % PLAYER_COLORS.length]])),
        [G.order]
    );
    return (
        <div style={{padding: 16, fontFamily: 'system-ui, sans-serif'}}>
            <section>
                <h3>政策リング（start:{G.ring.startMarkerIndex}）</h3>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8}}>
                    {(() => {
                        const n = G.ring.policyDeck.length;
                        const size = 640; // 直径
                        const r = size / 2 - 60; // 半径（カード分の余白）
                        const cx = size / 2, cy = size / 2;
                        return (
                            <div style={{ position: 'relative', width: size, height: size, margin: '8px auto', borderRadius: '50%', border: '1px dashed #bbb' }}>
                                {/* 円周上に等間隔配置 */}
                                {G.ring.policyDeck.map((card, idx) => {
                                    const isStart = idx === G.ring.startMarkerIndex;
                                    const occupants = Object.values(G.players).filter(p => p.policyPos === idx).map(p => p.id);
                                    const angle = (idx / n) * Math.PI * 2 - Math.PI / 2; // 12時基準
                                    const x = cx + r * Math.cos(angle);
                                    const y = cy + r * Math.sin(angle);
                                    return (
                                        <div key={card.id} style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)' }}>
                                            <div style={{
                                                width: 120,
                                                border: `2px solid ${isStart ? '#2b6cb0' : '#999'}`,
                                                padding: 8,
                                                borderRadius: 8,
                                                background: isStart ? 'rgba(66,153,225,0.08)' : 'white',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                                            }}>
                                                {isStart && (
                                                    <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 12, padding: '2px 6px', borderRadius: 12, border: '1px solid #2b6cb0', background: '#fff' }}>START</div>
                                                )}
                                                <div><b>{idx}</b> {card.name}</div>
                                                <div style={{ fontSize: 12, opacity: .8 }}>{card.description}</div>
                                                {/* 占有トークン（プレイヤー色の丸） */}
                                                <div style={{
                                                    display: 'flex',
                                                    gap: 6,
                                                    alignItems: 'center',
                                                    marginTop: 6
                                                }}>
                                                    {occupants.length === 0
                                                        ? <span style={{fontSize: 12, opacity: .5}}>空</span>
                                                        : occupants.map(pid => (
                                                            <>
                                                            <span key={pid} title={`P${pid}`}
                                                                  style={{
                                                                      width: 12,
                                                                      height: 12,
                                                                      borderRadius: '50%',
                                                                      background: colorByPlayer[pid],
                                                                      border: '1px solid rgba(0,0,0,.25)'
                                                                  }}
                                                            /><p>{pid}</p>
                                                            </>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* 回転方向ヒント */}
                                <div style={{ position: 'absolute', left: 8, top: 8, fontSize: 12, opacity: .6 }}>↻ 時計回り</div>
                            </div>
                        );
                    })()}
                </div>
                <b>プレイヤー {ctx.currentPlayer}の手番</b>
                {ctx.phase === 'policy' && (
                    <div style={{marginTop: 8}}>
                        <b>政策フェーズ操作</b>
                        <div>
                          {Array.from({length: freeLeadersAvailable(me)-1}, (_,i) => i+1).map(s => (
                            <button key={s} onClick={() => (moves as any).investAndMove(s)}>+{s}</button>
                          ))}
                          {freeLeadersAvailable(me) === 0 && <button onClick={()=> (moves as any).endPolicyTurn()}>投入不可</button>}
                        </div>
                        <p>投入する指導者コマの数を選択 コマ数 {freeLeadersAvailable(me)}</p>
                        <p>少なくとも1つのコマを投入する。少なくとも1つのコマを手元に残す。</p>
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
