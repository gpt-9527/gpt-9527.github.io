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
            经典 CS1.6 体验 · AK/M4 弹道 · AWP 瞬狙 · 爆破拆弹 · 经济系统
          </p>
        </header>

        <!-- Team -->
        <section class="section">
          <h2 class="section-title">选择阵营</h2>
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

        <!-- Weapon Mode -->
        <section class="section">
          <h2 class="section-title">选择武器模式</h2>
          <div class="weapon-grid">
            <button
              v-for="w in weapons"
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
          <p>
            W/A/S/D 移动 · 鼠标瞄准 · 左键射击 · R 换弹 · G 丢枪 ·
            空格跳跃 · Ctrl 蹲下 · E 拆弹 / 购买
          </p>
          <p class="tip-extra">
            当前阵营：<b>{{ currentTeam.name }}</b>
            &nbsp;|&nbsp;
            武器模式：<b>{{ currentWeapon.name }}</b>
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
            阵营：<b>{{ currentTeam.name }}</b>
            &nbsp;·&nbsp;
            武器：<b>{{ currentWeapon.name }}</b>
          </p>

          <h3 class="modal-section-title">游戏选项</h3>
          <div class="options-panel">
            <label class="toggle-row">
              <input v-model="wantFullscreen" type="checkbox" />
              <span class="toggle-ui" aria-hidden="true"></span>
              <span class="toggle-text">
                <strong>浏览器全屏模式</strong>
                <small>
                  开启：浏览器 Fullscreen API；关闭：页面内铺满窗口
                </small>
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

      <!-- HUD -->
      <div class="hud">
        <div class="hud-top">
          <div class="stat">
            <label>阵营</label>
            <strong class="sm">{{ hud.team }}</strong>
          </div>
          <div class="stat">
            <label>HP</label>
            <strong>{{ hud.hp }}</strong>
            <small>/ {{ hud.maxHp }}</small>
          </div>
          <div class="stat">
            <label>弹药</label>
            <strong>{{ hud.ammo }}</strong>
            <small>/ {{ hud.reserve }}</small>
          </div>
          <div class="stat">
            <label>武器</label>
            <strong class="sm">{{ hud.weaponName }}</strong>
          </div>
          <div class="stat">
            <label>比分</label>
            <strong class="sm">{{ hud.ctScore }} : {{ hud.tScore }}</strong>
          </div>
          <div class="stat">
            <label>击杀</label>
            <strong>{{ hud.kills }}</strong>
          </div>
          <div class="stat">
            <label>回合</label>
            <strong>{{ hud.round }}</strong>
            <small>/ {{ hud.totalRounds }}</small>
          </div>
          <button class="quit-btn" type="button" @click="quitToSelect">
            退出
          </button>
        </div>

        <!-- HP Bar -->
        <div class="hp-bar">
          <div class="hp-fill" :style="{ width: hpPercent + '%' }"></div>
          <span>HP {{ hud.hp }} / {{ hud.maxHp }}</span>
        </div>

        <!-- Crosshair: CS-style gap reticle (center open, no solid cross / T spam) -->
        <div class="crosshair" aria-hidden="true">
          <span class="ch-arm ch-top"></span>
          <span class="ch-arm ch-bottom"></span>
          <span class="ch-arm ch-left"></span>
          <span class="ch-arm ch-right"></span>
          <span class="ch-dot"></span>
        </div>

        <!-- Toast -->
        <div v-if="hud.message" class="toast">{{ hud.message }}</div>
        <div v-if="hud.bombPlanted && !hud.message" class="bomb-alert">
          C4 · {{ hud.bombTimer }}s
        </div>
      </div>

      <!-- Result -->
      <div v-if="hud.finished" class="result-overlay">
        <div class="result-card">
          <h2>战斗结束</h2>
          <p class="score-line">
            阵营 <b>{{ hud.team }}</b>
            · 击杀 <b>{{ hud.kills }}</b>
            · 比分 <b>{{ hud.ctScore }} : {{ hud.tScore }}</b>
          </p>
          <p class="score-hint">
            击杀、存活、拆弹 / 安包均可获得分数
          </p>

          <div class="result-actions">
            <button type="button" class="start-btn" @click="restart">
              再来一局
            </button>
            <button type="button" class="ghost-btn" @click="quitToSelect">
              重选配置
            </button>
            <button type="button" class="ghost-btn" @click="goGames">
              返回列表
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Header from '../../components/Header.vue'
import Footer from '../../components/Footer.vue'
import { CS16Engine } from '../../games/cs16-shooter/engine'
import type { HudState, TeamId, WeaponMode } from '../../games/cs16-shooter/types'

const router = useRouter()

/* ===================== 配置数据 ===================== */

