<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h2>Admin Portal</h2>
        <p>Sign in to your account</p>
      </div>
      <el-form :model="loginForm" :rules="rules" ref="loginFormRef" class="login-form">
        <el-form-item prop="username">
          <el-input v-model="loginForm.username" placeholder="Username" :prefix-icon="'User'"></el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input 
            v-model="loginForm.password" 
            placeholder="Password" 
            type="password" 
            :prefix-icon="'Lock'" 
            show-password
          ></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin(loginFormRef)">
            Sign In
          </el-button>
        </el-form-item>
      </el-form>
      <div class="hint">Use admin / 123456 to login for demo.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import md5 from 'md5'
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const loginFormRef = ref<FormInstance>()
const loading = ref(false)

const FIXED_USERNAME_MD5 = 'e45e5263c10b1ae4c29cfebdac3798a8'
const FIXED_PASSWORD_MD5 = 'bcdbf49b6a17cafda2ca758e4318b391'

const loginForm = reactive({
  username: '',
  password: ''
})

const rules = reactive<FormRules>({
  username: [{ required: true, message: 'Please input username', trigger: 'blur' }],
  password: [{ required: true, message: 'Please input password', trigger: 'blur' }]
})

const handleLogin = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  await formEl.validate((valid) => {
    if (valid) {
      loading.value = true

      const usernameHash = md5(loginForm.username.trim())
      const passwordHash = md5(loginForm.password)
      const isValid = usernameHash === FIXED_USERNAME_MD5 && passwordHash === FIXED_PASSWORD_MD5

      setTimeout(() => {
        if (!isValid) {
          loading.value = false
          ElMessage.error('Username or password is incorrect')
          return
        }

        localStorage.setItem('admin_token', `${FIXED_USERNAME_MD5}-${FIXED_PASSWORD_MD5}`)
        ElMessage.success('Login successfully')
        router.push('/dashboard')
        loading.value = false
      }, 1000)
    }
  })
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.login-box:hover {
  transform: translateY(-5px);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h2 {
  margin: 0;
  color: #303133;
  font-size: 24px;
}

.login-header p {
  color: #909399;
  font-size: 14px;
  margin-top: 10px;
}

.login-btn {
  width: 100%;
  padding: 12px;
  border-radius: 6px;
  font-size: 16px;
}

.hint {
  text-align: center;
  margin-top: 20px;
  color: #c0c4cc;
  font-size: 12px;
}
</style>
