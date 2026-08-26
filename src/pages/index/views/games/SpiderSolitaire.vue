<template>
  <div class="game-page">
    <!-- 难度选择 -->
    <div v-if="phase === 'select'" class="select-screen">
      <Header />
      <main class="select-main">
        <div class="page-toolbar">
          <button class="back-link" type="button" @click="goGames">← 返回游戏列表</button>
        </div>

        <header class="page-intro">
          <h1>蜘蛛纸牌</h1>
          <p class="sub">经典 Windows 蜘蛛牌玩法 · 双色 / 四色难度 · 同花色 K→A 收牌过关</p>
        </header>

        <section class="section">
          <h2 class="section-title">选择难度</h2>
          <div class="diff-grid">
            <button
              type="button"
              class="diff-card"
              :class="{ active: selectedDiff === 2 }"
              @click="selectedDiff = 2"
            >
              <div class="diff-icon">♠️♥️</div>
              <h3>双色</h3>
              <p class="diff-tag medium">中等</p>
              <p>仅使用黑桃与红心，共 8 副半色牌。同花色序列更容易凑齐，适合入门与休闲。</p>
              <ul>
                <li>2 种花色 × 4 套</li>
                <li>104 张牌 · 10 列</li>
                <li>完成 8 条 K→A 同花序列</li>
              </ul>
            </button>

            <button
              type="button"
              class="diff-card"
              :class="{ active: selectedDiff === 4 }"
              @click="selectedDiff = 4"
            >
              <div class="diff-icon">♠️♥️♦️♣️</div>
              <h3>四色</h3>
              <p class="diff-tag hard">困难</p>
              <p>完整四色两副牌。任意花色可叠放，但只有同花色连续序列才能整体移动，挑战更高。</p>
              <ul>
                <li>4 种花色 × 2 套</li>
                <li>104 张牌 · 10 列</li>
                <li>经典 Windows 最高难度</li>
              </ul>
            </button>
          </div>
        </section>

        <div class="controls-tip">
          <h4>操作说明</h4>
          <p>点击选中可移动的牌序列，再点击目标列放置 · 也可拖拽移动</p>
          <p>牌按点数递减叠放（不限花色）· 仅同花色连续序列可一起移动</p>
          <p>凑齐同花色 K→Q→…→A 自动收走 · 有空列时不可发牌</p>
        </div>

        <div class="start-row">
          <button class="start-btn" type="button" @click="startGame">开始游戏</button>
        </div>
      </main>
      <Footer />
    </div>

    <!-- 对局 -->
    <div v-else class="play-screen">
      <div class="play-toolbar">
        <button class="tool-btn ghost" type="button" @click="quitToSelect">← 退出</button>
        <div class="stats">
          <span class="stat"
            ><label>难度</label><strong>{{ difficultyLabel }}</strong></span
          >
          <span class="stat"
            ><label>得分</label><strong>{{ score }}</strong></span
          >
          <span class="stat"
            ><label>步数</label><strong>{{ moves }}</strong></span
          >
          <span class="stat"
            ><label>收牌</label><strong>{{ completed }}/8</strong></span
          >
        </div>
        <div class="tool-actions">
          <button class="tool-btn" type="button" :disabled="!canUndo" @click="onUndo">撤销</button>
          <button class="tool-btn" type="button" @click="onHint">提示</button>
          <button class="tool-btn" type="button" @click="onRestart">重开</button>
        </div>
      </div>

      <div v-if="toast" class="toast" role="status">{{ toast }}</div>

      <div class="board-wrap">
        <div class="board">
          <!-- 顶部：完成区 + 牌堆 -->
          <div class="top-row">
            <div class="completed-area" :title="`已完成 ${completed} 条序列`">
              <div
                v-for="n in 8"
                :key="'done-' + n"
                class="foundation-slot"
                :class="{ filled: n <= completed }"
              >
                <span v-if="n <= completed" class="mini-card">K♠</span>
              </div>
            </div>

            <div class="stock-area">
              <button
                type="button"
                class="stock-pile"
                :class="{
                  disabled: !canDeal,
                  empty: stockDealsLeft === 0,
                  'hint-deal': hint?.type === 'deal',
                }"
                :disabled="!canDeal"
                :title="stockTitle"
                @click="onDeal"
              >
                <template v-if="stockDealsLeft > 0">
                  <div
                    v-for="i in Math.min(stockDealsLeft, 5)"
                    :key="'stock-' + i"
                    class="stock-card-back"
                    :style="{ transform: `translate(${(i - 1) * 3}px, ${(i - 1) * -2}px)` }"
                  />
                  <span class="stock-count">{{ stockDealsLeft }}</span>
                </template>
                <span v-else class="stock-empty">空</span>
              </button>
              <span class="stock-label">发牌</span>
            </div>
          </div>

          <!-- 10 列牌桌 -->
          <div class="tableau" @click.self="clearSelection">
            <div
              v-for="(col, colIndex) in columns"
              :key="'col-' + colIndex"
              class="column"
              :class="{
                'drop-target': isDropTarget(colIndex),
                'hint-target': hint?.type === 'move' && hint.toCol === colIndex,
              }"
              @click="onColumnClick(colIndex)"
              @dragover.prevent="onDragOver($event, colIndex)"
              @drop.prevent="onDrop(colIndex)"
            >
              <div v-if="col.length === 0" class="empty-slot" :class="{ highlight: isDropTarget(colIndex) }">
                <span>空</span>
              </div>

              <div
                v-for="(card, cardIndex) in col"
                :key="card.id"
                class="card"
                :class="cardClass(colIndex, cardIndex, card)"
                :style="cardStyle(cardIndex)"
                :draggable="card.faceUp && isMovableRun(colIndex, cardIndex)"
                @click.stop="onCardClick(colIndex, cardIndex)"
                @dragstart="onDragStart($event, colIndex, cardIndex)"
                @dragend="onDragEnd"
              >
                <template v-if="card.faceUp">
                  <span class="corner top">
                    <span class="rank">{{ rankLabel(card.rank) }}</span>
                    <span class="suit">{{ suitSymbol(card.suit) }}</span>
                  </span>
                  <span class="center-suit">{{ suitSymbol(card.suit) }}</span>
                  <span class="corner bottom">
                    <span class="rank">{{ rankLabel(card.rank) }}</span>
                    <span class="suit">{{ suitSymbol(card.suit) }}</span>
                  </span>
                </template>
                <template v-else>
                  <div class="card-back-pattern" />
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 胜利弹窗 -->
      <div v-if="won" class="win-mask">
        <div class="win-modal" role="dialog" aria-modal="true">
          <div class="win-emoji">🕷️🎉</div>
          <h2>恭喜通关！</h2>
          <p>
            难度 <b>{{ difficultyLabel }}</b> · 得分 <b>{{ score }}</b> · 步数 <b>{{ moves }}</b>
          </p>
          <div class="win-actions">
            <button type="button" class="tool-btn ghost" @click="quitToSelect">返回选难度</button>
            <button type="button" class="start-btn" @click="onRestart">再来一局</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import Header from '../../components/Header.vue'
