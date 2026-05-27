<template>
    <div class="portal-container">
      <Header></Header>
      <main>
        <div>
          <h2 style="height: 80px;line-height: 80px;">欣赏大厨视频</h2>
          <div>
            <p style="text-align: left;height: 40px;line-height: 40px;">大厨大鱼人</p>
            <video controls width="100%" height="auto" src="/static/video/20260527.mp4"></video>
          </div>
        </div>

        <section class="hero">
            <div class="hero-content">
            <h1>Welcome to the Future of Managing</h1>
            <p>Experience our state-of-the-art dual portal system. Fast, reliable, and beautifully designed.</p>
            <a href="/admin.html" class="btn-large">Get Started Now</a>
            </div>
            <div class="hero-image">
            <div class="abstract-shape shape-1"></div>
            <div class="abstract-shape shape-2"></div>
            </div>
        </section>
        
        <section id="features" class="features">
            <h2>Why Choose Us</h2>
            <div class="feature-grid">
            <div class="feature-card">
                <div class="icon">⚡</div>
                <h3>Lightning Fast</h3>
                <p>Powered by Vite and Vue 3 for incredible performance.</p>
            </div>
            <div class="feature-card">
                <div class="icon">🛡️</div>
                <h3>Secure Admin</h3>
                <p>Protected routes and beautiful Element Plus interfaces.</p>
            </div>
            <div class="feature-card">
                <div class="icon">🎨</div>
                <h3>Modern Design</h3>
                <p>Glassmorphism, smooth animations, and vibrant colors.</p>
            </div>
            </div>
        </section>
      </main>
      <Footer></Footer>
    </div>
</template>

<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
</script>

<style scoped>
.portal-container {
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
  color: #fff;
  overflow-x: hidden;
}
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5rem 5%;
  min-height: 80vh;
  position: relative;
  overflow: hidden;
}

.hero-content {
  max-width: 50%;
  z-index: 2;
}

.hero h1 {
  font-size: 4rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  background: linear-gradient(to right, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.1;
}

.hero p {
  font-size: 1.25rem;
  color: #cbd5e1;
  margin-bottom: 2.5rem;
  line-height: 1.6;
}

.btn-large {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  padding: 1rem 2rem;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
  display: inline-block;
}

.btn-large:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(99, 102, 241, 0.6);
}

.hero-image {
  position: relative;
  width: 50%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.abstract-shape {
  position: absolute;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.6;
}

.shape-1 {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  animation: float 6s ease-in-out infinite;
}

.shape-2 {
  background: linear-gradient(135deg, #38bdf8, #06b6d4);
  animation: float 8s ease-in-out infinite reverse;
  right: 0;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) scale(1); }
  50% { transform: translateY(-30px) scale(1.05); }
}

.features {
  padding: 5rem 5%;
  background: rgba(15, 23, 42, 0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.features h2 {
  text-align: center;
  font-size: 3rem;
  margin-bottom: 3rem;
  font-weight: 800;
  background: linear-gradient(to right, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 3rem;
  transition: all 0.3s ease;
  text-align: center;
}

.feature-card:hover {
  transform: translateY(-10px);
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 10px 30px rgba(99, 102, 241, 0.2);
}

.feature-card .icon {
  font-size: 3rem;
  margin-bottom: 1.5rem;
}

.feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #fff;
}

.feature-card p {
  color: #94a3b8;
  line-height: 1.6;
}
</style>