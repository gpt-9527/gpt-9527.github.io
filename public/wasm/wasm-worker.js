// wasm-worker.js

let wasmModule = null;
let cDecoderInstancePtr = null;

// wasm-worker.js 顶层增加一个暂存队列
const decoderState = {
    isWasmReady: false,
    isDecoderOpened: false,
    isDecodePaused: false,
    totalFileSize: 0,
    chunkSize: 0,
    fileOffset: 0,
    
    // 🌟 追加数据队列，用来抗住主线程分片下载的网络抖动
    packetQueue: [], 
    isReading: false
};

self.onmessage = async function(e) {
    const { type, data } = e.data;

    switch (type) {
        case 'INIT_WASM':
            console.log('【WASM Worker】接收到环境初始化指令，配置全局 Module...');
            
            decoderState.totalFileSize = data.fileSize;
            decoderState.chunkSize = data.chunkSize;

            // 🌟 1. 核心关键：提前对全局 Module 对象进行劫持与生命周期挂载
            self.Module = {
                // 告诉 WebAssembly 动态寻找编译产生的 .wasm 核心文件的绝对路径
                locateFile: function(path) {
                    if (path.endsWith('.wasm')) {
                        return data.wasmPath;
                    }
                    return path;
                },
                // 🌟 核心：当 WASM 虚拟机 runtime 在全局完全加载完毕后，会自动触发这个生命周期回调
                onRuntimeInitialized: function() {
                    console.log('【WASM Worker】🎉 全局 Module Runtime 初始化成功！');
                    
                    // 将全局加载完毕的 Module 赋给外部持久变量，供后续调用
                    wasmModule = self.Module;

                    // 调用 C 层导出的初始化函数，分配解封装器指针
                    if (typeof wasmModule._alloc_ffmpeg_decoder === 'function') {
                        cDecoderInstancePtr = wasmModule._alloc_ffmpeg_decoder(data.fileSize);
                    } else if (typeof wasmModule._initDecoder === 'function') {
                        cDecoderInstancePtr = wasmModule._initDecoder(data.fileSize);
                    } else {
                        cDecoderInstancePtr = 0; // 若无需指针则设为 0 兼容
                    }

                    decoderState.isWasmReady = true;
                    console.log('【WASM Worker】C层解码内核实例就绪，指针:', cDecoderInstancePtr);

                    // 触发二级握手信号：通知主线程可以开始下载并灌入 1MB 首片索引数据了
                    self.postMessage({ type: 'INIT_DECODER_RSP' });
                }
            };

            // 🌟 2. 在配置好全局 Module 之后，再通过 importScripts 动态下载并执行 libffmpeg.js
            try {
                importScripts('libffmpeg.js');
            } catch (err) {
                console.error('【WASM Worker】加载 libffmpeg.js 静态资源失败:', err);
            }
            break;

        case 'APPEND_STREAM':
            // ... 压入队列代码 ...
            decoderState.packetQueue.push(new Uint8Array(data.buffer));
            
            // 🌟 强行唤醒：如果不强行唤醒，setTimeout 可能会有延时
            // 直接在这里调用一次解码尝试，让 FFmpeg 立即消化刚喂进去的包
            if (decoderState.isDecoderOpened) {
                // 如果底层已经在等数据，这里可以直接尝试解析一帧
                runDecodeLoop(); 
            }
            break;
        case 'OPEN_DECODER':
            if (!wasmModule || cDecoderInstancePtr === null) return;
            console.log('【WASM Worker】激活 _openDecoder 进行流式解封装开箱...');
            
            let openRet = -1;
            if (typeof wasmModule._open_native_decoder === 'function') {
                openRet = wasmModule._open_native_decoder(cDecoderInstancePtr);
            } else if (typeof wasmModule._openDecoder === 'function') {
                openRet = wasmModule._openDecoder();
            }

            if (openRet === 0 || openRet === 8) {
                console.log('【WASM Worker】🎉 avformat_open_input 成功打开，准备向下解码。');
                decoderState.isDecoderOpened = true;
                decoderState.isDecodePaused = false;
                
                const width = wasmModule._get_video_width ? wasmModule._get_video_width(cDecoderInstancePtr) : 1920;
                const height = wasmModule._get_video_height ? wasmModule._get_video_height(cDecoderInstancePtr) : 1080;
                
                self.postMessage({
                    type: 'VIDEO_META_DATA',
                    data: { videoWidth: width, videoHeight: height }
                });

                // 🌟 开箱成功后，立刻拉起无缝解码循环
                setTimeout(runDecodeLoop, 0);
            } else {
                console.error('【WASM Worker】开箱失败，错误码:', openRet);
                self.postMessage({ type: 'DECODE_FAILED', code: openRet });
            }
            break;

        case 'PAUSE_DECODE':
            decoderState.isDecodePaused = true;
            console.log('【WASM Worker】解码时钟挂起。');
            break;

        case 'RESUME_DECODE':
            if (decoderState.isDecodePaused) {
                decoderState.isDecodePaused = false;
                console.log('【WASM Worker】解码时钟恢复。');
                setTimeout(runDecodeLoop, 0);
            }
            break;

        case 'SEEK':
            if (wasmModule && cDecoderInstancePtr !== null) {
                if (typeof wasmModule._seek_native_decoder === 'function') {
                    wasmModule._seek_native_decoder(cDecoderInstancePtr, data.timeSec);
                }
            }
            break;

        case 'STREAM_EOF':
            console.log('【WASM Worker】网络流全部下载完毕（EOF）。');
            decoderState.isNetEof = true;
            break;
    }
};

