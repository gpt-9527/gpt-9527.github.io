/**
 * 结算模拟：验证零和与金额分布
 */
import { autoArrange, dealHands, detectSpecial, settleRound } from '../src/pages/index/games/thirteen/engine.ts'
import type { Arrangement } from '../src/pages/index/games/thirteen/types.ts'

const N = 400
let zeroSumBroken = 0
let homerunRounds = 0
let scoopRounds = 0
let maxAbsDelta = 0
let maxAbsPair = 0
const dist = new Map<string, number>()

for (let t = 0; t < N; t++) {
  const hands = dealHands(4).map((h) => autoArrange(h))
  const specials = hands.map((h) => detectSpecial([...h.front, ...h.middle, ...h.back]))
  const r = settleRound(hands as Arrangement[], specials)
  const sum = r.deltas.reduce((a, b) => a + b, 0)
  if (sum !== 0) {
    zeroSumBroken++
    if (zeroSumBroken <= 3) console.log(`第${t}局 零和破坏: deltas=${JSON.stringify(r.deltas)} sum=${sum} homeRuns=${JSON.stringify(r.homeRuns)}`)
  }
  if (r.homeRuns.length) homerunRounds++
  for (const p of r.pairs) {
    maxAbsPair = Math.max(maxAbsPair, Math.abs(p.points))
    if (p.scoopBy !== null) scoopRounds++
  }
  for (const d of r.deltas) {
    maxAbsDelta = Math.max(maxAbsDelta, Math.abs(d))
    const bucket = Math.abs(d * 100) >= 10000 ? '>=10000' : Math.abs(d * 100) >= 5000 ? '5000-9999' : Math.abs(d*100) >= 2000 ? '2000-4999' : '<2000'
    dist.set(bucket, (dist.get(bucket) ?? 0) + 1)
  }
}

console.log(`\n模拟 ${N} 局（全员 AI 理牌）`)
console.log(`零和被破坏的局数: ${zeroSumBroken}`)
console.log(`出现全垒打的局数: ${homerunRounds}, 出现打枪的对局数: ${scoopRounds}`)
console.log(`单家最大 |delta| = ${maxAbsDelta} 注 = ${maxAbsDelta * 100} 游戏币`)
console.log(`单对最大 |points| = ${maxAbsPair} 注 = ${maxAbsPair * 100} 游戏币`)
console.log('delta 币值分布:', JSON.stringify(Object.fromEntries(dist)))
