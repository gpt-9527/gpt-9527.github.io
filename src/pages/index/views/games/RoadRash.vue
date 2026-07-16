<template>
  <div class="game-page">
    <!-- Select map only -->
    <div v-if="phase === 'select'" class="select-screen">
      <Header />
      <main class="select-main">
        <div class="page-toolbar">
          <button class="back-link" type="button" @click="goGames">← 返回游戏列表</button>
        </div>

        <header class="page-intro">
          <h1>暴力摩托</h1>
          <p class="sub">选择地图后发车 · 最高时速 300 · 速度越高攻击伤害越高</p>
        </header>

        <section class="section">
          <h2 class="section-title">选择地图</h2>
          <div class="map-grid">
            <button
              v-for="m in maps"
              :key="m.id"
              type="button"
              class="map-card"
              :class="{ active: selectedMap === m.id }"
              @click="selectedMap = m.id"
            >
              <div class="map-preview" :class="m.id">
                <span>{{ m.id === 'desert' ? '🏜️' : '🌃' }}</span>
              </div>
              <h3>{{ m.name }}</h3>
              <p>{{ m.description }}</p>
              <ul>
                <li>赛道长度 {{ m.trackLength }}m</li>
                <li>对手 {{ m.racerCount }} 人</li>
                <li>弯道 + 上下坡</li>
              </ul>
            </button>
          </div>
        </section>

        <div class="controls-tip">
          <h4>操作说明</h4>
          <p>↑/W 加速 · ↓/S 刹车 · ←→/A D 转向 · 空格 出拳/出脚（有武器则用武器）</p>
          <p class="tip-extra">
            当前地图：
            <b>{{ currentMap.name }}</b>
          </p>
        </div>

        <div class="start-row">
          <button class="start-btn" type="button" @click="openLaunchModal">发车！</button>
        </div>
      </main>
      <Footer />

      <!-- 发车后：选角色 + 全屏 -->
      <div
        v-if="showLaunchModal"
        class="launch-modal-mask"
        @click.self="closeLaunchModal"
      >
        <div class="launch-modal" role="dialog" aria-modal="true" aria-labelledby="launch-title">
          <div class="launch-modal-head">
            <h2 id="launch-title">准备发车</h2>
            <button type="button" class="modal-close" aria-label="关闭" @click="closeLaunchModal">×</button>
          </div>
          <p class="launch-map-tip">
            地图：<b>{{ currentMap.name }}</b>
          </p>

          <h3 class="modal-section-title">选择角色</h3>
          <div class="char-grid modal-char-grid">
            <button
              v-for="c in characters"
              :key="c.id"
              type="button"
              class="char-card"
              :class="{ active: selectedChar === c.id }"
              @click="selectedChar = c.id"
            >
              <div class="char-emoji">{{ c.emoji }}</div>
              <div class="char-body">
                <h3>{{ c.name }}</h3>
                <span class="char-title">{{ c.title }}</span>
                <p>{{ c.description }}</p>
                <div class="trait-row">
                  <span v-for="t in c.traits" :key="t">{{ t }}</span>
                </div>
                <ul class="char-stats">
                  <li>血量 {{ c.maxHp }}</li>
                  <li>极速 {{ c.topSpeed }}</li>
                  <li>武器 {{ c.startWeapon || '徒手' }}</li>
                </ul>
              </div>
            </button>
          </div>

          <h3 class="modal-section-title">游戏选项</h3>
          <div class="options-panel">
            <label class="toggle-row">
              <input v-model="wantFullscreen" type="checkbox" />
              <span class="toggle-ui" aria-hidden="true"></span>
              <span class="toggle-text">
                <strong>浏览器全屏模式</strong>
                <small>
                  开启：使用浏览器 Fullscreen API 全屏；关闭：页面内铺满窗口（页面全屏）
                </small>
              </span>
            </label>
          </div>

          <div class="launch-modal-actions">
            <button type="button" class="ghost-btn" @click="closeLaunchModal">取消</button>
            <button type="button" class="start-btn" @click="confirmLaunch">确认发车</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Playing -->
    <div v-else ref="playScreen" class="play-screen">
      <div ref="canvasHost" class="canvas-host"></div>

      <div class="hud">
        <div class="hud-top">
          <div class="stat">
            <label>角色</label>
            <strong class="sm">{{ hud.characterName }}</strong>
          </div>
          <div class="stat">
            <label>速度</label>
            <strong>{{ hud.speed }}</strong>
            <small>/ 300</small>
          </div>
          <div class="stat">
            <label>名次</label>
            <strong>{{ hud.rank }}</strong>
            <small>/ {{ hud.totalRacers }}</small>
          </div>
          <div class="stat">
            <label>进度</label>
            <strong>{{ Math.round(hud.progress * 100) }}%</strong>
          </div>
          <div class="stat">
            <label>武器</label>
            <strong class="sm">{{ hud.weapon || '徒手' }}</strong>
          </div>
          <button class="quit-btn" type="button" @click="quitToSelect">退出</button>
        </div>

        <div class="hp-bar">
          <div class="hp-fill" :style="{ width: hpPercent + '%' }"></div>
          <span>HP {{ hud.hp }} / {{ hud.maxHp }}</span>
        </div>

        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: hud.progress * 100 + '%' }"></div>
        </div>

        <div v-if="hud.message" class="toast">{{ hud.message }}</div>

        <!-- 速度冲刺 UI 叠加 -->
        <div class="speed-vignette" :style="{ opacity: speedRushOpacity }"></div>
      </div>

      <div v-if="hud.finished" class="result-overlay">
        <div class="result-card">
          <h2>比赛结束</h2>
          <p class="score-line">
            名次 <b>#{{ hud.rank }}</b> · 得分 <b>{{ hud.score }}</b>
          </p>
          <p class="score-hint">排名越靠前、领先对手越多，得分越高</p>
          <ol class="rank-list">
            <li
              v-for="(item, idx) in hud.rankList"
              :key="item.name + idx"
              :class="{ me: item.isPlayer }"
            >
              <span>#{{ idx + 1 }} {{ item.name }}</span>
              <span>{{ Math.round(item.progress * 100) }}% · {{ item.score ?? '-' }} 分</span>
            </li>
          </ol>
          <div class="result-actions">
            <button type="button" class="start-btn" @click="restart">再来一局</button>
            <button type="button" class="ghost-btn" @click="quitToSelect">重选地图</button>
            <button type="button" class="ghost-btn" @click="goGames">返回列表</button>
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
import { MAPS, getMapById } from '../../games/road-rash/maps'
import { CHARACTERS, getCharacterById } from '../../games/road-rash/characters'
import { RoadRashEngine } from '../../games/road-rash/engine'
import type { CharacterId, HudState, MapId } from '../../games/road-rash/types'

