<template>
  <div class="pagination-container">
    <ul>
      <li class="prev" :class="{ disabled: currentPage <= 1 }" @click="changePage(currentPage - 1)">
        &lt;
      </li>

      <li 
        v-for="page in totalPages" 
        :key="page" 
        :class="{ active: page === currentPage }"
        @click="changePage(page)"
      >
        {{ page }}
      </li>

      <li class="next" :class="{ disabled: currentPage >= totalPages }" @click="changePage(currentPage + 1)">
        &gt;
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
console.log(666,totalPages.value,props.total,props.pageSize)
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
</style>