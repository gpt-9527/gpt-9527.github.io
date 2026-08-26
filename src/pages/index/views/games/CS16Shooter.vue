<template>
  <div class="game-page">
    <!-- Select mode / team / weapon -->
    <div v-if="phase === 'select'" class="select-screen">
      <Header />
      <main class="select-main">
        <div class="page-toolbar">
          <button class="back-link" type="button" @click="goGames">← 返回游戏列表</button>
        </div>

        <header class="page-intro">
          <h1>战术射击：CS 复刻</h1>
          <p class="sub">
            沙漠灰 5v5 竞技 · 经济购买系统 · AK/M4/AWP 十种武器 · C4 爆破模式
          </p>
        </header>

        <!-- Team -->
        <section class="section">
          <h2 class="section-title">选择阵营（5v5 · 你 + 4 名队友 vs 5 名敌人）</h2>
          <div class="team-grid">
            <button
              v-for="t in teams"
              :key="t.id"
              type="button"
              class="team-card"
              :class="{ active: selectedTeam === t.id }"
              @click="selectedTeam = t.id"
            >
              <div class="team-icon">{{ t.emoji }}</div>
              <h3>{{ t.name }}</h3>
              <p>{{ t.description }}</p>
            </button>
          </div>
        </section>

        <!-- Loadout preference -->
        <section class="section">
          <h2 class="section-title">初始出装偏好（进游戏后随时按 B 打开购买菜单）</h2>
          <div class="weapon-grid">
            <button
              v-for="w in loadouts"
              :key="w.id"
              type="button"
              class="weapon-card"
              :class="{ active: selectedWeapon === w.id }"
              @click="selectedWeapon = w.id"
            >
              <div class="weapon-icon">{{ w.emoji }}</div>
              <h3>{{ w.name }}</h3>
              <p>{{ w.description }}</p>
              <ul>
                <li v-for="t in w.traits" :key="t">{{ t }}</li>
              </ul>
            </button>
          </div>
        </section>

        <!-- Controls -->
        <div class="controls-tip">
          <h4>操作说明</h4>
          <p>W/A/S/D 移动 · 鼠标瞄准 · 左键射击 · R 换弹 · B 购买菜单 · Tab 计分板</p>
          <p>1 主武器 / 2 手枪 / Q 快速切枪 · E 安放 / 拆除 C4 · 空格跳跃 · Ctrl 蹲下</p>
          <p class="tip-extra">
            经济规则：初始 $800 · 击杀 +$300 · 回合胜 +$3250 / 负 +$1400
          </p>
        </div>

        <div class="start-row">
          <button class="start-btn" type="button" @click="openLaunchModal">
            进入战斗
          </button>
        </div>
      </main>
      <Footer />

      <!-- Launch Modal -->
      <div
        v-if="showLaunchModal"
        class="launch-modal-mask"
        @click.self="closeLaunchModal"
      >
        <div class="launch-modal" role="dialog" aria-modal="true">
          <div class="launch-modal-head">
            <h2 id="launch-title">准备战斗</h2>
            <button type="button" class="modal-close" @click="closeLaunchModal">×</button>
          </div>

          <p class="launch-map-tip">
            地图：<b>沙漠灰 de_dust2</b>
            &nbsp;·&nbsp;
            阵营：<b>{{ currentTeam.name }}</b>
            &nbsp;·&nbsp;
            出装：<b>{{ currentLoadout.name }}</b>
          </p>

          <h3 class="modal-section-title">游戏选项</h3>
          <div class="options-panel">
            <label class="toggle-row">
              <input v-model="wantFullscreen" type="checkbox" />
              <span class="toggle-ui" aria-hidden="true"></span>
              <span class="toggle-text">
                <strong>浏览器全屏模式</strong>
                <small>开启：浏览器 Fullscreen API；关闭：页面内铺满窗口</small>
              </span>
            </label>
          </div>

          <div class="launch-modal-actions">
            <button type="button" class="ghost-btn" @click="closeLaunchModal">
              取消
            </button>
            <button type="button" class="start-btn" @click="confirmLaunch">
              确认进入
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Playing -->
    <div v-else ref="playScreen" class="play-screen">
      <div ref="canvasHost" class="canvas-host"></div>

      <div class="hud">
        <!-- 顶部中央比分牌 -->
        <div class="scoreboard-bar" :class="{ ctWin: hud.ctScore > hud.tScore, tWin: hud.tScore > hud.ctScore }">
          <div class="sb-team sb-ct">
            <span class="sb-name">CT</span>
            <span class="sb-score">{{ hud.ctScore }}</span>
            <span class="alive-dots">
              <i v-for="n in 5" :key="'ct' + n" :class="{ on: n <= hud.aliveCt }" />
            </span>
          </div>
          <div class="sb-mid">
            <b>{{ formatRoundTime(hud.roundTime) }}</b>
            <small>第 {{ hud.round }} / {{ hud.totalRounds }} 回合</small>
          </div>
          <div class="sb-team sb-t">
            <span class="alive-dots">
              <i v-for="n in 5" :key="'t' + n" :class="{ on: n <= hud.aliveT }" />
            </span>
            <span class="sb-score">{{ hud.tScore }}</span>
            <span class="sb-name">T</span>
          </div>
        </div>

        <!-- Killfeed -->
        <div class="killfeed">
          <div
            v-for="k in killfeed"
            :key="k.id"
            class="kf-row"
            :class="{ mine: k.killerTeam === myTeamId || k.victimTeam === myTeamId }"
          >
            <span class="kf-killer" :class="k.killerTeam.toLowerCase()">{{ k.killer }}</span>
            <span class="kf-weapon">{{ k.weapon }}{{ k.headshot ? ' 💥' : '' }}</span>
            <span class="kf-victim" :class="k.victimTeam.toLowerCase()">{{ k.victim }}</span>
          </div>
        </div>

        <!-- 左下 HP -->
        <div class="hud-bottom-left">
          <div class="hp-bar">
            <div class="hp-fill" :class="{ low: hpPercent < 30 }" :style="{ width: hpPercent + '%' }"></div>
            <span>{{ hud.hp }} HP</span>
          </div>
          <div class="money-tag">${{ hud.money.toLocaleString() }}</div>
        </div>

        <!-- 右下 弹药/武器槽 -->
        <div class="hud-bottom-right">
          <div class="slots">
            <div class="slot-chip" :class="{ active: hud.slot === 'primary', empty: !hud.ownedPrimary }">
              <em>1</em>{{ hud.ownedPrimary || '无主武器' }}
            </div>
            <div class="slot-chip" :class="{ active: hud.slot === 'secondary' }">
              <em>2</em>{{ hud.ownedSecondary }}
            </div>
          </div>
          <div class="ammo-line">
            <b class="ammo-big">{{ hud.ammo }}</b>
            <span class="ammo-reserve">/ {{ hud.reserve }}</span>
            <span class="weapon-name">{{ hud.weaponName }}</span>
          </div>
          <div class="kd-line">K {{ hud.kills }} · D {{ hud.deaths }}</div>
        </div>

        <!-- 准星 -->
        <div class="crosshair" aria-hidden="true">
          <span class="ch-arm ch-top"></span>
          <span class="ch-arm ch-bottom"></span>
          <span class="ch-arm ch-left"></span>
          <span class="ch-arm ch-right"></span>
          <span class="ch-dot"></span>
        </div>

        <!-- 命中标记 -->
        <div v-if="hitMarkerVisible" class="hitmarker" :class="{ headshot: hitHeadshot }" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>

        <!-- Toast / C4 -->
        <div v-if="hud.message" class="toast">{{ hud.message }}</div>
        <div v-if="hud.bombPlanted && !hud.message" class="bomb-alert">
          💣 C4 · {{ hud.bombTimer }}s
        </div>

        <!-- 计分板（Tab）-->
        <div v-if="scoreboardVisible && scoreboard" class="tab-scoreboard">
          <div class="ts-head">
            <span>沙漠灰 · de_dust2</span>
            <b>CT {{ scoreboard.ctScore }} : {{ scoreboard.tScore }} T</b>
          </div>
          <div class="ts-cols">
            <div class="ts-team ts-ct">
              <h4>保卫者 CT</h4>
              <div v-for="r in scoreboard.ct" :key="'sbc' + r.name" class="ts-row" :class="{ dead: r.dead, me: r.isPlayer }">
                <span class="ts-name">{{ r.name }}<i v-if="r.isPlayer">（你）</i></span>
                <span class="ts-k">{{ r.dead ? '☠' : r.kills }}</span>
              </div>
            </div>
            <div class="ts-team ts-t">
              <h4>潜伏者 T</h4>
              <div v-for="r in scoreboard.t" :key="'sbt' + r.name" class="ts-row" :class="{ dead: r.dead }">
                <span class="ts-name">{{ r.name }}</span>
                <span class="ts-k">{{ r.dead ? '☠' : r.kills }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 购买菜单 -->
        <div v-if="buyMenuOpen" class="buy-mask" @click.self="closeBuyMenu()">
          <div class="buy-panel">
            <div class="buy-head">
              <h3>🛒 购买装备</h3>
              <div class="buy-balance">余额 <b>${{ hud.money.toLocaleString() }}</b></div>
              <button type="button" class="modal-close" @click="closeBuyMenu()">×</button>
            </div>

            <div class="buy-cats">
              <button
                v-for="cat in BUY_CATEGORIES"
                :key="cat"
                type="button"
                class="buy-cat"
                :class="{ active: activeCat === cat }"
                @click="activeCat = cat"
              >
                {{ CATEGORY_LABEL[cat] }}
              </button>
            </div>

            <p v-if="!hud.canBuy" class="buy-warning">⚠ 当前不是购买时间（仅冻结期与开战前 15 秒可购买）</p>

            <div class="buy-list">
              <button
                v-for="w in buyListByCat(activeCat)"
                :key="w.id"
                type="button"
                class="buy-card"
                :class="{ owned: isOwned(w), poor: hud.money < w.price }"
                :disabled="!hud.canBuy"
                @click="onBuy(w)"
              >
                <div class="bc-top">
                  <b class="bc-name">{{ w.name }}</b>
                  <span class="bc-price">${{ w.price }}</span>
                </div>
                <div class="bc-stats">
                  <span>伤害 {{ w.damage }}</span>
                  <span>射速 {{ w.rpm }}</span>
                  <span>弹匣 {{ w.magSize }}</span>
                  <span v-if="w.automatic">全自动</span>
                  <span v-else>半自动</span>
                </div>
                <div class="bc-owned-tag" v-if="isOwned(w)">✓ 已装备</div>
              </button>
            </div>

            <div class="buy-foot">
              <small>B / Esc 关闭 · 冻结期自动打开 · 开战后 15 秒内仍可购买</small>
              <button type="button" class="start-btn small" @click="closeBuyMenu()">
                关闭并出战
              </button>
            </div>
          </div>
        </div>

        <!-- Result -->
        <div v-if="hud.finished" class="result-overlay">
          <div class="result-card" :class="hud.matchResult">
            <h2>{{ hud.matchResult === 'win' ? '🏆 比赛胜利' : '💀 比赛失败' }}</h2>
            <p class="score-line">
              最终比分 <b class="c">CT {{ hud.ctScore }}</b> : <b class="y">T {{ hud.tScore }}</b>
            </p>
            <p class="score-hint">
              你的战绩：击杀 <b>{{ hud.kills }}</b> · 阵亡 <b>{{ hud.deaths }}</b> · K/D {{
                hud.deaths > 0 ? (hud.kills / hud.deaths).toFixed(2) : hud.kills.toFixed(2)
              }}
            </p>

            <div class="result-actions">
              <button type="button" class="start-btn" @click="restart">再来一局</button>
              <button type="button" class="ghost-btn" @click="quitToSelect">重选配置</button>
              <button type="button" class="ghost-btn" @click="goGames">返回列表</button>
            </div>
          </div>
        </div>

        <button class="quit-btn" type="button" @click="quitToSelect">退出</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Header from '../../components/Header.vue'
import Footer from '../../components/Footer.vue'
import { CS16Engine, type ScoreboardData } from '../../games/cs16-shooter/engine'
import type {
  GameEvent,
  HudState,
  TeamId,
  WeaponCategory,
  WeaponMode,
} from '../../games/cs16-shooter/types'
import { BUY_CATEGORIES, CATEGORY_LABEL, getBuyList } from '../../games/cs16-shooter/weapons'

const router = useRouter()

/* ===================== 配置数据 ===================== */

const teams = [
  {
    id: 'ct',
    name: '保卫者 CT',
    emoji: '🛡️',
    description: '反恐精英：防守 A/B 两个包点，阻止 C4 引爆或歼灭全部潜伏者。',
  },
  {
    id: 't',
    name: '潜伏者 T',
    emoji: '💀',
    description: '恐怖分子：携带 C4 在 A/B 点安放引爆，或歼灭全部保卫者。',
  },
] as const

const loadouts = [
  {
    id: 'rifle',
    name: '步枪手偏好',
    emoji: '🔫',
    description: '首回合推荐 AK-47 / M4A1 路线，强调压枪与对枪能力。',
    traits: ['冻结期免费推荐', '中远距离优势', '适合正面交火'],
  },
  {
    id: 'sniper',
    name: '狙击手偏好',
    emoji: '🎯',
    description: '首回合推荐 Scout / AWP 路线，一击必杀，高风险高回报。',
    traits: ['瞬狙 / 架点', '穿点打击', '机动性较低'],
  },
] as const

const ALL_BUY_WEAPONS = getBuyList()

/* ===================== 状态 ===================== */

const phase = ref<'select' | 'play'>('select')
const selectedTeam = ref<TeamId>('ct')
const selectedWeapon = ref<WeaponMode>('rifle')
const wantFullscreen = ref(false)
const showLaunchModal = ref(false)

const canvasHost = ref<HTMLElement | null>(null)
const playScreen = ref<HTMLElement | null>(null)
let engine: CS16Engine | null = null

const myTeamId = computed(() => selectedTeam.value)

const hud = reactive<HudState>({
  team: 'CT',
  hp: 100,
  maxHp: 100,
  ammo: 12,
  reserve: 60,
  weaponName: 'USP-S',
  kills: 0,
  deaths: 0,
  round: 1,
  totalRounds: 15,
  ctScore: 0,
  tScore: 0,
  score: 0,
  money: 800,
  aliveCt: 5,
  aliveT: 5,
  roundTime: 100,
  canBuy: true,
  ownedPrimary: '',
  ownedSecondary: 'USP-S',
  slot: 'secondary',
  message: '',
  finished: false,
  matchResult: '',
  bombPlanted: false,
  bombTimer: 0,
})

/* ---- Killfeed / Hitmarker ---- */
interface KillfeedEntry {
  id: number
  killer: string
  killerTeam: TeamId
  victim: string
  victimTeam: TeamId
  weapon: string
  headshot: boolean
}
const killfeed = ref<KillfeedEntry[]>([])
let kfSeq = 0
let kfTimer: ReturnType<typeof setTimeout> | null = null

const hitMarkerVisible = ref(false)
const hitHeadshot = ref(false)
let hitTimer: ReturnType<typeof setTimeout> | null = null

/* ---- 购买菜单 ---- */
const buyMenuOpen = ref(false)
const activeCat = ref<WeaponCategory>('rifle')

function buyListByCat(cat: WeaponCategory) {
  return ALL_BUY_WEAPONS.filter(w => w.category === cat)
}

function isOwned(w: { name: string; category: WeaponCategory }) {
  return w.category === 'pistol'
    ? hud.ownedSecondary === w.name
    : hud.ownedPrimary === w.name
}

function openBuyMenu() {
  if (!hud.canBuy || hud.finished) return
  buyMenuOpen.value = true
  engine?.setPointerLock(false)
}

function closeBuyMenu(relock = true) {
  buyMenuOpen.value = false
  if (relock) engine?.setPointerLock(true)
}

function onBuy(w: { id: string }) {
  const ok = engine?.buy(w.id) ?? false
  if (ok && hud.money < 500) {
    /* 钱快花完时留在菜单让玩家自行决定 */
  }
}

/* ---- 计分板 ---- */
const scoreboardVisible = ref(false)
const scoreboard = ref<ScoreboardData | null>(null)
let sbTimer: ReturnType<typeof setInterval> | null = null

function refreshScoreboard() {
  if (engine && phase.value === 'play') {
    scoreboard.value = engine.getScoreboard()
  }
}

/* ---- 全局按键（B 购买 / Tab 计分板）---- */
const onGlobalKeyDown = (e: KeyboardEvent) => {
  if (phase.value !== 'play') return
  if (e.code === 'KeyB') {
    e.preventDefault()
    if (buyMenuOpen.value) closeBuyMenu()
    else openBuyMenu()
  }
  if (e.code === 'Tab') {
    e.preventDefault()
    scoreboardVisible.value = true
    refreshScoreboard()
  }
}
const onGlobalKeyUp = (e: KeyboardEvent) => {
  if (e.code === 'Tab') {
    e.preventDefault()
    scoreboardVisible.value = false
  }
}
document.addEventListener('keydown', onGlobalKeyDown)
document.addEventListener('keyup', onGlobalKeyUp)

/* ===================== Computed ===================== */

const currentTeam = computed(() => teams.find(t => t.id === selectedTeam.value)!)
const currentLoadout = computed(() => loadouts.find(w => w.id === selectedWeapon.value)!)

const hpPercent = computed(() =>
  Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100)),
)

function formatRoundTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/* ===================== Engine 生命周期 ===================== */

const destroyEngine = () => {
  engine?.dispose()
  engine = null
}

const exitFullscreenSafe = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
  } catch {}
}

const enterFullscreenSafe = async (el: HTMLElement | null) => {
  if (!wantFullscreen.value || !el) return
  try {
    if (!document.fullscreenElement) await el.requestFullscreen()
  } catch {}
}

/* ===================== 游戏事件 ===================== */

const handleGameEvent = (e: GameEvent) => {
  if (e.type === 'kill') {
    killfeed.value.push({
      id: ++kfSeq,
      killer: e.killer,
      killerTeam: e.killerTeam,
      victim: e.victim,
      victimTeam: e.victimTeam,
      weapon: e.weapon,
      headshot: e.headshot,
    })
    if (killfeed.value.length > 5) killfeed.value.splice(0, killfeed.value.length - 5)
    if (kfTimer) clearTimeout(kfTimer)
    const id = kfSeq
    kfTimer = setTimeout(() => {
      killfeed.value = killfeed.value.filter(k => k.id !== id)
    }, 7000)
  } else if (e.type === 'hit') {
    hitHeadshot.value = e.headshot
    hitMarkerVisible.value = true
    if (hitTimer) clearTimeout(hitTimer)
    hitTimer = setTimeout(() => (hitMarkerVisible.value = false), 130)
  } else if (e.type === 'roundStart') {
    // 冻结期自动弹出购买菜单
    if (!hud.finished) {
      window.setTimeout(() => openBuyMenu(), 350)
    }
  }
}

