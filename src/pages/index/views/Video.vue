<template>
  <div class="portal-container">
    <Header></Header>
    
    <main class="main-content">
      <VideoType></VideoType>
      
      <ContainerListVideo 
        v-if="list.length > 0" 
        :list="list" 
        :total="total" 
        :currentPage="currentPage" 
        :pageSize="pageSize"
        :loading="loading"
        @current-change="onPageChange"
      />

      <div v-if="loading" class="state-info">
        <p>数据加载中...</p>
      </div>

      <div v-else-if="list.length === 0" class="state-info">
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
import VideoType from '../components/VideoType.vue'
import ContainerListVideo from '../components/ContainerListVideo.vue'

// --- 全局配置 ---
// const geturl = `https://rough-base-4402.0951b6a5.er.aliyun-esa.net/`
const geturl = import.meta.env.VITE_API_URL

// --- 响应式状态 ---
const list = ref([])           // 视频列表数据
const total = ref(0)          // 后端返回的总数据量
const currentPage = ref(1)    // 当前所在页码
const pageSize = ref(6)       // 每页限制条数 (需与后端 EdgeKV 限制一致)
const loading = ref(false)    // 加载状态控制

/**
 * 核心方法：获取列表数据
 * 分页模式下，每次请求都会根据当前的 currentPage 覆盖旧数据
 */
const getList = async () => {
    if (loading.value) return
    loading.value = true

    // 构造带分页参数的请求地址
    const fetchUrl = `${geturl}/api/v1/video/list?page=${currentPage.value}&size=${pageSize.value}`

    try {
        const response = await fetch(fetchUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // 如果前台不需要登录权限可删除下一行
                'Authorization': 'Bearer ' + (localStorage.getItem('admin_token') || '')
            }
        })
        
        const res = await response.json()

        if (res.code === 0) {
            // 1. 更新列表数据（直接赋值，实现翻页效果）
            list.value = res.data
            // 2. 更新总数，用于同步分页组件的页码按钮数量
            total.value = res.total
        } else {
            console.error('业务报错:', res.message)
        }
    } catch (error) {
        console.error('网络请求失败:', error)
    } finally {
        loading.value = false
    }
}

/**
 * 分页切换处理函数
 * 当子组件 (Pagination) 触发点击事件时执行
 * @param {number} page 子组件传回的目标页码
 */
const onPageChange = (page) => {
    // 更新当前页码
    currentPage.value = page
    
    // 重新请求数据
    getList()

    // 体验优化：翻页后自动平滑滚动回内容区域顶部
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    })
}

// 页面加载时初始化第一页数据
onMounted(() => {
    getList()
})
</script>

<style scoped>
/* 页面整体背景与基础样式 */
.portal-container {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  /* 深色渐变背景，符合视频站风格 */
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1; /* 撑开中间区域，让页脚固定在底部 */
  width: 100%;
  max-width: 1200px; /* 限制最大宽度，居中显示 */
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
}

/* 加载中与空状态的样式 */
.state-info {
  text-align: center;
  padding: 100px 0;
  color: #94a3b8;
  font-size: 16px;
  letter-spacing: 1px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .main-content {
    padding: 10px;
  }
}
</style>