import Footer from '../../components/Footer.vue'
import { SpiderEngine } from '../../games/spider-solitaire/engine'
import type { Card, Difficulty, MoveSelection, Rank, Suit } from '../../games/spider-solitaire/types'
import { RANK_LABEL, SUIT_COLOR, SUIT_SYMBOL } from '../../games/spider-solitaire/types'

const router = useRouter()

type Phase = 'select' | 'play'
type HintState =
  | { type: 'move'; fromCol: number; cardIndex: number; toCol: number }
  | { type: 'deal' }
  | null

const phase = ref<Phase>('select')
const selectedDiff = ref<Difficulty>(2)

const engine = shallowRef(new SpiderEngine(2))

// 响应式视图状态（从引擎同步）
const columns = ref<Card[][]>([])
const stockDealsLeft = ref(0)
const completed = ref(0)
const score = ref(500)
const moves = ref(0)
const won = ref(false)
const canDeal = ref(false)
const canUndo = ref(false)
const difficulty = ref<Difficulty>(2)

const selection = ref<MoveSelection | null>(null)
const hint = ref<HintState>(null)
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
let hintTimer: ReturnType<typeof setTimeout> | null = null

const dragSource = ref<MoveSelection | null>(null)

const difficultyLabel = computed(() => (difficulty.value === 2 ? '双色' : '四色'))

