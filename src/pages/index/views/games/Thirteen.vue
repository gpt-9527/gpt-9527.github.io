<template>
  <div class="game-page">
    <!-- 开局 / 规则页 -->
    <div v-if="phase === 'select'" class="select-screen">
      <Header />
      <main class="select-main">
        <div class="page-toolbar">
          <button class="back-link" type="button" @click="goGames">← 返回游戏列表</button>
        </div>

        <header class="page-intro">
          <h1>十三张</h1>
          <p class="sub">经典四人纸牌 · 头中尾三墩比大小 · 打枪翻倍 · 特殊牌型免比</p>
        </header>

        <section class="section">
          <h2 class="section-title">牌桌信息</h2>
          <div class="table-info">
            <span><label>玩家数</label><strong>4 人（你 + 3 名 NPC）</strong></span>
            <span><label>初始资金</label><strong>{{ fmtCoins(START_COINS) }} 游戏币</strong></span>
            <span><label>单注</label><strong>{{ fmtCoins(UNIT) }}</strong></span>
            <span><label>当前余额</label><strong :class="{ broke: mySavedBalance <= 0 }">{{ fmtCoins(mySavedBalance) }}</strong></span>
          </div>
        </section>

        <section class="section">
          <h2 class="section-title">玩法说明</h2>
          <div class="rules-grid">
            <div class="rules-block">
              <h4>基本流程</h4>
              <ul>
                <li>一副 52 张扑克，每人发 13 张</li>
                <li>理成三墩：头墩 3 张、中墩 5 张、尾墩 5 张</li>
                <li>尾墩 ≥ 中墩 ≥ 头墩，否则为相公不能开牌</li>
                <li>两两比牌，每墩胜者收 1 注（{{ fmtCoins(UNIT) }}）</li>
              </ul>
            </div>
            <div class="rules-block">
              <h4>加成规则</h4>
              <ul>
                <li>冲三：头墩三条赢墩按 3 注计</li>
                <li>中墩葫芦：赢墩按 2 注计</li>
                <li>🔫 打枪：对某家三墩全胜，该家成绩翻倍</li>
                <li>🎯 全垒打：三家全被打枪，总成绩再翻倍</li>
              </ul>
            </div>
            <div class="rules-block">
              <h4>特殊牌型（免比三墩，向每家收注）</h4>
              <ul>
                <li v-for="(def, key) in SPECIAL_DEFS" :key="key">
                  {{ def.name }} ×{{ def.mult }} —— {{ def.desc }}
                </li>
                <li>双方均有特殊牌时，倍数高者赢差值</li>
              </ul>
            </div>
            <div class="rules-block">
              <h4>资金</h4>
              <ul>
                <li>初始 100 万游戏币，单注 100</li>
                <li>NPC 破产自动补足 100 万</li>
                <li>你破产后可点「重整旗鼓」重置资金</li>
                <li>余额与局数自动保存在本地</li>
              </ul>
            </div>
          </div>
        </section>

        <section class="section">
          <h2 class="section-title">牌型大小（五张）</h2>
          <p class="rank-line">同花顺 ＞ 铁支(四条) ＞ 葫芦 ＞ 同花 ＞ 顺子 ＞ 三条 ＞ 两对 ＞ 对子 ＞ 散牌　·　头墩只有：三条 ＞ 对子 ＞ 散牌</p>
        </section>

        <div class="start-row">
          <button class="start-btn" type="button" @click="startGame">
            {{ hasSave ? '继续游戏' : '开始游戏' }}
          </button>
          <button v-if="hasSave" class="ghost-btn" type="button" @click="resetAll">重置资金</button>
        </div>
      </main>
      <Footer />
    </div>

    <!-- 对局 -->
    <div v-else class="play-screen">
      <div class="play-toolbar">
        <button class="tool-btn ghost" type="button" @click="quitToSelect">← 退出</button>
        <div class="stats">
          <span class="stat"><label>局数</label><strong>第 {{ roundNo }} 局</strong></span>
          <span class="stat"><label>单注</label><strong>{{ fmtCoins(UNIT) }}</strong></span>
          <span class="stat"><label>我的余额</label><strong>{{ fmtCoins(myBalance) }}</strong></span>
        </div>
        <div class="tool-actions">
          <button class="tool-btn" type="button" @click="showRules = true">规则</button>
          <button class="tool-btn" type="button" @click="toggleMute">
            {{ muted ? '🔇 音效关' : '🔊 音效开' }}
          </button>
          <button class="tool-btn" type="button" @click="resetAll">重置资金</button>
        </div>
      </div>

      <div v-if="toast" class="toast" role="status">{{ toast }}</div>

      <!-- 三位对手 -->
      <div class="opponents">
        <div
          v-for="p in npcPlayers"
          :key="p.id"
          class="opp-panel"
          :class="{ winner: isWinner(p.id), loser: isLoser(p.id) }"
        >
          <div class="opp-head">
            <span class="avatar">{{ p.avatar }}</span>
            <div class="opp-meta">
              <strong>{{ p.name }}</strong>
              <em>{{ fmtCoins(p.balance) }}</em>
            </div>
            <span v-if="p.special" class="special-chip">{{ p.special.name }} ×{{ p.special.mult }}</span>
          </div>

          <!-- 未开牌：牌背 -->
          <div v-if="phase === 'arranging'" class="opp-fan">
            <span v-for="i in 13" :key="i" class="mini-back" :style="{ marginLeft: i === 1 ? '0' : '-16px' }" />
          </div>

          <!-- 开牌：三墩 -->
          <div v-else-if="phase === 'reveal' && p.arrangement" class="opp-segments">
            <div
              v-for="row in oppRows(p)"
              :key="row.segment"
              class="opp-row"
              :class="{ 'beat-me': row.beatsMe, 'lost-to-me': row.lostToMe }"
            >
              <span class="row-tag">{{ SEGMENT_NAME[row.segment] }}</span>
              <span class="mini-cards">
                <MiniCard v-for="c in row.cards" :key="c.id" :card="c" />
              </span>
              <span class="row-name">{{ row.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 我的牌桌 -->
      <div class="my-table">
        <div class="table-title">我的牌桌 <span v-if="mySpecial" class="special-chip big">特殊牌型：{{ mySpecial.name }} ×{{ mySpecial.mult }}</span></div>

        <div v-for="seg in segmentOrder" :key="seg" class="segment-row">
          <div class="seg-label">
            <strong>{{ SEGMENT_NAME[seg] }}</strong>
            <em>{{ SEGMENT_SIZE[seg] }} 张</em>
            <span v-if="segPreview(seg)" class="seg-type">{{ segPreview(seg) }}</span>
          </div>
          <div class="slot-area">
            <div
              v-for="c in slots[seg]"
              :key="c.id"
              class="slot filled"
            >
              <PokerCard :card="c" @click="returnToHand(seg, c)" />
            </div>
            <div
              v-for="n in SEGMENT_SIZE[seg] - slots[seg].length"
              :key="'empty-' + seg + '-' + n"
              class="slot"
              @click="onSlotClick(seg)"
            />
          </div>
        </div>

        <div class="segment-row hand-row">
          <div class="seg-label"><strong>手牌</strong><em>{{ hand.length }} 张</em></div>
          <div class="hand-area">
            <PokerCard
              v-for="c in hand"
              :key="c.id"
              :card="c"
              :selected="selectedId === c.id"
              @click="onHandClick(c)"
            />
          </div>
        </div>

        <div class="action-bar">
          <button class="act-btn" type="button" :disabled="busy || !hasCards" @click="onAutoArrange">自动理牌</button>
          <button class="act-btn" type="button" :disabled="busy" @click="onClear">清空重摆</button>
          <button class="act-btn primary" type="button" :disabled="busy || !canConfirm" @click="onConfirm">
            {{ busy ? '各家理牌中…' : '确认出牌' }}
          </button>
        </div>
      </div>

      <!-- 结算面板 -->
      <div v-if="phase === 'reveal' && lastResult" class="settle-panel">
        <div class="settle-head">
          <h3>本局结算</h3>
          <span v-for="hr in homeRunNames" :key="hr" class="homerun-chip">🎯 全垒打：{{ hr }}</span>
        </div>

        <div class="delta-row">
          <div
            v-for="p in players"
            :key="'delta-' + p.id"
            class="delta-chip"
            :class="{ me: p.isHuman }"
          >
            <span class="who">{{ p.avatar }} {{ p.isHuman ? '我' : p.name }}</span>
            <span class="amt" :class="deltaClass(deltaOf(p.id))">{{ deltaText(deltaOf(p.id)) }}</span>
          </div>
        </div>

        <div class="vs-list">
          <details v-for="v in vsMeList" :key="v.id" class="vs-item" open>
            <summary>
              <span>{{ v.title }}</span>
              <b :class="deltaClass(v.myPoints)">{{ deltaText(v.myPoints) }}</b>
            </summary>
            <ul>
              <li v-for="(line, li) in v.lines" :key="li" :class="{ gain: line.points > 0, loss: line.points < 0 }">
                {{ line.text }}
                <em v-if="line.points !== 0">（{{ deltaText(line.points * UNIT) }}）</em>
              </li>
            </ul>
          </details>
        </div>

        <div class="next-row">
          <button class="act-btn primary" type="button" @click="onNextRound">下一局 →</button>
        </div>
      </div>

      <!-- 破产横幅 -->
      <div v-if="isBankrupt" class="bankrupt-banner">
        <span>💸 你已经破产了！</span>
        <button class="act-btn primary" type="button" @click="resetAll">重整旗鼓（重置 100 万）</button>
      </div>
    </div>

    <!-- 规则弹窗 -->
    <div v-if="showRules" class="modal-mask" @click.self="showRules = false">
      <div class="modal-card">
        <h3>十三张 · 规则速查</h3>
        <ul class="modal-rules">
          <li>13 张分三墩：头墩 3、中墩 5、尾墩 5，尾 ≥ 中 ≥ 头</li>
          <li>每墩与每家比较，赢一墩 +1 注（100 游戏币）</li>
          <li>冲三：头墩三条赢墩记 3 注；中墩葫芦赢墩记 2 注</li>
          <li>🔫 打枪：三墩全胜一家，该家成绩翻倍；🎯 全垒打再翻一倍</li>
          <li v-for="(def, key) in SPECIAL_DEFS" :key="key">特殊牌型 {{ def.name }} ×{{ def.mult }}（{{ def.desc }}），免比三墩直接向每家收注</li>
          <li>双方都有特殊牌时，倍数高者赢差值；倍数相同则互不支付</li>
        </ul>
        <button class="act-btn primary" type="button" @click="showRules = false">知道了</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, type PropType } from 'vue'
import { useRouter } from 'vue-router'
import Header from '../../components/Header.vue'
import Footer from '../../components/Footer.vue'
import {
  autoArrange,
  detectSpecial,
  dealHands,
  evaluateSegment,
  handName,
  settleRound,
  validateArrangement,
} from '../../games/thirteen/engine'
import type {
  Arrangement,
  Card,
  PairLine,
  PlayerState,
  RoundResult,
  Segment,
  SpecialInfo,
} from '../../games/thirteen/types'
import {
  RANK_LABEL,
  SEGMENT_NAME,
  SEGMENT_SIZE,
  START_COINS,
  STORAGE_KEY,
  SUIT_COLOR,
  SUIT_SYMBOL,
  UNIT,
  SPECIAL_DEFS,
} from '../../games/thirteen/types'
import { isMuted, loadMutePref, setMuted, sfx } from '../../games/thirteen/sfx'

/* ---------- 小型扑克牌组件 ---------- */
const PokerCard = defineComponent({
  props: {
    card: { type: Object as PropType<Card>, required: true },
    selected: { type: Boolean, default: false },
  },
  emits: ['click'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        {
          class: [
            'pcard',
            SUIT_COLOR[props.card.suit],
            { selected: props.selected },
          ],
          onClick: (e: MouseEvent) => {
            // 组件内部拦截原生冒泡，再抛出自定义 click（带原生事件，供修饰符使用）
            e.stopPropagation()
            emit('click', e)
          },
        },
        [
          h('span', { class: 'corner' }, [
            h('b', RANK_LABEL[props.card.rank]),
            h('i', SUIT_SYMBOL[props.card.suit]),
          ]),
          h('span', { class: 'big-suit' }, SUIT_SYMBOL[props.card.suit]),
        ],
      )
  },
})

