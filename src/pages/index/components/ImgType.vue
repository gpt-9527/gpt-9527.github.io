<template>
    <div>
        <ul class="img-type" v-if="imgType.length > 0">
            <template v-for="item in imgType" :key="item.id">
                <li 
                :class="{active: item.id === currentType.id}" 
                @click="changeType(item)">
                    {{ item.name }}
                </li>
            </template>
        </ul>
    </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
const props = defineProps({
  imgType: { type: Array, default: () => [] },
  currentType: { type: Object, default: () => {} }
})
const emit = defineEmits(['current-change'])
const changeType = (item) => {
  emit('current-change', item)
}
</script>

<style scoped>
ul,li{
  list-style: none;
  margin: 0;
  padding: 0;
}
.img-type{
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30px 30px 10px 30px;
}
.img-type li{
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
.img-type li:hover:not(.disabled){
  border-color: #409eff;
  color: #409eff;
}
.img-type li.active{
  background-color: #409eff;
  color: #fff;
  border-color: #409eff;
}
.img-type li.disabled{
  cursor: not-allowed;
  color: #ccc;
  background-color: #f5f5f5;
}
</style>