const stockTitle = computed(() => {
  if (stockDealsLeft.value === 0) return '牌堆已空'
  if (!canDeal.value) return '有空列时不能发牌，请先填满所有列'
  return `发牌（剩余 ${stockDealsLeft.value} 轮）`
})

function syncFromEngine() {
  const v = engine.value.getView()
  // 深拷贝列数据以触发 Vue 更新
  columns.value = v.columns.map((col) => col.map((c) => ({ ...c })))
  stockDealsLeft.value = v.stockDealsLeft
  completed.value = v.completed
  score.value = v.score
  moves.value = v.moves
  won.value = v.won
  canDeal.value = v.canDeal
  canUndo.value = v.canUndo
  difficulty.value = v.difficulty
}

function showToast(msg: string, ms = 2200) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, ms)
}

function clearHint() {
  hint.value = null
  if (hintTimer) {
    clearTimeout(hintTimer)
    hintTimer = null
  }
}

function goGames() {
  router.push('/Games')
}

function startGame() {
  engine.value = new SpiderEngine(selectedDiff.value)
  selection.value = null
  dragSource.value = null
  clearHint()
  syncFromEngine()
  phase.value = 'play'
}

function quitToSelect() {
  phase.value = 'select'
  selection.value = null
  clearHint()
}

function onRestart() {
  engine.value.newGame(difficulty.value)
  selection.value = null
  dragSource.value = null
  clearHint()
  syncFromEngine()
  showToast('已重新开局')
}

function onUndo() {
  if (!engine.value.undo()) return
  selection.value = null
  clearHint()
  syncFromEngine()
}

function onHint() {
  clearHint()
  const result = engine.value.findHint()
  if (result.type === 'none') {
    showToast('当前没有可用的提示')
    return
  }
  if (result.type === 'deal') {
    hint.value = { type: 'deal' }
    showToast('提示：点击右侧牌堆发牌')
  } else {
    hint.value = result
    showToast('提示：高亮的牌可以移动到目标列')
  }
  hintTimer = setTimeout(() => {
    clearHint()
  }, 4000)
}

function onDeal() {
  clearHint()
  if (!engine.value.canDeal()) {
    if (engine.value.stockDealsLeft === 0) {
      showToast('牌堆已空')
    } else {
      showToast('有空列时不能发牌')
    }
    return
  }
  engine.value.deal()
  selection.value = null
  syncFromEngine()
}

function rankLabel(rank: Rank) {
  return RANK_LABEL[rank]
}

function suitSymbol(suit: Suit) {
  return SUIT_SYMBOL[suit]
}

function isMovableRun(colIndex: number, cardIndex: number) {
  return engine.value.isMovableRun(colIndex, cardIndex)
}

function isSelected(colIndex: number, cardIndex: number) {
  const sel = selection.value
  if (!sel || sel.colIndex !== colIndex) return false
  return cardIndex >= sel.cardIndex
}

function isHintSource(colIndex: number, cardIndex: number) {
  const h = hint.value
  if (!h || h.type !== 'move') return false
  if (h.fromCol !== colIndex) return false
  return cardIndex >= h.cardIndex
}

function isDropTarget(colIndex: number) {
  if (!selection.value) return false
  if (selection.value.colIndex === colIndex) return false
  const moving = engine.value.columns[selection.value.colIndex]?.slice(selection.value.cardIndex)
  if (!moving?.length) return false
  return engine.value.canPlaceOn(colIndex, moving)
}

function cardClass(colIndex: number, cardIndex: number, card: Card) {
  const color = card.faceUp ? SUIT_COLOR[card.suit] : 'back'
  return {
    faceup: card.faceUp,
    facedown: !card.faceUp,
    red: color === 'red',
    black: color === 'black',
    selected: isSelected(colIndex, cardIndex),
    'hint-source': isHintSource(colIndex, cardIndex),
    movable: card.faceUp && isMovableRun(colIndex, cardIndex),
  }
}

/** 牌叠垂直偏移 */
function cardStyle(cardIndex: number) {
  return {
    top: `${cardIndex * varCardOffset()}px`,
    zIndex: cardIndex + 1,
  }
}

function varCardOffset() {
  // 在窄屏略收紧
  if (typeof window !== 'undefined' && window.innerWidth < 720) return 22
  return 28
}

function clearSelection() {
  selection.value = null
}

