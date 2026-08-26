/**
 * 十三张引擎 — 发牌、牌型评估、理牌校验、NPC 自动理牌与结算
 *
 * 规则要点：
 * - 一副 52 张扑克，4 人各摸 13 张，分为 头墩(3) / 中墩(5) / 尾墩(5)
 * - 尾墩 ≥ 中墩 ≥ 头墩（统一牌型刻度比较），否则为相公不允许确认
 * - 两两比牌：每墩胜出 +1 注；头墩三条赢墩按 3 注计（冲三）；中墩葫芦赢墩按 2 注计
 * - 打枪：对某家三墩全胜，对该家成绩翻倍；全垒打：把三家全部打枪，总成绩再翻倍
 * - 特殊牌型免比三墩，按倍数向每家收注；双方均有特殊牌时倍数高者赢差值
 */

import type {
  Arrangement,
  Card,
  HandEval,
  PairLine,
  PairOutcome,
  Rank,
  RoundResult,
  Segment,
  SpecialInfo,
  SpecialType,
  Suit,
} from './types'
import {
  HC_FLUSH,
  HC_FULL_HOUSE,
  HC_HIGH,
  HC_PAIR,
  HC_QUADS,
  HC_STRAIGHT,
  HC_STRAIGHT_FLUSH,
  HC_TRIPS,
  HC_TWO_PAIR,
  RANK_LABEL,
  SEGMENT_NAME,
  SPECIAL_PRIORITY,
} from './types'

let cardSeq = 0

function createCard(suit: Suit, rank: Rank): Card {
  cardSeq += 1
  return { id: `t${cardSeq}-${suit}-${rank}`, suit, rank }
}

/** Fisher–Yates 洗牌 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 生成洗好的一副 52 张扑克 */
export function createDeck(): Card[] {
  const cards: Card[] = []
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
  for (const suit of suits) {
    for (let rank = 2 as Rank; rank <= 14; rank = (rank + 1) as Rank) {
      cards.push(createCard(suit, rank))
    }
  }
  return shuffle(cards)
}

/** 给 num 家各发 13 张 */
export function dealHands(num = 4): Card[][] {
  const deck = createDeck()
  const hands: Card[][] = []
  for (let i = 0; i < num; i++) hands.push(deck.slice(i * 13, (i + 1) * 13))
  return hands
}

/** 按点数权重降序（A 默认 14） */
function descWeights(cards: Card[]): number[] {
  return cards.map((c) => c.rank).sort((x, y) => y - x)
}

/** 评估 5 张牌（中墩 / 尾墩） */
export function evaluate5(cards: Card[]): HandEval {
  const ws = descWeights(cards)
  const isFlush = cards.every((c) => c.suit === cards[0].suit)

  // 顺子判断：连续，或 A2345（[14,5,4,3,2]，以 5 为最大）
  let straightHigh = 0
  if (ws[0] - ws[4] === 4 && new Set(ws).size === 5) straightHigh = ws[0]
  if (
    !straightHigh &&
    ws[0] === 14 &&
    ws[1] === 5 &&
    ws[2] === 4 &&
    ws[3] === 3 &&
    ws[4] === 2
  ) {
    straightHigh = 5
  }

  // 按出现次数分组：(count 大者在前；count 相同则点数大者在前)
  const countMap = new Map<number, number>()
  for (const w of ws) countMap.set(w, (countMap.get(w) ?? 0) + 1)
  const groups = [...countMap.entries()]
    .map(([weight, count]) => ({ weight, count }))
    .sort((a, b) => b.count - a.count || b.weight - a.weight)

  if (isFlush && straightHigh) return { category: HC_STRAIGHT_FLUSH, keys: [straightHigh] }

  const g0 = groups[0]
  if (g0.count === 4) {
    return { category: HC_QUADS, keys: [g0.weight, groups[1].weight] }
  }
  if (g0.count === 3 && groups[1]?.count === 2) {
    return { category: HC_FULL_HOUSE, keys: [g0.weight, groups[1].weight] }
  }
  if (isFlush) return { category: HC_FLUSH, keys: [...ws] }
  if (straightHigh) return { category: HC_STRAIGHT, keys: [straightHigh] }
  if (g0.count === 3) {
    return {
      category: HC_TRIPS,
      keys: [g0.weight, groups[1].weight, groups[2].weight],
    }
  }
  if (g0.count === 2 && groups[1]?.count === 2) {
    return {
      category: HC_TWO_PAIR,
      keys: [g0.weight, groups[1].weight, groups[2].weight],
    }
  }
  if (g0.count === 2) {
    return {
      category: HC_PAIR,
      keys: [g0.weight, groups[1].weight, groups[2].weight, groups[3].weight],
    }
  }
  return { category: HC_HIGH, keys: [...ws] }
}