const teams = [
  {
    id: 'ct',
    name: '保卫者',
    emoji: '🛡️',
    description: '反恐精英，负责防守炸弹点、解救人质。',
  },
  {
    id: 't',
    name: '潜伏者',
    emoji: '💀',
    description: '恐怖分子，负责安放炸弹或歼灭敌方。',
  },
] as const

const weapons = [
  {
    id: 'rifle',
    name: '冲锋步枪模式',
    emoji: '🔫',
    description: 'AK-47 / M4A1 为主战武器，强调压枪与定位。',
    traits: ['全自动射击', '中远距离优势', '经济友好'],
  },
  {
    id: 'sniper',
    name: '狙击枪模式',
    emoji: '🎯',
    description: 'AWP / Scout 专精，一击必杀，高风险高回报。',
    traits: ['瞬狙 / 盲狙', '穿点打击', '机动性较低'],
  },
] as const

/* ===================== 状态 ===================== */

const phase = ref<'select' | 'play'>('select')
const selectedTeam = ref<TeamId>('ct')
const selectedWeapon = ref<WeaponMode>('rifle')
const wantFullscreen = ref(false)
const showLaunchModal = ref(false)

const canvasHost = ref<HTMLElement | null>(null)
const playScreen = ref<HTMLElement | null>(null)
let engine: CS16Engine | null = null

const hud = reactive<HudState>({
  team: 'CT',
  hp: 100,
  maxHp: 100,
  ammo: 30,
  reserve: 90,
  weaponName: 'AK-47',
  kills: 0,
  round: 1,
  totalRounds: 15,
  ctScore: 0,
  tScore: 0,
  score: 0,
  message: '',
  finished: false,
  bombPlanted: false,
  bombTimer: 0,
})

/* ===================== Computed ===================== */

const currentTeam = computed(() =>
  teams.find(t => t.id === selectedTeam.value)!,
)
const currentWeapon = computed(() =>
  weapons.find(w => w.id === selectedWeapon.value)!,
)

const hpPercent = computed(() =>
  Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100)),
)

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
  })
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
  phase.value = 'select'
}

const goGames = async () => {
  destroyEngine()
  await exitFullscreenSafe()
  lockPageScroll(false)
  router.push('/Games')
}

/* ===================== HUD 回调 ===================== */

const applyHud = (state: Partial<HudState>) => {
  Object.assign(hud, state)
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
  padding: 1.1rem 0 0.4rem;
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

.page-intro h1 {
  margin: 0 0 0.45rem;
  font-size: 2.15rem;
  background: linear-gradient(to right, #38bdf8, #a78bfa);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
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
  margin: 0 0 0.9rem;
  font-size: 1.1rem;
  color: #c7d2fe;
  font-weight: 700;
}

/* Team Grid */
.team-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.1rem;
}

.team-card {
  text-align: center;
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  padding: 1.2rem 1rem 1.4rem;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s;
}

.team-card:hover {
  transform: translateY(-3px);
}

.team-card.active {
  border-color: #38bdf8;
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.4);
}

.team-icon {
  font-size: 3rem;
  margin-bottom: 0.6rem;
}

.team-card h3 {
  margin: 0 0 0.35rem;
  font-size: 1.2rem;
}

.team-card p {
  margin: 0;
  color: #cbd5e1;
  font-size: 0.88rem;
  line-height: 1.45;
}

/* Weapon Grid */
.weapon-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.1rem;
}

.weapon-card {
  text-align: left;
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  padding: 1rem 1rem 1.2rem;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s;
}

.weapon-card:hover {
  transform: translateY(-3px);
}

.weapon-card.active {
  border-color: #f472b6;
  box-shadow: 0 0 0 1px rgba(244, 114, 182, 0.4);
}

.weapon-icon {
  font-size: 2.8rem;
  margin-bottom: 0.5rem;
}

.weapon-card h3 {
  margin: 0 0 0.35rem;
  font-size: 1.15rem;
}

.weapon-card p {
  margin: 0 0 0.55rem;
  color: #cbd5e1;
  font-size: 0.88rem;
  line-height: 1.45;
}

.weapon-card ul {
  margin: 0;
  padding-left: 1.1rem;
  color: #a5b4fc;
  font-size: 0.82rem;
}

