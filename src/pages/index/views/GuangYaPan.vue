<template>
    <div class="portal-container">
        <Header></Header>
        
        <!-- 播放器弹窗遮罩，居中悬浮 -->
        <div v-show="showPlayer" class="player-wrapper">
            <!-- 西瓜播放器容器 (MP4, HLS, FLV 等) -->
            <div v-show="!isMpegFormat" id="mse"></div>
            
            <!-- JSMpeg 专用 Canvas 容器 (MPEG 格式) -->
            <div v-show="isMpegFormat" class="mpeg-container">
                <canvas id="mpeg-canvas"></canvas>
            </div>
            
            <button class="close-btn" @click="closePlayer">关闭播放</button>
        </div>

        <div class="main-content">
            <div class="mune">
                <span @click="gohome()">首页</span>
                <span v-if="depth.length >2 " @click="goPrev()">上一页- {{ depth[depth.length - 2].fileName }}</span>
                <input name="searchQuery" type="text" placeholder="快速查询文件" v-model="searchQuery" @keydown.enter="handleSearch" />
            </div>
            <div v-if="initialCookies" class="success-state">
                <ul v-if="source.list.length > 0">
                    <template v-for="value in source.list" :key="value.fileId">
                        <template v-if="value.resType === 1">
                            <li @click="handleShow(value)">
                                <div class="fileicon" >
                                    <template alt="视频" v-if="value.mineType === 'video/mp4'">
                                        <img :src="value.thumbnail" alt="">
                                    </template>
                                    <template alt="txt" v-else-if="value.mineType === 'text/plain; charset=utf-8'">
                                        📄
                                    </template>
                                    <template alt="图片" v-else-if="value.mineType === 'image/jpeg'">
                                        <img :src="value.thumbnail" alt="">
                                    </template>
                                    <template alt="视频" v-else-if="value.mineType === 'application/octet-stream'">
                                        🎞️
                                    </template>
                                    <template alt="视频" v-else-if="value.mineType === 'video/mpegts'">
                                        🎞️
                                    </template>
                                    <template alt="视频" v-else-if="value.mineType === 'video/mpeg'">
                                        🎞️
                                    </template>
                                    <template alt="图片" v-else>
                                        📄
                                    </template>
                                </div>
                                <span>{{ value.fileName }}</span>
                            </li>
                        </template>
                        <template v-else-if="value.resType === 2">
                            <li @click="handleShow(value)">
                                <div class="fileicon">📁</div>
                                <span>{{ value.fileName }}</span>
                            </li>
                        </template>
                        <template v-else>
                            <li @click="handleShow(value)" >
                                <div class="fileicon">🈲</div>
                                <span>{{ value.fileName }}</span>
                            </li>
                        </template>
                    </template>
                </ul>
                <ul class="nodata" v-if="source.list.length === 0">
                    <li>🧱 暂无文件,请点击首页或者重新输入查询</li>
                </ul>
            </div>
            <div v-else="!initialCookies" class="empty-state">
                <div class="empty-icon">📦</div>
                <h2 @click="handleTitleClick" class="empty-title">跳转设置</h2>
                <p>内容正在建设中，请稍等...</p>
            </div>
        </div>
        <Pagination :total="source.total" :pageSize="pageSize" :currentPage="currentPage" @current-change="handlePageChange"></Pagination>
        <Footer></Footer>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import Pagination from '../components/Pagination.vue'

import { smartFetch } from '../../../utils/smartFetch' // 引入封装的智能 fetch 函数
import { ref, onMounted, onUnmounted } from 'vue'
import Player from 'xgplayer';
import HlsPlugin from 'xgplayer-hls';
import Mp4Plugin from 'xgplayer-mp4';
import FlvPlugin from "xgplayer-flv";
import "xgplayer/dist/index.min.css";

// 动态引入 jsmpeg-player，规避 SSR 或一些严格类型校验下的依赖报错
// @ts-ignore
import JSMpeg from 'jsmpeg-player'; 