const MiniCard = defineComponent({
  props: { card: { type: Object as PropType<Card>, required: true } },
  setup(props) {
    return () =>
      h(
        'span',
        { class: ['mcard', SUIT_COLOR[props.card.suit]] },
        `${RANK_LABEL[props.card.rank]}${SUIT_SYMBOL[props.card.suit]}`,
      )
  },
})

/* ---------- 常量 ---------- */
const NPC_META = [
  { name: '阿豪', avatar: '😎' },
  { name: '大虎', avatar: '🐯' },
  { name: '小狐', avatar: '🦊' },
]
const segmentOrder: Segment[] = ['front', 'middle', 'back']
const SUIT_ORDER = ['spades', 'hearts', 'clubs', 'diamonds']

interface SavedState {
  balances: number[]
  round: number
}

/* ---------- 状态 ---------- */
const router = useRouter()
const phase = ref<'select' | 'arranging' | 'reveal'>('select')
const roundNo = ref(1)
const players = ref<PlayerState[]>([])
const hand = ref<Card[]>([])
const slots = ref<Record<Segment, Card[]>>({ front: [], middle: [], back: [] })
const selectedId = ref<string | null>(null)
const toast = ref('')
const busy = ref(false)
const lastResult = ref<RoundResult | null>(null)
const showRules = ref(false)
const hasSave = ref(false)
const muted = ref(isMuted())
let toastTimer: ReturnType<typeof setTimeout> | null = null

