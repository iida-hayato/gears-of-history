// 最小限のサンプル
import type { PolicyCard, TechCard, WonderCard } from './types';

// 再現性確保のためシミュレーション側から差し替え可能な RNG
export let globalSimRng: () => number = Math.random;
export const setCardsRng = (r: () => number) => { globalSimRng = r; };

export const samplePolicies = (nPlayers: number): PolicyCard[] => {
  // プレイヤー人数+5枚
  const xs: PolicyCard[] = [
    { id: 'P-000-BUILD+1', name:'工期短縮令' ,description: '建築+1', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'P-000-BUILD+2', name:'公共事業' ,description: '建築+2', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'buildActionsDelta', amount: 2, scope: 'round' }] },
    { id: 'P-000-GEAR+1',  name:'配給強化' ,description: '歯車+1', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'gearDelta', amount: 1, scope: 'round' }] },
    { id: 'P-000-GEAR+2',  name:'工業支援' ,description: '歯車+2', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'gearDelta', amount: 2, scope: 'round' }] },
    { id: 'P-000-INVENT+1',name:'研究支援' ,description: '発明+1', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'inventActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'P-001-INVENT+1',name:'研究支援' ,description: '発明+1', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'inventActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'P-002-INVENT+1',name:'研究支援' ,description: '発明+1', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'inventActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'P-000-FOOD+1',  name:'農地開拓' ,description: '食料+1', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'foodDelta', amount: 1, scope: 'round' }] },
    { id: 'P-000-FOOD+2',  name:'食料支援' ,description: '食料+2', kind: 'Policy', cost: 0, vp: 0, effects: [{ tag: 'foodDelta', amount: 2, scope: 'round' }] },
  ];
  // 足りない分はプレースホルダで埋める
  while (xs.length < nPlayers + 5) {
    xs.push({ id: `P-NOOP-${xs.length}`, name: '政策なし', kind: 'Policy', cost: 0, vp: 0, effects: [] });
  }
  // シンプルシャッフル（Fisher-Yates）
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(globalSimRng() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
};