type FileItem = {
    auditStatus: number,
    ctime: number,
    depth: number,
    dirType: number,
    fileId: string
    fileName: string
    resType: number,
    utime: number,
    mineType: string,
    thumbnail: string,
    ext: string,
    gcid: string,
    downloadURL: string
}
type bodyDataType = {
    orderBy: number,
    pageSize: number,
    parentId: string,
    sortType: number,
    page?: number,
    name?: string
}

let initialCookies = ref(false)
let source = ref({
    list: [] as FileItem[],
    total: 0
})
let depth = ref([{fileName: '', fileId: ''}])
let showPlayer = ref(false)
let isMpegFormat = ref(false)
let currentPage = ref(1) // 当前分页页码

let playerInstance: Player | null = null; // 西瓜播放器实例
let mpegInstance: any = null;              // JSMpeg 播放器实例
let pageSize = ref(12); // 每页显示的文件数量
let searchQuery = ref(''); // 搜索查询字符串
// 关闭播放器并彻底清理所有实例
const closePlayer = () => {
    showPlayer.value = false;
    isMpegFormat.value = false;

    // 销毁西瓜播放器
    if (playerInstance) {
        playerInstance.destroy();
        playerInstance = null;
    }
    // 销毁 JSMpeg 播放器
    if (mpegInstance) {
        mpegInstance.destroy();
        mpegInstance = null;
    }
}

let cookiesData = localStorage.getItem('cookiesData')
let token = ''
if(cookiesData){
  const parsedCookies = JSON.parse(cookiesData)
  initialCookies.value = true
  token = parsedCookies.access_token || '';
}else{
  initialCookies.value = false
}

const handleTitleClick = () => {
  window.location.href = `/admin.html#/GuangYaPan`
}

const handleShow = (value: FileItem) => {
    if(value.resType === 1){
        // 文件：扩展了判断，当检测到 video/mpeg 时也进入获取视频流逻辑
        if(value.mineType === 'video/mpeg' || value.mineType === 'video/mp4' || value.mineType === 'application/octet-stream' || value.mineType === 'video/mpegts'){
          getVideoData(value.fileId, value.gcid, value.mineType)
        }else{
          window.open(value.downloadURL, '_blank')
        }
    }else if(value.resType === 2){
        depth.value.push({fileName: value.fileName, fileId: value.fileId})
        getData(value.fileId, 1)
    }
}

const goPrev = () => {
    // 判断当前是否在搜索状态，如果是则直接回到当前目录列表而不是上一级目录
    if(searchQuery.value.trim() !== ''){
        searchQuery.value = ''
        const parentId = depth.value[depth.value.length - 1]?.fileId || ''
        getData(parentId, 1)
        return
    }
    // 回到上一级目录，弹出路径栈顶元素
    if(depth.value.length > 1){
        depth.value.pop()
        const prev = depth.value[depth.value.length - 1]
        getData(prev.fileId, 1)
    }
}

const gohome = () => {
    // 回到根目录，重置路径栈
    depth.value = [{fileName: '', fileId: ''}]
    // 搜索状态下点击首页，重置搜索框并恢复到根目录列表
    searchQuery.value = ''
    // 直接调用 getData 请求根目录数据，避免重复逻辑
    getData('', 1)
}

const getData = (id: string = '', page: number = 1,pageSize: number = 12) => {
    currentPage.value = page
    let url = `https://api.guangyapan.com/userres/v1/file/get_file_list`
    let bodyData = {
        "orderBy": 1,
        "pageSize": pageSize,
        "parentId": id,
        "sortType": 1
        } as bodyDataType
    if(page !== 1){
        bodyData.page = page - 1
    }
    smartFetch(url, {
        method: 'POST',
        body: JSON.stringify(bodyData),
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
      if (data.msg === 'success' && data.data?.list) {
        source.value = data.data || { list: [], total: 0 }
      } else {
        source.value = { list: [], total: 0 }
      }
    })
    .catch(error => {
      console.error('Error checking cookies:', error)
    })
}

