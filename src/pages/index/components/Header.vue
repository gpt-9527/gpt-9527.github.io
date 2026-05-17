<template>
    <header class="glass-header">
      <div class="logo">🚀 博客128</div>
      <nav>
        <a href="#Home">首页</a>
        <a href="#Imgs">图片</a>
        <a href="#Video">视频</a>
        <a href="/admin.html" class="btn-primary">管理</a>
      </nav>
    </header>
</template>

<script setup>

</script>

<style scoped>
.glass-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 4rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
}

nav a {
  margin-left: 2rem;
  color: #fff;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
}

nav a:hover {
  color: #94a3b8;
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
}
</style>
