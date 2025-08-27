import { Client } from 'boardgame.io';
import { GearsOfHistory } from '../game/game';
import type { BuildType } from '../game/types';

async function main() {
  const cli = Client({ game: GearsOfHistory, numPlayers: 3 });
  cli.start();

  // 政策フェーズ: 各プレイヤーが1投資
  for (let i = 0; i < 3; i++) {
    cli.updatePlayerID(String(i));
    // investAndMove が内部で events.endTurn() を呼ぶため endPolicyTurn は不要
    cli.moves.investAndMove?.(1);
  }

  // 発明フェーズ: 各プレイヤーが残回数だけ Land を公開
  const types: BuildType[] = ['Land','FoodFacility','ProdFacility','Infrastructure','Government'];
  for (let i = 0; i < 3; i++) {
    const pid = String(i);
    cli.updatePlayerID(pid);
    while (true) {
      const state: any = cli.getState();
      const remain = state?.G?._inventRemaining?.[pid] ?? 0;
      if (remain <= 0) break;
      const t = types[0];
      cli.moves.inventType?.(t);
    }
  }

  // 建築フェーズ: P0 が市場最安を1枚試行
  cli.updatePlayerID('0');
  let s0: any = cli.getState();
  const firstCard = s0.G.market.techMarket[0]?.id;
  if (firstCard) {
    cli.moves.buildFromMarket?.(firstCard);
  }
  cli.moves.endBuildTurn?.();
  cli.updatePlayerID('1'); cli.moves.endBuildTurn?.();
  cli.updatePlayerID('2'); cli.moves.endBuildTurn?.();

  // クリンナップ
  for (let i = 0; i < 3; i++) {
    cli.updatePlayerID(String(i));
    cli.moves.finalizeCleanup?.();
  }

  const end: any = cli.getState();
  console.log('Round:', end.G.round);
  console.log('TechMarket size:', end.G.market.techMarket.length);
  console.log('P0 built:', end.G.players['0'].built);
}

main();