// 分页切换：使用当前所在的文件夹 ID 重新请求
const handlePageChange = (page: number) => {
    // 判断当前是否是搜索状态，如果是则继续使用搜索接口进行分页请求，而不是普通的目录列表接口
    console.log('Page change triggered:', page, 'Current search query:', searchQuery.value);
    if (searchQuery.value.trim() !== '') {
        searchData(searchQuery.value, page)
    }else{
        const parentId = depth.value[depth.value.length - 1]?.fileId || ''
        getData(parentId, page)
    }
}

// 获取视频资源并分流渲染
const getVideoData = (id: string, gcid: string, mimeType: string) => {
  let url = `https://api.guangyapan.com/userres/v1/file/get_vod_download_url`
  fetch(url, {
    method: 'POST',
    body: JSON.stringify({ fileId: id, gcid: gcid }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
    .then(response => response.json())
    .then(data => {
      if (data.msg === 'success' && data.data?.signedURL) {
        const videoUrl = data.data.signedURL;
        showPlayer.value = true;

        // 1. 每次载入新视频前，先彻底断开和清理旧的实例
        if (playerInstance) { playerInstance.destroy(); playerInstance = null; }
        if (mpegInstance) { mpegInstance.destroy(); mpegInstance = null; }

        // 2. 核心分流机制：通过 mimeType 或链接特征识别 video/mpeg 
        if (mimeType === 'video/mpeg' || videoUrl.toLowerCase().includes('.mpeg') || videoUrl.toLowerCase().includes('.mpg')) {
            isMpegFormat.value = true;
            
            // 使用 JSMpeg 绑定内部的 canvas 进行 Wasm 软解码渲染
            mpegInstance = new JSMpeg.VideoElement('#mpeg-canvas', videoUrl, {
                autoplay: true,
                loop: false,
                control: true // 显示 JSMpeg 自带的简易控制条
            });
            console.log('JSMpeg 软解播放器初始化成功:', videoUrl);
            
        } else {
            // 3. 非 mpeg 格式，继续走西瓜播放器硬解通道
            isMpegFormat.value = false;
            
            // 【核心修复】：收紧 HLS 的判断逻辑，防止链接中因为带有时间戳参数 &ts=xxxx 导致误判
            const isRealHls = videoUrl.toLowerCase().includes('.m3u8');
            let plugins = [];
            
            if (isRealHls) {
                plugins.push(HlsPlugin);
            } else if (videoUrl.toLowerCase().includes('.mp4')) {
                plugins.push(Mp4Plugin);
            } else if (videoUrl.toLowerCase().includes('.flv')) {
                plugins.push(FlvPlugin);
            }
            // 如果像 CDN 下载直链一样没有任何特征后缀，则不传入特定的格式切片插件，直接交由原生内核渲染

            playerInstance = new Player({
                id: 'mse',
                url: videoUrl,
                width: '100%',
                fluid: true, 
                autoplay: true,
                lang: 'zh-cn',
                plugins: plugins,
                mp4plugin: isRealHls ? undefined : {
                    maxBufferLength: 50,
                    minBufferLength: 10,
                }
            });

            // 4. 增加错误监听兜底
            playerInstance.on('error', (err) => {
                console.error('西瓜播放器播放发生异常，详情：', err);
            });

            console.log('西瓜播放器初始化成功，当前是否为 M3U8:', isRealHls, '链接:', videoUrl);
        }
      } else {
        console.log('Video are invalid or expired.')
      }
    })
    .catch(error => {
      console.error('Error checking Video:', error)
    })
}
// 搜索查询
const searchData = (name: string, page: number = 1, pageSize: number = 12) => {
    currentPage.value = page
    let url = `https://api.guangyapan.com/userres/v1/file/search_files`
    let bodyData = {
        "orderBy": 1,
        "pageSize": pageSize,
        "sortType": 1,
        name: name
        } as bodyDataType
    if(page !== 1){
        bodyData.page = page - 1
    }
    smartFetch(url, {
        method: 'POST',
        body: JSON.stringify(bodyData),
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
      if (data.msg === 'success' && data.data?.list) {
        source.value = data.data || { list: [], total: 0 }
      } else {
        source.value = { list: [], total: 0 }
      }
    })
    .catch(error => {
      console.error('Error checking cookies:', error)
    })
}
const handleSearch = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
        const target = event.target as HTMLInputElement;
        searchQuery.value = target.value;
        if(searchQuery.value.trim() === ''){
            // 如果搜索框为空，恢复到当前目录的正常列表
            const parentId = depth.value[depth.value.length - 1]?.fileId || ''
            getData(parentId, 1)
        }else{
            // 否则执行搜索
            searchData(searchQuery.value, 1)    
        }
    }
}

onMounted(() => {
  if (initialCookies.value) {
    getData()
  }
})

onUnmounted(() => {
    // 统一销毁，防止切页面时留有背景音或内存泄漏
    if (playerInstance) playerInstance.destroy();
    if (mpegInstance) mpegInstance.destroy();
})
</script>

<style scoped>
ul,li{
    list-style: none;
    margin: 0;
    padding: 0;
}
.portal-container {
    font-family: 'Inter', sans-serif;
    min-height: 100vh;
    background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
    color: #fff;
    overflow-x: hidden;
}

/* 播放器基础弹窗架构 */
.player-wrapper {
    width: 60%;
    min-width: 600px;
    margin: 20px auto;
    background: #000;
    border-radius: 12px;
    overflow: hidden;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translateX(-50%) translateY(-50%);
    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    z-index: 1000;
}

/* MPEG 容器与 Canvas 自适应响应样式 */
.mpeg-container {
    position: relative;
    width: 100%;
    padding-top: 56.25%; /* 保持 16:9 比例屏，防止软解拉伸变形 */
    background: #000;
}
#mpeg-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.close-btn {
    position: absolute;
    right: 10px;
    top: 10px;
    z-index: 1010;
    background: rgba(255, 0, 0, 0.6);
    color: white;
    border: none;
    padding: 6px 14px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
}
.close-btn:hover {
    background: rgba(255, 0, 0, 0.9);
}

