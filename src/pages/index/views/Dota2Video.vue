<template>
  <div class="portal-container">
    <Header></Header>
    <main class="main-content">
      <h2 class="page-title">欣赏大厨视频(标注的steamID可以拷贝加入黑名单，提前必坑！)</h2>
      <div class="video-list">
        <template v-for="value in list" :key="value.id || value.steamID + value.url">
          <div v-if="value.isbitch" class="video-item">
            <h6 class="video-title">
              {{ value.title }} SteamID: <span class="steam-id danger">{{ value.steamID }}</span>
            </h6>
            <video controls width="100%" height="auto" preload="metadata" :src="value.url"></video>
            <p>{{ value.description }}</p>
          </div>
        </template>
      </div>
      <div class="video-list">
        <template v-for="value in list" :key="value.id || value.steamID + value.url">
          <div v-if="!value.isbitch" class="video-item">
            <h6 class="video-title">
              {{ value.title }} SteamID: <span class="steam-id">{{ value.steamID }}</span>
            </h6>
            <video controls width="100%" height="auto" preload="metadata" :src="value.url"></video>
            <p>{{ value.description }}</p>
          </div>
        </template>
      </div>
      <div v-if="!loading && list.length === 0" class="state-info">
        <p>暂无相关视频内容</p>
      </div>
    </main>
    <Footer></Footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'

const list = ref([])
const loading = ref(true)

import { supabase } from '../../../utils/supabase'
const getData = async () => {
  const { data, error } = await supabase
    .from('gpt-9527')
    .select('*')

  if (error) {
    console.error(error)
  }else {
    list.value = data
  }
}

onMounted(async () => {
  // getData();
  try {
    const module = await import('/public/static/video/data.ts')
    list.value = module.default
  } catch (error) {
    console.error('导入配置失败:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.portal-container {
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
  color: #fff;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding-bottom: 2rem;
}

.page-title {
  height: 80px;
  line-height: 80px;
  text-align: center;
  padding: 0 3%;
  margin: 0;
}

.video-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  padding: 0 3%;
}

.video-item {
  margin-bottom: 40px;
}

.video-title {
  text-align: left;
  height: 40px;
  line-height: 40px;
  margin: 0;
}

.steam-id {
  font-weight: normal;
}

.steam-id.danger {
  color: red;
  font-weight: bold;
}

.state-info {
  text-align: center;
  padding: 100px 0;
  color: #94a3b8;
  font-size: 16px;
}

@media (max-width: 768px) {
  .video-list {
    grid-template-columns: 1fr;
  }

  .page-title {
    height: auto;
    line-height: 1.5;
    padding: 1.5rem 3%;
    font-size: 1.1rem;
  }
}
</style>