/**
 * 评估头墩 3 张。使用与 5 张统一的刻度：
 * 三条 > 对子 > 散牌（头墩无同花/顺子）。
 * 统一刻度保证跨墩校验正确（如 中墩两对 < 头墩三条 → 相公）。
 */
export function evaluateFront(cards: Card[]): HandEval {
  const ws = descWeights(cards)
  const countMap = new Map<number, number>()
  for (const w of ws) countMap.set(w, (countMap.get(w) ?? 0) + 1)
  const groups = [...countMap.entries()]
    .map(([weight, count]) => ({ weight, count }))
    .sort((a, b) => b.count - a.count || b.weight - a.weight)

  if (groups[0].count === 3) return { category: HC_TRIPS, keys: [groups[0].weight] }
  if (groups[0].count === 2) {
    return { category: HC_PAIR, keys: [groups[0].weight, groups[1].weight] }
  }
  return { category: HC_HIGH, keys: [...ws] }
}

/** 按墩位取评估函数 */
export function evaluateSegment(segment: Segment, cards: Card[]): HandEval {
  return segment === 'front' ? evaluateFront(cards) : evaluate5(cards)
}

/** 牌型比较：>0 表示 a 强 */
export function compareHands(a: HandEval, b: HandEval): number {
  if (a.category !== b.category) return a.category - b.category
  const len = Math.max(a.keys.length, b.keys.length)
  for (let i = 0; i < len; i++) {
    const ka = a.keys[i] ?? 0
    const kb = b.keys[i] ?? 0
    if (ka !== kb) return ka - kb
  }
  return 0
}

/** 把牌型折算成标量分（用于 NPC 理牌目标函数） */
function scoreOf(ev: HandEval): number {
  return (
    ev.category * 1e10 +
    ev.keys.reduce((acc, k) => acc * 15 + (k + 1), 0)
  )
}

/** 牌型中文名 */
export function handName(ev: HandEval): string {
  const label = (w: number | undefined) =>
    w != null ? RANK_LABEL[(w >= 2 && w <= 14 ? w : 14) as Rank] : ''
  switch (ev.category) {
    case HC_STRAIGHT_FLUSH:
      return `同花顺(${label(ev.keys[0])}高)`
    case HC_QUADS:
      return `铁支·四条${label(ev.keys[0])}`
    case HC_FULL_HOUSE:
      return `葫芦(${label(ev.keys[0])}带${label(ev.keys[1])})`
    case HC_FLUSH:
      return `同花(${label(ev.keys[0])}高)`
    case HC_STRAIGHT:
      return `顺子(${label(ev.keys[0])}高)`
    case HC_TRIPS:
      return `三条${label(ev.keys[0])}`
    case HC_TWO_PAIR:
      return `两对(${label(ev.keys[0])}与${label(ev.keys[1])})`
    case HC_PAIR:
      return `一对${label(ev.keys[0])}`
    default:
      return `散牌(${label(ev.keys[0])}高)`
  }
}

export interface ValidateResult {
  ok: boolean
  reason?: string
}

/** 校验三墩顺序：尾 ≥ 中 ≥ 头 */
export function validateArrangement(arr: Arrangement): ValidateResult {
  const evB = evaluate5(arr.back)
  const evM = evaluate5(arr.middle)
  const evF = evaluateFront(arr.front)
  if (compareHands(evB, evM) < 0) {
    return {
      ok: false,
      reason: `相公：尾墩「${handName(evB)}」弱于中墩「${handName(evM)}」`,
    }
  }
  if (compareHands(evM, evF) < 0) {
    return {
      ok: false,
      reason: `相公：中墩「${handName(evM)}」弱于头墩「${handName(evF)}」`,
    }
  }
  return { ok: true }
}

