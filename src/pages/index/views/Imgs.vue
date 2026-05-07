<template>
    <div class="portal-container">
      <Header></Header>
      <main class="main-content">
        <ImgType 
          :imgType="imgType"
          @current-change="getList"
          :currentType="currentType"
        ></ImgType>
        <ContainerListImg 
          v-if="list.length > 0" 
          :list="list" 
          :loading="loading"
          @current-change="getList(currentType)"
        />
      </main>
      <Footer></Footer>
    </div>
</template>

<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import ContainerListImg from '../components/ContainerListImg.vue'
import ImgType from '../components/ImgType.vue'
import { ref, onMounted } from 'vue'

const list = ref([])
const loading = ref(false)
const imgType = ref([
  { id: 1, name: 'Cat', url: 'https://api.thecatapi.com/v1/images/search' },
  { id: 2, name: 'Dog', url: 'https://dog.ceo/api/breeds/image/random' },
])
const titleurl = ref('https://v1.hitokoto.cn/')
const currentType = ref(imgType.value[0])
const getList = (type) => {
  loading.value = true
  currentType.value = type
  let size = 6
  let tasks = []
  let titleTasks = []
  for (let i = 0; i < size; i++) {
    tasks.push(fetch(type.url))
    titleTasks.push(fetch(titleurl.value + `?t=${i+1}${new Date().getTime()}`))
  }
  Promise.all(tasks)
    .then(responses => Promise.all(responses.map(response => response.json())))
    .then(data => {
      let result = []
      if(type.id === 1){
        result = data.flat()
      }else if(type.id === 2){
        result = data.map(v => {
          return {
            url: v.message,
            id: v.id
          }
        })
      }
      Promise.all(titleTasks)
          .then(responses => Promise.all(responses.map(response => response.json())))
          .then(titleData => {
            result = result.map((v, i) => {
              console.log(999,titleData,i)
              return {
                ...v,
                title: titleData[i].hitokoto,
                des: titleData[i].from + '_' + titleData[i].from_who
              }
            })
            list.value = result
            loading.value = false
          })
    })
}

onMounted(() => {
  getList(currentType.value)
})
</script>

<style scoped>
.portal-container {
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
  color: #fff;
  overflow-x: hidden;
}
</style>