/**
 * 🌟 核心辅助函数：把 JS 暂存队列里的数据安全、有序地喂给 C 层
 */
function flushQueueToNative() {
    if (decoderState.packetQueue.length === 0) return;
    
    // 取出队列中最前端的一个网络切片
    const chunkArray = decoderState.packetQueue.shift();
    const size = chunkArray.byteLength;
    
    // 动态开辟 WASM 堆空间
    const cBufferPtr = wasmModule._malloc(size);
    wasmModule.HEAPU8.set(chunkArray, cBufferPtr);
    
    // 写入底层
    if (typeof wasmModule._write_native_buffer === 'function') {
        wasmModule._write_native_buffer(cDecoderInstancePtr, cBufferPtr, size);
    } else if (typeof wasmModule._sendData === 'function') {
        wasmModule._sendData(cBufferPtr, size);
    }
    
    // 释放暂存区指针
    wasmModule._free(cBufferPtr);
}

/**
 * 驱动解码循环
 */
function runDecodeLoop() {
    if (!wasmModule || !decoderState.isDecoderOpened || decoderState.isDecodePaused) return;

    let hasFrame = -1;
    if (typeof wasmModule._decode_next_packet === 'function') {
        hasFrame = wasmModule._decode_next_packet(cDecoderInstancePtr);
    } else if (typeof wasmModule._decodeFrame === 'function') {
        hasFrame = wasmModule._decodeFrame();
    }

    if (hasFrame === 0) {
        // 解码出一帧成功，正常提取音视频
        const hasVideo = wasmModule._has_video ? wasmModule._has_video(cDecoderInstancePtr) : true;
        if (hasVideo) {
            const videoBufferPtr = wasmModule._get_video_buffer ? wasmModule._get_video_buffer(cDecoderInstancePtr) : 0;
            const bufferSize = wasmModule._get_video_buffer_size ? wasmModule._get_video_buffer_size(cDecoderInstancePtr) : (1920 * 1080 * 4);
            const pts = wasmModule._get_video_pts ? wasmModule._get_video_pts(cDecoderInstancePtr) : 0;

            if (videoBufferPtr > 0) {
                const frameArray = new Uint8Array(wasmModule.HEAPU8.buffer, videoBufferPtr, bufferSize);
                const videoCopyBuffer = new ArrayBuffer(bufferSize);
                new Uint8Array(videoCopyBuffer).set(frameArray);

                self.postMessage({
                    type: 'VIDEO_FRAME',
                    data: { buffer: videoCopyBuffer, pts: pts }
                }, [videoCopyBuffer]);
            }
        }
        
        // 维持高频解码
        setTimeout(runDecodeLoop, 5);
    } 
    else if (hasFrame === 1 || hasFrame === -11) { 
        // 🌟 核心改进：当底层返回 1 或 -11（EAGAIN，意味着底层缓冲区空了，需要喂数据）
        console.log('【WASM Worker】C层胃袋饥饿，尝试从本地队列派发下一片数据...');
        
        if (decoderState.packetQueue.length > 0) {
            flushQueueToNative(); // 喂下一片数据
            setTimeout(runDecodeLoop, 10); // 喂完立刻重新尝试解码
        } else if (decoderState.isNetEof) {
            // 如果网络下载也 EOF 了，队列也空了，那才是真正的播放完毕
            console.log('【WASM Worker】流与队列均空，播放完结。');
            self.postMessage({ type: 'DECODE_FINISHED' });
        } else {
            // 网络还没下载完，只是网络慢了，挂起时钟，等待下一个 APPEND_STREAM 唤醒
            console.log('【WASM Worker】网络分片尚未下载到本地，解码挂起等待网络流...');
        }
    } 
    else {
        // 🌟 核心优化：针对错误码 -1 (EOF) 进行流式宽容处理
        if (hasFrame === -1) {
            // 如果底层返回 EOF，但我们知道网络流还没有真正结束 (isNetEof 为 false)
            // 这说明 FFmpeg 此时处于“等待数据中”的状态，不要直接结束播放
            if (!decoderState.isNetEof) {
                console.warn('【WASM Worker】FFmpeg 触发伪 EOF (网络流未完)，保持解码循环等待数据...');
                // 增加等待时间，防止 CPU 空转，同时等待主线程喂入下一片数据
                setTimeout(runDecodeLoop, 100); 
            } else {
                // 如果 isNetEof 为 true 且队列为空，那才是真正的结束
                if (decoderState.packetQueue.length === 0) {
                    console.log('【WASM Worker】流已完全处理，正常播放结束。');
                    self.postMessage({ type: 'DECODE_FINISHED' });
                } else {
                    // 如果虽然网络结束了，但队列里还有残留数据，继续解码
                    setTimeout(runDecodeLoop, 20);
                }
            }
        } else {
            // 其他非 -1 的负数码，判定为真正的致命异常
            console.log('【WASM Worker】致命解码异常，错误码:', hasFrame);
            self.postMessage({ type: 'DECODE_FAILED', code: hasFrame });
        }
    }
}