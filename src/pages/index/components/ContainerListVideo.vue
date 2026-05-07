<template>
  <div class="list-wrapper">
    <ul class="container-list" v-loading="loading">
      <li class="item" v-for="item in list" :key="item.id || item.title">
        <div class="card">
          <div class="img-box">
            <img :src="item.image" loading="lazy" />
          </div>
          <div class="info">
            <span class="title">{{ item.title }}</span>
            <span class="des">{{ item.description }}</span>
          </div>
        </div>
      </li>
    </ul>

    <div v-if="list.length === 0" class="empty-tip">暂无数据</div>

    <Pagination 
      :total="total" 
      :currentPage="currentPage" 
      :pageSize="pageSize" 
      @current-change="onPageChange"
    />
  </div>
</template>

<script setup>
import Pagination from './Pagination.vue'

const props = defineProps({
  list: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  currentPage: { type: Number, default: 1 },
  pageSize: { type: Number, default: 6 },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['current-change'])

const onPageChange = (page) => {
  emit('current-change', page)
}
</script>

<style scoped>
.list-wrapper {
  padding: 15px;
}
.container-list {
  display: grid;
  /* 默认：电脑和平板端 - 3列 (每列占一份剩余空间) */
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  list-style: none;
  padding: 0;
}

/* 响应式适配：当屏幕宽度小于 768px (通常是手机端) */
@media (max-width: 768px) {
  .container-list {
    /* 手机端 - 改为 1列 */
    /* 手机端同样建议使用 minmax(0, 1fr) */
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 15px;
  }
}

.item {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.card {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid #eee;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.img-box {
  width: 100%;
  height: 160px;
  overflow: hidden;
}

.img-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title {
  font-size: 15px;
  font-weight: bold;
  color: #333;
  /* 两行省略 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.des {
  font-size: 13px;
  color: #888;
  /* 两行省略 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty-tip {
  text-align: center;
  padding: 40px;
  color: #999;
}
</style>