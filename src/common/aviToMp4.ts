import Player from 'xgplayer';
import Mp4Plugin from 'xgplayer-mp4';
import { FfmpegService } from './ffmpeg-service';

export function aviToMp4(videoDetail: any, videoUrl: string, isMpegFormat: { value: boolean },ffmpegService: FfmpegService | null, playerInstance: Player | null): void {
    console.log('请稍等正在加载 FFmpeg WASM 模块以支持 AVI 视频播放，加载时间可能较长...');
    console.log('playerInstance parameter received:', playerInstance);
    if (!videoDetail) return;
    
    // 状态管理
    let isMinimized = false;
    let isCancelled = false;
    let startTime = Date.now();
    let progressInterval: any = null;
    let ffmpegCancelled = false;
    let originalOverflow = '';
    
    // 保存的进度值
    let currentProgress = 0;
    
    // 下载选项状态
    let shouldDownload = true; // 默认勾选
    
    // 遮罩层相关元素
    let overlay: HTMLElement | null = null;
    let minimizedView: HTMLElement | null = null;
    
    // 生成雪花算法文件名
    const generateSnowflakeFilename = (): string => {
        // 使用时间戳+随机数生成类似雪花的ID
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return `${timestamp}_${random}.mp4`;
    };
    
    // 下载文件
    const downloadFile = (blob: Blob, filename: string) => {
        try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log('文件下载完成:', filename);
            }, 100);
        } catch (error) {
            console.error('下载文件失败:', error);
        }
    };
    
    // 锁住页面滚动
    const lockPageScroll = () => {
        originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
    };
    
    // 恢复页面滚动
    const unlockPageScroll = () => {
        document.body.style.overflow = originalOverflow;
    };
    
    // 创建遮罩层
    const createOverlay = () => {
        // 如果已存在，先移除
        removeOverlay();
        
        lockPageScroll();
        
        overlay = document.createElement('div');
        overlay.id = 'transcoding-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            color: white;
            font-family: sans-serif;
            transition: all 0.3s ease;
        `;
        
        overlay.innerHTML = `
            <div id="transcoding-main" style="
                background: rgba(40, 40, 40, 0.95);
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                max-width: 450px;
                width: 85%;
                position: relative;
                transition: all 0.3s ease;
                animation: fadeIn 0.3s ease;
            ">
                <style>
                    @keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                </style>
                
                <button id="minimize-btn" style="
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: #aaa;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                " title="最小化到后台">_</button>
                
                <div id="spinner" style="
                    width: 50px;
                    height: 50px;
                    border: 3px solid rgba(255,255,255,0.2);
                    border-top: 3px solid #1890ff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                
                <h3 style="margin-bottom: 10px;">视频转码中...</h3>
                <p style="color: #aaa; margin-bottom: 20px;">AVI 格式需要转换为 MP4 才能播放</p>
                
                <div style="
                    width: 100%;
                    height: 6px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 3px;
                    overflow: hidden;
                    margin-bottom: 10px;
                ">
                    <div id="progress-bar" style="
                        height: 100%;
                        background: #1890ff;
                        width: ${currentProgress}%;
                        transition: width 0.3s;
                    "></div>
                </div>
                
                <div id="progress-text" style="font-size: 14px; color: #1890ff; margin-bottom: 10px;">${currentProgress}%</div>
                
                <div id="time-info" style="
                    font-size: 12px;
                    color: rgba(255,255,255,0.6);
                    background: rgba(255,255,255,0.05);
                    padding: 4px 8px;
                    border-radius: 4px;
                    display: inline-block;
                    margin-top: 5px;
                    margin-bottom: 15px;
                ">
                    已用时: <span id="elapsed-time">${Math.floor((Date.now() - startTime) / 1000)}</span>秒
                </div>
                
                <!-- 下载选项 -->
                <div id="download-option" style="
                    background: rgba(255,255,255,0.05);
                    border-radius: 6px;
                    padding: 12px 15px;
                    margin-bottom: 20px;
                    text-align: left;
                ">
                    <div style="display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none;" id="download-toggle">
                        <div id="checkbox" style="
                            width: 18px;
                            height: 18px;
                            border: 2px solid #1890ff;
                            border-radius: 4px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            transition: all 0.2s;
                            ${shouldDownload ? 'background: #1890ff;' : ''}
                        ">
                            ${shouldDownload ? '✓' : ''}
                        </div>
                        <div>
                            <div style="font-size: 14px; color: #fff; margin-bottom: 4px;">自动下载转码后的视频</div>
                            <div style="font-size: 12px; color: rgba(255,255,255,0.6);">转码成功后自动下载 MP4 文件</div>
                        </div>
                    </div>
                    
                    <div id="filename-preview" style="
                        font-size: 11px;
                        color: rgba(255,255,255,0.5);
                        background: rgba(0,0,0,0.3);
                        padding: 6px 10px;
                        border-radius: 4px;
                        margin-top: 8px;
                        font-family: monospace;
                        display: ${shouldDownload ? 'block' : 'none'};
                        border-left: 2px solid #1890ff;
                    ">
                        将保存为: ${generateSnowflakeFilename()}
                    </div>
                </div>
                
                <div style="
                    display: flex;
                    justify-content: space-between;
                    margin-top: 10px;
                    gap: 10px;
                ">
                    <button id="background-btn" style="
                        flex: 1;
                        background: rgba(255,255,255,0.1);
                        color: #aaa;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        transition: all 0.2s;
                    ">后台运行</button>
                    
                    <button id="cancel-btn" style="
                        flex: 1;
                        background: rgba(255, 77, 79, 0.1);
                        color: #ff4d4f;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        transition: all 0.2s;
                    ">取消转码</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // 绑定事件监听器
        setTimeout(() => {
            // 下载选项切换
            const downloadToggle = document.getElementById('download-toggle');
            const checkbox = document.getElementById('checkbox');
            const filenamePreview = document.getElementById('filename-preview');
            
            if (downloadToggle && checkbox) {
                downloadToggle.addEventListener('click', () => {
                    shouldDownload = !shouldDownload;
                    
                    if (shouldDownload) {
                        checkbox.innerHTML = '✓';
                        checkbox.style.background = '#1890ff';
                        if (filenamePreview) {
                            filenamePreview.style.display = 'block';
                            // 更新文件名显示
                            filenamePreview.textContent = `将保存为: ${generateSnowflakeFilename()}`;
                        }
                    } else {
                        checkbox.innerHTML = '';
                        checkbox.style.background = '';
                        if (filenamePreview) {
                            filenamePreview.style.display = 'none';
                        }
                    }
                    
                    console.log('下载选项:', shouldDownload ? '开启' : '关闭');
                });
                
                // 添加悬停效果
                downloadToggle.addEventListener('mouseenter', () => {
                    checkbox.style.borderColor = '#36cfc9';
                });
                downloadToggle.addEventListener('mouseleave', () => {
                    checkbox.style.borderColor = '#1890ff';
                });
            }
            
            // 最小化按钮
            const minimizeBtn = document.getElementById('minimize-btn');
            if (minimizeBtn) {
                minimizeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    minimizeOverlay();
                });
            }
            
            // 后台运行按钮
            const backgroundBtn = document.getElementById('background-btn');
            if (backgroundBtn) {
                backgroundBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    minimizeOverlay();
                });
                
                // 添加悬停效果
                backgroundBtn.addEventListener('mouseenter', () => {
                    backgroundBtn.style.background = 'rgba(255,255,255,0.2)';
                    backgroundBtn.style.color = '#fff';
                });
                backgroundBtn.addEventListener('mouseleave', () => {
                    backgroundBtn.style.background = 'rgba(255,255,255,0.1)';
                    backgroundBtn.style.color = '#aaa';
                });
            }
            
            // 取消按钮
            const cancelBtn = document.getElementById('cancel-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    cancelTranscoding();
                });
                
                cancelBtn.addEventListener('mouseenter', () => {
                    cancelBtn.style.background = 'rgba(255, 77, 79, 0.2)';
                    cancelBtn.style.color = '#ff7a7a';
                });
                cancelBtn.addEventListener('mouseleave', () => {
                    cancelBtn.style.background = 'rgba(255, 77, 79, 0.1)';
                    cancelBtn.style.color = '#ff4d4f';
                });
            }
        }, 10);
    };
    
    // 创建最小化视图
    const createMinimizedView = () => {
        // 如果已存在，先移除
        removeMinimizedView();
        
        minimizedView = document.createElement('div');
        minimizedView.id = 'transcoding-minimized';
        minimizedView.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(40, 40, 40, 0.95);
            border-radius: 8px;
            padding: 12px 15px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            z-index: 999998;
            border-left: 3px solid #1890ff;
            min-width: 220px;
            cursor: pointer;
            backdrop-filter: blur(10px);
            animation: slideIn 0.3s ease;
            transition: all 0.2s;
        `;
        
        minimizedView.innerHTML = `
            <style>
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            </style>
            
            <div id="minimized-spinner" style="
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255,255,255,0.2);
                border-top: 2px solid #1890ff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                flex-shrink: 0;
            "></div>
            
            <div style="flex: 1; min-width: 0;">
                <div style="font-size: 12px; color: #aaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">
                    视频转码中
                    <span id="minimized-download-icon" style="
                        display: ${shouldDownload ? 'inline-block' : 'none'};
                        margin-left: 5px;
                        color: #1890ff;
                        font-size: 10px;
                        background: rgba(24, 144, 255, 0.1);
                        padding: 1px 4px;
                        border-radius: 3px;
                    " title="将自动下载">↓</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                    <div style="
                        flex: 1;
                        height: 4px;
                        background: rgba(255,255,255,0.1);
                        border-radius: 2px;
                        overflow: hidden;
                    ">
                        <div id="minimized-progress" style="
                            height: 100%;
                            background: #1890ff;
                            width: ${currentProgress}%;
                            transition: width 0.3s;
                        "></div>
                    </div>
                    <div id="minimized-percent" style="font-size: 11px; color: #1890ff; min-width: 25px; flex-shrink: 0;">${currentProgress}%</div>
                </div>
            </div>
            
            <div style="display: flex; gap: 5px; flex-shrink: 0;">
                <button id="restore-btn" style="
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: #aaa;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                " title="恢复窗口">□</button>
                
                <button id="minimized-cancel-btn" style="
                    background: rgba(255, 77, 79, 0.1);
                    border: none;
                    color: #ff4d4f;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                " title="取消转码">×</button>
            </div>
        `;
        
        document.body.appendChild(minimizedView);
        
        // 绑定最小化视图事件
        setTimeout(() => {
            // 整个最小化视图点击恢复
            minimizedView?.addEventListener('click', (e) => {
                if (e.target === minimizedView) {
                    restoreOverlay();
                }
            });
            
            // 恢复按钮
            const restoreBtn = document.getElementById('restore-btn');
            if (restoreBtn) {
                restoreBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    restoreOverlay();
                });
                
                restoreBtn.addEventListener('mouseenter', () => {
                    restoreBtn.style.background = 'rgba(255,255,255,0.2)';
                    restoreBtn.style.color = '#fff';
                });
                restoreBtn.addEventListener('mouseleave', () => {
                    restoreBtn.style.background = 'rgba(255,255,255,0.1)';
                    restoreBtn.style.color = '#aaa';
                });
            }
            
            // 最小化视图中的取消按钮
            const minimizedCancelBtn = document.getElementById('minimized-cancel-btn');
            if (minimizedCancelBtn) {
                minimizedCancelBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    cancelTranscoding();
                });
                
                minimizedCancelBtn.addEventListener('mouseenter', () => {
                    minimizedCancelBtn.style.background = 'rgba(255, 77, 79, 0.2)';
                    minimizedCancelBtn.style.color = '#ff7a7a';
                });
                minimizedCancelBtn.addEventListener('mouseleave', () => {
                    minimizedCancelBtn.style.background = 'rgba(255, 77, 79, 0.1)';
                    minimizedCancelBtn.style.color = '#ff4d4f';
                });
            }
            if (minimizedView) {
                // 最小化视图悬停效果
                minimizedView.addEventListener('mouseenter', () => {
                    minimizedView!.style.transform = 'translateY(-2px)';
                    minimizedView!.style.boxShadow = '0 6px 25px rgba(0,0,0,0.5)';
                });
                minimizedView.addEventListener('mouseleave', () => {
                    minimizedView!.style.transform = 'translateY(0)';
                    minimizedView!.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';
                });
            }
        }, 10);
    };
    
    // 移除遮罩层
    const removeOverlay = () => {
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
    };
    
    // 移除最小化视图
    const removeMinimizedView = () => {
        if (minimizedView) {
            minimizedView.remove();
            minimizedView = null;
        }
    };
    
    // 清理所有视图
    const cleanupAllViews = () => {
        removeOverlay();
        removeMinimizedView();
        unlockPageScroll();
        
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
    };
    
    // 最小化遮罩层
    const minimizeOverlay = () => {
        if (isMinimized) return;
        
        isMinimized = true;
        unlockPageScroll(); // 恢复页面滚动
        removeOverlay();    // 移除遮罩层
        createMinimizedView(); // 创建最小化视图
    };
    
    // 恢复遮罩层
    const restoreOverlay = () => {
        if (!isMinimized) return;
        
        isMinimized = false;
        removeMinimizedView(); // 移除最小化视图
        createOverlay();       // 重新创建遮罩层
    };
    
    // 更新已用时间
    const updateElapsedTime = () => {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const elapsedElement = document.getElementById('elapsed-time');
        if (elapsedElement) {
            elapsedElement.textContent = elapsedTime.toString();
        }
    };
    
    // 更新进度显示
    const updateProgressDisplay = (progressValue: number) => {
        currentProgress = progressValue;
        
        // 更新主遮罩层进度
        if (overlay) {
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');
            
            if (progressBar) progressBar.style.width = `${progressValue}%`;
            if (progressText) progressText.textContent = `${progressValue}%`;
        }
        
        // 更新最小化视图进度
        if (minimizedView) {
            const minimizedProgress = document.getElementById('minimized-progress');
            const minimizedPercent = document.getElementById('minimized-percent');
            
            if (minimizedProgress) minimizedProgress.style.width = `${progressValue}%`;
            if (minimizedPercent) minimizedPercent.textContent = `${progressValue}%`;
        }
        
        // 根据进度改变颜色
        let color = '#1890ff';
        if (progressValue < 30) {
            color = '#ff4d4f';
        } else if (progressValue < 70) {
            color = '#faad14';
        } else if (progressValue < 100) {
            color = '#52c41a';
        }
        
        // 更新颜色
        if (overlay) {
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');
            if (progressBar) progressBar.style.background = color;
            if (progressText) progressText.style.color = color;
        }
        
        if (minimizedView) {
            const minimizedProgress = document.getElementById('minimized-progress');
            const minimizedPercent = document.getElementById('minimized-percent');
            const minimizedSpinner = document.getElementById('minimized-spinner');
            
            if (minimizedProgress) minimizedProgress.style.background = color;
            if (minimizedPercent) minimizedPercent.style.color = color;
            if (minimizedSpinner) minimizedSpinner.style.borderTopColor = color;
        }
    };
    
    // 更新最小化视图的下载图标
    const updateMinimizedDownloadIcon = () => {
        const downloadIcon = document.getElementById('minimized-download-icon');
        if (downloadIcon) {
            downloadIcon.style.display = shouldDownload ? 'inline-block' : 'none';
        }
    };
    
    // 取消转码
    const cancelTranscoding = () => {
        if (isCancelled) return;
        
        isCancelled = true;
        ffmpegCancelled = true;
        
        // 显示取消提示
        if (overlay) {
            const mainElement = document.getElementById('transcoding-main');
            if (mainElement) {
                mainElement.innerHTML = `
                    <div style="text-align:center; padding:20px;">
                        <div style="color: #ffa500; font-size: 40px; margin-bottom: 20px;">⚠️</div>
                        <h3 style="margin-bottom: 10px;">正在取消转码...</h3>
                        <p style="color: #aaa; margin-bottom: 20px;">请稍候，正在清理转码任务</p>
                        <div style="
                            width: 30px;
                            height: 30px;
                            border: 3px solid rgba(255,255,255,0.2);
                            border-top: 3px solid #ffa500;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                            margin: 0 auto;
                        "></div>
                    </div>
                `;
            }
        } else if (minimizedView) {
            // 如果是最小化状态，先恢复显示
            restoreOverlay();
            setTimeout(() => {
                const mainElement = document.getElementById('transcoding-main');
                if (mainElement) {
                    mainElement.innerHTML = `
                        <div style="text-align:center; padding:20px;">
                            <div style="color: #ffa500; font-size: 40px; margin-bottom: 20px;">⚠️</div>
                            <h3 style="margin-bottom: 10px;">正在取消转码...</h3>
                            <p style="color: #aaa; margin-bottom: 20px;">请稍候，正在清理转码任务</p>
                            <div style="
                                width: 30px;
                                height: 30px;
                                border: 3px solid rgba(255,255,255,0.2);
                                border-top: 3px solid #ffa500;
                                border-radius: 50%;
                                animation: spin 1s linear infinite;
                                margin: 0 auto;
                            "></div>
                        </div>
                    `;
                }
            }, 300);
        }
        
        // 清理 ffmpeg 服务
        if (ffmpegService) {
            ffmpegService.cleanup();
            ffmpegService = null;
        }
        
        // 2秒后关闭所有视图
        setTimeout(cleanupAllViews, 2000);
    };
    
    // 转码成功处理
    const handleTranscodingSuccess = (convertedBlob: Blob) => {
        if (ffmpegCancelled) {
            console.log('转码完成但已被用户取消');
            cleanupAllViews();
            return;
        }
        
        const blob = new Blob([convertedBlob], { type: 'video/mp4' });
        const blobUrl = URL.createObjectURL(blob);
        
        // 如果设置了自动下载，则下载文件
        if (shouldDownload) {
            const filename = generateSnowflakeFilename();
            console.log('自动下载转码后的视频:', filename);
            downloadFile(blob, filename);
        }
        
        // 显示成功提示
        if (overlay) {
            const mainElement = document.getElementById('transcoding-main');
            if (mainElement) {
                const downloadStatus = shouldDownload ? 
                    '<div style="color: #52c41a; font-size: 12px; background: rgba(82, 196, 26, 0.1); padding: 6px 10px; border-radius: 4px; margin-top: 10px;">✓ 视频已开始下载</div>' : 
                    '';
                
                mainElement.innerHTML = `
                    <div style="text-align:center; padding:20px;">
                        <div style="color: #52c41a; font-size: 40px; margin-bottom: 20px;">✅</div>
                        <h3 style="margin-bottom: 10px; color: #fff;">转码完成！</h3>
                        <p style="color: #aaa; margin-bottom: 20px;">正在启动播放器...</p>
                        <div style="
                            background: linear-gradient(90deg, #1890ff, #36cfc9);
                            width: 100%;
                            height: 6px;
                            border-radius: 3px;
                            margin: 20px 0;
                            animation: pulse 1.5s ease-in-out infinite;
                        "></div>
                        ${downloadStatus}
                    </div>
                `;
            }
        } else if (minimizedView) {
            // 如果是最小化状态，先恢复显示
            restoreOverlay();
            setTimeout(() => {
                const mainElement = document.getElementById('transcoding-main');
                if (mainElement) {
                    const downloadStatus = shouldDownload ? 
                        '<div style="color: #52c41a; font-size: 12px; background: rgba(82, 196, 26, 0.1); padding: 6px 10px; border-radius: 4px; margin-top: 10px;">✓ 视频已开始下载</div>' : 
                        '';
                    
                    mainElement.innerHTML = `
                        <div style="text-align:center; padding:20px;">
                            <div style="color: #52c41a; font-size: 40px; margin-bottom: 20px;">✅</div>
                            <h3 style="margin-bottom: 10px; color: #fff;">转码完成！</h3>
                            <p style="color: #aaa; margin-bottom: 20px;">正在启动播放器...</p>
                            <div style="
                                background: linear-gradient(90deg, #1890ff, #36cfc9);
                                width: 100%;
                                height: 6px;
                                border-radius: 3px;
                                margin: 20px 0;
                                animation: pulse 1.5s ease-in-out infinite;
                            "></div>
                            ${downloadStatus}
                        </div>
                    `;
                }
            }, 300);
        }
        
        // 1.5秒后清理并开始播放
        setTimeout(() => {
            cleanupAllViews();
            isMpegFormat.value = false;
            playerInstance = new Player({
                id: 'mse', 
                url: blobUrl, 
                width: '100%', 
                fluid: true, 
                autoplay: true, 
                lang: 'zh-cn', 
                plugins: [Mp4Plugin],
                mp4plugin: { maxBufferLength: 50, minBufferLength: 10 }
            });
        }, 1500);
    };
    
    // 转码失败处理
    const handleTranscodingError = (err: any) => {
        if (ffmpegCancelled) {
            console.log('转码已被用户取消');
            return;
        }
        
        console.error('AVI 转 MP4 失败:', err);
        
        // 确保显示错误提示
        if (!overlay && !minimizedView) {
            // 如果都没有显示，创建一个错误提示
            const errorOverlay = document.createElement('div');
            errorOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 999999;
            `;
            
            errorOverlay.innerHTML = `
                <div style="
                    background: rgba(40, 40, 40, 0.95);
                    padding: 30px;
                    border-radius: 10px;
                    text-align: center;
                    max-width: 400px;
                    width: 80%;
                ">
                    <div style="color: #ff4d4f; font-size: 40px; margin-bottom: 20px;">❌</div>
                    <h3 style="margin-bottom: 10px; color: #fff;">转码失败</h3>
                    <p style="color: #aaa; margin-bottom: 20px; background:rgba(255,77,79,0.1); padding:10px; border-radius:4px;">
                        ${err.message || '转码过程中发生错误'}
                    </p>
                    <button id="error-close-btn" style="
                        background: #ff4d4f;
                        color: white;
                        border: none;
                        padding: 8px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                    ">
                        关闭
                    </button>
                </div>
            `;
            
            document.body.appendChild(errorOverlay);
            
            // 绑定关闭按钮
            setTimeout(() => {
                const closeBtn = document.getElementById('error-close-btn');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        errorOverlay.remove();
                        unlockPageScroll();
                    });
                }
            }, 10);
        } else if (minimizedView) {
            // 如果是最小化状态，先恢复显示
            restoreOverlay();
            setTimeout(() => {
                const mainElement = document.getElementById('transcoding-main');
                if (mainElement) {
                    mainElement.innerHTML = `
                        <div style="
                            background: rgba(40, 40, 40, 0.95);
                            padding: 30px;
                            border-radius: 10px;
                            text-align: center;
                            max-width: 400px;
                            width: 80%;
                        ">
                            <div style="color: #ff4d4f; font-size: 40px; margin-bottom: 20px;">❌</div>
                            <h3 style="margin-bottom: 10px;">转码失败</h3>
                            <p style="color: #aaa; margin-bottom: 20px; background:rgba(255,77,79,0.1); padding:10px; border-radius:4px;">
                                ${err.message || '转码过程中发生错误'}
                            </p>
                            <button onclick="this.closest('#transcoding-overlay')?.remove(); document.body.style.overflow = ''" style="
                                background: #ff4d4f;
                                color: white;
                                border: none;
                                padding: 8px 20px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 12px;
                            ">
                                关闭
                            </button>
                        </div>
                    `;
                }
            }, 300);
        } else if (overlay) {
            // 如果是遮罩层状态，直接显示错误
            const mainElement = document.getElementById('transcoding-main');
            if (mainElement) {
                mainElement.innerHTML = `
                    <div style="
                        background: rgba(40, 40, 40, 0.95);
                        padding: 30px;
                        border-radius: 10px;
                        text-align: center;
                        max-width: 400px;
                        width: 80%;
                    ">
                        <div style="color: #ff4d4f; font-size: 40px; margin-bottom: 20px;">❌</div>
                        <h3 style="margin-bottom: 10px;">转码失败</h3>
                        <p style="color: #aaa; margin-bottom: 20px; background:rgba(255,77,79,0.1); padding:10px; border-radius:4px;">
                            ${err.message || '转码过程中发生错误'}
                        </p>
                        <button onclick="this.closest('#transcoding-overlay')?.remove(); document.body.style.overflow = ''" style="
                            background: #ff4d4f;
                            color: white;
                            border: none;
                            padding: 8px 20px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 12px;
                        ">
                            关闭
                        </button>
                    </div>
                `;
            }
        }
    };
    
    // 开始执行
    createOverlay();
    
    // 启动计时器
    progressInterval = setInterval(updateElapsedTime, 1000);
    
    if (!ffmpegService) {
        ffmpegService = new FfmpegService();
        ffmpegService.load().then(() => {
            console.log('FFmpeg WASM 加载成功，准备播放 AVI 视频');
            
            if (ffmpegService) {
                ffmpegService.convertAviToMp4FromUrl(videoUrl, (p: { progress: number }) => {
                    if (ffmpegCancelled) {
                        console.log('转码已被用户取消');
                        return;
                    }
                    
                    const progressValue = Math.floor(p.progress * 100);
                    console.log(`AVI 转 MP4 进度: ${progressValue}%`);
                    updateProgressDisplay(progressValue);
                    
                    // 更新最小化视图的下载图标
                    updateMinimizedDownloadIcon();
                }).then(handleTranscodingSuccess)
                .catch(handleTranscodingError);
            }
        }).catch((err: Error) => {
            handleTranscodingError(err);
        });
    }
}