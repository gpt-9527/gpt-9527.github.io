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
                <span @click="gohome()" :style="{color: userinfo.isVip ? 'yellow' : ''}">首页</span>
                <span @click="goPrev(index)" v-for="(value,index) in depth" v-show="index > 0" :key="value.fileId">> {{ value.fileName }}</span>
                <el-input 
                    name="searchQuery" 
                    type="text" 
                    placeholder="快速查询文件" 
                    v-model="searchQuery" 
                    @keydown.enter="handleSearch">
                </el-input>
            </div>
            <div v-if="initialCookies" class="success-state">
                <ul v-if="source.list.length > 0">
                    <template v-for="value in source.list" :key="value.fileId">
                        <template v-if="value.resType === 1">
                            <li @click="handleShow(value)">
                                <div class="fileicon" >
                                    <template alt="视频" v-if="SHOW_VIDEO_TYPES.includes(value.mineType as any)">
                                        🎞️
                                    </template>
                                    <template alt="图片" v-else-if="SHOW_IMAGE_TYPES.includes(value.mineType as any)">
                                        <v-lazy-image :src="value.thumbnail" :src-placeholder="lazyimg" alt="" />
                                    </template>
                                    <template alt="文档" v-else-if="SHOW_DOCUMENT_TYPES.includes(value.mineType as any)">
                                        📄
                                    </template>
                                    <template alt="其他" v-else>
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
import { ref, onMounted, onUnmounted ,getCurrentInstance } from 'vue'

// 图片预加载插件
import VLazyImage from "v-lazy-image"
const lazyimg = "/lazyimg.jpg" 

// 定义文件项类型，方便后续使用
import { 
    IMAGE_TYPES, 
    VIDEO_TYPES, 
    DOCUMENT_TYPES, 
    SHOW_IMAGE_TYPES, 
    SHOW_VIDEO_TYPES,
    SHOW_DOCUMENT_TYPES
} from '../../../common/enum/file'

import loadImage from '../../../common/loadImage'
import loadDocument from '../../../common/loadDocument'

import { getAssets, getFileList } from '../../../common/guangyaapi'
import type { FileItem } from '../../../common/dto/file'
import type { bodyDataType } from '../../../common/dto/request'
import type { ResponseData } from '../../../common/dto/response'
import * as videoPlayer from '../../../common/loadVideo'


const instance = getCurrentInstance();
const proxy = instance?.proxy as any;

let userinfo = ref({
    isVip: true,
    isVipExpired: false
})
let initialCookies = ref(false)
let source = ref({
    list: [] as FileItem[],
    total: 0
})
let depth = ref([{fileName: '', fileId: ''}])
let showPlayer = ref(false)
let isMpegFormat = ref(false)
let currentPage = ref(1) // 当前分页页码

let pageSize = ref(12); // 每页显示的文件数量
let searchQuery = ref(''); // 搜索查询字符串

// 关闭播放器并彻底清理所有实例
const closePlayer = () => {
    videoPlayer.closePlayer(showPlayer, isMpegFormat)
}

let cookiesData = localStorage.getItem('gycookies')
if(cookiesData){
  initialCookies.value = true
}else{
  initialCookies.value = false
}

const handleTitleClick = () => {
  window.location.href = `/admin.html#/setting/GuangYaPan`
}

// 统一的文件点击处理函数，根据文件类型分流不同的展示或操作逻辑
const handleShow = (value: FileItem) => {
    if (value.resType === 1) {
        // 视频类型
        if (VIDEO_TYPES.includes(value.mineType as any)) {
            getVideoData(value)
            return;
        }
        // 图片类型
        if (IMAGE_TYPES.includes(value.mineType as any)) {
            loadImage(value, proxy.$viewerApi)
            return;
        }
        // 文档类型
        if (DOCUMENT_TYPES.includes(value.mineType as any)) {
            loadDocument(value)
            return;
        }
        // 其他类型，直接下载或新窗口打开
        window.open(value.downloadURL, '_blank')
    } else if (value.resType === 2) {
        // 文件夹，进入下一级
        depth.value.push({ fileName: value.fileName, fileId: value.fileId })
        getData(value.fileId, 1)
    }
}

