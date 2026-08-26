/**
 * 十三张引擎快速自测（node --experimental-strip-types 直接运行）
 */
import {
  autoArrange,
  dealHands,
  detectSpecial,
  evaluateFront,
  evaluate5,
  settleRound,
  validateArrangement,
} from '../src/pages/index/games/thirteen/engine.ts'
import type { Arrangement, Card } from '../src/pages/index/games/thirteen/types.ts'

let failed = 0
function check(name: string, cond: boolean) {
  if (!cond) {
    failed++
    console.error(`✗ ${name}`)
  } else {
    console.log(`✓ ${name}`)
  }
}

const c = (rank: number, suit: 'spades' | 'hearts' | 'diamonds' | 'clubs'): Card => ({
  id: `x${suit}${rank}`,
  suit,
  rank: rank as Card['rank'],
})

/* --- 牌型评估 --- */
const sf = [c(14, 'spades'), c(13, 'spades'), c(12, 'spades'), c(11, 'spades'), c(10, 'spades')]
const quads = [c(9, 'hearts'), c(9, 'diamonds'), c(9, 'clubs'), c(9, 'spades'), c(3, 'hearts')]
check('同花顺 > 铁支', evaluate5(sf).category > evaluate5(quads).category)
const wheel = [c(14, 'spades'), c(2, 'hearts'), c(3, 'diamonds'), c(4, 'clubs'), c(5, 'spades')]
const wheelEv = evaluate5(wheel)
check('A2345 是顺子且 5 高', wheelEv.category === 4 && wheelEv.keys[0] === 5)
const boat = [c(13, 'spades'), c(13, 'hearts'), c(13, 'diamonds'), c(2, 'clubs'), c(2, 'spades')]
check('葫芦 < 铁支', evaluate5(boat).category < evaluate5(quads).category)
const tripsFront = [c(7, 'spades'), c(7, 'hearts'), c(7, 'diamonds')]
check('头墩三条=三条类', evaluateFront(tripsFront).category === 3)

/* --- 相公校验：中墩两对 弱于 头墩三条 → 不合法 --- */
const bad: Arrangement = {
  front: tripsFront,
  middle: [c(13, 'spades'), c(13, 'hearts'), c(5, 'diamonds'), c(5, 'clubs'), c(9, 'spades')],
  back: [c(14, 'spades'), c(14, 'hearts'), c(14, 'diamonds'), c(6, 'clubs'), c(6, 'spades')],
}
check('中墩两对+头墩三条 判相公', !validateArrangement(bad).ok)
const good: Arrangement = {
  front: [c(4, 'spades'), c(4, 'hearts'), c(11, 'diamonds')],
  middle: boat,
  back: sf,
}
check('尾≥中≥头 合法', validateArrangement(good).ok)

/* --- 特殊牌型 --- */
const dragonFlush = Array.from({ length: 13 }, (_, i) => c(i + 2, 'clubs'))
const dfSpecial = detectSpecial(dragonFlush)
check('清一条龙', dfSpecial?.type === 'dragonFlush')
const dragonMixed = dragonFlush.map((card, i) =>
  i % 2 === 0 ? card : c(card.rank, i % 4 === 1 ? 'hearts' : i % 4 === 3 ? 'diamonds' : 'clubs'),
)
check('杂色一条龙', detectSpecial(dragonMixed)?.type === 'dragon')
const sixPairsCards = [
  c(2, 'spades'), c(2, 'hearts'),
  c(5, 'spades'), c(5, 'hearts'),
  c(8, 'spades'), c(8, 'hearts'),
  c(11, 'spades'), c(11, 'hearts'),
  c(13, 'spades'), c(13, 'hearts'),
  c(4, 'diamonds'), c(4, 'clubs'),
  c(9, 'diamonds'),
]
check('六对半', detectSpecial(sixPairsCards)?.type === 'sixPairs')
// 5♠ + 5♥(7重复) + ♦QKA：三组各成同花；缺 J 且 7 重复，不构成一条龙
const threeFlush = [
  ...Array.from({ length: 5 }, (_, i) => c(i + 2, 'spades')),
  ...[7, 8, 9, 10, 7].map((r) => c(r, 'hearts')),
  ...[12, 13, 14].map((r) => c(r, 'diamonds')),
]
check('三同花', detectSpecial(threeFlush)?.type === 'threeFlush')

/* --- 自动理牌：随机 200 手全部必须合法 --- */
let allValid = true
for (let t = 0; t < 200; t++) {
  const hands = dealHands(4)
  for (const hand of hands) {
    const arr = autoArrange(hand)
    if (!validateArrangement(arr).ok || arr.front.length !== 3 || arr.middle.length !== 5 || arr.back.length !== 5) {
      allValid = false
    }
  }
}
check('200 局随机发牌 AI 理牌全部合法', allValid)

/* --- 结算：打枪翻倍 --- */
const p0: Arrangement = {
  front: [c(2, 'spades'), c(3, 'hearts'), c(8, 'diamonds')], // 散牌
  middle: boat, // 葫芦
  back: sf, // 同花顺
}
const p1: Arrangement = {
  front: [c(5, 'clubs'), c(9, 'hearts'), c(12, 'diamonds')],
  middle: [c(4, 'spades'), c(6, 'hearts'), c(8, 'clubs'), c(10, 'diamonds'), c(12, 'spades')],
  back: [c(2, 'clubs'), c(6, 'clubs'), c(9, 'clubs'), c(11, 'clubs'), c(13, 'clubs')],
}
const p2: Arrangement = autoArrange(dealHands(4)[0])
const p3: Arrangement = autoArrange(dealHands(4)[1])
const r1 = settleRound([p0, p1, p2, p3], [null, null, null, null])
const pair01 = r1.pairs.find((p) => (p.a === 0 && p.b === 1) || (p.a === 1 && p.b === 0))!
const pts01 = pair01.a === 0 ? pair01.points : -pair01.points
// p0 对 p1：头墩散牌8高 输 散牌Q高(-1)；中墩葫芦胜散牌，中墩葫芦加成(+2)；尾墩同花顺胜同花(+1)
check('p0 vs p1 头墩输', pair01.lines[0].points === -1)
check('p0 vs p1 中墩赢(葫芦加成=+2)', pair01.lines[1].points === 2)
check('p0 vs p1 尾墩赢(同花顺)', pair01.lines[2].points === 1)
check('p0 未打枪净+2', pts01 === 2 && pair01.scoopBy === null)