/* 保持你其余的网盘 UI 布局样式不变 */
.main-content {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    min-height: calc(100vh - 180px);
}
.mune{
    display: flex;
    gap: 20px;
    margin: 20px 0;
    width: calc(100% - 120px);
}
.success-state{
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 20px;
    border-radius: 20px;
    text-align: center;
    color: #cbd5e1;
    min-height: calc(100vh - 300px);
    min-width: 960px;
}
.success-state ul {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    padding: 0;
    user-select: none;
}
.success-state ul.nodata {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 500px;
    transition: display 0.5s ease;
}
.success-state ul li{
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.success-state ul li:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}
.success-state ul .fileicon {
    width: auto;
    height: 100px;
    display: flex;
    font-size: 100px;
    transform: translate(0px, 32px);
    margin-bottom: 10px;
}
.success-state ul .fileicon img {
    width: auto;
    height: auto;
    display: block;
    transform: translate(0px, -32px);
}
.success-state ul li span {
    font-size: 14px;
    color: #94a3b8;
}
.empty-state {
    text-align: center;
    color: #cbd5e1;
    padding: 4rem 2rem;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    max-width: 500px;
    width: 100%;
}
.empty-icon {
    font-size: 4rem;
    margin-bottom: 1.5rem;
}
.empty-state h2 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 1rem;
    background: linear-gradient(to right, #38bdf8, #818cf8);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    cursor: pointer;
    transition: background 0.3s ease;
}
.empty-state p {
    font-size: 1.1rem;
    color: #94a3b8;
}
</style>