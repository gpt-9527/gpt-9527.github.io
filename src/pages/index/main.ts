import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
// 图片预览查看器
import Viewer from 'v-viewer'
import 'viewerjs/dist/viewer.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 注册 sw.js 脚本，作用域为当前网站根目录
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker 注册成功:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker 注册失败:', error);
      });
  });
}

const app = createApp(App)
app.use(router)
app.use(Viewer,{
  defaultOptions: {
    zIndex: 9999, // 提高层级，防止被其他元素遮挡
    // ... 其他配置
  }
})
app.mount('#app')
