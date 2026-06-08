<template>
  <div class="user-manage">
    <div class="empty-state">
      <el-empty description="用户功能功能开发中...">
        <el-button type="primary">即将上线</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
// Admin User view - content placeholder
</script>

<style scoped>
.user-manage {
  padding: 0 20px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
}
</style>
