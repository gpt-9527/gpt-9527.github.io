<template>
    <div class="card-list">
          <el-card shadow="hover" class="data-card">
            <template #header>
              <div class="card-header">
                <span>Total Users</span>
                <el-tag type="success">Monthly</el-tag>
              </div>
            </template>
            <div class="card-value">1,245</div>
          </el-card>
          <el-card shadow="hover" class="data-card">
            <template #header>
              <div class="card-header">
                <span>Revenue</span>
                <el-tag type="warning">Weekly</el-tag>
              </div>
            </template>
            <div class="card-value">$32,045</div>
          </el-card>
          <el-card shadow="hover" class="data-card">
            <template #header>
              <div class="card-header">
                <span>Active Projects</span>
                <el-tag type="info">Current</el-tag>
              </div>
            </template>
            <div class="card-value">48</div>
          </el-card>
    </div>

    <el-card shadow="never" class="welcome-card">
        <h2>Welcome back, Admin!</h2>
        <p>Here is what's happening with your projects today.</p>
        <el-button @click="goHome" type="primary">View Full Go Home</el-button>
    </el-card>
</template>
<script setup lang="ts">

const goHome = () => {
  // Placeholder for navigation logic
  window.location.href = `/#/`;
};
</script>
<style scoped>
.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.data-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-value {
  font-size: 28px;
  font-weight: bold;
  margin-top: 10px;
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