/* ===================== 流程控制 ===================== */

const openLaunchModal = () => {
  showLaunchModal.value = true
}

const closeLaunchModal = () => {
  showLaunchModal.value = false
}

const lockPageScroll = (lock: boolean) => {
  document.documentElement.style.overflow = lock ? 'hidden' : ''
  document.body.style.overflow = lock ? 'hidden' : ''
}

const startGame = async () => {
  showLaunchModal.value = false
  phase.value = 'play'
  destroyEngine()
  lockPageScroll(true)
  killfeed.value = []
  buyMenuOpen.value = false
  scoreboardVisible.value = false

  await nextTick()
  await new Promise(r => requestAnimationFrame(() => r(null)))

  if (!wantFullscreen.value) {
    await exitFullscreenSafe()
  } else {
    await enterFullscreenSafe(playScreen.value)
  }

  await new Promise(r => setTimeout(r, 50))

  engine = new CS16Engine({
    canvasHost: canvasHost.value!,
    team: selectedTeam.value,
    weaponMode: selectedWeapon.value,
    onHudUpdate: applyHud,
    onEvent: handleGameEvent,
  })

  // 计分板轮询
  if (sbTimer) clearInterval(sbTimer)
  sbTimer = setInterval(refreshScoreboard, 600)
}

const confirmLaunch = async () => {
  await startGame()
}