function onCardClick(colIndex: number, cardIndex: number) {
  clearHint()
  const card = engine.value.columns[colIndex]?.[cardIndex]
  if (!card) return

  // 已有选中 → 尝试放到该列
  if (selection.value) {
    const { colIndex: fromCol, cardIndex: fromIdx } = selection.value
    if (fromCol === colIndex) {
      // 点同一列：若点到选中序列内则取消；否则尝试改选
      if (cardIndex >= fromIdx) {
        selection.value = null
        return
      }
      if (engine.value.isMovableRun(colIndex, cardIndex)) {
        selection.value = { colIndex, cardIndex }
      } else {
        selection.value = null
      }
      return
    }

    const ok = engine.value.move(fromCol, fromIdx, colIndex)
    selection.value = null
    if (ok) {
      syncFromEngine()
    } else if (card.faceUp && engine.value.isMovableRun(colIndex, cardIndex)) {
      // 无法放置则改选目标列的可移动牌
      selection.value = { colIndex, cardIndex }
    } else {
      showToast('无法移动到此处')
    }
    return
  }

  // 无选中：选中可移动序列
  if (!card.faceUp) return
  if (!engine.value.isMovableRun(colIndex, cardIndex)) {
    showToast('只能移动同花色连续递减的牌组')
    return
  }
  selection.value = { colIndex, cardIndex }
}

function onColumnClick(colIndex: number) {
  clearHint()
  // 点击空列或列空白区域放置
  if (!selection.value) return
  const { colIndex: fromCol, cardIndex: fromIdx } = selection.value
  if (fromCol === colIndex) {
    selection.value = null
    return
  }
  const ok = engine.value.move(fromCol, fromIdx, colIndex)
  selection.value = null
  if (ok) {
    syncFromEngine()
  } else {
    showToast('无法移动到此处')
  }
}

/* —— 拖拽 —— */
function onDragStart(e: DragEvent, colIndex: number, cardIndex: number) {
  clearHint()
  if (!engine.value.isMovableRun(colIndex, cardIndex)) {
    e.preventDefault()
    return
  }
  dragSource.value = { colIndex, cardIndex }
  selection.value = { colIndex, cardIndex }
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `${colIndex},${cardIndex}`)
  }
}

function onDragEnd() {
  dragSource.value = null
}

function onDragOver(e: DragEvent, colIndex: number) {
  if (!dragSource.value && !selection.value) return
  const src = dragSource.value || selection.value
  if (!src || src.colIndex === colIndex) return
  const moving = engine.value.columns[src.colIndex]?.slice(src.cardIndex)
  if (moving && engine.value.canPlaceOn(colIndex, moving)) {
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  }
}

function onDrop(colIndex: number) {
  const src = dragSource.value || selection.value
  dragSource.value = null
  if (!src) return
  if (src.colIndex === colIndex) {
    selection.value = null
    return
  }
  const ok = engine.value.move(src.colIndex, src.cardIndex, colIndex)
  selection.value = null
  if (ok) syncFromEngine()
}

function onKeydown(e: KeyboardEvent) {
  if (phase.value !== 'play') return
  if (e.key === 'Escape') {
    selection.value = null
    clearHint()
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    onUndo()
  } else if (e.key.toLowerCase() === 'h') {
    onHint()
  } else if (e.key.toLowerCase() === 'd') {
    onDeal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (toastTimer) clearTimeout(toastTimer)
  if (hintTimer) clearTimeout(hintTimer)
})
</script>

<style scoped>
.game-page {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  color: #fff;
}

/* —— 选择页 —— */
.select-screen {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #14532d 40%, #1e1b4b 100%);
  display: flex;
  flex-direction: column;
}

.select-main {
  flex: 1;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 3rem;
  box-sizing: border-box;
}

.page-toolbar {
  margin-bottom: 1rem;
}

