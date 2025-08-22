// 最小限のサンプル
import type { PolicyCard, TechCard, WonderCard } from './types';

export const samplePolicies = (nPlayers: number): PolicyCard[] => {
  // プレイヤー人数+5枚
  const xs: PolicyCard[] = [
    { id: 'P-BUILD+1', name:'工期短縮令' ,description: '建築+1', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'P-BUILD+2', name:'公共事業' ,description: '建築+2', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'buildActionsDelta', amount: 2, scope: 'round' }] },
    { id: 'P-GEAR+1',  name:'配給強化' ,description: '歯車+1', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'gearDelta', amount: 1, scope: 'round' }] },
    { id: 'P-GEAR+2',  name:'工業支援' ,description: '歯車+2', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'gearDelta', amount: 2, scope: 'round' }] },
    { id: 'P-INVENT+1',name:'特許布告' ,description: '発明+1', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'inventActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'P-INVENT+2',name:'研究支援' ,description: '発明+2', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'inventActionsDelta', amount: 2, scope: 'round' }] },
    { id: 'P-INVENT+3',name:'研究助成金' ,description: '発明+3', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'inventActionsDelta', amount: 3, scope: 'round' }] },
    { id: 'P-FOOD+1',  name:'農地開拓' ,description: '食料+1', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'foodDelta', amount: 1, scope: 'round' }] },
    { id: 'P-FOOD+2',  name:'食料支援' ,description: '食料+2', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'foodDelta', amount: 2, scope: 'round' }] },
  ];
  // 足りない分はプレースホルダで埋める
  while (xs.length < nPlayers + 5) {
    xs.push({ id: `P-NOOP-${xs.length}`, name: '政策なし', kind: 'Policy', cost: 0, vp: 0, effects: [] });
  }
  return xs.sort((a, b) => 0.5 - Math.random());
};

export const sampleTechDeck = (): TechCard[] => [
  { id: 'T-001', name: '小工房', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1,  }] },
  { id: 'T-002', name: '畑',   kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 ,}] },
  { id: 'T-003', name: '効率化', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'laborReduceDelta', amount: 1,  }] },
  { id: 'T-004', name: '書記局', kind: 'Tech', cost: 2, vp: 2, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }, { tag: 'foodDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
  { id: 'T-005', name: '交易路', kind: 'Tech', cost: 0, vp: 0, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }] },
];

export const sampleWondersByEra = (): Record<1 | 2 | 3, WonderCard[]> => ({
  1: [
    { id: 'W1-001', name: 'ギザの大ピラミッド', kind: 'Wonder', era: 1, cost: 3, vp: 3, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'W1-002', name: 'ロードスの巨神像', kind: 'Wonder', era: 1, cost: 3, vp: 2, effects: [{ tag: 'foodDelta', amount: 1, scope: 'persistent' }] },
  ],
  2: [
    { id: 'W2-001', name: 'ノートルダム大聖堂', kind: 'Wonder', era: 2, cost: 3, vp: 5, effects: [{ tag: 'inventActionsDelta', amount: 1, scope: 'round' }] },
  ],
  3: [
    { id: 'W3-001', name: 'ルーヴル美術館', kind: 'Wonder', era: 3, cost: 4, vp: 8, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }, { tag: 'foodDelta', amount: 1, scope: 'persistent' }] },
  ],
});