const mySavedBalance = ref(START_COINS)

/* ---------- 初始化 ---------- */
function buildPlayers(balances?: number[]): PlayerState[] {
  const list: PlayerState[] = []
  list.push({
    id: 0,
    name: '我',
    avatar: '👤',
    isHuman: true,
    cards: [],
    arrangement: null,
    special: null,
    balance: balances?.[0] ?? START_COINS,
  })
  NPC_META.forEach((m, idx) => {
    list.push({
      id: idx + 1,
      name: m.name,
      avatar: m.avatar,
      isHuman: false,
      cards: [],
      arrangement: null,
      special: null,
      balance: balances?.[idx + 1] ?? START_COINS,
    })
  })
  return list
}

function loadSave(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedState
    if (
      Array.isArray(parsed.balances) &&
      parsed.balances.length === 4 &&
      parsed.balances.every((n) => typeof n === 'number')
    ) {
      return { balances: parsed.balances, round: Number(parsed.round) || 1 }
    }
  } catch {
    /* 忽略坏档 */
  }
  return null
}

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ balances: players.value.map((p) => p.balance), round: roundNo.value }),
    )
  } catch {
    /* 存档失败不影响游戏 */
  }
}

onMounted(() => {
  muted.value = loadMutePref()
  const saved = loadSave()
  hasSave.value = saved !== null
  if (saved) mySavedBalance.value = saved.balances[0]
})