const restart = async () => {
  await startGame()
}

const quitToSelect = async () => {
  destroyEngine()
  await exitFullscreenSafe()
  lockPageScroll(false)
  showLaunchModal.value = false
  if (sbTimer) clearInterval(sbTimer)
  phase.value = 'select'
}

const goGames = async () => {
  destroyEngine()
  await exitFullscreenSafe()
  lockPageScroll(false)
  if (sbTimer) clearInterval(sbTimer)
  router.push('/Games')
}

/* ===================== HUD 回调 ===================== */

const applyHud = (state: Partial<HudState>) => {
  Object.assign(hud, state)
  // 超出购买窗口时自动收起菜单
  if (buyMenuOpen.value && !state.canBuy && !hud.finished) {
    closeBuyMenu(false)
  }
  // 比赛结束时确保解锁指针并收起菜单
  if (hud.finished && buyMenuOpen.value) {
    closeBuyMenu(false)
  }
}

/* ===================== 全屏监听 ===================== */

const onFsChange = () => {
  if (engine && canvasHost.value) {
    window.dispatchEvent(new Event('resize'))
  }
}

document.addEventListener('fullscreenchange', onFsChange)

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFsChange)
  document.removeEventListener('keydown', onGlobalKeyDown)
  document.removeEventListener('keyup', onGlobalKeyUp)
  if (sbTimer) clearInterval(sbTimer)
  if (kfTimer) clearTimeout(kfTimer)
  if (hitTimer) clearTimeout(hitTimer)
  destroyEngine()
  exitFullscreenSafe()
  lockPageScroll(false)
})
</script>

