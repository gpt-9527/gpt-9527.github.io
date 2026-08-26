/**
 * 蜘蛛纸牌引擎 — 经典 Windows 蜘蛛牌规则
 *
 * - 104 张牌，10 列牌桌
 * - 初始发 54 张：前 4 列各 6 张，后 6 列各 5 张，仅最上面一张朝上
 * - 余下 50 张为牌堆，每次向 10 列各发 1 张（有空列时不可发牌）
 * - 任意花色可按点数递减叠放；只有同花色连续递减序列可整体移动
 * - 同花色 K→A 完整序列自动收走
 * - 双色：黑桃 + 红心 各 4 副；四色：两副完整扑克
 */

import type {
  Card,
  Difficulty,
  GameSnapshot,
  MoveSelection,
  Rank,
  Suit,
} from './types'
import {
  COLUMN_COUNT,
  COMPLETE_RUN_LENGTH,
  TOTAL_RUNS,
} from './types'

let cardSeq = 0

function createCard(suit: Suit, rank: Rank, faceUp = false): Card {
  cardSeq += 1
  return {
    id: `c${cardSeq}-${suit}-${rank}`,
    suit,
    rank,
    faceUp,
  }
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

/** 按难度生成 104 张牌 */
function buildDeck(difficulty: Difficulty): Card[] {
  const cards: Card[] = []
  const ranks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as Rank[]

  if (difficulty === 2) {
    // 双色：♠ 与 ♥ 各 4 套
    const suits: Suit[] = ['spades', 'hearts']
    for (let copy = 0; copy < 4; copy++) {
      for (const suit of suits) {
        for (const rank of ranks) {
          cards.push(createCard(suit, rank))
        }
      }
    }
  } else {
    // 四色：两副标准扑克
    const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
    for (let copy = 0; copy < 2; copy++) {
      for (const suit of suits) {
        for (const rank of ranks) {
          cards.push(createCard(suit, rank))
        }
      }
    }
  }

  return shuffle(cards)
}

function cloneCards(cards: Card[]): Card[] {
  return cards.map((c) => ({ ...c }))
}

function cloneColumns(columns: Card[][]): Card[][] {
  return columns.map((col) => cloneCards(col))
}

export class SpiderEngine {
  columns: Card[][] = []
  stock: Card[] = []
  completed = 0
  score = 500
  moves = 0
  difficulty: Difficulty = 2
  won = false

  private history: GameSnapshot[] = []
  private maxHistory = 100

  constructor(difficulty: Difficulty = 2) {
    this.newGame(difficulty)
  }

  newGame(difficulty: Difficulty = this.difficulty): void {
    this.difficulty = difficulty
    this.completed = 0
    this.score = 500
    this.moves = 0
    this.won = false
    this.history = []
    cardSeq = 0

    const deck = buildDeck(difficulty)
    this.columns = Array.from({ length: COLUMN_COUNT }, () => [])

    // 前 4 列 6 张，后 6 列 5 张
    let idx = 0
    for (let col = 0; col < COLUMN_COUNT; col++) {
      const count = col < 4 ? 6 : 5
      for (let i = 0; i < count; i++) {
        const card = deck[idx++]
        card.faceUp = i === count - 1
        this.columns[col].push(card)
      }
    }

    // 剩余 50 张牌堆（每次发 10 张，共 5 轮）
    this.stock = deck.slice(idx)
  }

  /** 序列化当前局面（用于撤销） */
  private snapshot(): GameSnapshot {
    return {
      columns: cloneColumns(this.columns),
      stock: cloneCards(this.stock),
      completed: this.completed,
      score: this.score,
      moves: this.moves,
      difficulty: this.difficulty,
    }
  }

  private pushHistory(): void {
    this.history.push(this.snapshot())
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }
  }

  canUndo(): boolean {
    return this.history.length > 0
  }

  undo(): boolean {
    const prev = this.history.pop()
    if (!prev) return false
    this.columns = prev.columns
    this.stock = prev.stock
    this.completed = prev.completed
    this.score = prev.score
    this.moves = prev.moves
    this.difficulty = prev.difficulty
    this.won = this.completed >= TOTAL_RUNS
    return true
  }

  /** 从某列某张牌起，是否为可移动的同花色递减序列 */
  isMovableRun(colIndex: number, cardIndex: number): boolean {
    const col = this.columns[colIndex]
    if (!col || cardIndex < 0 || cardIndex >= col.length) return false

    const start = col[cardIndex]
    if (!start.faceUp) return false

    for (let i = cardIndex; i < col.length - 1; i++) {
      const a = col[i]
      const b = col[i + 1]
      if (!a.faceUp || !b.faceUp) return false
      if (a.suit !== b.suit) return false
      if (a.rank !== b.rank + 1) return false
    }
    return true
  }

  /** 某列从底部向上的最长可移动序列起点下标 */
  getMovableStart(colIndex: number): number {
    const col = this.columns[colIndex]
    if (!col || col.length === 0) return -1

    let start = col.length - 1
    while (start > 0) {
      const upper = col[start - 1]
      const lower = col[start]
      if (!upper.faceUp) break
      if (upper.suit !== lower.suit) break
      if (upper.rank !== lower.rank + 1) break
      start -= 1
    }
    return start
  }

  /** 目标列是否可接收该序列 */
  canPlaceOn(targetCol: number, movingCards: Card[]): boolean {
    if (movingCards.length === 0) return false
    const col = this.columns[targetCol]
    if (!col) return false

    if (col.length === 0) return true

    const top = col[col.length - 1]
    if (!top.faceUp) return false
    // 任意花色，点数递减即可叠放
    return top.rank === movingCards[0].rank + 1
  }

  /**
   * 尝试移动：从 fromCol 的 fromCardIndex 起整段移到 toCol
   * @returns 是否成功
   */
  move(fromCol: number, fromCardIndex: number, toCol: number): boolean {
    if (fromCol === toCol) return false
    if (!this.isMovableRun(fromCol, fromCardIndex)) return false

    const moving = this.columns[fromCol].slice(fromCardIndex)
    if (!this.canPlaceOn(toCol, moving)) return false

    this.pushHistory()

    this.columns[fromCol].splice(fromCardIndex)
    this.columns[toCol].push(...moving)

    // 翻开源列新的顶牌
    this.flipTop(fromCol)

    this.moves += 1
    this.score = Math.max(0, this.score - 1)

    // 检查完整序列（可能一次移动产生多条，极少见但循环处理）
    this.collectCompletedRuns()

    return true
  }

  private flipTop(colIndex: number): void {
    const col = this.columns[colIndex]
    if (col && col.length > 0) {
      const top = col[col.length - 1]
      if (!top.faceUp) top.faceUp = true
    }
  }

  /**
   * 扫描各列，收走同花色 K→A 完整 13 张
   */
  collectCompletedRuns(): number {
    let collected = 0
    let found = true

    while (found) {
      found = false
      for (let c = 0; c < COLUMN_COUNT; c++) {
        const col = this.columns[c]
        if (col.length < COMPLETE_RUN_LENGTH) continue

        // 从底部往上找完整 K-A 同花色序列
        const end = col.length
        const start = end - COMPLETE_RUN_LENGTH
        const slice = col.slice(start)

        if (!this.isCompleteRun(slice)) continue

        // 必须全部朝上
        if (!slice.every((card) => card.faceUp)) continue

        col.splice(start, COMPLETE_RUN_LENGTH)
        this.flipTop(c)
        this.completed += 1
        this.score += 100
        collected += 1
        found = true

        if (this.completed >= TOTAL_RUNS) {
          this.won = true
        }
      }
    }

    return collected
  }

  private isCompleteRun(cards: Card[]): boolean {
    if (cards.length !== COMPLETE_RUN_LENGTH) return false
    const suit = cards[0].suit
    // 应为 K(13), Q(12), … A(1)
    for (let i = 0; i < COMPLETE_RUN_LENGTH; i++) {
      const expectedRank = (13 - i) as Rank
      if (cards[i].suit !== suit || cards[i].rank !== expectedRank) {
        return false
      }
    }
    return true
  }

  /** 是否可从牌堆发牌（经典规则：不能有空列） */
  canDeal(): boolean {
    if (this.stock.length < COLUMN_COUNT) return false
    if (this.won) return false
    return this.columns.every((col) => col.length > 0)
  }

  get stockDealsLeft(): number {
    return Math.floor(this.stock.length / COLUMN_COUNT)
  }

  /** 发一轮：每列一张朝上 */
  deal(): boolean {
    if (!this.canDeal()) return false

    this.pushHistory()

    for (let c = 0; c < COLUMN_COUNT; c++) {
      const card = this.stock.shift()!
      card.faceUp = true
      this.columns[c].push(card)
    }

    this.moves += 1
    this.score = Math.max(0, this.score - 1)
    this.collectCompletedRuns()
    return true
  }

  /**
   * 提示：找一步合法移动
   * 优先：能接到同花色的移动；其次任意合法移动；最后提示发牌
   */
  findHint():
    | { type: 'move'; fromCol: number; cardIndex: number; toCol: number }
    | { type: 'deal' }
    | { type: 'none' } {
    type HintMove = {
      fromCol: number
      cardIndex: number
      toCol: number
      sameSuit: boolean
      exposes: boolean
    }
    const candidates: HintMove[] = []

    for (let from = 0; from < COLUMN_COUNT; from++) {
      const col = this.columns[from]
      if (col.length === 0) continue

      // 检查所有可移动子序列起点
      for (let i = 0; i < col.length; i++) {
        if (!this.isMovableRun(from, i)) continue
        const moving = col.slice(i)

        for (let to = 0; to < COLUMN_COUNT; to++) {
          if (to === from) continue
          if (!this.canPlaceOn(to, moving)) continue

          // 避免无意义移动：整列移到空列
          if (
            this.columns[to].length === 0 &&
            i === 0 &&
            col.length === moving.length
          ) {
            continue
          }

          const targetTop = this.columns[to][this.columns[to].length - 1]
          const sameSuit = !!(targetTop && targetTop.suit === moving[0].suit)
          // 移动后能否露出/翻开下方牌
          const exposes = i > 0

          candidates.push({
            fromCol: from,
            cardIndex: i,
            toCol: to,
            sameSuit,
            exposes,
          })
        }
      }
    }

    // 排序：同花色优先，其次能翻开/露出牌的
    candidates.sort((a, b) => {
      if (a.sameSuit !== b.sameSuit) return a.sameSuit ? -1 : 1
      if (a.exposes !== b.exposes) return a.exposes ? -1 : 1
      return 0
    })

    if (candidates.length > 0) {
      const best = candidates[0]
      return {
        type: 'move',
        fromCol: best.fromCol,
        cardIndex: best.cardIndex,
        toCol: best.toCol,
      }
    }

    if (this.canDeal()) return { type: 'deal' }
    return { type: 'none' }
  }

  /** 用于 UI 的浅拷贝视图 */
  getView() {
    return {
      columns: this.columns,
      stockDealsLeft: this.stockDealsLeft,
      completed: this.completed,
      score: this.score,
      moves: this.moves,
      difficulty: this.difficulty,
      won: this.won,
      canDeal: this.canDeal(),
      canUndo: this.canUndo(),
    }
  }
}

/** 判断选中的牌是否仍有效 */
export function selectionStillValid(
  engine: SpiderEngine,
  sel: MoveSelection | null,
): boolean {
  if (!sel) return false
  return engine.isMovableRun(sel.colIndex, sel.cardIndex)
}