/** 六对半：恰好六对 + 一单张 */
function isSixPairs(cards: Card[]): boolean {
  const countMap = new Map<number, number>()
  for (const c of cards) countMap.set(c.rank, (countMap.get(c.rank) ?? 0) + 1)
  let pairs = 0
  let singles = 0
  for (const v of countMap.values()) {
    if (v === 2) pairs++
    else if (v === 1) singles++
  }
  return pairs === 6 && singles === 1
}

/** 三同花：13 张可分成 5/5/3 三组，每组内部同花色 */
function isThreeFlush(cards: Card[]): boolean {
  const counts: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 }
  for (const c of cards) counts[c.suit]++
  const suits = (Object.keys(counts) as Suit[]).filter((s) => counts[s] > 0)
  const bins = [5, 5, 3]

  const assign = (bi: number): boolean => {
    if (bi === bins.length) return true
    const size = bins[bi]
    for (const s of suits) {
      if (counts[s] >= size) {
        counts[s] -= size
        if (assign(bi + 1)) return true
        counts[s] += size
      }
    }
    return false
  }
  return assign(0)
}

/** 一条龙：A~K 各一张；全同花为清一条龙 */
function detectDragon(cards: Card[]): SpecialInfo | null {
  const rankSet = new Set(cards.map((c) => c.rank))
  if (rankSet.size !== 13) return null
  for (let r = 2; r <= 14; r++) {
    if (!rankSet.has(r as Rank)) return null
  }
  const flush = cards.every((c) => c.suit === cards[0].suit)
  return flush
    ? { type: 'dragonFlush', name: '清一条龙', mult: 26 }
    : { type: 'dragon', name: '一条龙', mult: 13 }
}

/** 从特殊牌型表构造信息 */
function buildSpecial(type: SpecialType): SpecialInfo {
  switch (type) {
    case 'dragonFlush':
      return { type, name: '清一条龙', mult: 26 }
    case 'dragon':
      return { type, name: '一条龙', mult: 13 }
    case 'threeFlush':
      return { type, name: '三同花', mult: 10 }
    case 'sixPairs':
      return { type, name: '六对半', mult: 6 }
  }
}

/** 检测特殊牌型（按倍数从高到低优先） */
export function detectSpecial(cards: Card[]): SpecialInfo | null {
  for (const type of SPECIAL_PRIORITY) {
    if (type === 'dragonFlush' || type === 'dragon') {
      const d = detectDragon(cards)
      if (d && d.type === type) return d
    } else if (type === 'threeFlush') {
      if (isThreeFlush(cards)) return buildSpecial(type)
    } else if (type === 'sixPairs') {
      if (isSixPairs(cards)) return buildSpecial(type)
    }
  }
  return null
}

/** 组合枚举：从 n 个下标中选 k 个 */
function* combinations(n: number, k: number): Generator<number[]> {
  const idx = Array.from({ length: k }, (_, i) => i)
  if (k > n) return
  while (true) {
    yield [...idx]
    let i = k - 1
    while (i >= 0 && idx[i] === n - k + i) i--
    if (i < 0) return
    idx[i]++
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1
  }
}

/**
 * 自动理牌：在全部合法（尾≥中≥头）组合里最大化三墩强度之和。
 * 枚举量 C(13,5)×C(8,5)=72072，性能无忧。
 */
export function autoArrange(cards: Card[]): Arrangement {
  const n = cards.length
  let bestScore = -Infinity
  let best: Arrangement | null = null

  for (const bIdx of combinations(n, 5)) {
    const bSet = new Set(bIdx)
    const back = bIdx.map((i) => cards[i])
    const evB = evaluate5(back)
    const sB = scoreOf(evB)
    const rest: number[] = []
    for (let i = 0; i < n; i++) if (!bSet.has(i)) rest.push(i)

    for (const mIdx of combinations(rest.length, 5)) {
      const mSet = new Set(mIdx)
      const middle = mIdx.map((i) => cards[rest[i]])
      const front: Card[] = []
      for (let i = 0; i < rest.length; i++) if (!mSet.has(i)) front.push(cards[rest[i]])

      const evM = evaluate5(middle)
      const evF = evaluateFront(front)
      if (compareHands(evB, evM) < 0 || compareHands(evM, evF) < 0) continue

      const total = sB + scoreOf(evM) + scoreOf(evF)
      if (total > bestScore) {
        bestScore = total
        best = { front, middle, back }
      }
    }
  }

  if (best) return best
  // 理论不可达的兜底
  return {
    front: cards.slice(0, 3),
    middle: cards.slice(3, 8),
    back: cards.slice(8, 13),
  }
}

