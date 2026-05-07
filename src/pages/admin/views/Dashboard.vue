<template>
  <el-container class="dashboard-container">
    <Aside />
    
    <el-container>
      <el-header class="header">
        <Header></Header>
      </el-header>
      <el-main class="main-content">
        <router-view></router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import Aside from '../components/Aside.vue'
import Header from '../components/Header.vue'

</script>

<style scoped>
.dashboard-container {
  height: 100vh;
}
.header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  color: #606266;
}
.main-content {
  background-color: #f0f2f5;
  padding: 24px;
}

</style>
