import { Client } from 'boardgame.io/client';
import { GearsOfHistory } from '../game/game';

async function main() {
  const cli = Client({ game: GearsOfHistory, numPlayers: 3 });
  cli.start();

  // ラウンド1: 各プレイヤーが政策+1 → 確定
  for (let i = 0; i < 3; i++) {
    cli.updatePlayerID(String(i));
    cli.moves.investAndMove?.(1);
    cli.moves.endPolicyTurn?.();
  }

  // 発明: P0 が2枚、P1が1枚を市場へ
  cli.updatePlayerID('0'); cli.moves.inventToMarket?.(2); cli.moves.endInventionTurn?.();
  cli.updatePlayerID('1'); cli.moves.inventToMarket?.(1); cli.moves.endInventionTurn?.();
  cli.updatePlayerID('2'); cli.moves.inventToMarket?.(0); cli.moves.endInventionTurn?.();

  // 建築: P0が最安を1枚
  const s0 = cli.getState();
  const firstCard = s0.G.market.techMarket[0]?.id;
  if (firstCard) {
    cli.updatePlayerID('0');
    cli.moves.buildFromMarket?.(firstCard);
    cli.moves.endBuildTurn?.();
  }
  cli.updatePlayerID('1'); cli.moves.endBuildTurn?.();
  cli.updatePlayerID('2'); cli.moves.endBuildTurn?.();

  // クリンナップ
  for (let i = 0; i < 3; i++) {
    cli.updatePlayerID(String(i));
    cli.moves.finalizeCleanup?.();
  }

  const end = cli.getState();
  console.log('Round:', end.G.round);
  console.log('TechMarket size:', end.G.market.techMarket.length);
  console.log('P0 built:', end.G.players['0'].built);
}

main();