.back-link,
.tool-btn.ghost {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #cbd5e1;
  border-radius: 999px;
  padding: 0.4rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.back-link:hover,
.tool-btn.ghost:hover {
  border-color: #86efac;
  color: #fff;
}

.page-intro {
  text-align: center;
  margin-bottom: 2rem;
}

.page-intro h1 {
  margin: 0 0 0.5rem;
  font-size: 2.2rem;
  background: linear-gradient(to right, #86efac, #38bdf8);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.page-intro .sub {
  color: #94a3b8;
  margin: 0;
}

.section-title {
  font-size: 1.1rem;
  color: #a7f3d0;
  margin: 0 0 1rem;
}

.diff-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.diff-card {
  text-align: left;
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 1.4rem 1.3rem;
  color: #e2e8f0;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}

.diff-card:hover {
  transform: translateY(-3px);
  border-color: rgba(134, 239, 172, 0.45);
}

.diff-card.active {
  border-color: #4ade80;
  box-shadow: 0 0 0 1px #4ade80, 0 12px 32px rgba(74, 222, 128, 0.2);
  background: rgba(74, 222, 128, 0.08);
}

.diff-icon {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
  letter-spacing: 0.15em;
}

.diff-card h3 {
  margin: 0 0 0.35rem;
  font-size: 1.35rem;
  color: #fff;
}

.diff-tag {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
  margin-bottom: 0.6rem;
}

.diff-tag.medium {
  background: rgba(56, 189, 248, 0.2);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.4);
}

.diff-tag.hard {
  background: rgba(248, 113, 113, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(248, 113, 113, 0.4);
}

.diff-card p {
  margin: 0 0 0.75rem;
  color: #cbd5e1;
  line-height: 1.5;
  font-size: 0.92rem;
}

.diff-card ul {
  margin: 0;
  padding-left: 1.1rem;
  color: #94a3b8;
  font-size: 0.85rem;
  line-height: 1.6;
}

.controls-tip {
  margin-top: 2rem;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem 1.25rem;
}

.controls-tip h4 {
  margin: 0 0 0.5rem;
  color: #86efac;
}

.controls-tip p {
  margin: 0.25rem 0;
  color: #94a3b8;
  font-size: 0.9rem;
}

.start-row {
  margin-top: 1.75rem;
  text-align: center;
}

.start-btn {
  border: none;
  border-radius: 999px;
  padding: 0.75rem 2.2rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: #052e16;
  background: linear-gradient(135deg, #4ade80, #22d3ee);
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(74, 222, 128, 0.35);
  transition: transform 0.15s, box-shadow 0.15s;
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(74, 222, 128, 0.45);
}

/* —— 对局页 —— */
.play-screen {
  min-height: 100vh;
  background:
    radial-gradient(ellipse at top, #166534 0%, transparent 55%),
    linear-gradient(160deg, #052e16 0%, #0f172a 50%, #14532d 100%);
  display: flex;
  flex-direction: column;
  position: relative;
}

.play-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 50;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem 1rem;
  flex: 1;
  justify-content: center;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 3.5rem;
}

.stat label {
  font-size: 11px;
  color: #86efac;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat strong {
  font-size: 1.05rem;
  color: #fff;
}

.tool-actions {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.tool-btn {
  border: 1px solid rgba(134, 239, 172, 0.35);
  background: rgba(74, 222, 128, 0.12);
  color: #ecfdf5;
  border-radius: 8px;
  padding: 0.4rem 0.85rem;
  font-size: 0.88rem;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}

.tool-btn:hover:not(:disabled) {
  background: rgba(74, 222, 128, 0.28);
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toast {
  position: fixed;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 80;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(134, 239, 172, 0.4);
  color: #e2e8f0;
  padding: 0.55rem 1.2rem;
  border-radius: 999px;
  font-size: 0.9rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  animation: fade-in 0.2s ease;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.board-wrap {
  flex: 1;
  overflow-x: auto;
  padding: 1rem 0.75rem 2rem;
}

.board {
  min-width: 780px;
  max-width: 1100px;
  margin: 0 auto;
}

.top-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 1.25rem;
  gap: 1rem;
  padding: 0 0.25rem;
}

.completed-area {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.foundation-slot {
  width: 42px;
  height: 58px;
  border-radius: 6px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.foundation-slot.filled {
  border-style: solid;
  border-color: rgba(74, 222, 128, 0.5);
  background: linear-gradient(145deg, #f8fafc, #e2e8f0);
}

.mini-card {
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
}

.stock-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stock-pile {
  position: relative;
  width: 64px;
  height: 88px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
}

.stock-pile.disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.stock-pile.empty {
  border: 2px dashed rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stock-card-back {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background:
    repeating-linear-gradient(
      45deg,
      #1e3a8a,
      #1e3a8a 4px,
      #1e40af 4px,
      #1e40af 8px
    );
  border: 2px solid #93c5fd;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}

.stock-count {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.25rem;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  z-index: 6;
}

.stock-empty {
  color: #64748b;
  font-size: 0.85rem;
}

.stock-label {
  font-size: 12px;
  color: #86efac;
}

.stock-pile:not(.disabled):hover .stock-card-back {
  filter: brightness(1.15);
}

.stock-pile.hint-deal .stock-card-back {
  box-shadow: 0 0 0 3px #fbbf24, 0 6px 14px rgba(251, 191, 36, 0.5);
  animation: pulse-hint 0.9s ease infinite alternate;
}

.tableau {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 6px;
  min-height: 420px;
}

.column {
  position: relative;
  min-height: 420px;
  border-radius: 10px;
  transition: background 0.15s;
  /* 为绝对定位的牌提供定位上下文 */
}

.column.drop-target,
.column.hint-target {
  background: rgba(74, 222, 128, 0.12);
  outline: 1px dashed rgba(74, 222, 128, 0.5);
}

.empty-slot {
  height: 96px;
  border-radius: 10px;
  border: 2px dashed rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.25);
  font-size: 0.8rem;
}

.empty-slot.highlight {
  border-color: #4ade80;
  color: #86efac;
  background: rgba(74, 222, 128, 0.1);
}

.card {
  position: absolute;
  left: 0;
  right: 0;
  width: 100%;
  max-width: 92px;
  margin: 0 auto;
  height: 96px;
  border-radius: 8px;
  box-sizing: border-box;
  user-select: none;
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s;
}

.card.facedown {
  background:
    repeating-linear-gradient(
      135deg,
      #1e3a8a,
      #1e3a8a 5px,
      #1d4ed8 5px,
      #1d4ed8 10px
    );
  border: 2px solid #93c5fd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.card-back-pattern {
  width: 100%;
  height: 100%;
}

.card.faceup {
  background: linear-gradient(165deg, #ffffff 0%, #f1f5f9 100%);
  border: 1px solid #cbd5e1;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  cursor: grab;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4px 5px;
}

.card.faceup:active {
  cursor: grabbing;
}

.card.red {
  color: #dc2626;
}

.card.black {
  color: #0f172a;
}

.card.selected {
  transform: translateY(-8px);
  box-shadow: 0 8px 16px rgba(74, 222, 128, 0.45), 0 0 0 2px #4ade80;
  z-index: 40 !important;
}

.card.hint-source {
  box-shadow: 0 0 0 3px #fbbf24, 0 6px 14px rgba(251, 191, 36, 0.4);
  animation: pulse-hint 0.9s ease infinite alternate;
}

@keyframes pulse-hint {
  from {
    filter: brightness(1);
  }
  to {
    filter: brightness(1.12);
  }
}

.card.movable:hover:not(.selected) {
  filter: brightness(1.05);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
}

.corner {
  display: flex;
  flex-direction: column;
  line-height: 1.05;
  font-weight: 700;
  font-size: 0.78rem;
}

.corner.top {
  align-self: flex-start;
}

.corner.bottom {
  align-self: flex-end;
  transform: rotate(180deg);
}

.center-suit {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.6rem;
  opacity: 0.9;
  pointer-events: none;
}

.rank {
  font-size: 0.85rem;
}

.suit {
  font-size: 0.75rem;
}

/* 胜利 */
.win-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.win-modal {
  background: linear-gradient(160deg, #064e3b, #0f172a);
  border: 1px solid rgba(74, 222, 128, 0.4);
  border-radius: 20px;
  padding: 2rem 2.2rem;
  text-align: center;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.win-emoji {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.win-modal h2 {
  margin: 0 0 0.75rem;
  color: #4ade80;
  font-size: 1.75rem;
}

.win-modal p {
  color: #cbd5e1;
  margin: 0 0 1.5rem;
}

.win-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .diff-grid {
    grid-template-columns: 1fr;
  }

  .page-intro h1 {
    font-size: 1.7rem;
  }

  .board {
    min-width: 640px;
  }

  .card {
    height: 80px;
  }

  .empty-slot {
    height: 80px;
  }

  .center-suit {
    font-size: 1.25rem;
  }

  .play-toolbar {
    justify-content: center;
  }
}
</style>
