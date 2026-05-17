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
      // 匹配所有以 /api 开头的请求
      '/api': {
        target: 'https://api.guangyapan.com', // 目标接口域名
        changeOrigin: true,                 // 允许跨域
        rewrite: (path) => path.replace(/^\/api/, '') // 把 /api 替换为空
      }
    }
  }
})
