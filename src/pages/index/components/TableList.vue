<template>
    <div class="container-box">
        <ul>
            <li v-for="(item, index) in List" :key="index"">
                <span class="name">{{ item.name }}</span>
                <span class="link">{{ item.link }}</span>
                <span class="size">{{ item.size }}</span>
                <button class="primary-btn" @click="handleClick(item)">Get Magnet</button>
            </li>
        </ul>
    </div>
</template>

<script setup lang="ts">
import type { Magne } from '../../../common/dto/magne';

const props = defineProps({
  List: { type: Array<Magne>, default: () => [] }
})
const emit = defineEmits(['current-change'])
const handleClick = (item: Magne) => {
  // 这里可以根据需要处理点击事件，例如复制链接、打开新窗口等
  console.log('Clicked item:', item);
  emit('current-change',item)
}
</script>

<style scoped>
ul,li{
  list-style: none;
  margin: 0;
  padding: 0;
}
.container-box {
  width: 100%;
}
.container-box ul {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.container-box li {
  display: flex;
  gap: 20px;
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  height: 100px;
  align-items: center;
}
.container-box li:hover {
  background-color: rgba(255, 255, 255, 0.3);
}
.container-box li .name {
  font-weight: bold;
  font-size: 18px;
  flex: 1;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}
.container-box li .link {
  font-weight: bold;
  font-size: 18px;
  flex-shrink: 0;
  width: 150px;
}
.container-box li .size {
  font-weight: bold;
  font-size: 18px;
  flex-shrink: 0;
  width: 150px;
}
.primary-btn {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>