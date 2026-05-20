/**
 * @description: 视频加载工具函数 (光鸭盘项目专用 - 完全对齐标准流控制模式)
 */
import type { FileItem } from './dto/file';
import type { ResponseData } from './dto/response';
import { getVideoOriginalUrl, getFileDetail } from './guangyaapi';

import Player from 'xgplayer';
// import HlsPlugin from 'xgplayer-hls';
import Mp4Plugin from 'xgplayer-mp4';
// import FlvPlugin from "xgplayer-flv";
import "xgplayer/dist/index.min.css";
import mpegts from 'mpegts.js';

// 统一管理所有的播放器/解码器实例
export let playerInstance: Player | null = null;       // 西瓜播放器实例
export let mpegtsPlayerInstance: any = null;                  // mpegts 实例
let mkvWasmWorkerInstance: Worker | null = null;        // 🛠️ 统一管理的内核 Worker 线程实例

// 缓存动态创建的原生 MKV DOM 元素，便于精确销毁
let mkvContainerElement: HTMLDivElement | null = null;
let mkvFetchAbortController: AbortController | null = null;

/**
 * 清理所有活跃的播放器实例与网络 IO，防止内存泄漏
 */
function clearActiveInstances(): void {
    if (mkvFetchAbortController) {
        mkvFetchAbortController.abort();
        mkvFetchAbortController = null;
    }

    if (playerInstance) {
        try { playerInstance.destroy(); } catch (e) { console.error(e); }
        playerInstance = null;
    }

    if (mpegtsPlayerInstance) {
        try {
            mpegtsPlayerInstance.unload();
            mpegtsPlayerInstance.detachMediaElement();
            mpegtsPlayerInstance.destroy();
        } catch (e) { console.error(e); }
        mpegtsPlayerInstance = null;
    }

    if (mkvWasmWorkerInstance) {
        try {
            mkvWasmWorkerInstance.postMessage({ type: 'STREAM_EOF' });
            mkvWasmWorkerInstance.terminate();
        } catch (e) { console.error(e); }
        mkvWasmWorkerInstance = null;
    }

    if (mkvContainerElement) {
        try { mkvContainerElement.remove(); } catch (e) { console.error(e); }
        mkvContainerElement = null;
    }

    const container = document.getElementById('mse');
    if (container) { container.innerHTML = ''; }
}


/**
 * @description: 经过修复与寻址锁优化的 MPEG-TS 专用加载器 (已补全播放/暂停、音量、双全屏及控制条自动隐藏)
 */