const router = useRouter()
const maps = MAPS
const characters = CHARACTERS
const phase = ref<'select' | 'play'>('select')
const selectedMap = ref<MapId>('desert')
const selectedChar = ref<CharacterId>('jack')
/** true = 浏览器全屏；false = 页面内铺满视口 */
const wantFullscreen = ref(false)
const showLaunchModal = ref(false)
const canvasHost = ref<HTMLElement | null>(null)
const playScreen = ref<HTMLElement | null>(null)
let engine: RoadRashEngine | null = null

const hud = reactive<HudState>({
  speed: 0,
  hp: 100,
  maxHp: 100,
  rank: 1,
  totalRacers: 1,
  progress: 0,
  weapon: null,
  attackCooldown: 0,
  message: '',
  finished: false,
  score: 0,
  characterName: '',
  rankList: [],
})

const currentMap = computed(() => getMapById(selectedMap.value))
const hpPercent = computed(() => Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100)))
const speedRushOpacity = computed(() => {
  const t = Math.min(1, hud.speed / 300)
  return t * t * 0.55
})

const applyHud = (state: HudState) => {
  Object.assign(hud, state)
}

const destroyEngine = () => {
  engine?.dispose()
  engine = null
}

const exitFullscreenSafe = async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    }
  } catch {
    /* ignore */
  }
}

