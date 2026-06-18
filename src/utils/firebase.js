import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  projectId: "datasource-92d53",
  authDomain: "datasource-92d53.firebaseapp.com",
  apiKey: "AIzaSyCG5OpMfrQPKVyzU2MNXZ3ZqfOIew_CS6k",
  storageBucket: "datasource-92d53.firebasestorage.app",
  messagingSenderId: "968981202868",
  appId: "1:968981202868:web:27622f0ab4735cf92bd4e1",
  measurementId: "G-H06M1V9YCP"
};

// 1. 初始化 App
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// 2. 必须在 initializeAppCheck 之前注入 Debug Token！
export const sitekey = `6Ld3ASYtAAAAAAT4iuFic8hGkUsBhGAorSLZFkeZ`;
// 1. 在初始化任何 Firebase 组件之前，通过官方推荐的唯一合法全局变量挂载 Debug Token
if (import.meta.env.DEV) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = "C0F21AE7-4894-46EE-AC28-865062C997D8";
  console.log("🔥 [Firebase] 开发环境已内联强制激活 Debug 模式:", self.FIREBASE_APPCHECK_DEBUG_TOKEN);
}
// 3. 初始化 App Check
export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(sitekey),
  isTokenAutoRefreshEnabled: true,
});

// 4. 将匿名登录封装为一个函数，而不是在顶层直接 await
export const initFirebaseAuth = async () => {
  try {
    // 如果当前没有用户，才执行匿名登录
    if (!auth.currentUser) {
      await signInAnonymously(auth);
      console.log("匿名登录成功");
    }
  } catch (error) {
    console.error("匿名登录失败:", error);
  }
};