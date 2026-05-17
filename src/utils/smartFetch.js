/**
 * smartFetch.js
 * 
 * 这是一个封装了自动刷新 Token 功能的 fetch 函数。当后端返回 401 错误时，它会尝试刷新 Token，并在刷新成功后重试原始请求。  
 * 用于处理光鸭盘项目中可能遇到的 Token 过期问题，确保用户体验的连续性。
 * 
 * 注意事项：
 */

let isRefreshing = false; // 标记是否正在刷新 Token
let retryQueue = []; // 存放因 401 挂起的请求队列

// 队列处理函数
const subscribeTokenRefresh = (cb) => retryQueue.push(cb);
const onRerfreshed = (newToken) => {
  retryQueue.forEach((cb) => cb(newToken));
  retryQueue = [];
};

export function smartFetch(url, options = {}) {
  // 1. 自动注入 Token
  const token = localStorage.getItem('cookiesData') ? JSON.parse(localStorage.getItem('cookiesData')).access_token : null;
  options.headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  // 2. 返回一个整体的 Promise，确保外部可以完全使用 .then().catch() 链式调用
  return new Promise((resolve, reject) => {
    
    // 抽取核心请求逻辑
    const executeFetch = () => {
      fetch(url, options)
        .then(async (response) => {
          
          // 发现 401 鉴权失败
          if (response.status === 401) {
            
            // 安全防线：如果是刷新接口自己报 401，说明 Refresh Token 也过期了，直接走失败逻辑，防死循环
            if (url.includes('/v1/auth/token')) {
              throw new Error('Refresh token expired');
            }

            // 情况 A：当前没有人在刷新 Token，由我发起刷新
            if (!isRefreshing) {
              isRefreshing = true;

              try {
                // 安全获取本地的 refresh_token
                const cookiesData = JSON.parse(localStorage.getItem('cookiesData') || '{}');
                const refreshToken = cookiesData.refresh_token;

                // 调用光鸭盘刷新 Token 的接口
                const refreshRes = await fetch('https://account.guangyapan.com/v1/auth/token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    refreshToken: refreshToken,
                    client_id: "aMe-8VSlkrbQXpUR",
                    grant_type: "refresh_token"
                  })
                });

                if (refreshRes.ok) {
                  const data = await refreshRes.json();
                  // 💡 注意：这里根据你后端的实际返回字段取值，通常是 data.accessToken 或 data.data.accessToken
                  console.log('刷新 Token 成功，新的 Access Token:', data);
                  const newToken = data.access_token; 
                  
                  localStorage.setItem('cookiesData', JSON.stringify({...data}));
                  isRefreshing = false;

                  // 【修复点】：刷新成功后，重新执行“当前第一个”请求，并把结果给到外层
                  options.headers['Authorization'] = `Bearer ${newToken}`;
                  fetch(url, options).then(resolve).catch(reject);

                  // 执行队列里其他挂起的请求
                  onRerfreshed(newToken);
                } else {
                  throw new Error('Refresh token expired');
                }
              } catch (err) {
                // 刷新彻底失败，清空并去登录页
                isRefreshing = false;
                retryQueue = [];
                localStorage.clear();
                window.location.href = '/login';
                reject(err);
              }
            } 
            // 情况 B：别人正在刷新 Token，我需要乖乖进队列排队
            else {
              subscribeTokenRefresh((newToken) => {
                options.headers['Authorization'] = `Bearer ${newToken}`;
                // 重新请求并把结果 resolve 给最外层
                fetch(url, options).then(resolve).catch(reject);
              });
            }
          } 
          // 状态码正常（200, 404, 500 等），直接返回原生 response
          else {
            resolve(response);
          }
        })
        .catch((err) => {
          // 捕获网络层面的错误（如断网、跨域、服务器崩了等）
          reject(err);
        });
    };

    // 执行请求
    executeFetch();
  });
}