const enterFullscreenSafe = async (el: HTMLElement | null) => {
  if (!wantFullscreen.value || !el) return
  try {
    if (!document.fullscreenElement) {
      await el.requestFullscreen()
    }
  } catch {
    /* 用户拒绝或浏览器不支持时静默降级 */
  }
}

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
  await new Promise((r) => requestAnimationFrame(() => r(null)))
  if (!canvasHost.value) return

  // 勾选：浏览器全屏；未勾选：页面全屏（fixed 铺满视口）
  if (wantFullscreen.value) {
    await enterFullscreenSafe(playScreen.value)
  } else {
    await exitFullscreenSafe()
  }

  // 尺寸稳定后再初始化渲染器
  await new Promise((r) => setTimeout(r, 50))
  const map = getMapById(selectedMap.value)
  const character = getCharacterById(selectedChar.value)
  engine = new RoadRashEngine(canvasHost.value, map, character, applyHud)
}

const confirmLaunch = async () => {
  await startGame()
}

const restart = async () => {
  // 再来一局：沿用上次角色与全屏设置
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

const onFsChange = () => {
  // 用户按 ESC 退出全屏时，若仍在对局则保持游玩
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

/* 主内容独立滚动区域，避免被 sticky 顶栏视觉遮挡 */
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
  background: linear-gradient(to right, #fb923c, #f472b6);
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
  margin: 0 0 0.9rem;
  font-size: 1.1rem;
  color: #c7d2fe;
  font-weight: 700;
}

.char-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.char-card {
  display: flex;
  gap: 0.85rem;
  text-align: left;
  border-radius: 14px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  padding: 0.9rem;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}

.char-card:hover {
  transform: translateY(-2px);
}

.char-card.active {
  border-color: #a78bfa;
  box-shadow: 0 0 0 1px rgba(167, 139, 250, 0.45);
  background: rgba(99, 102, 241, 0.12);
}

.char-emoji {
  font-size: 2.2rem;
  line-height: 1;
  width: 2.6rem;
  flex-shrink: 0;
}

.char-body h3 {
  margin: 0;
  font-size: 1.05rem;
}

.char-title {
  display: inline-block;
  margin: 0.2rem 0 0.35rem;
  font-size: 12px;
  color: #fbbf24;
}

.char-body p {
  margin: 0 0 0.45rem;
  color: #cbd5e1;
  font-size: 0.84rem;
  line-height: 1.45;
}

.trait-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.4rem;
}

.trait-row span {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(251, 146, 60, 0.15);
  color: #fdba74;
  border: 1px solid rgba(251, 146, 60, 0.3);
}

.char-stats {
  margin: 0;
  padding-left: 1rem;
  color: #a5b4fc;
  font-size: 0.8rem;
}

.map-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.1rem;
}

.map-card {
  text-align: left;
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  padding: 0 0 1rem;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s, transform 0.2s;
}

.map-card:hover {
  transform: translateY(-3px);
}

.map-card.active {
  border-color: #fb923c;
  box-shadow: 0 0 0 1px rgba(251, 146, 60, 0.4);
}

.map-preview {
  height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.8rem;
}

