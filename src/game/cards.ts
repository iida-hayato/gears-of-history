// 最小限のサンプル
import type { PolicyCard, TechCard, WonderCard } from './types';

export const samplePolicies = (nPlayers: number): PolicyCard[] => {
  // プレイヤー人数+5枚
  const xs: PolicyCard[] = [
    { id: 'P-BUILD+2', name: '建築+2', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'buildActionsDelta', amount: 2, scope: 'round' }] },
    { id: 'P-GEAR+1',  name: '歯車+1(本ラウンド)', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'gearDelta', amount: 1, scope: 'round' }] },
    { id: 'P-INVENT+1',name: '発明+1', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'inventActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'P-LABOR-1', name: '労働拘束-1(本ラウンド)', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'laborReqDelta', amount: -1 }] },
    { id: 'P-FOOD+1',  name: '食料+1(本ラウンド)', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'foodDelta', amount: 1, scope: 'round' }] },
  ];
  // 足りない分はプレースホルダで埋める
  while (xs.length < nPlayers + 5) {
    xs.push({ id: `P-NOOP-${xs.length}`, name: '政策なし', kind: 'Policy', cost: 0, vp: 0, effects: [] });
  }
  return xs;
};

export const sampleTechDeck = (): TechCard[] => [
  { id: 'T-001', name: '小工房', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
  { id: 'T-002', name: '畑',   kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
  { id: 'T-003', name: '効率化', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'laborReduceDelta', amount: 1 }] },
  { id: 'T-004', name: '書記局', kind: 'Tech', cost: 2, vp: 2, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }, { tag: 'foodDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
  { id: 'T-005', name: '交易路', kind: 'Tech', cost: 0, vp: 0, effects: [{ tag: 'gearDelta', amount: 1, scope: 'round' }] },
];

export const sampleWondersByEra = (): Record<1 | 2 | 3, WonderCard[]> => ({
  1: [
    { id: 'W1-001', name: '巨神像', kind: 'Wonder', era: 1, cost: 2, vp: 3, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'W1-002', name: '大穀倉', kind: 'Wonder', era: 1, cost: 1, vp: 2, effects: [{ tag: 'foodDelta', amount: 1, scope: 'persistent' }] },
  ],
  2: [
    { id: 'W2-001', name: '大図書館', kind: 'Wonder', era: 2, cost: 3, vp: 5, effects: [{ tag: 'inventActionsDelta', amount: 1, scope: 'round' }] },
  ],
  3: [
    { id: 'W3-001', name: '空中庭園', kind: 'Wonder', era: 3, cost: 4, vp: 8, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }, { tag: 'foodDelta', amount: 1, scope: 'persistent' }] },
  ],
});
