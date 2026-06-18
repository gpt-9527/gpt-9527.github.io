// sw.js

// 监听激活事件，确保 Service Worker 立即接管页面，无需等待下次刷新
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// 核心拦截逻辑
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  const urlStr = event.request.url;
  // 1. 精准匹配：只要请求发往谷歌验证 API、Firebase 域名、或者是 Firestore 的数据传输
  if (
    urlStr.includes('googleapis.com') || 
    urlStr.includes('firebase') || 
    urlStr.includes('firestore.googleapis.com')
  ) {
    console.log('✨ [SW 放行] 检测到 Firebase/AppCheck 核心凭证网络请求，绝对不拦截:', urlStr);
    
    // 2. 核心修正：使用原生 fetch 显式代理，并强制携带其原有的所有凭证与头部
    event.respondWith(
      fetch(event.request, {
        credentials: event.request.credentials // 极其关键：确保在开发环境下，跨域验证凭证原封不动传给谷歌
      })
    );
    return; // 结束函数，不再往下走任何缓存逻辑
  }
  // console.info('SW 收到请求:', event.request.url);
  // 1. 匹配你的视频链接（请根据实际的 URL 特征修改此处）
  // 例如：链接中包含 '/get-video' 或者以特定的无后缀路径结尾
  if (requestUrl.pathname.includes('httpdown.guangyacdn.com')) {
    console.log('SW 拦截到视频请求:', event.request.url);
    // 拦截请求，交由自定义的响应处理
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 如果请求失败，直接返回原响应
          if (!response.ok) return response;

          // 2. 创建一个新的 Headers 对象，复制原有的所有响应头
          const newHeaders = new Headers(response.headers);

          // 3. 强行抹除下载头，防止浏览器弹出下载框
          newHeaders.delete('content-disposition');

          // 4. 强行篡改 Content-Type 为标准的 MP4 视频格式
          newHeaders.set('content-type', 'video/mp4');
          
          // 5. 确保支持流式分片请求（Range Requests），现代播放器快进退必用
          // 如果后端已经返回了 accept-ranges，这里可以确保它存在
          if (!newHeaders.has('accept-ranges')) {
            newHeaders.set('accept-ranges', 'bytes');
          }

          // 6. 用修改后的 Headers 重新包装并返回新的 Response 对象
          // 注意：body 只能被读取一次，所以这里保持原样返回即可
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
          });
        })
        .catch(error => {
          console.error('SW 拦截视频流出错:', error);
          return fetch(event.request); // 出错时降级返回原请求
        })
    );
  }
});