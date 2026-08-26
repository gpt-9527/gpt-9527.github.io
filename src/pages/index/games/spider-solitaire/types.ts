/** 花色 */
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'

/** 点数：1=A … 13=K */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

/** 难度：双色 / 四色（对应 Windows 蜘蛛牌） */
export type Difficulty = 2 | 4

export interface Card {
  /** 唯一 id，用于 Vue key 与选择 */
  id: string
  suit: Suit
  rank: Rank
  faceUp: boolean
}

export interface GameSnapshot {
  columns: Card[][]
  stock: Card[]
  completed: number
  score: number
  moves: number
  difficulty: Difficulty
}

export interface MoveSelection {
  colIndex: number
  cardIndex: number
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
  1: 'A',
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
}

export const COLUMN_COUNT = 10
export const COMPLETE_RUN_LENGTH = 13
export const TOTAL_RUNS = 8