// 路径导航点击，直接跳转到对应目录
const goPrev = (idx: number) => {
    // 判断点击的路径索引是否在当前路径栈范围内，防止越界
    if (idx === depth.value.length - 1) return; // 点击当前目录，无需操作
    // 通过点击的索引直接切换到对应目录，更新路径栈
    depth.value = depth.value.slice(0, idx + 1)
    const target = depth.value[depth.value.length - 1]
    getData(target.fileId, 1)
}

// 首页点击，重置路径栈并请求根目录数据
const gohome = () => {
    // 回到根目录，重置路径栈
    depth.value = [{fileName: '', fileId: ''}]
    // 搜索状态下点击首页，重置搜索框并恢复到根目录列表
    searchQuery.value = ''
    // 直接调用 getData 请求根目录数据，避免重复逻辑
    getData('', 1)
}
// 获取文件列表的统一函数，支持分页和目录切换
const getData = (id: string = '', page: number = 1,pageSize: number = 12) => {
    currentPage.value = page
    getFileList(id, page, pageSize)
    .then((raw: string) => {
        let data: ResponseData<any>;
        try {
            data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (e) {
            console.error('数据请求失败:', e);
            return;
        }
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
    if (searchQuery.value.trim() !== '') {
        searchData(searchQuery.value, page)
    }else{
        const parentId = depth.value[depth.value.length - 1]?.fileId || ''
        getData(parentId, page)
    }
}

// 获取视频资源并分流渲染
const getVideoData = (value: FileItem) => {
    // 请求获取视频的签名 URL
    videoPlayer.loadVideo(value, showPlayer, isMpegFormat, userinfo.value)
}
// 搜索查询
const searchData = (name: string, page: number = 1, pageSize: number = 12) => {
    // 搜索时分页会跳转到对应页码，更新当前页码状态
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
        body: JSON.stringify(bodyData)
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
const handleSearch = (event: KeyboardEvent | Event) => {
    if ('key' in event && event.key === "Enter") {
        const target = event.target as HTMLInputElement;
        searchQuery.value = target.value;
        if(searchQuery.value.trim() === ''){
            // 如果搜索框为空，恢复到当前目录的正常列表
            const parentId = depth.value[depth.value.length - 1]?.fileId || ''
            getData(parentId, 1)
        }else{
            // 否则执行搜索
            // 清除路径导航，进入搜索结果状态
            depth.value = [{ fileName: `搜索: ${searchQuery.value}`, fileId: '' }]
            searchData(searchQuery.value, 1)
            // 清除搜索框输入，保持界面整洁
            searchQuery.value = ''
        }
    }
}

onMounted(() => {
  if (initialCookies.value) {
    // 获取数据
    getData()
    // 查询是否是会员
    getAssets()
    .then((raw: string) => {
        let data: ResponseData<any>;
        try {
            data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (e) {
            console.error('数据请求失败:', e);
            return;
        }
        if (data.msg === 'success' && data.data) {
            if([null == true ? void 0 : data.data.vipStatus, null == true ? void 0 : data.data.svipStatus].includes(2)){
                //是会员
                userinfo.value.isVip = true
            }else{
                userinfo.value.isVip = false
            }
            if([null == true ? void 0 : data.data.vipStatus, null == true ? void 0 : data.data.svipStatus].includes(3)){
                //会员过期
                userinfo.value.isVipExpired = true
            }else{
                userinfo.value.isVipExpired = false
            }
        } else {
            source.value = { list: [], total: 0 }
        }
    })
    .catch(error => {
      console.error('Error checking cookies:', error)
    })
    
  }
})

onUnmounted(() => {
    // 统一销毁，防止切页面时留有背景音或内存泄漏
    if (videoPlayer.playerInstance) videoPlayer.playerInstance.destroy();
    if (videoPlayer.mpegtsPlayerInstance) videoPlayer.mpegtsPlayerInstance.destroy();
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
    justify-content: flex-start;
    align-items: center;
    flex-direction: column;
    min-height: calc(100vh - 260px);
}
.mune{
    display: flex;
    gap: 20px;
    margin: 20px 0;
    width: calc(100% - 120px);
}
.mune span {
    cursor: pointer;
    color: #94a3b8;
    transition: color 0.2s;
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
    margin: 4rem 0;
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