export const initialTechDeck = (): TechCard[] => [
    {id: 'T-I-F-000',serial:0, name: '狩猟野営地', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 0, vp: 0, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    {id: 'T-I-P-000',serial:0, name: '伐採所', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 0, vp: 0, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    {id: 'T-I-L-000',serial:0, name: '森', buildType:'ProdFacility', description: '歯車+1, 要求労働力+1', kind: 'Tech', cost: 0, vp: 0, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
]

export const landTechDeck = (): TechCard[] => [
    { id: 'T-L-000',serial:0, name: '草原', buildType:'Land', description:'食料+1, 要求労働力+1', kind: 'Tech', cost: 0, vp: 0, effects: [{ tag: 'foodDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-L-001',serial:1,  name: '沿岸', buildType:'Land', description:'食料+1, 要求労働力+1', kind: 'Tech', cost: 0, vp: 0, effects: [{ tag: 'foodDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-L-002',serial:2,  name: '湿地', buildType:'Land', description:'食料+1, 要求労働力+1', kind: 'Tech', cost: 0, vp: 0, effects: [{ tag: 'foodDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-L-003',serial:3,  name: '森林', buildType:'Land', description:'歯車+1, 要求労働力+1', kind: 'Tech', cost: 0, vp: 0, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-L-004',serial:4,  name: '山岳', buildType:'Land', description:'歯車+1, 要求労働力+1', kind: 'Tech', cost: 0, vp: 0, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-L-005',serial:5,  name: '砂漠', buildType:'Land', description:'歯車+1, 要求労働力+1', kind: 'Tech', cost: 0, vp: 0, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
  ]

export const foodProductiveTechDeck = (): TechCard[] => [
  { id: 'T-F-000',serial:0, name: '狩猟野営地', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
  { id: 'T-F-001',serial:0, name: '狩猟野営地', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
  { id: 'T-F-002',serial:0, name: '狩猟野営地', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
  { id: 'T-F-003',serial:1, name: '水田', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
  { id: 'T-F-004',serial:1, name: '水田', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
  { id: 'T-F-005',serial:1, name: '水田', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
  { id: 'T-F-006',serial:2, name: '輪栽農地', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
  { id: 'T-F-007',serial:2, name: '輪栽農地', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
  { id: 'T-F-008',serial:2, name: '輪栽農地', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
  { id: 'T-F-009',serial:3, name: 'ビニールハウス農業', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
  { id: 'T-F-010',serial:3, name: 'ビニールハウス農業', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
  { id: 'T-F-011',serial:3, name: 'ビニールハウス農業', buildType:'FoodFacility', description: '食料+2, 要求労働力+1',  kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'foodDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
]

export const productiveTechDeck = (): TechCard[] => [
    { id: 'T-P-000',serial:0, name: '伐採所', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-P-001',serial:0, name: '伐採所', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-P-002',serial:0, name: '伐採所', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-P-003',serial:1, name: 'たたら製鉄場', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-P-004',serial:1, name: 'たたら製鉄場', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-P-005',serial:1, name: 'たたら製鉄場', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-P-006',serial:2, name: '紡績工房', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-P-007',serial:2, name: '紡績工房', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-P-008',serial:2, name: '紡績工房', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-P-009',serial:3, name: '機械工場', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-P-010',serial:3, name: '機械工場', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-P-011',serial:3, name: '機械工場', buildType:'ProdFacility', description: '歯車+2, 要求労働力+1', kind: 'Tech', cost: 1, vp: 1, effects: [{ tag: 'gearDelta', amount: 2, scope: 'persistent' }, { tag: 'laborReqDelta',scope: 'persistent' , amount: 1 }] },
]

export const infrastructureTechDeck = (): TechCard[] => [
    { id: 'T-I-000',serial:0, name: '道路', buildType:'Infrastructure', description: '歯車-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'gearDelta', amount: -2, scope: 'persistent' }, { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-I-001',serial:0, name: '道路', buildType:'Infrastructure', description: '歯車-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'gearDelta', amount: -2, scope: 'persistent' }, { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-I-002',serial:1, name: '集落', buildType:'Infrastructure', description: '食料-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'foodDelta', amount: -2, scope: 'persistent' }, { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-I-003',serial:1, name: '集落', buildType:'Infrastructure', description: '食料-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'foodDelta', amount: -2, scope: 'persistent' }, { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-I-004',serial:2, name: '運河', buildType:'Infrastructure', description: '歯車-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'gearDelta', amount: -2, scope: 'persistent' }, { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-I-005',serial:2, name: '運河', buildType:'Infrastructure', description: '歯車-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'gearDelta', amount: -2, scope: 'persistent' }, { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-I-006',serial:3, name: '城下町', buildType:'Infrastructure', description: '食料-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'foodDelta', amount: -2, scope: 'persistent' }, { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-I-007',serial:3, name: '城下町', buildType:'Infrastructure', description: '食料-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'foodDelta', amount: -2, scope: 'persistent' }, { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-I-008',serial:4, name: '上下水道', buildType:'Infrastructure', description: '歯車-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'gearDelta', amount: -2, scope: 'persistent' }, { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-I-009',serial:4, name: '上下水道', buildType:'Infrastructure', description: '歯車-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'gearDelta', amount: -2, scope: 'persistent' }, { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-I-010',serial:5, name: '居住区', buildType:'Infrastructure', description: '食料-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'foodDelta', amount: -2, scope: 'persistent' }, { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-I-011',serial:5, name: '居住区', buildType:'Infrastructure', description: '食料-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'foodDelta', amount: -2, scope: 'persistent' }, { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-I-012',serial:6, name: '鉄道', buildType:'Infrastructure', description: '歯車-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'gearDelta', amount: -2, scope: 'persistent' }, { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-I-013',serial:6, name: '鉄道', buildType:'Infrastructure', description: '歯車-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'gearDelta', amount: -2, scope: 'persistent' }, { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-I-014',serial:7, name: '集合住宅地', buildType:'Infrastructure', description: '食料-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'foodDelta', amount: -2, scope: 'persistent' }, { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-I-015',serial:7, name: '集合住宅地', buildType:'Infrastructure', description: '食料-2, 要求労働力-1', kind: 'Tech', cost: 2, vp: 1, effects: [{ tag: 'foodDelta', amount: -2, scope: 'persistent' }, { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
]

export const governmentTechDeck = (): TechCard[] => [
    { id: 'T-G-000',serial:0, name:'宮殿', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [ { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-G-001',serial:0, name:'宮殿', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [ { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-G-002',serial:1, name:'城', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [ { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-G-003',serial:1, name:'城', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [ { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-G-004',serial:2, name:'市庁舎', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [ { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-G-005',serial:2, name:'市庁舎', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [ { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-G-006',serial:3, name:'議会', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [ { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-G-007',serial:3, name:'議会', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [ { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-G-008',serial:4, name:'立法府', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [ { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-G-009',serial:4, name:'立法府', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [ { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-G-010',serial:5, name:'国会', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [ { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
    { id: 'T-G-011',serial:5, name:'国会', buildType:'Government', description: '要求労働力-1, 1枚のみ', kind: 'Tech', cost: 2, vp: 1, effects: [ { tag: 'laborReduceDelta',scope: 'persistent' , amount: 1 }] },
]

// N枚のコピーを作る
function copies(t: TechCard, n: number): TechCard[] {
    return Array.from({ length: n }, (_, i) => ({
        ...t,
        id: `${t.id}#${i + 1}`,         // ← 一意なIDに
        templateId: t.id,               // ← 元のテンプレIDを保持しておくと便利
    }));
}

export const baseTechDeck = (): TechCard[] => [
    // 5枚ずつ追加 (Land のみシャッフル)
    ...(() => { const arr = landTechDeck().flatMap(t => copies(t, 5)); for (let i = arr.length -1; i>0; i--) { const j = Math.floor(globalSimRng()*(i+1)); [arr[i],arr[j]] = [arr[j],arr[i]];} return arr; })(),
    ...foodProductiveTechDeck(),
    ...productiveTechDeck(),
    ...infrastructureTechDeck(),
    ...governmentTechDeck(),
];

// テスト用のカード設定。本来はユニークな効果とコンボを持つべきだが、もろもろうまく行った想定の効果だけ記述しておく。
export const sampleWondersByEra = (): Record<1 | 2 | 3, WonderCard[]> => ({
  1: [
    { id: 'W1-001', name: 'ギザの大ピラミッド', kind: 'Wonder', era: 1, cost: 3, vp: 3, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'W1-002', name: 'ロードスの巨神像', kind: 'Wonder', era: 1, cost: 3, vp: 2, effects: [{ tag: 'foodDelta', amount: 1, scope: 'persistent' }] },
    { id: 'W1-003', name: 'バビロンの空中庭園', kind: 'Wonder', era: 1, cost: 3, vp: 4, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }] },
    { id: 'W1-004', name: 'アルテミス神殿', kind: 'Wonder', era: 1, cost: 3, vp: 3, effects: [{ tag: 'foodDelta', amount: 1, scope: 'persistent' }] },
    { id: 'W1-005', name: 'ヘラクレスの大柱', kind: 'Wonder', era: 1, cost: 3, vp: 2, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'W1-006', name: 'オリンピアのゼウス像', kind: 'Wonder', era: 1, cost: 3, vp: 4, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }] },
    { id: 'W1-007', name: 'マウソロス霊廟', kind: 'Wonder', era: 1, cost: 3, vp: 3, effects: [{ tag: 'buildActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'W1-008', name: 'ロドス島の巨像', kind: 'Wonder', era: 1, cost: 3, vp: 2, effects: [{ tag: 'foodDelta', amount: 1, scope: 'persistent' }] },
    { id: 'W1-009', name: 'アレクサンドリアの大灯台', kind: 'Wonder', era: 1, cost: 3, vp: 4, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }] },
  ],
  2: [
    { id: 'W2-001', name: 'ノートルダム大聖堂', kind: 'Wonder', era: 2, cost: 3, vp: 5, effects: [{ tag: 'inventActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'W2-002', name: '万里の長城', kind: 'Wonder', era: 2, cost: 4, vp: 6, effects: [{ tag: 'foodDelta', amount: 1, scope: 'persistent' }, { tag: 'gearDelta', amount: 1, scope: 'persistent' }] },
    { id: 'W2-003', name: 'タージ・マハル', kind: 'Wonder', era: 2, cost: 4, vp: 5, effects: [{ tag: 'inventActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'W2-004', name: 'コロッセオ', kind: 'Wonder', era: 2, cost: 4, vp: 6, effects: [{ tag: 'foodDelta', amount: 1, scope: 'persistent' }, { tag: 'gearDelta', amount: 1, scope: 'persistent' }] },
    { id: 'W2-005', name: 'ピサの斜塔', kind: 'Wonder', era: 2, cost: 3, vp: 5, effects: [{ tag: 'inventActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'W2-006', name: 'アヤソフィア大聖堂', kind: 'Wonder', era: 2, cost: 4, vp: 6, effects: [{ tag: 'foodDelta', amount: 1, scope: 'persistent' }, { tag: 'gearDelta', amount: 1, scope: 'persistent' }] },
    { id: 'W2-007', name: 'シドニー・オペラハウス', kind: 'Wonder', era: 2, cost: 4, vp: 5, effects: [{ tag: 'inventActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'W2-008', name: '自由の女神像', kind: 'Wonder', era: 2, cost: 4, vp: 6, effects: [{ tag: 'foodDelta', amount: 1, scope: 'persistent' }, { tag: 'gearDelta', amount: 1, scope: 'persistent' }] },
  ],
  3: [
    { id: 'W3-001', name: 'ルーヴル美術館', kind: 'Wonder', era: 3, cost: 4, vp: 8, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }, { tag: 'foodDelta', amount: 1, scope: 'persistent' }] },
    { id: 'W3-002', name: 'エッフェル塔', kind: 'Wonder', era: 3, cost: 4, vp: 7, effects: [{ tag: 'inventActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'W3-003', name: 'ビッグ・ベン', kind: 'Wonder', era: 3, cost: 4, vp: 8, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }, { tag: 'foodDelta', amount: 1, scope: 'persistent' }] },
    { id: 'W3-004', name: 'サグラダ・ファミリア', kind: 'Wonder', era: 3, cost: 4, vp: 7, effects: [{ tag: 'inventActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'W3-005', name: 'ブルジュ・ハリファ', kind: 'Wonder', era: 3, cost: 4, vp: 8, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }, { tag: 'foodDelta', amount: 1, scope: 'persistent' }] },
    { id: 'W3-006', name: 'シャンゼリゼ通り', kind: 'Wonder', era: 3, cost: 4, vp: 7, effects: [{ tag: 'inventActionsDelta', amount: 1, scope: 'round' }] },
    { id: 'W3-007', name: 'グッゲンハイム美術館', kind: 'Wonder', era: 3, cost: 4, vp: 8, effects: [{ tag: 'gearDelta', amount: 1, scope: 'persistent' }, { tag: 'foodDelta', amount: 1, scope: 'persistent' }] },
    { id: 'W3-008', name: 'マチュ・ピチュ', kind: 'Wonder', era: 3, cost: 4, vp: 7, effects: [{ tag: 'inventActionsDelta', amount: 1, scope: 'round' }] }
  ]
});
