<template>
  <div class="pagination-container">
    <ul>
      <!-- 首页按钮 -->
      <li class="prev" :class="{ disabled: currentPage <= 1 }" @click="changePage(1)">
        <span class="btn-text">首页</span>
      </li>

      <!-- 页码按钮 -->
      <li
        v-for="page in visiblePages"
        :key="page" 
        :class="{ active: page === currentPage }"
        @click="changePage(page)"
      >
        {{ page }}
      </li>

      <!-- 尾页按钮 -->
      <li class="next" :class="{ disabled: currentPage >= totalPages }" @click="changePage(totalPages)">
        <span class="btn-text">尾页</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  total: { type: Number, default: 0 },
  pageSize: { type: Number, default: 6 },
  currentPage: { type: Number, default: 1 }
})

const emit = defineEmits(['current-change'])

// 计算总页数
const totalPages = computed(() => Math.ceil(props.total / props.pageSize))

// 需要显示的页码列表
const visiblePages = computed(() => {
  const total = totalPages.value
  const current = props.currentPage
  const result = []

  if (total <= 8) {
    // 总页数小于等于 8 时全部显示
    for (let i = 1; i <= total; i++) result.push(i)
    return result
  }

  // 总页数大于 8，采用分段策略
  // 规则：显示当前页前 4 个和后 4 个，如果当前页靠前/靠后则顺序排列

  const rangeStart = Math.max(1, current - 4)
  const rangeEnd = Math.min(total, current + 4)

  // 如果范围不够 9 个，向两侧补齐
  if (rangeEnd - rangeStart < 8) {
    if (rangeStart === 1) {
      // 当前靠前，取前 9 个
      for (let i = 1; i <= 9 && i <= total; i++) result.push(i)
    } else {
      // 当前靠后，取后 9 个
      for (let i = Math.max(1, total - 8); i <= total; i++) result.push(i)
    }
  } else {
    for (let i = rangeStart; i <= rangeEnd; i++) result.push(i)
  }

  return result
})

const changePage = (page) => {
  if (page < 1 || page > totalPages.value || page === props.currentPage) return
  emit('current-change', page)
}
</script>

<style scoped>
ul,li{
    list-style: none;
    margin: 0;
    padding: 0;
}
ul {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  padding: 20px;
}
li {
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
/* 首页/尾页按钮文字样式 */
.btn-text {
  font-size: 13px;
  padding: 0 4px;
}
</style>