function toggleMute() {
  muted.value = !muted.value
  setMuted(muted.value)
  if (!muted.value) sfx.confirm()
}

/* ---------- 计算属性 ---------- */
const myBalance = computed(() => players.value[0]?.balance ?? 0)
const npcPlayers = computed(() => players.value.filter((p) => !p.isHuman))
const placedCount = computed(
  () => slots.value.front.length + slots.value.middle.length + slots.value.back.length,
)
const hasCards = computed(() => placedCount.value > 0 || hand.value.length > 0)
const canConfirm = computed(() => placedCount.value === 13)
const mySpecial = computed(() => detectSpecial(allThirteen()))
const isBankrupt = computed(() => phase.value === 'reveal' && myBalance.value < 0)
const homeRunNames = computed(() => {
  const res = lastResult.value
  if (!res) return []
  return res.homeRuns.map((i) => (players.value[i]?.isHuman ? '我' : players.value[i]?.name ?? ''))
})

/* ---------- 工具 ---------- */
function fmtCoins(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}${Math.abs(n).toLocaleString('zh-CN')}`
}

function deltaText(units: number): string {
  const coins = units * UNIT
  if (coins > 0) return `+${fmtCoins(coins)}`
  if (coins < 0) return `-${fmtCoins(Math.abs(coins))}`
  return '±0'
}

function deltaClass(units: number): string {
  return units > 0 ? 'gain' : units < 0 ? 'loss' : ''
}

function showToast(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 3200)
}
onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer)
})

function allThirteen(): Card[] {
  return [...hand.value, ...slots.value.front, ...slots.value.middle, ...slots.value.back]
}

function sortHand() {
  hand.value.sort(
    (a, b) => b.rank - a.rank || SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit),
  )
}

/* ---------- 流程 ---------- */
function startGame() {
  const saved = loadSave()
  players.value = buildPlayers(saved?.balances)
  roundNo.value = saved?.round ?? 1
  hasSave.value = false
  dealNewRound()
  phase.value = 'arranging'
}

function dealNewRound() {
  const dealt = dealHands(4)
  players.value.forEach((p, i) => {
    p.cards = dealt[i]
    p.arrangement = null
    p.special = null
  })
  hand.value = [...dealt[0]]
  sortHand()
  slots.value = { front: [], middle: [], back: [] }
  selectedId.value = null
  lastResult.value = null
  sfx.dealFan(8)
}

function quitToSelect() {
  phase.value = 'select'
  const saved = loadSave()
  hasSave.value = saved !== null
  if (saved) mySavedBalance.value = saved.balances[0]
}

function goGames() {
  router.push('/Games')
}

function resetAll() {
  players.value = buildPlayers()
  roundNo.value = 1
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* 忽略 */
  }
  showToast('资金已全部重置为 100 万')
  if (phase.value !== 'select') {
    dealNewRound()
    phase.value = 'arranging'
  } else {
    mySavedBalance.value = START_COINS
    hasSave.value = false
  }
}

function onNextRound() {
  roundNo.value += 1
  dealNewRound()
  phase.value = 'arranging'
  saveState()
}

/* ---------- 理牌交互 ---------- */
function onHandClick(c: Card) {
  selectedId.value = selectedId.value === c.id ? null : c.id
}

function takeCardFromAnywhere(id: string): Card | null {
  const hi = hand.value.findIndex((c) => c.id === id)
  if (hi >= 0) return hand.value.splice(hi, 1)[0]
  for (const seg of segmentOrder) {
    const si = slots.value[seg].findIndex((c) => c.id === id)
    if (si >= 0) return slots.value[seg].splice(si, 1)[0]
  }
  return null
}

function onSlotClick(seg: Segment) {
  if (!selectedId.value) {
    if (hand.value.length > 0) showToast('请先点击手牌选中一张牌，再点击目标墩位')
    return
  }
  if (slots.value[seg].length >= SEGMENT_SIZE[seg]) {
    showToast(`${SEGMENT_NAME[seg]}已满（${SEGMENT_SIZE[seg]}张），先取回一些牌吧`)
    return
  }
  const card = takeCardFromAnywhere(selectedId.value)
  if (card) slots.value[seg].push(card)
  selectedId.value = null
}

/** 把墩内的牌取回手牌 */
function returnToHand(seg: Segment, c: Card) {
  const si = slots.value[seg].findIndex((x) => x.id === c.id)
  if (si >= 0) {
    slots.value[seg].splice(si, 1)
    hand.value.push(c)
    sortHand()
    selectedId.value = null
  }
}

function onAutoArrange() {
  if (busy.value) return
  const arranged = autoArrange(allThirteen())
  slots.value = {
    front: [...arranged.front],
    middle: [...arranged.middle],
    back: [...arranged.back],
  }
  hand.value = []
  selectedId.value = null
  showToast('已自动理牌，可点击墩内牌取回微调')
}

function onClear() {
  hand.value = allThirteen()
  slots.value = { front: [], middle: [], back: [] }
  sortHand()
  selectedId.value = null
}

/* ---------- 开牌结算 ---------- */
function onConfirm() {
  if (busy.value || !canConfirm.value) return
  const arrangement: Arrangement = {
    front: [...slots.value.front],
    middle: [...slots.value.middle],
    back: [...slots.value.back],
  }
  const v = validateArrangement(arrangement)
  if (!v.ok) {
    showToast(v.reason ?? '牌型不合法')
    return
  }

  busy.value = true
  sfx.confirm()
  window.setTimeout(() => {
    players.value[0].arrangement = arrangement
    for (let i = 1; i < players.value.length; i++) {
      players.value[i].arrangement = autoArrange(players.value[i].cards)
    }
    players.value.forEach((p) => (p.special = detectSpecial(p.cards)))

    const hands = players.value.map((p) => p.arrangement!) as Arrangement[]
    const specials = players.value.map((p) => p.special) as (SpecialInfo | null)[]
    sfx.reveal()
    const result = settleRound(hands, specials)

    result.deltas.forEach((d, i) => {
      players.value[i].balance += d * UNIT
    })

    const msgs: string[] = []
    players.value.forEach((p) => {
      if (!p.isHuman && p.balance < 0) {
        p.balance = START_COINS
        msgs.push(`${p.name} 破产，庄家自动补足 ${fmtCoins(START_COINS)}`)
      }
    })

    lastResult.value = result
    saveState()
    busy.value = false
    phase.value = 'reveal'
    if (msgs.length) showToast(msgs.join('；'))

    // 结算音效：赢 → 愉快琶音；输 → 低沉下行；平 → 中性双音
    window.setTimeout(() => {
      const myDelta = result.deltas[0]
      if (myDelta > 0) sfx.win()
      else if (myDelta < 0) sfx.lose()
      else sfx.neutral()
    }, 380)
  }, 700)
}

/* ---------- 结算展示辅助 ---------- */
function pairWithMe(pid: number) {
  const res = lastResult.value
  if (!res) return null
  return (
    res.pairs.find((p) => (p.a === 0 && p.b === pid) || (p.a === pid && p.b === 0)) ?? null
  )
}

function myPointsVs(pid: number): number {
  const pair = pairWithMe(pid)
  if (!pair) return 0
  return pair.a === 0 ? pair.points : -pair.points
}

function deltaOf(pid: number): number {
  return lastResult.value?.deltas[pid] ?? 0
}

function isWinner(pid: number): boolean {
  return deltaOf(pid) > 0
}

function isLoser(pid: number): boolean {
  return deltaOf(pid) < 0
}

interface OppRow {
  segment: Segment
  cards: Card[]
  label: string
  beatsMe: boolean
  lostToMe: boolean
}

function oppRows(p: PlayerState): OppRow[] {
  if (!p.arrangement || !players.value[0].arrangement) return []
  const mine = players.value[0].arrangement
  // 特殊牌型局免比三墩，不做墩位胜负高亮
  const specialRound = Boolean(p.special || players.value[0].special)
  return (['front', 'middle', 'back'] as Segment[]).map((seg) => {
    const cards = p.arrangement![seg]
    const label =
      p.special && seg === 'front'
        ? `${p.special.name} ×${p.special.mult}`
        : handName(evaluateSegment(seg, cards))
    let beatsMe = false
    let lostToMe = false
    if (!specialRound) {
      const c = compareSeg(mine[seg], cards, seg)
      beatsMe = c < 0
      lostToMe = c > 0
    }
    return { segment: seg, cards, label, beatsMe, lostToMe }
  })
}

function compareSeg(a: Card[], b: Card[], seg: Segment): number {
  const ea = evaluateSegment(seg, a)
  const eb = evaluateSegment(seg, b)
  if (ea.category !== eb.category) return ea.category - eb.category
  for (let i = 0; i < Math.max(ea.keys.length, eb.keys.length); i++) {
    const ka = ea.keys[i] ?? 0
    const kb = eb.keys[i] ?? 0
    if (ka !== kb) return ka - kb
  }
  return 0
}

interface VsItem {
  id: number
  title: string
  myPoints: number
  lines: PairLine[]
}

const vsMeList = computed<VsItem[]>(() => {
  if (!lastResult.value) return []
  return npcPlayers.value.map((p) => {
    const pair = pairWithMe(p.id)
    const lines = pair ? [...pair.lines].reverse() : []
    let title = `${p.avatar} ${p.name}`
    if (pair?.scoopBy === p.id) title += ' 🔫 被打枪'
    else if (pair?.scoopBy === 0) title += ' 🔫 打枪成功'
    if (pair?.special) title += ' ✦ 特殊牌型局'
    return { id: p.id, title, myPoints: myPointsVs(p.id), lines }
  })
})

/* 墩位实时牌型预览 */
function segPreview(seg: Segment): string {
  const cards = slots.value[seg]
  if (cards.length !== SEGMENT_SIZE[seg]) return ''
  return handName(evaluateSegment(seg, cards))
}
</script>

<style scoped>
.game-page {
  min-height: 100vh;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #172554 100%);
  color: #e2e8f0;
}

/* ===== 选局页 ===== */
.select-main {
  flex: 1;
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding: 0 1.25rem 3.5rem;
  box-sizing: border-box;
}
.page-toolbar {
  position: relative;
  z-index: 1;
  padding: 1.1rem 0 0.4rem;
  margin-bottom: 0.35rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.back-link {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
  cursor: pointer;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  font-size: 0.92rem;
  transition: background 0.2s, color 0.2s;
}
.back-link:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
.page-intro {
  text-align: center;
  padding: 1.25rem 0 0.5rem;
  margin-bottom: 2rem;
}
.page-intro h1 {
  margin: 0 0 0.6rem;
  font-size: 2.4rem;
  background: linear-gradient(to right, #f59e0b, #ef4444, #a78bfa);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  height: 2.4rem;
  line-height: 2.4rem;
}
.page-intro .sub {
  color: #94a3b8;
  margin: 0;
}
.section {
  margin-bottom: 1.8rem;
}
.section-title {
  font-size: 1.15rem;
  color: #fbbf24;
  margin: 0 0 0.9rem;
}
.table-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.8rem;
}
.table-info span {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.table-info label {
  font-size: 0.78rem;
  color: #94a3b8;
}
.table-info strong {
  font-size: 1.05rem;
  color: #fff;
}
.table-info strong.broke {
  color: #ef4444;
}
.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.9rem;
}
.rules-block {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 1rem 1.1rem;
}
.rules-block h4 {
  margin: 0 0 0.6rem;
  color: #e2e8f0;
  font-size: 0.98rem;
}
.rules-block ul {
  margin: 0;
  padding-left: 1.1rem;
  color: #94a3b8;
  line-height: 1.7;
  font-size: 0.88rem;
}
.rank-line {
  color: #cbd5e1;
  font-size: 0.92rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 0.85rem 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  line-height: 1.7;
}
.start-row {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}
.start-btn {
  border: none;
  border-radius: 999px;
  padding: 0.8rem 2.4rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.start-btn:hover {
  transform: translateY(-2px);
}
.ghost-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #cbd5e1;
  border-radius: 999px;
  padding: 0.8rem 1.6rem;
  cursor: pointer;
  font-size: 0.95rem;
}
.ghost-btn:hover {
  border-color: rgba(255, 255, 255, 0.5);
  color: #fff;
}

/* ===== 对局页 ===== */
.play-screen {
  max-width: 1120px;
  margin: 0 auto;
  padding: 1rem 1.2rem 3rem;
}
.play-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.stats {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
}
.stat {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  display: flex;
  gap: 0.45rem;
  align-items: baseline;
}
.stat label {
  font-size: 0.75rem;
  color: #94a3b8;
}
.stat strong {
  color: #fbbf24;
  font-size: 0.92rem;
}
.tool-actions,
.tool-btn {
  display: flex;
  gap: 0.5rem;
}
.tool-btn {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e2e8f0;
  border-radius: 999px;
  padding: 0.4rem 0.95rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s ease;
}
.tool-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
}
.tool-btn.ghost {
  background: none;
  border-color: transparent;
  color: #94a3b8;
}
.toast {
  position: fixed;
  left: 50%;
  top: 76px;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(251, 191, 36, 0.45);
  color: #fde68a;
  padding: 0.55rem 1.2rem;
  border-radius: 999px;
  z-index: 60;
  font-size: 0.9rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  max-width: min(90vw, 720px);
}

/* 对手区 */
.opponents {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.9rem;
  margin-bottom: 1rem;
}
.opp-panel {
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 0.8rem 0.9rem;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  min-height: 118px;
}
.opp-panel.winner {
  border-color: rgba(34, 197, 94, 0.55);
  box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.3), 0 8px 24px rgba(34, 197, 94, 0.12);
}
.opp-panel.loser {
  border-color: rgba(239, 68, 68, 0.5);
}
.opp-head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.55rem;
  flex-wrap: wrap;
}
.avatar {
  font-size: 1.5rem;
}
.opp-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.opp-meta strong {
  font-size: 0.95rem;
  color: #fff;
}
.opp-meta em {
  font-style: normal;
  font-size: 0.78rem;
  color: #fbbf24;
}
.special-chip {
  margin-left: auto;
  background: rgba(168, 85, 247, 0.18);
  border: 1px solid rgba(168, 85, 247, 0.5);
  color: #d8b4fe;
  border-radius: 999px;
  font-size: 0.72rem;
  padding: 0.15rem 0.55rem;
  white-space: nowrap;
}
.special-chip.big {
  margin-left: 0.6rem;
  font-size: 0.82rem;
  padding: 0.25rem 0.75rem;
}
.opp-fan {
  display: flex;
  padding-left: 6px;
  height: 40px;
  align-items: center;
}
.mini-back {
  width: 26px;
  height: 38px;
  border-radius: 4px;
  background:
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.12) 0 2px, transparent 2px 5px),
    linear-gradient(160deg, #1d4ed8, #1e3a8a);
  border: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow: -1px 0 3px rgba(0, 0, 0, 0.4);
}
.opp-segments {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.opp-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 8px;
  padding: 2px 6px;
}
.opp-row.beat-me {
  background: rgba(239, 68, 68, 0.12);
}
.opp-row.lost-to-me {
  background: rgba(34, 197, 94, 0.12);
}
.row-tag {
  font-size: 0.72rem;
  color: #94a3b8;
  width: 30px;
  flex: none;
}
.mini-cards {
  display: flex;
  gap: 3px;
  flex: none;
}
.row-name {
  font-size: 0.72rem;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 迷你牌 */
.mcard {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 22px;
  padding: 0 3px;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 4px;
  background: #f8fafc;
  border: 1px solid rgba(0, 0, 0, 0.25);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}
.mcard.red {
  color: #dc2626;
}
.mcard.black {
  color: #111827;
}

/* 我的牌桌 */
.my-table {
  background: radial-gradient(ellipse at top, rgba(180, 83, 9, 0.16), transparent 65%),
    rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  padding: 1.1rem 1.2rem 1.3rem;
}
.table-title {
  font-weight: 800;
  color: #fbbf24;
  margin-bottom: 0.9rem;
  display: flex;
  align-items: center;
}
.segment-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.55rem 0;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
}
.segment-row:last-of-type {
  border-bottom: none;
}
.seg-label {
  width: 150px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.seg-label strong {
  color: #e2e8f0;
  font-size: 0.98rem;
}
.seg-label em {
  font-style: normal;
  font-size: 0.72rem;
  color: #64748b;
}
.seg-type {
  font-size: 0.78rem;
  color: #34d399;
  font-weight: 700;
}
.slot-area {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.slot {
  width: 62px;
  height: 88px;
  border-radius: 8px;
  border: 1.5px dashed rgba(255, 255, 255, 0.22);
  transition: border-color 0.2s ease, background 0.2s ease;
}
.slot.filled {
  border-style: solid;
  border-color: transparent;
}
.hand-area {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 92px;
  align-items: center;
  padding: 4px 0;
}

/* 扑克牌 */
.pcard {
  width: 62px;
  height: 88px;
  background: linear-gradient(170deg, #ffffff, #eef2f7);
  border-radius: 9px;
  border: 1px solid rgba(0, 0, 0, 0.35);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
  position: relative;
  cursor: pointer;
  user-select: none;
  transition: transform 0.15s ease, outline-color 0.15s ease;
  outline: 2px solid transparent;
  flex: none;
}
.pcard:hover {
  transform: translateY(-6px);
}
.pcard.selected {
  transform: translateY(-14px);
  outline-color: #818cf8;
  box-shadow: 0 10px 20px rgba(99, 102, 241, 0.45);
}
.pcard .corner {
  position: absolute;
  top: 5px;
  left: 6px;
  display: flex;
  flex-direction: column;
  line-height: 1.02;
}
.pcard .corner b {
  font-size: 0.86rem;
}
.pcard .corner i {
  font-style: normal;
  font-size: 0.74rem;
}
.pcard.red {
  color: #dc2626;
}
.pcard.black {
  color: #111827;
}
.pcard .big-suit {
  position: absolute;
  right: 7px;
  bottom: 3px;
  font-size: 1.7rem;
  opacity: 0.85;
}

/* 动作栏 */
.action-bar {
  display: flex;
  justify-content: center;
  gap: 0.9rem;
  margin-top: 1.1rem;
  flex-wrap: wrap;
}
.act-btn {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.07);
  color: #e2e8f0;
  border-radius: 999px;
  padding: 0.55rem 1.4rem;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease, opacity 0.15s ease;
}
.act-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.13);
}
.act-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.act-btn.primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-color: transparent;
  color: #fff;
}
.act-btn.primary:hover:not(:disabled) {
  filter: brightness(1.1);
}

/* 结算面板 */
.settle-panel {
  margin-top: 1.2rem;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: 1.1rem 1.3rem 1.4rem;
}
.settle-head {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.9rem;
}
.settle-head h3 {
  margin: 0;
  color: #fbbf24;
}
.homerun-chip {
  background: rgba(239, 68, 68, 0.16);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #fca5a5;
  border-radius: 999px;
  padding: 0.2rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 700;
}
.delta-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.7rem;
  margin-bottom: 1rem;
}
.delta-chip {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 0.6rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.delta-chip.me {
  border-color: rgba(129, 140, 248, 0.6);
  background: rgba(99, 102, 241, 0.12);
}
.delta-chip .who {
  font-size: 0.8rem;
  color: #94a3b8;
}
.delta-chip .amt {
  font-size: 1.15rem;
  font-weight: 800;
}
.amt.gain,
.gain em {
  color: #34d399;
}
.amt.loss,
.loss em {
  color: #f87171;
}
.vs-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.8rem;
}
.vs-item {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.6rem 0.9rem;
}
.vs-item summary {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  font-weight: 700;
  font-size: 0.92rem;
}
.vs-item summary b {
  font-size: 0.95rem;
}
.vs-item ul {
  margin: 0.5rem 0 0.2rem;
  padding-left: 1rem;
  color: #94a3b8;
  font-size: 0.82rem;
  line-height: 1.75;
}
.vs-item ul li.gain {
  color: #86efac;
}
.vs-item ul li.loss {
  color: #fca5a5;
}
.next-row {
  display: flex;
  justify-content: center;
  margin-top: 1.1rem;
}

/* 破产 */
.bankrupt-banner {
  margin-top: 1rem;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.5);
  border-radius: 14px;
  padding: 0.9rem 1.2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  font-weight: 700;
  color: #fecaca;
}

/* 规则弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(3px);
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.2rem;
}
.modal-card {
  width: min(560px, 96vw);
  max-height: 84vh;
  overflow: auto;
  background: #101828;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 1.4rem 1.6rem;
}
.modal-card h3 {
  margin: 0 0 0.8rem;
  color: #fbbf24;
}
.modal-rules {
  margin: 0 0 1.1rem;
  padding-left: 1.2rem;
  color: #cbd5e1;
  line-height: 1.9;
  font-size: 0.92rem;
}

@media (max-width: 860px) {
  .opponents {
    grid-template-columns: 1fr;
  }
  .delta-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .segment-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.4rem;
  }
  .seg-label {
    width: auto;
    flex-direction: row;
    align-items: baseline;
    gap: 0.5rem;
  }
}
</style>