/* Controls */
.controls-tip {
  margin: 1.75rem 0 1.25rem;
  padding: 1rem 1.2rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.controls-tip h4 {
  margin: 0 0 0.4rem;
}

.controls-tip p {
  margin: 0;
  color: #cbd5e1;
  font-size: 0.92rem;
}

.tip-extra {
  margin-top: 0.55rem !important;
  color: #a5b4fc !important;
}

.tip-extra b {
  color: #fbbf24;
}

/* Start */
.start-row {
  padding-bottom: 0.5rem;
}

.start-btn {
  border: none;
  border-radius: 999px;
  padding: 0.85rem 2.2rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #38bdf8, #a78bfa);
  cursor: pointer;
  box-shadow: 0 10px 25px rgba(56, 189, 248, 0.35);
}

.start-btn:hover {
  filter: brightness(1.05);
}

/* Launch Modal */
.launch-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.launch-modal {
  width: min(720px, 100%);
  background: linear-gradient(165deg, #1e1b4b 0%, #0f172a 100%);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  padding: 1.15rem 1.25rem 1.35rem;
}

.launch-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.35rem;
}

.launch-modal-head h2 {
  background: linear-gradient(to right, #38bdf8, #a78bfa);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  font-size: 1.35rem;
}

.modal-close {
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.4rem;
  cursor: pointer;
}

.launch-map-tip {
  margin: 0 0 1rem;
  color: #94a3b8;
  font-size: 0.92rem;
}

.launch-map-tip b {
  color: #fbbf24;
}

.options-panel {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  padding: 1rem 1.15rem;
}

.toggle-row {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  cursor: pointer;
}

.toggle-row input {
  position: absolute;
  opacity: 0;
}

.toggle-ui {
  flex-shrink: 0;
  width: 44px;
  height: 26px;
  border-radius: 999px;
  background: #334155;
  position: relative;
  margin-top: 2px;
}

.toggle-ui::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
}

.toggle-row input:checked + .toggle-ui {
  background: #38bdf8;
}

.toggle-row input:checked + .toggle-ui::after {
  transform: translateX(18px);
}

.launch-modal-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* Play Screen */
.play-screen {
  position: fixed;
  inset: 0;
  z-index: 1600;
  background: #000;
}

.canvas-host {
  width: 100%;
  height: 100%;
}

.canvas-host :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

/* HUD */
.hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
}

.hud-top {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.stat {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 6px 12px;
  backdrop-filter: blur(6px);
  min-width: 72px;
}

.stat label {
  display: block;
  font-size: 11px;
  color: #94a3b8;
}

.stat strong {
  font-size: 1.25rem;
}

.stat strong.sm {
  font-size: 0.95rem;
}

.stat small {
  color: #64748b;
  font-size: 12px;
}

.quit-btn {
  pointer-events: auto;
  margin-left: auto;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-radius: 999px;
  padding: 8px 14px;
  cursor: pointer;
}

/* HP Bar */
.hp-bar {
  margin-top: 10px;
  height: 14px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  position: relative;
  max-width: 260px;
}

.hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #f97316);
  transition: width 0.15s linear;
}

.hp-bar span {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

/* Crosshair — classic CS gap style, not a solid + / inverted-T stack */
.crosshair {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 28px;
  height: 28px;
  pointer-events: none;
}

.ch-arm {
  position: absolute;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
}

.ch-top,
.ch-bottom {
  left: 50%;
  width: 2px;
  height: 8px;
  transform: translateX(-50%);
}

.ch-top {
  top: 0;
}

.ch-bottom {
  bottom: 0;
}

.ch-left,
.ch-right {
  top: 50%;
  width: 8px;
  height: 2px;
  transform: translateY(-50%);
}

.ch-left {
  left: 0;
}

.ch-right {
  right: 0;
}

.ch-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 2px;
  height: 2px;
  margin: -1px 0 0 -1px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
}

/* Toast */
.toast {
  position: absolute;
  top: 28%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 700;
}

.bomb-alert {
  position: absolute;
  top: 18%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(127, 29, 29, 0.85);
  border: 1px solid rgba(248, 113, 113, 0.6);
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 800;
  color: #fecaca;
  letter-spacing: 0.05em;
}

/* Result */
.result-overlay {
  position: absolute;
  inset: 0;
  background: rgba(2, 6, 23, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.result-card {
  width: min(420px, 100%);
  background: linear-gradient(160deg, #1e1b4b, #0f172a);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: 1.5rem;
}

.result-card h2 {
  margin: 0 0 0.6rem;
  text-align: center;
}

.score-line {
  text-align: center;
  font-size: 1.15rem;
}

.score-line b {
  color: #38bdf8;
}

.score-hint {
  text-align: center;
  color: #94a3b8;
  font-size: 0.85rem;
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: center;
  margin-top: 1.2rem;
}

.ghost-btn {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #e2e8f0;
  border-radius: 999px;
  padding: 0.7rem 1.2rem;
  cursor: pointer;
}

/* Mobile */
@media (max-width: 768px) {
  .team-grid,
  .weapon-grid {
    grid-template-columns: 1fr;
  }
}
</style>