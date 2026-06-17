<template>
  <div class="portal-container">
    <Header></Header>
    <main class="main-content">
      <div class="text-center mb-6">
        <h1 class="text-4xl font-bold">磁力链接获取</h1>
        <p class="text-gray-400 mt-2">从8ci.li获取最新的磁力链接资源</p>
      </div>
      <div class="row" style="padding-bottom: 20px;">
        <div class="flex justify-center">
          <el-input
            v-model="search"
            placeholder="Please input"
            @keydown.enter="getList"
          >
            <template #append><el-button v-loading.fullscreen.lock="loading" @click="getList" icon="Search" >搜索</el-button></template>
          </el-input>
        </div>
      </div>
      <TableList :List="list" @current-change="getMagnetLink"></TableList>

      <div v-if="list.length === 0" class="state-info">
        <p>暂无相关搜索内容</p>
      </div>
    </main>

    <Footer></Footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import TableList from '../components/TableList.vue'
import type { Magne } from '../../../common/dto/magne.ts'

import { ElMessageBox,ElMessage, ElInput ,ElLoading } from 'element-plus'


// --- 全局配置 ---
const geturl = `https://8ci.li`
const search = ref('')       // 搜索关键词
const list = ref<Magne[]>([])    // 每页限制条数 (需与后端 EdgeKV 限制一致)
const loading = ref(false)    // 加载状态控制

/**
 * 核心方法：获取列表数据
 * 分页模式下，每次请求都会根据当前的 currentPage 覆盖旧数据
 */
const proxyUrl = 'https://corsproxy.io/?'
const getList = async () => {
    if (loading.value) return
    loading.value = true
    // 构造带分页参数的请求地址
    if (!search.value.trim()) {
      ElMessage.warning('请输入搜索关键词')
      loading.value = false
      return
    }
    const fetchUrl = `${geturl}/search?q=${search.value}`
    const proxyFetchUrl = `${proxyUrl}${encodeURIComponent(fetchUrl)}`
    try {
        const response = await fetch(proxyFetchUrl, {
            method: 'GET',
            headers: {
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
            }
        })
        const res = await response.text()
        const parser = new DOMParser();
        const doc = parser.parseFromString(res, 'text/html');
        const items = [...doc.querySelectorAll('.file-list tr')];
        list.value = items.map(item => {
            const name = item.querySelector('a')?.textContent?.trim() || '未知标题';
            const link = item.querySelector('a')?.getAttribute('href') || '#';
            const size = item.querySelector('.td-size')?.textContent?.trim() || '未知大小'
            return { name, link, size };
        });
        console.log('获取到的列表数据:', list.value)
    } catch (error) {
        console.error('网络请求失败:', error)
    } finally {
      loading.value = false
    }
}

/**
 * 获取磁力链接
 */
const getMagnetLink = async (item: Magne) => {
   const loadingstatus = ElLoading.service({
    lock: true,
    text: 'Loading',
    background: 'rgba(0, 0, 0, 0.7)',
  })
  try {
    const url = `${geturl}${item.link}`
    const proxyFetchUrl = proxyUrl + encodeURIComponent(url)

    const res = await fetch(proxyFetchUrl, {
      method: 'GET',
      headers: {
        'user-agent': 'Mozilla/5.0'
      }
    })

    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const magnetInput = doc.querySelector<HTMLInputElement>('#input-magnet')

    const magnetLink = magnetInput?.value?.trim()

    if (!magnetLink) {
      ElMessage.warning('未获取到磁力链接')
      return
    }

    // ✅ 弹出自定义弹窗
    await ElMessageBox({
      title: '复制磁力链接',
      message: h('div', { style: 'display:flex;flex-direction:column;gap:12px;' }, [
        h(
          'textarea',
          {
            readonly: true,
            rows: 4,
            value: magnetLink,
            onClick: (e: Event) => (e.target as HTMLTextAreaElement).select(),
            style: `
              border-radius: 6px;
              border: 1px solid #444;
              background: #1e1e1e;
              color: #fff;
              resize: none;
              font-size: 13px;
            `
          }
        )
      ]),
      customStyle: {
        borderRadius: '8px',
        border: '1px solid #444',
        width: '400px'
      },
      customClass: 'setstyle',
      showCancelButton: true,
      confirmButtonText: '复制链接',
      cancelButtonText: '取消',
    }).then(() => {
      // 用户点击了确认按钮
      try {
        navigator.clipboard.writeText(magnetLink)
        ElMessage.success('已复制到剪贴板')
      } catch (err) {
        console.error('复制失败:', err)
        ElMessage.error('复制失败，请手动复制')
      }
    }).catch(() => {
      // 用户点击了取消按钮或关闭了弹窗
      ElMessage.info('已取消')
    }).finally(() => {
      loadingstatus.close() // 关闭加载状态
    })
  } catch (err) {
    console.error(err)
    ElMessage.error('获取磁力链接失败')
    loadingstatus.close() // 关闭加载状态
  }
}

// 页面加载时初始化第一页数据
onMounted(() => {
    // getList()
})
</script>

<style>
.setstyle .el-message-box__message {
  width: 100%;
}
</style>
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