/** 墩位基础注数：头墩三条（冲三）记 3 注；中墩葫芦记 2 注；其余 1 注 */
export function segmentUnit(segment: Segment, winnerEv: HandEval): number {
  if (segment === 'front' && winnerEv.category === HC_TRIPS) return 3
  if (segment === 'middle' && winnerEv.category === HC_FULL_HOUSE) return 2
  return 1
}

/**
 * 一整局结算：hands/specials 均按玩家下标排列。
 * 返回每对玩家的明细与每家净变动（单位：注）。
 * 保证严格零和：所有 delta 之和恒为 0。
 */
export function settleRound(hands: Arrangement[], specials: (SpecialInfo | null)[]): RoundResult {
  const n = hands.length
  const pairs: PairOutcome[] = []
  const scoopWins = new Array<number>(n).fill(0)

  const evals = hands.map((h) => ({
    front: evaluateFront(h.front),
    middle: evaluate5(h.middle),
    back: evaluate5(h.back),
  }))

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const si = specials[i]
      const sj = specials[j]
      let points = 0
      let scoopBy: number | null = null
      const lines: PairLine[] = []

      if (si || sj) {
        // 特殊牌型结算：倍数高者赢差值
        const mi = si?.mult ?? 0
        const mj = sj?.mult ?? 0
        points = mi - mj
        const text =
          si && sj
            ? `双方特殊牌：${si.name} vs ${sj.name}，倍数高者赢差值（${fmtSigned(points)}注）`
            : si
              ? `${si.name}！免比三墩直接取胜（+${mi}注）`
              : `对方 ${sj!.name}，免比三墩直接落败（-${mj}注）`
        lines.push({ segment: 'none', text, points })
      } else {
        let winsI = 0
        let winsJ = 0
        for (const seg of ['front', 'middle', 'back'] as Segment[]) {
          const ea = evals[i][seg]
          const eb = evals[j][seg]
          const c = compareHands(ea, eb)
          const segName = SEGMENT_NAME[seg]
          if (c > 0) {
            const u = segmentUnit(seg, ea)
            points += u
            winsI++
            lines.push({
              segment: seg,
              text: `${segName}：${handName(ea)} 胜 ${handName(eb)}（冲三/加成已计入）`,
              points: u,
            })
          } else if (c < 0) {
            const u = segmentUnit(seg, eb)
            points -= u
            winsJ++
            lines.push({
              segment: seg,
              text: `${segName}：${handName(ea)} 不敌 ${handName(eb)}`,
              points: -u,
            })
          } else {
            lines.push({
              segment: seg,
              text: `${segName}：双方同为 ${handName(ea)}，平局`,
              points: 0,
            })
          }
        }
        // 打枪：三墩全胜一家 → 该对成绩翻倍
        if (winsI === 3) {
          points *= 2
          scoopBy = i
        } else if (winsJ === 3) {
          points *= 2
          scoopBy = j
        }
        if (scoopBy !== null) {
          lines.push({
            segment: 'none',
            text: `${scoopBy === i ? '我方三墩全胜' : '对方三墩全胜'}，打枪！该家成绩翻倍`,
            points: 0,
          })
        }
      }

      if (scoopBy !== null) scoopWins[scoopBy]++
      pairs.push({ a: i, b: j, points, scoopBy, special: Boolean(si || sj), lines })
    }
  }

  // 全垒打：把其余 n-1 家全部打枪 → 该玩家参与的每一对成绩再翻倍。
  // 在“对”的层面翻倍而非只翻倍总 delta，保证零和（否则会凭空产生/吞掉筹码）。
  const homeRuns: number[] = []
  for (let i = 0; i < n; i++) {
    if (scoopWins[i] === n - 1) {
      homeRuns.push(i)
      for (const p of pairs) {
        if (p.a === i || p.b === i) p.points *= 2
      }
    }
  }

  const deltas = new Array<number>(n).fill(0)
  for (const p of pairs) {
    deltas[p.a] += p.points
    deltas[p.b] -= p.points
  }

  return { pairs, deltas, homeRuns }
}

function fmtSigned(v: number): string {
  return v >= 0 ? `+${v}` : `${v}`
}
