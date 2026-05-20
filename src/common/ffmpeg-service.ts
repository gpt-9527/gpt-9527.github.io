import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

export class FfmpegService {
  private ffmpeg: FFmpeg;
  private isLoaded = false;
  // private worker: Worker | null = null;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  async load(): Promise<void> {
    if (this.isLoaded) return;

    await this.ffmpeg.load({
      coreURL: await toBlobURL(
        'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
        'text/javascript'
      ),
      wasmURL: await toBlobURL(
        'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
        'application/wasm'
      ),
    //   log: false
    });

    this.isLoaded = true;
  }

  // 从 URL 转换 AVI
  async convertAviToMp4FromUrl(
    url: string,
    onProgress?: (progress: any) => void
  ): Promise<Blob> {
    if (!this.isLoaded) {
      await this.load();
    }

    // 监听进度
    if (onProgress) {
      this.ffmpeg.on('progress', onProgress);
    }

    try {
      // 1. 下载远程文件
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], 'remote.avi');

      // 2. 写入文件
      await this.ffmpeg.writeFile('input.avi', await fetchFile(file));

      // 3. 转码
      await this.ffmpeg.exec([
        '-i', 'input.avi',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '28',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        'output.mp4'
      ]);

      // 4. 读取结果
      const data = await this.ffmpeg.readFile('output.mp4');

        // 5. 清理
        await this.ffmpeg.deleteFile('input.avi');
        await this.ffmpeg.deleteFile('output.mp4');

        const uint8 = new Uint8Array(data as unknown as ArrayBuffer);
        return new Blob([uint8.buffer], { type: 'video/mp4' });

    } finally {
        if (onProgress) {
            this.ffmpeg.off('progress', onProgress);
        }
    }
  }

  cleanup(): void {
    this.ffmpeg.terminate();
    this.isLoaded = false;
  }
}