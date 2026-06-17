<template>
  <div class="list-wrapper">
    <ul class="container-list" v-loading="loading">
      <li class="item" v-for="item in list" :key="item.id || item.title">
        <div class="card">
          <div class="img-box">
            <img :src="item.url" loading="lazy" />
          </div>
          <div class="info">
            <div class="title">{{ item.title }}</div>
            <div class="des">{{ item.des }}</div>
          </div>
        </div>
      </li>
    </ul>
    <div v-if="list.length === 0" class="empty-tip">暂无数据</div>
    <div class="pagination-container">
      <ul>
        <li class="prev" @click="changePage()">
          切换图片
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
const props = defineProps({
  list: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})
const emit = defineEmits(['current-change'])
const changePage = () => {
  emit('current-change')
}
</script>

<style scoped>
ul,li{
  list-style: none;
  margin: 0;
  padding: 0;
}
.pagination-container{
  ul{
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 30px;
  }
  li {
    width: 100px;
  min-width: 36px;
  height: 36px;
  border-radius: 4px;
  background-color: #fff;
  border: 1px solid #ddd;
  color: #333;
  text-align: center;
  line-height: 36px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
li:hover:not(.disabled) {
  border-color: #409eff;
  color: #409eff;
}
li.active {
  background-color: #409eff;
  color: #fff;
  border-color: #409eff;
}
li.disabled {
  cursor: not-allowed;
  color: #ccc;
  background-color: #f5f5f5;
}
}
.list-wrapper {
  padding: 15px;
}
.container-list {
  display: grid;
  /* 默认：电脑和平板端 - 3列 (每列占一份剩余空间) */
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
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
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.des {
  font-size: 13px;
  color: #888;
  /* 两行省略 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty-tip {
  text-align: center;
  padding: 40px;
  color: #999;
}
</style>