function mpegtsTOLoadVideo(videoDetail: any, videoUrl: string): void {
    if (typeof mpegts === 'undefined' || !mpegts.isSupported()) {
        console.error('当前环境不支持 MPEG-TS 播放');
        return;
    }

    const container = document.getElementById('mse');
    if (!container) return;

    // 清理容器并重置样式
    container.innerHTML = '';
    container.style.cssText = `width:100%; height:100%; background:#000; position:relative; user-select:none; overflow:hidden;`;

    // 1. 创建原生 video 元素
    const nativeVideo = document.createElement('video');
    nativeVideo.style.cssText = 'width:100%; height:100%; display:block;';
    nativeVideo.width = videoDetail.resolution.width || 640;
    nativeVideo.height = videoDetail.resolution.height || 360;
    container.appendChild(nativeVideo);

    // 2. 创建自定义控制条容器
    const customControls = document.createElement('div');
    customControls.style.cssText = 'position:absolute; bottom:0; left:0; right:0; height:44px; background:linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.3)); display:flex; align-items:center; padding:0 15px; color:#fff; z-index:20; transition: transform 0.3s ease, opacity 0.3s ease;';
    
    // 2.1 播放/暂停 按钮
    const playPauseBtn = document.createElement('div');
    playPauseBtn.style.cssText = 'cursor:pointer; padding-right:15px; font-size:14px; user-select:none; min-width:40px;';
    playPauseBtn.innerText = '暂停'; // 默认初始会走 play()
    customControls.appendChild(playPauseBtn);

    // 2.2 进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = 'flex:1; height:6px; background:rgba(255,255,255,0.2); margin-right:15px; cursor:pointer; position:relative; display:flex; align-items:center; border-radius:3px;';
    
    const progressBar = document.createElement('div');
    progressBar.style.cssText = 'width:0%; height:100%; background:#1890ff; position:relative; border-radius:3px;';
    
    const progressDot = document.createElement('div');
    progressDot.style.cssText = 'position:absolute; right:-6px; top:-3px; width:12px; height:12px; border-radius:50%; background:#fff; box-shadow:0 0 4px rgba(0,0,0,0.5); display:none;';
    progressBar.appendChild(progressDot);
    progressContainer.appendChild(progressBar);
    customControls.appendChild(progressContainer);

    progressContainer.addEventListener('mouseenter', () => progressDot.style.display = 'block');
    progressContainer.addEventListener('mouseleave', () => { if (!isDragging) progressDot.style.display = 'none'; });

    // 2.3 时间文本显示
    const timeDisplay = document.createElement('div');
    timeDisplay.style.cssText = 'font-size:13px; min-width:110px; text-align:left; margin-right:15px; font-family: monospace;';
    customControls.appendChild(timeDisplay);

    // 2.4 音量控制面板
    const volumeContainer = document.createElement('div');
    volumeContainer.style.cssText = 'display:flex; align-items:center; margin-right:20px;';
    
    const volumeBtn = document.createElement('div');
    volumeBtn.style.cssText = 'cursor:pointer; font-size:13px; margin-right:8px; min-width:35px; text-align:center;';
    volumeBtn.innerText = '静音'; // 初始由于代码底部强制静音，状态设为静音

    const volumeSliderBg = document.createElement('div');
    volumeSliderBg.style.cssText = 'width:60px; height:4px; background:rgba(255,255,255,0.3); position:relative; cursor:pointer; border-radius:2px;';
    
    const volumeSliderBar = document.createElement('div');
    volumeSliderBar.style.cssText = 'width:0%; height:100%; background:#fff; border-radius:2px;'; // 初始0% (配合muted)
    volumeSliderBg.appendChild(volumeSliderBar);
    
    volumeContainer.appendChild(volumeBtn);
    volumeContainer.appendChild(volumeSliderBg);
    customControls.appendChild(volumeContainer);

    // 2.5 网页全屏按钮
    const webFullscreenBtn = document.createElement('div');
    webFullscreenBtn.style.cssText = 'cursor:pointer; font-size:13px; margin-right:15px; user-select:none;';
    webFullscreenBtn.innerText = '网页全屏';
    customControls.appendChild(webFullscreenBtn);

    // 2.6 系统全屏按钮
    const fullscreenBtn = document.createElement('div');
    fullscreenBtn.style.cssText = 'cursor:pointer; font-size:13px; user-select:none;';
    fullscreenBtn.innerText = '全屏';
    customControls.appendChild(fullscreenBtn);

    container.appendChild(customControls);

    // 3. 初始化播放器
    const durationInSeconds = videoDetail.duration;

    mpegtsPlayerInstance = mpegts.createPlayer({
        type: 'mpegts',
        isLive: false,
        url: videoUrl,
        duration: durationInSeconds * 1000,
    }, {
        enableRangeRequest: true,
        accurateSeek: true,
        autoCleanupSourceBuffer: true,
        maxBufferDuration: 120,
        stashInitialPlaylist: false,
        lazyLoad: false,
        enableStashBuffer: false,       
        forceSeekingByRange: true,      
        seekType: 'range',              
    });

    mpegtsPlayerInstance.attachMediaElement(nativeVideo);
    
    mpegtsPlayerInstance.on(mpegts.Events.ERROR, (errType: any, errDetail: any) => {
        console.error(`播放器报错: ${errType}, ${errDetail}`);
        if (errType === mpegts.ErrorTypes.NETWORK_ERROR) {
            mpegtsPlayerInstance.unload();
            mpegtsPlayerInstance.load();
        }
    });
    mpegtsPlayerInstance.load();
    
    // 4. 核心控制变量
    let isDragging = false;       
    let isSeekingBlock = false;   
    let lockedTargetTime = 0;     
    let seekTimer: any = null;    
    let lastVolume = 0.5;         // 用于解除静音时恢复的历史音量比例

    const format = (s: number) => {
        if (isNaN(s)) return '00:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const getClickPercent = (clientX: number) => {
        const rect = progressContainer.getBoundingClientRect();
        let offset = (clientX - rect.left) / rect.width;
        return Math.max(0, Math.min(1, offset));
    };

    let globalCheckArrivalTimer: any = null;
    let globalActiveUnlockFunc: any = null;
    let globalLastTargetTime: number = 0;

    // 执行寻址流跳转
    const performSeek = (targetTime: number) => {
        clearTimeout(seekTimer);
        seekTimer = setTimeout(() => {
            if (!mpegtsPlayerInstance || !nativeVideo) return;

            let isBuffered = false;
            const buffered = nativeVideo.buffered;
            for (let i = 0; i < buffered.length; i++) {
                if (targetTime >= buffered.start(i) && targetTime <= (buffered.end(i) - 0.3)) {
                    isBuffered = true;
                    break;
                }
            }

            if (isBuffered) {
                isSeekingBlock = false;
                nativeVideo.currentTime = targetTime;
            } else {
                if (globalCheckArrivalTimer) {
                    clearInterval(globalCheckArrivalTimer);
                    globalCheckArrivalTimer = null;
                }
                if (globalActiveUnlockFunc) {
                    nativeVideo.removeEventListener('timeupdate', globalActiveUnlockFunc);
                    nativeVideo.removeEventListener('playing', globalActiveUnlockFunc);
                    nativeVideo.removeEventListener('seeked', globalActiveUnlockFunc);
                    globalActiveUnlockFunc = null;
                }

                isSeekingBlock = true;
                lockedTargetTime = targetTime;
                globalLastTargetTime = targetTime; 

                nativeVideo.style.opacity = '0';
                nativeVideo.style.transition = 'opacity 0.2s ease';

                const percent = (targetTime / durationInSeconds) * 100;
                progressBar.style.width = `${percent}%`;
                timeDisplay.innerText = "加载片段中...";
                timeDisplay.style.color = "#ff9900";

                try {
                    console.log(`[Mpegts] 启动暗箱寻址，目标: ${targetTime}s`);

                    if (mpegtsPlayerInstance._mstrController && mpegtsPlayerInstance._mstrController._mseController) {
                        mpegtsPlayerInstance.unload(); 
                        nativeVideo.currentTime = targetTime;
                        mpegtsPlayerInstance.load();
                    }

                    if (mpegtsPlayerInstance._controller && typeof mpegtsPlayerInstance._controller.seek === 'function') {
                        mpegtsPlayerInstance._controller.seek(targetTime);
                    }
                    
                    nativeVideo.currentTime = targetTime;

                    globalCheckArrivalTimer = setInterval(() => {
                        if (!isSeekingBlock || lockedTargetTime !== globalLastTargetTime) {
                            clearInterval(globalCheckArrivalTimer);
                            return;
                        }

                        const curTime = nativeVideo.currentTime;
                        const buffered = nativeVideo.buffered;

                        if (curTime >= (lockedTargetTime - 3.5) && curTime <= (lockedTargetTime + 10)) {
                            let hasSolidBuffer = false;
                            for (let i = 0; i < buffered.length; i++) {
                                if (curTime >= buffered.start(i) && curTime <= buffered.end(i)) {
                                    hasSolidBuffer = true;
                                    break;
                                }
                            }

                            if (hasSolidBuffer) {
                                clearInterval(globalCheckArrivalTimer);
                                console.log(`[Mpegts] 🎉 暗箱成功交接最新目标点: ${curTime}s`);
                                
                                isSeekingBlock = false;
                                nativeVideo.style.opacity = '1'; 
                                timeDisplay.style.color = "";
                                return;
                            }
                        }

                        if (buffered.length > 0 && (curTime < buffered.start(0) || curTime > buffered.end(buffered.length - 1))) {
                            nativeVideo.currentTime = buffered.start(0) + 0.1;
                        }
                    }, 50);

                    const unlock = () => {
                        if (!isSeekingBlock || lockedTargetTime !== globalLastTargetTime) return;
                        
                        const buffered = nativeVideo.buffered;
                        if (buffered.length > 0 && nativeVideo.currentTime > 0.5) {
                            for (let i = 0; i < buffered.length; i++) {
                                if (nativeVideo.currentTime >= buffered.start(i) && nativeVideo.currentTime <= buffered.end(i)) {
                                    clearInterval(globalCheckArrivalTimer);
                                    
                                    nativeVideo.removeEventListener('timeupdate', unlock);
                                    nativeVideo.removeEventListener('playing', unlock);
                                    nativeVideo.removeEventListener('seeked', unlock);
                                    globalActiveUnlockFunc = null;

                                    isSeekingBlock = false;
                                    nativeVideo.style.opacity = '1';
                                    timeDisplay.style.color = "";
                                    return;
                                }
                            }
                        }
                    };

                    globalActiveUnlockFunc = unlock;
                    nativeVideo.addEventListener('timeupdate', unlock);
                    nativeVideo.addEventListener('playing', unlock);
                    nativeVideo.addEventListener('seeked', unlock);

                    setTimeout(() => {
                        if (mpegtsPlayerInstance && lockedTargetTime === globalLastTargetTime) {
                            mpegtsPlayerInstance.play().catch(() => {});
                        }
                    }, 100);

                    const currentCaptureTarget = lockedTargetTime;
                    setTimeout(() => {
                        if (isSeekingBlock && currentCaptureTarget === globalLastTargetTime) {
                            clearInterval(globalCheckArrivalTimer);
                            isSeekingBlock = false;
                            nativeVideo.style.opacity = '1';
                            timeDisplay.style.color = "";
                        }
                    }, 5000);

                } catch (error) {
                    console.error("[Mpegts] 寻址异常:", error);
                    isSeekingBlock = false;
                    nativeVideo.style.opacity = '1';
                }
            }
        }, 180);
    };

    // ==========================================
    // 🛠️ 新增核心交互 A：播放 / 暂停 核心逻辑联动
    // ==========================================
    const togglePlay = () => {
        if (!nativeVideo) return;
        if (nativeVideo.paused) {
            nativeVideo.play().catch(() => {});
            playPauseBtn.innerText = '暂停';
        } else {
            nativeVideo.pause();
            playPauseBtn.innerText = '播放';
        }
    };
    playPauseBtn.addEventListener('click', togglePlay);
    // 允许点击视频画面中心也能快速切换播放/暂停
    nativeVideo.addEventListener('click', togglePlay);

    // 监听视频层底层状态，避免外部中断导致控制栏UI文字不同步
    nativeVideo.addEventListener('play', () => { playPauseBtn.innerText = '暂停'; });
    nativeVideo.addEventListener('pause', () => { playPauseBtn.innerText = '播放'; });


    // ==========================================
    // 🛠️ 新增核心交互 B：精密音量设置与静音切换
    // ==========================================
    const setVolumeStyle = (vol: number) => {
        volumeSliderBar.style.width = `${vol * 100}%`;
        if (vol === 0 || nativeVideo.muted) {
            volumeBtn.innerText = '静音';
        } else if (vol < 0.5) {
            volumeBtn.innerText = '音量小';
        } else {
            volumeBtn.innerText = '音量大';
        }
    };

    // 改变音量的内部公共处理器
    const changeVolumeProcess = (clientX: number) => {
        const rect = volumeSliderBg.getBoundingClientRect();
        let offset = (clientX - rect.left) / rect.width;
        let targetVol = Math.max(0, Math.min(1, offset));
        
        nativeVideo.muted = false;
        nativeVideo.volume = targetVol;
        if (targetVol > 0) {
            lastVolume = targetVol; // 记录最近活跃音量
        }
        setVolumeStyle(targetVol);
    };

    // 音量进度条点击与拖拽
    let isVolumeDragging = false;
    volumeSliderBg.addEventListener('mousedown', (e: MouseEvent) => {
        isVolumeDragging = true;
        changeVolumeProcess(e.clientX);
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
        if (isVolumeDragging) changeVolumeProcess(e.clientX);
    });

    window.addEventListener('mouseup', () => {
        if (isVolumeDragging) isVolumeDragging = false;
    });

    // 静音/反静音 点击按钮切换
    volumeBtn.addEventListener('click', () => {
        if (nativeVideo.muted) {
            nativeVideo.muted = false;
            nativeVideo.volume = lastVolume;
            setVolumeStyle(lastVolume);
        } else {
            nativeVideo.muted = true;
            setVolumeStyle(0);
        }
    });


    // ==========================================
    // 🛠️ 新增核心交互 C：网页全屏功能
    // ==========================================
    let isWebFullscreen = false;
    webFullscreenBtn.addEventListener('click', () => {
        if (!isWebFullscreen) {
            // 给视频最外层容器强行附加最高级层级样式
            container.style.setProperty('position', 'fixed', 'important');
            container.style.setProperty('top', '0', 'important');
            container.style.setProperty('left', '0', 'important');
            container.style.setProperty('width', '100vw', 'important');
            container.style.setProperty('height', '100vh', 'important');
            container.style.setProperty('z-index', '999999', 'important');
            webFullscreenBtn.innerText = '退出网页全屏';
            isWebFullscreen = true;
        } else {
            // 还原旧样式
            container.style.position = 'relative';
            container.style.top = '';
            container.style.left = '';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.zIndex = '';
            webFullscreenBtn.innerText = '网页全屏';
            isWebFullscreen = false;
        }
    });


    // ==========================================
    // 🛠️ 新增核心交互 D：系统真实全屏功能
    // ==========================================
    fullscreenBtn.addEventListener('click', () => {
        // 判断当前容器是否已经处于全屏状态
        if (!document.fullscreenElement) {
            container.requestFullscreen().then(() => {
                fullscreenBtn.innerText = '退出全屏';
            }).catch(err => {
                console.error(`无法激活全屏: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    // 必须通过事件监听原生全屏状态（防止用户按 Esc 退出后 UI 状态锁死）
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement === container) {
            fullscreenBtn.innerText = '退出全屏';
        } else {
            fullscreenBtn.innerText = '全屏';
        }
    });


    // ==========================================
    // 🛠️ 体验提升优化 E：控制工具栏自动冷冻隐藏
    // ==========================================
    let controlsTimer: any = null;
    const hideControls = () => {
        if (nativeVideo.paused || isDragging || isVolumeDragging) return;
        customControls.style.transform = 'translateY(100%)';
        customControls.style.opacity = '0';
        container.style.cursor = 'none'; // 顺带隐藏鼠标指针
    };
    const showControls = () => {
        clearTimeout(controlsTimer);
        customControls.style.transform = 'translateY(0)';
        customControls.style.opacity = '1';
        container.style.cursor = 'default';
        controlsTimer = setTimeout(hideControls, 2000); // 2秒无操作自动隐藏
    };

    container.addEventListener('mousemove', showControls);
    container.addEventListener('mouseleave', hideControls);
    showControls(); // 默认唤醒展现一次


    // A. 进度条鼠标按下事件
    progressContainer.addEventListener('mousedown', (e: MouseEvent) => {
        if (!durationInSeconds) return;
        isDragging = true;
        progressDot.style.display = 'block';

        const percent = getClickPercent(e.clientX);
        const targetTime = percent * durationInSeconds;

        progressBar.style.width = `${percent * 100}%`;
        timeDisplay.innerText = `${format(targetTime)} / ${format(durationInSeconds)}`;

        performSeek(targetTime);
    });

    // B. 全局鼠标移动事件
    window.addEventListener('mousemove', (e: MouseEvent) => {
        if (!isDragging || !durationInSeconds) return;

        const percent = getClickPercent(e.clientX);
        const targetTime = percent * durationInSeconds;

        progressBar.style.width = `${percent * 100}%`;
        timeDisplay.innerText = `${format(targetTime)} / ${format(durationInSeconds)}`;

        performSeek(targetTime);
    });

    // C. 全局鼠标释放事件
    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
        }
    });

    // 5. 进度实时更新
    nativeVideo.addEventListener('timeupdate', () => {
        if (isDragging) return; 

        if (isSeekingBlock) {
            const percent = (lockedTargetTime / durationInSeconds) * 100;
            progressBar.style.width = `${Math.min(percent, 100)}%`;
            timeDisplay.innerText = "加载片段中...";
            timeDisplay.style.color = "#ff9900";
            return;
        }

        const percent = (nativeVideo.currentTime / durationInSeconds) * 100;
        progressBar.style.width = `${Math.min(percent, 100)}%`;
        timeDisplay.style.color = "";
        timeDisplay.innerText = `${format(nativeVideo.currentTime)} / ${format(durationInSeconds)}`;
    });

    // 6. 状态事件辅助监听
    nativeVideo.addEventListener('canplay', () => {
        if (!isSeekingBlock) {
            nativeVideo.play().catch(() => {});
        }
    });

    nativeVideo.addEventListener('seeked', () => {
        if (!isDragging && !isSeekingBlock) {
            timeDisplay.style.color = "";
            timeDisplay.innerText = `${format(nativeVideo.currentTime)} / ${format(durationInSeconds)}`;
        }
    });

    nativeVideo.addEventListener('waiting', () => {
        if (!isDragging) {
            timeDisplay.innerText = "网络请求中...";
            timeDisplay.style.color = "#ff9900";
            if (mpegtsPlayerInstance && !isSeekingBlock) {
                 nativeVideo.play().catch(() => {});
            }
        }
    });

    nativeVideo.addEventListener('playing', () => {
        if (!isDragging && !isSeekingBlock) {
            timeDisplay.style.color = "";
            timeDisplay.innerText = `${format(nativeVideo.currentTime)} / ${format(durationInSeconds)}`;
        }
    });

    // 保持静音策略开启（防止浏览器内核由于策略拒绝触发首屏 autoplay）
    nativeVideo.muted = true; 
    setVolumeStyle(0);
    nativeVideo.play().catch(e => {
        console.warn("自动播放被拦截", e);
    });
}


// _loadVideoWithFormat 分支处理
function _loadVideoWithFormat(videoDetail: any, videoUrl: string, showPlayer: { value: boolean }, isMpegFormat: { value: boolean }): void {
    videoDetail = videoDetail.info || videoDetail; 
    showPlayer.value = true;
    clearActiveInstances();
    // ================== 1. MP4 格式分支 ==================
    if (videoDetail.mimeType === 'video/mp4') {
        isMpegFormat.value = false;
        playerInstance = new Player({
            id: 'mse', 
            url: videoUrl, 
            width: '100%', 
            fluid: true, 
            autoplay: true, 
            lang: 'zh-cn', 
            plugins: [Mp4Plugin],
            mp4plugin: { maxBufferLength: 50, minBufferLength: 10 }
        });
    }
    // ================== 2. MKV 纯原生软解分支 ==================
    else if (videoDetail.mimeType === '.mkv') {
        
    }
    // ================== 3. video/mpegts 格式 ==================
    else if (videoDetail.mimeType === 'video/mpegts') {
        mpegtsTOLoadVideo(videoDetail, videoUrl);
    }
    else if (videoDetail.mimeType === 'video/MP2T') {
        mpegtsTOLoadVideo(videoDetail, videoUrl);
    }
    // ================== 4. AVI 格式 ==================
    else if (videoDetail.mimeType === 'video/x-msvideo') {
        mpegtsTOLoadVideo(videoDetail, videoUrl);
    }
    else {
        console.warn('未识别的视频格式，尝试使用通用播放器核心逻辑');
    }
}

/**
 * 加载并播放视频主入口
 */
export function loadVideo(value: FileItem, showPlayer: { value: boolean }, isMpegFormat: { value: boolean }): void {
    getFileDetail(value.fileId).then((detailRaw: string | ResponseData<any>) => {
        let detailData: ResponseData<any>;
        try {
            detailData = typeof detailRaw === 'string' ? JSON.parse(detailRaw) : detailRaw;
            if(detailData.msg === 'success' && detailData.data?.videoResource){
                detailData.data.videoResource.sort((a: any, b: any) => {
                    if (a.info.videoType === 'mp4') return -1;
                    if (b.info.videoType === 'mp4') return 1;
                    if (a.info.videoType === 'mpegts') return -1;
                    if (b.info.videoType === 'mpegts') return 1;
                    return 0;
                });
                let videoDetail = detailData.data.videoResource[0];
                if (videoDetail) {
                    getVideoOriginalUrl(value.fileId, videoDetail.gcid).then((raw: string | ResponseData<any>) => {
                        let data: ResponseData<any>;
                        try {
                            data = typeof raw === 'string' ? JSON.parse(raw) : raw;
                            if (data.msg === 'success' && data.data?.signedURL) {
                                const videoUrl = data.data.signedURL;
                                _loadVideoWithFormat(videoDetail, videoUrl, showPlayer, isMpegFormat);
                            }
                        } catch (e) {
                            console.error('视频原始链接解析失败:', e);
                        }
                    });
                }
            }
        } catch (e) {
            console.error('文件详情解析失败:', e);
        }
    }).catch(err => {
        console.error('获取文件详情失败:', err);
    });
}

export function closePlayer(showPlayer: { value: boolean }, isMpegFormat: { value: boolean }): void {
    showPlayer.value = false;
    isMpegFormat.value = false;
    clearActiveInstances();
}