/* --- 中墩葫芦赢墩记 2 注、冲三记 3 注 --- */
const q0: Arrangement = { front: good.front, middle: good.middle, back: sf }
const q1: Arrangement = { front: bad.front, middle: bad.middle, back: bad.back }
const r2 = settleRound([q0, q1, p2, p3], [null, null, null, null])
const pairQ = r2.pairs[0]
const ptsQ = pairQ.a === 0 ? pairQ.points : -pairQ.points
// 头墩：一对4 输 三条7（冲三）-3；中墩：葫芦 胜 两对 +2；尾墩：同花顺 胜 葫芦A +1 → 合计 0
check('冲三-3 / 中墩葫芦+2 结算正确 (合计0)', ptsQ === 0)

/* --- 打枪：三墩全胜一家，成绩翻倍 --- */
const w0: Arrangement = {
  front: [c(12, 'spades'), c(12, 'hearts'), c(9, 'diamonds')],
  middle: [c(14, 'clubs'), c(13, 'diamonds'), c(12, 'clubs'), c(11, 'hearts'), c(10, 'spades')],
  back: sf,
}
const w1: Arrangement = {
  front: [c(2, 'clubs'), c(5, 'diamonds'), c(9, 'hearts')],
  middle: [c(13, 'spades'), c(13, 'hearts'), c(5, 'diamonds'), c(5, 'clubs'), c(9, 'spades')],
  back: [c(3, 'clubs'), c(4, 'clubs'), c(5, 'clubs'), c(6, 'clubs'), c(7, 'clubs')],
}
// 第三家：头墩三条 K，破掉 0 的三墩全胜（避免构成全垒打）
const wk3: Arrangement = {
  front: [c(13, 'spades'), c(13, 'hearts'), c(13, 'diamonds')],
  middle: [c(14, 'spades'), c(14, 'hearts'), c(14, 'diamonds'), c(2, 'clubs'), c(2, 'diamonds')],
  back: [c(9, 'clubs'), c(10, 'clubs'), c(11, 'clubs'), c(12, 'clubs'), c(13, 'clubs')],
}
const r4pairs = settleRound([w0, w1, wk3], [null, null, null])
const pairW01 = r4pairs.pairs.find((p) => p.a === 0 && p.b === 1)!
check('三墩全胜打枪翻倍(+6)', pairW01.points === 6 && pairW01.scoopBy === 0)
// 第三家头墩三条 K 破掉对 0 的全胜，避免构成全垒打；0 vs 2：头墩输冲三-3、中墩输-1、尾墩赢+1
check('未全胜不触发额外翻倍', r4pairs.homeRuns.length === 0)

/* --- 全垒打：参与的每对成绩再翻倍，且严格零和 --- */
const hr0: Arrangement = {
  front: [c(12, 'spades'), c(12, 'hearts'), c(9, 'diamonds')],
  middle: [c(14, 'clubs'), c(13, 'diamonds'), c(12, 'clubs'), c(11, 'hearts'), c(10, 'spades')],
  back: sf,
}
const mkWeak = (k: number): Arrangement => ({
  front: [c(2, 'clubs'), c(5, 'diamonds'), c(9 + k, 'hearts')],
  middle: [c(3, 'spades'), c(5, 'hearts'), c(7, 'clubs'), c(9, 'diamonds'), c(11 + k, 'spades')],
  back: [c(4, 'spades'), c(4, 'hearts'), c(6, 'diamonds'), c(6, 'clubs'), c(8, 'spades')],
})
const r5 = settleRound([hr0, mkWeak(0), mkWeak(1), mkWeak(2)], [null, null, null, null])
const sum5 = r5.deltas.reduce((a, b) => a + b, 0)
check('全垒打单家 +36 注（3注×打枪×全垒打）', r5.homeRuns.includes(0) && r5.deltas[0] === 36)
// 弱家互比之间还有 ±2 注转移：(1,2)(1,3)(2,3) 各由后者赢 2 注
check('三家分别为 -16/-12/-8 注（含弱家互比转移）',
  r5.deltas[1] === -16 && r5.deltas[2] === -12 && r5.deltas[3] === -8)
check('全垒打局严格零和', sum5 === 0)

/* --- 特殊牌型结算 --- */
const s0 = { type: 'dragonFlush' as const, name: '清一条龙', mult: 26 }
const s2 = { type: 'sixPairs' as const, name: '六对半', mult: 6 }
const r3 = settleRound([p0, p1, p2, p3], [s0, null, s2, null])
const pairS02 = r3.pairs.find((p) => (p.a === 0 && p.b === 2) || (p.a === 2 && p.b === 0))!
const got02 = pairS02.a === 0 ? pairS02.points : -pairS02.points
check('特殊牌 26-6=20 注差值', got02 === 20)

console.log(failed === 0 ? '\n全部通过 ✅' : `\n${failed} 项失败 ❌`)
process.exit(failed === 0 ? 0 : 1)