<style scoped>
.game-page {
  min-height: 100vh;
  background: #0b1020;
  color: #fff;
  font-family: 'Inter', system-ui, sans-serif;
}

/* ===================== 选局页 ===================== */
.select-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
}

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
  padding: 1.25rem 0 0.5rem;
}

.page-intro h1 {
  margin: 0 0 0.45rem;
  font-size: 2.15rem;
  background: linear-gradient(to right, #38bdf8, #a78bfa);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  height: 2.15rem;
  line-height: 2.15rem;
}

.sub {
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}

.section {
  margin-top: 1.75rem;
}

.section-title {
  font-size: 1.08rem;
  color: #93c5fd;
  margin: 0 0 0.9rem;
}

.team-grid,
.weapon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.team-card,
.weapon-card {
  text-align: left;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 1.1rem 1.2rem;
  color: inherit;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.team-card:hover,
.weapon-card:hover {
  transform: translateY(-3px);
}

.team-card.active,
.weapon-card.active {
  border-color: #60a5fa;
  box-shadow: 0 10px 30px rgba(96, 165, 250, 0.22);
  background: rgba(96, 165, 250, 0.1);
}

.team-icon,
.weapon-icon {
  font-size: 2rem;
  margin-bottom: 0.4rem;
}

.team-card h3,
.weapon-card h3 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
}

.team-card p,
.weapon-card p {
  margin: 0 0 0.5rem;
  color: #94a3b8;
  font-size: 0.88rem;
  line-height: 1.55;
}

.weapon-card ul {
  margin: 0;
  padding-left: 1.1rem;
  color: #7dd3fc;
  font-size: 0.82rem;
  line-height: 1.7;
}

.controls-tip {
  margin-top: 1.75rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 1rem 1.2rem;
}

.controls-tip h4 {
  margin: 0 0 0.5rem;
  color: #93c5fd;
}

.controls-tip p {
  margin: 0.25rem 0;
  color: #cbd5e1;
  font-size: 0.9rem;
  line-height: 1.6;
}

.tip-extra b {
  color: #fbbf24;
}

.start-row {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

.start-btn {
  border: none;
  border-radius: 999px;
  padding: 0.8rem 2.4rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.start-btn:hover {
  transform: translateY(-2px);
}

.start-btn.small {
  padding: 0.55rem 1.5rem;
  font-size: 0.92rem;
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

/* ===================== Launch Modal ===================== */
.launch-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(3px);
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.2rem;
}

.launch-modal {
  width: min(520px, 96vw);
  background: #101828;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 18px;
  padding: 1.4rem 1.6rem;
}

.launch-modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
}

.launch-modal-head h2 {
  margin: 0;
  font-size: 1.3rem;
}

.modal-close {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}

.launch-map-tip {
  color: #94a3b8;
  font-size: 0.92rem;
}

.launch-map-tip b {
  color: #93c5fd;
}

.modal-section-title {
  font-size: 0.98rem;
  color: #cbd5e1;
  margin: 1rem 0 0.6rem;
}

.options-panel {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 0.4rem 0.9rem;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.55rem 0;
  cursor: pointer;
}

.toggle-text strong {
  display: block;
}

.toggle-text small {
  color: #94a3b8;
}

.launch-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.8rem;
  margin-top: 1.2rem;
}

/* ===================== 对局页 ===================== */
.play-screen {
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 50;
}

.canvas-host {
  position: absolute;
  inset: 0;
}

.canvas-host :deep(canvas) {
  display: block;
}

.hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  user-select: none;
}

