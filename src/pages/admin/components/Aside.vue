<template>
    <el-aside width="240px" class="aside">
      <div class="logo">
        <el-icon :size="24" color="#409EFC"><Platform /></el-icon>
        <span>Nova Admin</span>
      </div>
      <el-menu
        :default-active="active"
        class="el-menu-vertical"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item index="0" @click="handleCommand('/dashboard')">
          <el-icon><DataBoard /></el-icon>
          <span>Overview</span>
        </el-menu-item>
        <el-menu-item index="10" @click="handleCommand('/setting/user')">
          <el-icon><User /></el-icon>
          <span>Users</span>
        </el-menu-item>
        <el-menu-item index="22" @click="handleCommand('/setting/video')">
          <el-icon><VideoCamera /></el-icon>
          <span>Video</span>
        </el-menu-item>
        <el-menu-item index="25" @click="handleCommand('/setting/GuangYaPan')">
          <el-icon><Platform /></el-icon>
          <span>GuangYaPan</span>
        </el-menu-item>
        <el-menu-item index="39" @click="handleCommand('/setting/Set')">
          <el-icon><Setting /></el-icon>
          <span>Settings</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
let active = ref('0')
const router = useRouter()

const handleCommand = (command: string) => {
  if (command === 'logout') {
    localStorage.removeItem('admin_token')
    router.push('/login')
  }else{
    router.push(command)
  }
}
if(router.currentRoute.value.path === '/dashboard'){
  active.value = '0'
}else if(router.currentRoute.value.path === '/setting/user'){
  active.value = '10'
}else if(router.currentRoute.value.path === '/setting/video'){
  active.value = '22'
}else if(router.currentRoute.value.path === '/setting/GuangYaPan'){
  active.value = '25'
}else if(router.currentRoute.value.path === '/setting/Set'){
  active.value = '39'
}
</script>
<style scoped>
.aside {
  background-color: #304156;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background-color: #2b3649;
  color: white;
  font-size: 18px;
  font-weight: bold;
}

.el-menu-vertical {
  border-right: none;
  flex: 1;
}
</style>