<template>
  <div class="setting-manage">
    <div class="empty-state">
      <el-empty description="设置功能功能开发中...">
        <el-button type="primary">即将上线</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
// Admin Setting view - content placeholder
</script>

<style scoped>
.setting-manage {
  padding: 0 20px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
}
</style>
