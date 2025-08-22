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

export const landTechDeck = (): TechCard[] => [
    { id: 'T-L-000', name: '草原', buildType:'Land', description:'食料+1, 要求労働力+1', kind: 'Tech', cost: 0, vp: 0, effects: [{ tag: 'foodDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
    { id: 'T-L-000', name: '沿岸', buildType:'Land', description:'食料+1, 要求労働力+1', kind: 'Tech', cost: 0, vp: 0, effects: [{ tag: 'foodDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
    { id: 'T-L-000', name: '湿地', buildType:'Land', description:'食料+1, 要求労働力+1', kind: 'Tech', cost: 0, vp: 0, effects: [{ tag: 'foodDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
    { id: 'T-L-000', name: '森林', buildType:'Land', description:'歯車+1, 要求労働力+1', kind: 'Tech', cost: 0, vp: 0, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
    { id: 'T-L-000', name: '山岳', buildType:'Land', description:'歯車+1, 要求労働力+1', kind: 'Tech', cost: 0, vp: 0, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
    { id: 'T-L-000', name: '砂漠', buildType:'Land', description:'歯車+1, 要求労働力+1', kind: 'Tech', cost: 0, vp: 0, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
  ]

export const foodProductiveTechDeck = (): TechCard[] => [
  { id: 'T-F-001', name: '狩猟野営地', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
  { id: 'T-F-001', name: '狩猟野営地', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
  { id: 'T-F-001', name: '狩猟野営地', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
  { id: 'T-F-002', name: '水田', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
  { id: 'T-F-002', name: '水田', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
  { id: 'T-F-002', name: '水田', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
  { id: 'T-F-003', name: '輪栽農地', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
  { id: 'T-F-003', name: '輪栽農地', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
  { id: 'T-F-003', name: '輪栽農地', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
  { id: 'T-F-004', name: 'ビニールハウス農業', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
  { id: 'T-F-004', name: 'ビニールハウス農業', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
  { id: 'T-F-004', name: 'ビニールハウス農業', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
]

export const productiveTechDeck = (): TechCard[] => [
    { id: 'T-P-001', name: '伐採所', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
    { id: 'T-P-001', name: '伐採所', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
    { id: 'T-P-001', name: '伐採所', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
    { id: 'T-P-002', name: 'たたら製鉄場', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
    { id: 'T-P-002', name: 'たたら製鉄場', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
    { id: 'T-P-002', name: 'たたら製鉄場', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
    { id: 'T-P-003', name: '紡績工房', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
    { id: 'T-P-003', name: '紡績工房', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
    { id: 'T-P-003', name: '紡績工房', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
    { id: 'T-P-004', name: '機械工場', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
    { id: 'T-P-004', name: '機械工場', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
    { id: 'T-P-004', name: '機械工場', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta', amount: 1 }] },
]

export const infrastructureTechDeck = (): TechCard[] => [
    { id: 'T-I-001', name: '道路', buildType:'Infrastructure', description: '歯車-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'gearDelta', amount: -2, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-I-001', name: '道路', buildType:'Infrastructure', description: '歯車-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'gearDelta', amount: -2, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-I-002', name: '集落', buildType:'Infrastructure', description: '食料-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'foodDelta', amount: -2, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-I-002', name: '集落', buildType:'Infrastructure', description: '食料-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'foodDelta', amount: -2, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-I-003', name: '運河', buildType:'Infrastructure', description: '歯車-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'gearDelta', amount: -2, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-I-003', name: '運河', buildType:'Infrastructure', description: '歯車-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'gearDelta', amount: -2, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-I-004', name: '城下町', buildType:'Infrastructure', description: '食料-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'foodDelta', amount: -2, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-I-004', name: '城下町', buildType:'Infrastructure', description: '食料-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'foodDelta', amount: -2, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-I-005', name: '上下水道', buildType:'Infrastructure', description: '歯車-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'gearDelta', amount: -2, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-I-005', name: '上下水道', buildType:'Infrastructure', description: '歯車-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'gearDelta', amount: -2, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-I-006', name: '居住区', buildType:'Infrastructure', description: '食料-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'foodDelta', amount: -2, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-I-006', name: '居住区', buildType:'Infrastructure', description: '食料-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'foodDelta', amount: -2, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-I-007', name: '鉄道', buildType:'Infrastructure', description: '歯車-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'gearDelta', amount: -2, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-I-007', name: '鉄道', buildType:'Infrastructure', description: '歯車-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'gearDelta', amount: -2, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-I-008', name: '集合住宅地', buildType:'Infrastructure', description: '食料-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'foodDelta', amount: -2, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-I-008', name: '集合住宅地', buildType:'Infrastructure', description: '食料-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'foodDelta', amount: -2, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
]

export const governmentTechDeck = (): TechCard[] => [
    { id: 'T-G-001', name:'宮殿', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-G-001', name:'宮殿', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-G-002', name:'城', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-G-002', name:'城', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-G-003', name:'市庁舎', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-G-003', name:'市庁舎', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-G-004', name:'議会', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-G-004', name:'議会', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-G-005', name:'立法府', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-G-005', name:'立法府', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-G-006', name:'国会', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
    { id: 'T-G-006', name:'国会', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }, { tag: 'laborReduceDelta', amount: 1 }] },
]

// N枚のコピーを作る
function copies(t: TechCard, n: number): TechCard[] {
  return Array.from({ length: n }, (_, i) => ({ ...t }));
}

export const baseTechDeck = (): TechCard[] => [
    // 5枚ずつ追加
    ...landTechDeck().flatMap(t => copies(t, 5)).sort(() => 0.5 - Math.random()),
    ...foodProductiveTechDeck(),
    ...productiveTechDeck(),
    ...infrastructureTechDeck(),
    ...governmentTechDeck(),
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
