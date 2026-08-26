<template>
  <div class="portal-container">
    <Header />
    <main class="main-content">
      <div class="page-head">
        <h1>游戏中心</h1>
        <p>精选浏览器小游戏，点击卡片进入游玩</p>
      </div>

      <div class="game-grid">
        <article
          v-for="game in games"
          :key="game.id"
          class="game-card"
          @click="goGame(game)"
        >
          <div class="cover" :style="{ background: game.cover }">
            <span class="emoji">{{ game.emoji }}</span>
            <span v-if="game.badge" class="badge">{{ game.badge }}</span>
          </div>
          <div class="body">
            <h2>{{ game.title }}</h2>
            <p>{{ game.description }}</p>
            <div class="meta">
              <span>{{ game.engine }}</span>
              <span>{{ game.genre }}</span>
            </div>
            <button class="play-btn" type="button">开始游戏</button>
          </div>
        </article>

        <!-- Placeholder slots to keep two-column look when few games -->
        <article class="game-card locked" aria-hidden="true">
          <div class="cover coming">
            <span class="emoji">🚧</span>
          </div>
          <div class="body">
            <h2>更多游戏</h2>
            <p>敬请期待后续上线的新作品…</p>
            <div class="meta">
              <span>Coming Soon</span>
            </div>
            <button class="play-btn" type="button" disabled>即将上线</button>
          </div>
        </article>
      </div>
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'

interface GameItem {
  id: string
  title: string
  description: string
  emoji: string
  cover: string
  engine: string
  genre: string
  route: string
  badge?: string
}

const router = useRouter()

const games: GameItem[] = [
  {
    id: 'road-rash',
    title: '暴力摩托',
    description: 'Three.js 公路竞速格斗。油门冲刺、拳脚与武器，撞翻对手冲过终点！',
    emoji: '🏍️',
    cover: 'linear-gradient(135deg, #ff6b35 0%, #f7c59f 45%, #2a9d8f 100%)',
    engine: 'Three.js',
    genre: '竞速 / 格斗',
    route: '/Games/RoadRash',
    badge: '热门',
  },
  {
    id: 'cs16-shooter',
    title: '战术射击：CS 复刻',
    description: '经典 CS1.6 体验。AK/M4 弹道、拆弹、经济系统，HTML5 + Three.js 重制。',
    emoji: '🔫',
    cover: 'linear-gradient(135deg, #1e293b 0%, #475569 50%, #0f172a 100%)',
    engine: 'Three.js',
    genre: 'FPS / 战术射击',
    route: '/Games/CS16Shooter',
    badge: '新品',
  },
  {
    id: 'spider-solitaire',
    title: '蜘蛛纸牌',
    description: '经典 Windows 蜘蛛牌。双色 / 四色难度，同花色 K→A 收牌，发牌、撤销与提示一应俱全。',
    emoji: '🕷️',
    cover: 'linear-gradient(135deg, #14532d 0%, #166534 40%, #0f172a 100%)',
    engine: 'Vue',
    genre: '纸牌 / 益智',
    route: '/Games/SpiderSolitaire',
    badge: '新品',
  },
  {
    id: 'thirteen',
    title: '十三张',
    description: '四人斗三墩。头中尾理牌比大小，冲三、打枪、全垒打，特殊牌型免比，初始 100 万游戏币单注 100。',
    emoji: '🃏',
    cover: 'linear-gradient(135deg, #7c2d12 0%, #b45309 45%, #1c1917 100%)',
    engine: 'Vue',
    genre: '纸牌 / 棋牌',
    route: '/Games/Thirteen',
    badge: '新品',
  },
]

const goGame = (game: GameItem) => {
  router.push(game.route)
}
</script>

<style scoped>
.portal-container {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
  box-sizing: border-box;
}

.page-head {
  text-align: center;
  margin-bottom: 2.5rem;
}

.page-head h1 {
  font-size: 2.4rem;
  margin: 0 0 0.6rem;
  background: linear-gradient(to right, #38bdf8, #a78bfa);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  height: 2.4rem;
  line-height: 2.4rem;
}

.page-head p {
  color: #94a3b8;
  margin: 0;
}

.game-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.game-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  display: flex;
  flex-direction: column;
}

.game-card:not(.locked):hover {
  transform: translateY(-6px);
  border-color: rgba(99, 102, 241, 0.55);
  box-shadow: 0 16px 40px rgba(99, 102, 241, 0.25);
}

.game-card.locked {
  cursor: default;
  opacity: 0.55;
}

.cover {
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.cover.coming {
  background: linear-gradient(135deg, #334155, #1e293b);
}

.emoji {
  font-size: 4rem;
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.35));
}

.badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #ef4444;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
}

.body {
  padding: 1.25rem 1.4rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  flex: 1;
}

.body h2 {
  margin: 0;
  font-size: 1.35rem;
}

.body p {
  margin: 0;
  color: #cbd5e1;
  line-height: 1.55;
  font-size: 0.95rem;
  flex: 1;
}

.meta {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.meta span {
  font-size: 12px;
  color: #a5b4fc;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 3px 10px;
  border-radius: 999px;
}

.play-btn {
  margin-top: 0.4rem;
  align-self: flex-start;
  border: none;
  border-radius: 999px;
  padding: 0.55rem 1.25rem;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.play-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.play-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background: #475569;
}

@media (max-width: 768px) {
  .game-grid {
    grid-template-columns: 1fr;
  }

  .page-head h1 {
    font-size: 1.8rem;
  }
}
</style>
