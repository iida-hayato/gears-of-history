import React from 'react';
import type {BoardProps} from 'boardgame.io/react';
import {
    BUILD_TYPE_ORDER, BuildType,
    foodByPlayer,
    freeLeadersAvailable, freeLeadersRaw,
    gearByPlayer,
    GState,
    laborRequiredByPlayer, persistentAvailableCostByPlayer, persistentAvailableLeaderByPlayer
} from '../game/types';
import {availableCost, buildActionsThisRound, inventActionsThisRound} from '../game/types';
import {Simulate} from "react-dom/test-utils";
import play = Simulate.play;

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
                <h3>政策リング（ラウンド:{G.round}）</h3>
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
                <b>プレイヤー {ctx.currentPlayer}の手番 手元コマ数{freeLeadersAvailable(G.players[ctx.currentPlayer])}</b>
                {ctx.phase === 'policy' && myID === ctx.currentPlayer && (
                    <div style={{marginTop: 8}}>
                        <b>政策フェーズ操作</b>
                        <div>
                          {Array.from({length: freeLeadersAvailable(me)-1}, (_,i) => i+1).map(s => (
                            <button key={s} onClick={() => (moves as any).investAndMove(s)}>+{s}</button>
                          ))}
                          {freeLeadersAvailable(me) === 0 && <button onClick={()=> (moves as any).endPolicyTurn()}>投入不可</button>}
                        </div>
                        <p>投入する指導者コマの数を選択</p>
                        <p>少なくとも1つのコマを投入する。少なくとも1つのコマを手元に残す。</p>
                    </div>
                )}
            </section>
            <section>
                <h3>市場</h3>
                {(() => {
                    // 残回数とタイプ別在庫
                    const remainInvent = (G._inventRemaining as any)?.[myID] ?? 0;             // ※コメント3：残回数表示
                    const remainBuild = (G._buildRemaining as any)?.[myID] ?? 0;
                    const budget       = (G._buildBudget      as any)?.[myID] ?? 0;
                    const byType: Record<string, { deck: number; faceUp:number, cards: any[] ,faceUpCards: any[] }> = {};
                    for (const c of G.market.techMarket) {
                        const k = (c.buildType ?? 'Land') as string;
                        (byType[k] ??= { deck: 0,faceUp:0, cards: [],faceUpCards: [] }).cards.push(c);
                    }
                    for (const c of G.market.techDeck) {
                        const k = (c.buildType ?? 'Land') as string;
                        (byType[k] ??= { deck: 0,faceUp:0, cards: [],faceUpCards: [] }).deck++;
                    }
                    // 表の知識庫（公開情報）も集計
                    for (const c of (G.market as any).techFaceUp ?? []) {
                      const k = (c.buildType ?? 'Land') as string;
                      (byType[k] ??= { deck: 0, faceUp: 0, cards: [], faceUpCards: [] });
                      byType[k].faceUp++;
                      byType[k].faceUpCards.push(c);
                    }
                    const typeKeys: string[] = [
                           ...BUILD_TYPE_ORDER.filter(k => byType[k]),                                  // BuildType[] → string[]へ
                           ...Object.keys(byType).filter(k => !BUILD_TYPE_ORDER.includes(k as BuildType)).sort(),
                    ];
                    return (
                        <div style={{ width: 640}}>
                            {ctx.phase === 'invention' && myID === ctx.currentPlayer && (
                                <div style={{ marginTop: 6 }}>
                                    残り発明回数: {remainInvent}
                                    <br/>
                                    残り利用可能コスト: {budget}（最大: {availableCost(me)}）
                                </div>
                            )}
                            {ctx.phase === 'build' && myID === ctx.currentPlayer && (
                                <div style={{ marginTop: 6 }}>
                                    残り建築回数: {remainBuild}
                                    <br/>
                                    残り利用可能コスト: {budget}（最大: {availableCost(me)}）
                                    <br/>
                                    <button onClick={() => (moves as any).endBuildTurn(myID)} >建築完了</button>
                                </div>
                            )}
                            {/* グループ表示（タイプごとに id で昇順） */}
                            {typeKeys.map(k => {
                                const cards = [...byType[k].cards].sort((a,b) =>
                                    a.id.localeCompare(b.id)
                                );
                                return (
                                    <div key={k} style={{ margin: '8px 0', padding: 8, border: '1px solid #ddd', borderRadius: 8 }}>
                                        <div style={{ display:'flex', justifyContent:'space-between' }}>
                                            <div><b>{k}</b></div>
                                             <div style={{ fontSize:12, opacity:.7 }}>
                                               山札: {byType[k].deck}／表: {byType[k].faceUp}
                                             </div>
                                        </div>
                                        {ctx.phase === 'invention' && myID === ctx.currentPlayer && (
                                            <div>
                                                <button
                                                    onClick={() => (moves as any).inventType(k)}
                                                    disabled={remainInvent<=0 || (byType[k].deck + byType[k].faceUp) <= 0}
                                                >
                                                    公開（{k}）
                                                </button>
                                            </div>
                                        )}
                                            <>
                                                <div style={{ fontSize:12, opacity:.8, marginBottom:4 }}>表の知識庫（公開情報）</div>
                                                {!!byType[k].faceUp && (
                                                <ul style={{ margin: 0 }}>
                                                    {byType[k].faceUpCards
                                                        .slice()
                                                        .sort((a,b)=> a.id.localeCompare(b.id))
                                                        .map((c,i)=>(
                                                            <li key={`${c.id}:fu:${i}`}>
                                                                {c.name}<br/>
                                                                {c.description}<br/>
                                                                勝利点: {c.vp}<br/>
                                                                コスト: {c.cost}
                                                                </li>
                                                        ))
                                                    }
                                                </ul>
                                                )}
                                                <hr style={{ margin: '8px 0', border: 0, borderTop: '1px dashed #bbb' }} />
                                            </>
                                        <div style={{ fontSize:12, opacity:.8, marginBottom:4 }}>発明済みの知識</div>
                                        <ul style={{ margin: '6px 0' }}>
                                            {cards.map((c,index) => (
                                                <li key={`${c.id}:${index}`}>
                                                    {c.name}<br/>
                                                    {c.description}<br/>
                                                    勝利点: {c.vp}<br/>
                                                    コスト: {c.cost}<br/>
                                                    {ctx.phase === 'build' && myID === ctx.currentPlayer && (
                                                        <button onClick={() => (moves as any).buildFromMarket(c.id)}
                                                                disabled={remainBuild<=0 || budget < c.cost}
                                                                style={{marginLeft: 8}}>建築</button>
                                                    )}
                                                </li>
                                            ))}
                                            {cards.length === 0 && <li style={{ opacity:.6 }}>（なし）</li>}
                                        </ul>
                                    </div>
                                );
                            })}
                            <div style={{ margin: '8px 0', padding: 8, border: '1px solid #ddd', borderRadius: 8 }}>
                                <b>七不思議(建築可能):</b>
                                <ul>
                                    {G.market.wonderMarket.map(w => (
                                        <li key={w.id}>
                                            [時代{(w as any).era}] {w.name}<br/>
                                            <div style={{fontSize:12,opacity:.8}}>
                                                {(w.effects ?? []).map((ef:any, j:number) => (
                                                    <span key={`${w.id}:ef:${j}`}>{fmtEffect(ef)} </span>
                                                ))}
                                            </div>
                                            勝利点: {w.vp}<br/>
                                            コスト: {w.cost}<br/>
                                            {ctx.phase === 'build' && myID === ctx.currentPlayer && (
                                                <button
                                                    onClick={() => (moves as any).buildWonderFromMarket(w.id)}
                                                    disabled={remainBuild<=0 || budget < w.cost}
                                                    style={{ marginLeft: 8 }}
                                                >建築</button>
                                            )}
                                        </li>
                                    ))}
                                    {G.market.wonderMarket.length === 0 && <li style={{ opacity:.6 }}>（なし）</li>}
                                </ul>
                            </div>
                        </div>
                    );
                })()}
            </section>
            <section>
                <h3>七不思議（公開情報セクション）</h3>
                {(() => {
                    // 現在公開中の時代（R2〜4:1 / R5〜7:2 / R8〜:3）
                    const eraNow = G.round >= 9 ? 3 : G.round >= 6 ? 2 : G.round >= 3 ? 1 : 0;
                    const eraLabel = (e:number) =>
                        e === eraNow ? '公開中'
                            : e < eraNow   ? '消滅'
                                : '未公開';
                    const listForEra = (e:1|2|3) =>
                        (e === eraNow ? G.market.wonderMarket : G.market.wondersByEra[e]) ?? [];

                    
                    return (
                        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                            {[1,2,3].map((e) => {
                                const era = e as 1|2|3;
                                const round = era === 1 ? 3 : era === 2 ? 6 : 8;
                                const arr = listForEra(era);
                                const faded = era < eraNow;
                                return (
                                    <div key={`era-${era}`} style={{border:'1px solid #ddd',borderRadius:8,padding:8,opacity:faded?0.6:1}}>
                                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                            <b>時代: {era} </b>
                                            <span style={{fontSize:12,opacity:.7}}>（ラウンド{round}〜）</span>
                                            <span style={{fontSize:12,opacity:.8}}>{eraLabel(era)}</span>
                                        </div>
                                        <ul style={{margin:'6px 0'}}>
                                            {arr.length ? arr.map((w:any, i:number) => (
                                                <li key={`${w.id}:${i}`}>
                                                    [{w.cost}] {w.name} <span style={{fontSize:12,opacity:.75}}>VP {w.vp}</span>
                                                    <div style={{fontSize:12,opacity:.8}}>
                                                        {(w.effects ?? []).map((ef:any, j:number) => (
                                                            <span key={`${w.id}:ef:${j}`}>{fmtEffect(ef)} </span>
                                                        ))}
                                                    </div>
                                                </li>
                                            )) : <li style={{opacity:.6}}>（なし）</li>}
                                        </ul>
                                        <div style={{fontSize:12,opacity:.7}}>
                                            {era === eraNow ? '※ この時代の7不思議は公開中（建築は別セクションで実施）。'
                                                : era < eraNow ? '※ 前時代の未建築は消滅しています。'
                                                    : '※ 未来のラインナップ（発明では出ません）。'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
            </section>
            <section>
                <h3>個人ボード (P{myID})</h3>
                <div>手元指導者コマ: {freeLeadersAvailable(me)}</div>
                <div>歯車: {gearByPlayer(me)}</div>
                <div>食料: {foodByPlayer(me)}</div>
                <div>利用可能コスト: {persistentAvailableCostByPlayer(me)}</div>
                <div>労働力拘束: {laborRequiredByPlayer(me)}</div>
                <div>指導者コマ(目安): {persistentAvailableLeaderByPlayer(me)}</div>
                <div>建築権(目安): {buildActionsThisRound(me)}</div>
                <div>発明権(目安): {inventActionsThisRound(me)}</div>
                <div>
                    <span>保留中の建築物: </span>
                    {me.pendingBuilt.length === 0 && <span style={{opacity:.6}}>（なし）</span>}
                    <ul>
                        {me.pendingBuilt.map(id => (
                            <li key={id}>
                                {G.cardById?.[id]?.name ?? id}<br/>
                            </li>
                        ))}
                    </ul>
                </div>
                {ctx.phase === 'cleanup' && myID === ctx.currentPlayer && (
                    <>
                    <button onClick={() => (moves as any).finalizeCleanup()}
                    disabled={persistentAvailableLeaderByPlayer(me)<2}
                    >クリンナップ確定</button>
                    {persistentAvailableLeaderByPlayer(me)<2 && <span style={{color:'red', marginLeft:8}}>※ 利用可能な指導者コマが2つ未満です！建物を裏返して要求労働力を減らしてください。</span>}
                    </>
                )}
                    
                <div>
                    <b>表</b>:
                    <ul>
                        {me.built.map(id => (
                            <li key={id}>
                                {G.cardById?.[id]?.name ?? id}<br/>
                                {G.cardById?.[id]?.description}<br/>
                                勝利点: {G.cardById?.[id]?.vp}<br/>
                                コスト: {G.cardById?.[id]?.cost}<br/>
                                {ctx.phase === 'cleanup' && myID === ctx.currentPlayer && (
                                    <button onClick={() => (moves as any).toggleFace(id)} style={{ marginLeft: 8 }}>
                                        裏にする
                                    </button>
                                )}
                            </li>
                        ))}
                        {me.built.length === 0 && <li style={{ opacity:.6 }}>（なし）</li>}
                    </ul>
                </div>
                <div>
                    <b>裏</b>:
                    <ul>
                        {me.builtFaceDown.map(id => (
                            <li key={id}>
                                {G.cardById?.[id]?.name ?? id}
                                {ctx.phase === 'cleanup' && myID === ctx.currentPlayer && (
                                    <button onClick={() => (moves as any).toggleFace(id)} style={{ marginLeft: 8 }}>
                                        表にする
                                    </button>
                                )}
                            </li>
                        ))}
                        {me.builtFaceDown.length === 0 && <li style={{ opacity:.6 }}>（なし）</li>}
                    </ul>
                    <div style={{ fontSize: 12, opacity: .7 }}>※ 7不思議は裏面不可</div>
                </div>
            </section>

            <hr/>
            <div>phase: {ctx.phase} / turn: {ctx.turn} / current: P{ctx.currentPlayer}さん</div>
        </div>
    );
}
const fmtEffect = (ef:any) => {
    const n = ef.amount >= 0 ? `+${ef.amount}` : `${ef.amount}`;
    if (ef.tag === 'gearDelta') return `歯車${n}}`;
    if (ef.tag === 'foodDelta') return `食料${n}`;
    if (ef.tag === 'buildActionsDelta') return `建築${n}`;
    if (ef.tag === 'inventActionsDelta') return `発明${n}`;
    if (ef.tag === 'laborReqDelta') return `労働要求${n}`;
    if (ef.tag === 'laborReduceDelta') return `労働削減${n}`;
    return JSON.stringify(ef);
};