.quit-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 30;
  pointer-events: auto;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #e2e8f0;
  border-radius: 999px;
  padding: 0.35rem 1rem;
  font-size: 0.85rem;
  cursor: pointer;
}

/* ---- 顶部比分牌 ---- */
.scoreboard-bar {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: stretch;
  gap: 2px;
  background: rgba(8, 12, 24, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  overflow: hidden;
  min-width: 340px;
}

.sb-team {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.9rem;
}

.sb-team.sb-ct {
  background: rgba(37, 99, 235, 0.28);
}

.sb-team.sb-t {
  background: rgba(202, 138, 4, 0.26);
}

.sb-name {
  font-weight: 900;
  letter-spacing: 0.08em;
  font-size: 0.95rem;
}

.sb-score {
  font-size: 1.5rem;
  font-weight: 900;
  min-width: 1.6ch;
  text-align: center;
}

.alive-dots {
  display: flex;
  gap: 3px;
}

.alive-dots i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
}

.alive-dots i.on {
  background: #4ade80;
  box-shadow: 0 0 6px rgba(74, 222, 128, 0.8);
}

.sb-mid {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.3rem 1rem;
}

.sb-mid b {
  font-size: 1.15rem;
  font-variant-numeric: tabular-nums;
}

.sb-mid small {
  color: #94a3b8;
  font-size: 0.68rem;
}

