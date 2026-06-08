<template>
  <div class="guangyapan-manage">
    <el-card shadow="never" class="welcome-card">
      <h2>Welcome to GuangYaPan Management</h2>
      <p>Here you can manage your GuangYaPan settings and data.(copy same as credentials_aMe-8VSlkrbQXpUR)</p>
      <p>复制类似 credentials_aMe-8VSlkrbQXpUR 的 字段内容(百度搜索复制localstorage值!)</p>
    </el-card>
    <el-row style="padding: 20px 0;">stro
      <el-col :span="20" :offset="2">
        <el-form :model="form" label-width="auto" style="max-width: 600px">
          <el-form-item label="GuangYaPan cookies">
            <el-input :autosize="{ minRows: 22, maxRows: 25 }" style="min-height: 480px;" v-model="form.cookies" type="textarea" placeholder="Enter GuangYaPan cookies"></el-input>
          </el-form-item>
          <el-form-item>
            <el-button @click="onSubmit" type="primary">Save</el-button>
            <el-button @click="onGoGuangYaPan" type="success">Go GuangYaPan</el-button>
          </el-form-item>
        </el-form>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
// Admin GuangYaPan view - content placeholder
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'

let cookies = localStorage.getItem('gycookies') || ''
// do not use same name with ref
const form = reactive({
  cookies: cookies
})

const onSubmit = () => {
  localStorage.setItem('gycookies', form.cookies)
  ElMessage.success('GuangYaPan cookies saved successfully!')
}

const onGoGuangYaPan = () => {
  window.open('/#/GuangYaPan', '_blank')
}
</script>

<style scoped>
.guangyapan-manage {
  padding: 0 20px;
}

.welcome-card {
  border-radius: 8px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.welcome-card h2 {
  margin: 0 0 10px 0;
  font-size: 24px;
}

.welcome-card p {
  margin: 0 0 20px 0;
  opacity: 0.9;
}
</style>