.map-preview.desert {
  background: linear-gradient(160deg, #f4c27a, #c9a66b 60%, #8b6914);
}

.map-preview.city {
  background: linear-gradient(160deg, #0b1026, #1e1b4b 50%, #2de2ff33);
}

.map-card h3 {
  margin: 0.85rem 1rem 0.35rem;
  font-size: 1.15rem;
}

.map-card p {
  margin: 0 1rem 0.55rem;
  color: #cbd5e1;
  font-size: 0.88rem;
  line-height: 1.45;
}

.map-card ul {
  margin: 0 1rem;
  padding-left: 1.1rem;
  color: #a5b4fc;
  font-size: 0.82rem;
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
  user-select: none;
}

.toggle-row input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.toggle-ui {
  flex-shrink: 0;
  width: 44px;
  height: 26px;
  border-radius: 999px;
  background: #334155;
  position: relative;
  margin-top: 2px;
  transition: background 0.2s;
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
  background: #f97316;
}

.toggle-row input:checked + .toggle-ui::after {
  transform: translateX(18px);
}

.toggle-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.toggle-text strong {
  font-size: 0.98rem;
}

.toggle-text small {
  color: #94a3b8;
  font-size: 0.82rem;
  line-height: 1.4;
}

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
  background: linear-gradient(135deg, #f97316, #ef4444);
  cursor: pointer;
  box-shadow: 0 10px 25px rgba(239, 68, 68, 0.35);
}

.start-btn:hover {
  filter: brightness(1.05);
}

/* 发车弹框 */
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
  box-sizing: border-box;
}

.launch-modal {
  width: min(920px, 100%);
  max-height: min(90vh, 900px);
  overflow: auto;
  background: linear-gradient(165deg, #1e1b4b 0%, #0f172a 100%);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  padding: 1.15rem 1.25rem 1.35rem;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
}

.launch-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
}

.launch-modal-head h2 {
  margin: 0;
  font-size: 1.35rem;
  background: linear-gradient(to right, #fb923c, #f472b6);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.modal-close {
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.16);
}

.launch-map-tip {
  margin: 0 0 1rem;
  color: #94a3b8;
  font-size: 0.92rem;
}

.launch-map-tip b {
  color: #fbbf24;
}

.modal-section-title {
  margin: 0 0 0.7rem;
  font-size: 0.98rem;
  color: #c7d2fe;
}

.modal-char-grid {
  margin-bottom: 1.15rem;
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

/* 页面全屏：固定铺满浏览器视口（未勾选浏览器全屏时） */
.play-screen {
  position: fixed;
  inset: 0;
  z-index: 1600;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #000;
}

/* 浏览器全屏 API */
.play-screen:fullscreen,
.play-screen:-webkit-full-screen {
  width: 100vw;
  height: 100vh;
  position: fixed;
  inset: 0;
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

.hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  box-sizing: border-box;
}

.hud-top {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  position: relative;
  z-index: 2;
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
  margin-right: 2px;
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

.hp-bar,
.progress-bar {
  margin-top: 10px;
  height: 14px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  position: relative;
  max-width: 360px;
  z-index: 2;
}

.hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #f97316);
  transition: width 0.15s linear;
}

.progress-bar {
  height: 8px;
  max-width: 360px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #22d3ee, #818cf8);
}

.hp-bar span {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  text-shadow: 0 1px 2px #000;
}

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
  letter-spacing: 0.5px;
  z-index: 3;
}

.speed-vignette {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 35%,
    rgba(0, 0, 0, 0.15) 70%,
    rgba(15, 23, 42, 0.55) 100%
  );
  box-shadow: inset 0 0 80px rgba(255, 120, 40, 0.15);
  z-index: 1;
  transition: opacity 0.12s linear;
}

.result-overlay {
  position: absolute;
  inset: 0;
  background: rgba(2, 6, 23, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  padding: 1rem;
  box-sizing: border-box;
  z-index: 5;
}

.result-card {
  width: min(420px, 100%);
  background: linear-gradient(160deg, #1e1b4b, #0f172a);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: 1.5rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
}

.result-card h2 {
  margin: 0 0 0.6rem;
  text-align: center;
}

.score-line {
  text-align: center;
  font-size: 1.15rem;
  margin: 0 0 0.25rem;
}

.score-line b {
  color: #fb923c;
}

.score-hint {
  text-align: center;
  color: #94a3b8;
  font-size: 0.85rem;
  margin: 0 0 1rem;
}

.rank-list {
  list-style: none;
  margin: 0 0 1.25rem;
  padding: 0;
  max-height: 240px;
  overflow: auto;
}

.rank-list li {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  font-size: 0.92rem;
  color: #cbd5e1;
}

.rank-list li.me {
  background: rgba(249, 115, 22, 0.18);
  color: #fff;
  font-weight: 700;
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: center;
}

.ghost-btn {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #e2e8f0;
  border-radius: 999px;
  padding: 0.7rem 1.2rem;
  cursor: pointer;
}

@media (max-width: 768px) {
  .char-grid,
  .map-grid {
    grid-template-columns: 1fr;
  }

  .stat strong {
    font-size: 1rem;
  }

  .page-intro h1 {
    font-size: 1.7rem;
  }
}
</style>
