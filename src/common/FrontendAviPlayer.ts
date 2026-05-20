// 完整的、能跑的代码（ffmpeg.wasm 方案）
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

class FrontendAviPlayer {
  container: HTMLElement | null;
    ffmpeg: FFmpeg;
    isLoaded: boolean;
  constructor(containerId: string) {
    this.container = document.getElementById(containerId);
    this.ffmpeg = new FFmpeg();
    this.isLoaded = false;
  }
  
  async load() {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd';
    this.ffmpeg.on('log', ({ message }) => {
      console.log(message);
    });
    
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    this.isLoaded = true;
  }
  
  async playAviFile(file: File) {
    if (!this.isLoaded) await this.load();
    
    // 写入文件
    await this.ffmpeg.writeFile('input.avi', new Uint8Array(await file.arrayBuffer()));
    
    // 获取视频信息
    await this.ffmpeg.exec(['-i', 'input.avi']);
    
    // 转码为 MP4
    console.time('转码耗时');
    await this.ffmpeg.exec([
      '-i', 'input.avi',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '30',
      '-c:a', 'aac',
      '-b:a', '64k',
      '-t', '60', // 限制60秒
      'output.mp4'
    ]);
    console.timeEnd('转码耗时');
    
    // 读取并播放
    const data = await this.ffmpeg.readFile('output.mp4');
    // Ensure compatibility: convert to Uint8Array, then to ArrayBuffer
    const uint8 = new Uint8Array(data as unknown as ArrayBuffer);
    const blob = new Blob([uint8.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    
    this.createVideoElement(url);
  }
  
  createVideoElement(url: string) {
    if (!this.container) return;
    // 清空容器
    this.container.innerHTML = '';
    
    // 创建 video 元素
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.style.width = '100%';
    
    this.container.appendChild(video);
    
    // 或者用 XGPlayer
    // new Player({ el: this.container, url, autoplay: true });
  }
}

// 使用
const player = new FrontendAviPlayer('videoContainer');
const fileInput = document.getElementById('fileInput');

fileInput?.addEventListener('change', async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file && file.name.endsWith('.avi')) {
    try {
      await player.playAviFile(file);
    } catch (err: any) {
      alert('播放失败: ' + err.message);
    }
  }
});