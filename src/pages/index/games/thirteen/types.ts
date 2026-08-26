/**
 * 十三张（十三水 / Chinese Poker）类型与常量
 *
 * - 4 人游戏：1 名玩家 + 3 名 NPC
 * - 一副 52 张扑克，每人发 13 张
 * - 理牌为 三墩：头墩(前墩) 3 张、中墩 5 张、尾墩(后墩) 5 张
 * - 尾墩 ≥ 中墩 ≥ 头墩，否则判相公（不允许确认出牌）
 * - 初始资金 100 万游戏币，单注 100
 */

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'

/** 点数：2~14（内部权重），A 视作 14（顺子 A2345 时特殊处理） */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface Card {
  /** 唯一 id，用于 Vue key 与选择 */
  id: string
  suit: Suit
  rank: Rank
}

/** 墩位 */
export type Segment = 'front' | 'middle' | 'back'

export interface SegmentMap<T> {
  front: T
  middle: T
  back: T
}

export type Arrangement = SegmentMap<Card[]>

/** 5 张 / 3 张通用牌型评估结果（统一刻度，便于跨墩比较） */
export const HC_HIGH = 0
export const HC_PAIR = 1
export const HC_TWO_PAIR = 2
export const HC_TRIPS = 3
export const HC_STRAIGHT = 4
export const HC_FLUSH = 5
export const HC_FULL_HOUSE = 6
export const HC_QUADS = 7
export const HC_STRAIGHT_FLUSH = 8

export interface HandEval {
  category: number
  /** 依次比较的键（点数权重），字典序大者胜 */
  keys: number[]
}

/** 特殊牌型（免比三墩，直接按倍数向每家收注） */
export type SpecialType = 'dragonFlush' | 'dragon' | 'threeFlush' | 'sixPairs'

export interface SpecialInfo {
  type: SpecialType
  name: string
  /** 对每家的收注倍数（单位：注） */
  mult: number
}

export const SPECIAL_DEFS: Record<SpecialType, { name: string; mult: number; desc: string }> = {
  dragonFlush: { name: '清一条龙', mult: 26, desc: 'A~K 同花色一条龙' },
  dragon: { name: '一条龙', mult: 13, desc: 'A~K 杂色一条龙' },
  threeFlush: { name: '三同花', mult: 10, desc: '头中尾三墩全部同花' },
  sixPairs: { name: '六对半', mult: 6, desc: '六对 + 单张' },
}

export const SPECIAL_PRIORITY: SpecialType[] = ['dragonFlush', 'dragon', 'threeFlush', 'sixPairs']

/** 每名玩家的对局内信息 */
export interface PlayerState {
  id: number
  name: string
  avatar: string
  isHuman: boolean
  cards: Card[]
  arrangement: Arrangement | null
  special: SpecialInfo | null
  balance: number
}

/** 单对单比牌的一墩明细 */
export interface PairLine {
  /** 'none' 表示非具体墩位的说明行（如打枪、特殊牌） */
  segment: Segment | 'none'
  text: string
  /** 相对 a 家的注数变化 */
  points: number
}

/** 两家之间的结算 */
export interface PairOutcome {
  a: number
  b: number
  /** + 表示 a 赢 b 注数 */
  points: number
  /** 被打枪/打枪方的玩家 id（三墩全胜者） */
  scoopBy: number | null
  special: boolean
  lines: PairLine[]
}

export interface RoundResult {
  pairs: PairOutcome[]
  /** 每家本局净变动（单位：注） */
  deltas: number[]
  /** 达成全垒打的玩家 id */
  homeRuns: number[]
}

export const START_COINS = 1_000_000
export const UNIT = 100

export const SEGMENT_NAME: Record<Segment, string> = {
  front: '头墩',
  middle: '中墩',
  back: '尾墩',
}

export const SEGMENT_SIZE: Record<Segment, number> = {
  front: 3,
  middle: 5,
  back: 5,
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

export const SUIT_COLOR: Record<Suit, 'red' | 'black'> = {
  spades: 'black',
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
}

export const RANK_LABEL: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
}

/** 存档键：保留各家余额与局数 */
export const STORAGE_KEY = 'thirteen-cards-save-v1'
