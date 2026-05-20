import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { dirname, resolve } from 'node:path'

function copyReadmeToDist(root: string): Plugin {
  return {
    name: 'copy-readme-to-dist',
    closeBundle() {
      const src = resolve(root, 'README.md')
      const dest = resolve(root, 'dist/README.md')
      if (!existsSync(src)) return
      mkdirSync(dirname(dest), { recursive: true })
      copyFileSync(src, dest)
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), copyReadmeToDist(__dirname)],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  },
  server: {
    proxy: {
      // 匹配前端代码中以 /video-stream 开头的请求
      '/video-stream1': {
        target: 'https://hwsh01-httpdown.guangyacdn.com/', // 远程视频流、摄像头或 TS 文件的真正基地址
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/video-stream1/, '') // 移除前缀
      },
      '/video-stream2': {
        target: 'https://hwsh02-httpdown.guangyacdn.com/', // 远程视频流、摄像头或 TS 文件的真正基地址
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/video-stream2/, '') // 移除前缀
      }
    }
  }
})