/* ---- Killfeed ---- */
.killfeed {
  position: absolute;
  top: 76px;
  right: 14px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-end;
}

.kf-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(8, 12, 24, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.25rem 0.65rem;
  font-size: 0.82rem;
  animation: kfIn 0.18s ease-out;
}

.kf-row.mine {
  border-color: rgba(250, 204, 21, 0.45);
}

@keyframes kfIn {
  from {
    opacity: 0;
    transform: translateX(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.kf-killer.ct,
.kf-victim.ct {
  color: #7cb3ff;
  font-weight: 700;
}

.kf-killer.t,
.kf-victim.t {
  color: #fbbf24;
  font-weight: 700;
}

.kf-weapon {
  color: #94a3b8;
  font-size: 0.72rem;
}

/* ---- 左下 HP / 金钱 ---- */
.hud-bottom-left {
  position: absolute;
  left: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 240px;
}

.hp-bar {
  position: relative;
  height: 20px;
  border-radius: 10px;
  background: rgba(8, 12, 24, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.14);
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #16a34a, #4ade80);
  transition: width 0.18s ease;
}

.hp-fill.low {
  background: linear-gradient(90deg, #dc2626, #f87171);
}

.hp-bar span {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  font-weight: 800;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.money-tag {
  align-self: flex-start;
  background: rgba(8, 12, 24, 0.72);
  border: 1px solid rgba(250, 204, 21, 0.4);
  color: #fde047;
  border-radius: 999px;
  padding: 0.2rem 0.8rem;
  font-weight: 800;
  font-size: 0.95rem;
}

/* ---- 右下 弹药 ---- */
.hud-bottom-right {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.slots {
  display: flex;
  gap: 6px;
}

.slot-chip {
  background: rgba(8, 12, 24, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #94a3b8;
  border-radius: 8px;
  padding: 0.22rem 0.6rem;
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.slot-chip em {
  font-style: normal;
  font-weight: 800;
  color: #64748b;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 0 0.3rem;
}

.slot-chip.active {
  border-color: #60a5fa;
  color: #e2e8f0;
}

.slot-chip.empty {
  opacity: 0.5;
}

.ammo-line {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  background: rgba(8, 12, 24, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  padding: 0.3rem 0.9rem;
}

.ammo-big {
  font-size: 1.9rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.ammo-reserve {
  color: #94a3b8;
  font-size: 1rem;
}

.weapon-name {
  color: #93c5fd;
  font-size: 0.88rem;
  font-weight: 700;
  margin-left: 0.4rem;
}

.kd-line {
  color: #94a3b8;
  font-size: 0.78rem;
}

/* ---- 准星 ---- */
.crosshair {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
}

.ch-arm {
  position: absolute;
  background: rgba(140, 255, 160, 0.92);
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.9);
}

.ch-top { width: 2px; height: 8px; left: -1px; top: -13px; }
.ch-bottom { width: 2px; height: 8px; left: -1px; top: 5px; }
.ch-left { width: 8px; height: 2px; left: -13px; top: -1px; }
.ch-right { width: 8px; height: 2px; left: 5px; top: -1px; }

.ch-dot {
  position: absolute;
  width: 2px;
  height: 2px;
  left: -1px;
  top: -1px;
  background: rgba(140, 255, 160, 0.92);
}

/* ---- 命中标记 ---- */
.hitmarker {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
}

.hitmarker span {
  position: absolute;
  width: 2px;
  height: 9px;
  background: #fff;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.9);
}

.hitmarker span:nth-child(1) { transform: translate(-7px, -11px) rotate(45deg); }
.hitmarker span:nth-child(2) { transform: translate(5px, -11px) rotate(-45deg); }
.hitmarker span:nth-child(3) { transform: translate(-7px, 2px) rotate(-45deg); }
.hitmarker span:nth-child(4) { transform: translate(5px, 2px) rotate(45deg); }

.hitmarker.headshot span {
  background: #f87171;
}

/* ---- Toast / C4 ---- */
.toast {
  position: absolute;
  left: 50%;
  top: 22%;
  transform: translateX(-50%);
  background: rgba(8, 12, 24, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.35);
  color: #f1f5f9;
  padding: 0.5rem 1.3rem;
  border-radius: 999px;
  font-size: 0.98rem;
  white-space: nowrap;
}

.bomb-alert {
  position: absolute;
  left: 50%;
  top: 22%;
  transform: translateX(-50%);
  background: rgba(127, 29, 29, 0.85);
  border: 1px solid rgba(248, 113, 113, 0.6);
  color: #fecaca;
  padding: 0.5rem 1.3rem;
  border-radius: 999px;
  font-weight: 800;
  animation: bombPulse 0.9s infinite;
}

@keyframes bombPulse {
  50% {
    box-shadow: 0 0 18px rgba(239, 68, 68, 0.7);
  }
}

/* ---- Tab 计分板 ---- */
.tab-scoreboard {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(720px, 92vw);
  background: rgba(8, 12, 24, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 16px;
  padding: 1rem 1.3rem;
}

.ts-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.8rem;
  color: #94a3b8;
  font-size: 0.9rem;
}

.ts-head b {
  font-size: 1.25rem;
  color: #fff;
}

.ts-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.ts-team h4 {
  margin: 0 0 0.4rem;
  font-size: 0.9rem;
}

.ts-ct h4 {
  color: #7cb3ff;
}

.ts-t h4 {
  color: #fbbf24;
}

.ts-row {
  display: flex;
  justify-content: space-between;
  padding: 0.28rem 0.55rem;
  border-radius: 6px;
  font-size: 0.88rem;
  color: #e2e8f0;
}

.ts-row.me {
  background: rgba(250, 204, 21, 0.12);
}

.ts-row.dead {
  opacity: 0.42;
  text-decoration: line-through;
}

.ts-k {
  font-variant-numeric: tabular-nums;
  color: #94a3b8;
}

/* ---- 购买菜单 ---- */
.buy-mask {
  position: absolute;
  inset: 0;
  background: rgba(2, 6, 23, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  z-index: 20;
}

.buy-panel {
  width: min(860px, 94vw);
  max-height: 86vh;
  overflow: auto;
  background: #0d1526;
  border: 1px solid rgba(96, 165, 250, 0.35);
  border-radius: 18px;
  padding: 1.1rem 1.3rem 1.3rem;
}

.buy-head {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.7rem;
}

.buy-head h3 {
  margin: 0;
  font-size: 1.15rem;
}

.buy-balance {
  margin-left: auto;
  color: #94a3b8;
  font-size: 0.92rem;
}

.buy-balance b {
  color: #fde047;
  font-size: 1.1rem;
}

.buy-cats {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 0.7rem;
}

.buy-cat {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
  border-radius: 999px;
  padding: 0.32rem 0.95rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.buy-cat.active {
  border-color: #60a5fa;
  color: #fff;
  background: rgba(96, 165, 250, 0.18);
}

.buy-warning {
  margin: 0 0 0.6rem;
  color: #fbbf24;
  font-size: 0.85rem;
}

.buy-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 0.6rem;
}

.buy-card {
  position: relative;
  text-align: left;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 0.65rem 0.8rem;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.buy-card:hover:not(:disabled) {
  border-color: #60a5fa;
  transform: translateY(-2px);
}

.buy-card.poor {
  opacity: 0.45;
  cursor: not-allowed;
}

.buy-card.owned {
  border-color: rgba(74, 222, 128, 0.5);
}

.bc-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.3rem;
}

.bc-name {
  font-size: 0.95rem;
}

.bc-price {
  color: #fde047;
  font-weight: 800;
  font-size: 0.9rem;
}

.bc-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 0.7rem;
  color: #94a3b8;
  font-size: 0.72rem;
}

.bc-owned-tag {
  position: absolute;
  right: 8px;
  bottom: 8px;
  color: #4ade80;
  font-size: 0.72rem;
  font-weight: 700;
}

.buy-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.9rem;
  gap: 1rem;
}

.buy-foot small {
  color: #64748b;
}

/* ---- 结算 ---- */
.result-overlay {
  position: absolute;
  inset: 0;
  background: rgba(2, 6, 23, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  z-index: 40;
}

.result-card {
  width: min(480px, 92vw);
  background: #101828;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 20px;
  padding: 1.6rem 1.8rem;
  text-align: center;
}

.result-card.win {
  border-color: rgba(74, 222, 128, 0.55);
}

.result-card.lose {
  border-color: rgba(248, 113, 113, 0.5);
}

.result-card h2 {
  margin: 0 0 0.8rem;
}

.score-line {
  font-size: 1.15rem;
  margin: 0 0 0.4rem;
}

.score-line .c {
  color: #7cb3ff;
}

.score-line .y {
  color: #fbbf24;
}

.score-hint {
  color: #94a3b8;
  font-size: 0.9rem;
  margin: 0 0 1.2rem;
}

.result-actions {
  display: flex;
  justify-content: center;
  gap: 0.8rem;
  flex-wrap: wrap;
}
</style>
