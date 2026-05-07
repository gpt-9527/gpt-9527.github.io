<template>
  <div class="video-manage">
    <div class="header">
      <el-button type="primary" @click="handleAdd">新增视频</el-button>
    </div>
    <div v-loading="loading">
      <el-table :data="tableData" style="width: 100%; margin-top: 20px">
        <el-table-column prop="id" label="ID" width="180" />
        <el-table-column prop="name" label="名称" width="120" show-overflow-tooltip />
        <el-table-column prop="title" label="标题" width="120" show-overflow-tooltip />
        <el-table-column label="图片" width="120">
          <template #default="scope">
            <el-image :src="scope.row.image" style="width: 100px; height: 80px" />
          </template>
        </el-table-column>
        <el-table-column prop="url" label="视频地址" width="180" show-overflow-tooltip />
        <el-table-column prop="createAt" label="创建时间" width="120" />
        <el-table-column prop="updateAt" label="更新时间" width="120" />
        <el-table-column prop="status" label="状态">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">{{ scope.row.status.toString() === '1' ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" />
        <el-table-column label="操作" width="160">
          <template #default="scope">
            <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          background
          layout="prev, pager, next, total"
          :total="total"
          @current-change="handlePageChange"
        />
      </div>
    </div>
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form :model="formData" label-width="90px">
        <el-form-item label="名称">
          <el-input v-model="formData.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="formData.title" placeholder="请输入标题" />
        </el-form-item>
        <el-form-item label="图片">
          <el-input v-model="formData.image" placeholder="请输入图片地址" />
        </el-form-item>
        <el-form-item label="视频地址">
          <el-input v-model="formData.url" placeholder="请输入视频地址" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="formData.description" type="textarea" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="formData.status" placeholder="请选择状态">
            <el-option label="启用" :value="1"></el-option>
            <el-option label="禁用" :value="0"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const url = import.meta.env.VITE_API_URL

// --- 分页相关变量 ---
const tableData = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(6) // 对应后端限制的 6
const loading = ref(false)

// 获取数据逻辑
const getData = (page = 1) => {
  loading.value = true
  currentPage.value = page
  
  // 拼接分页参数 ?page=1&size=6
  const fetchUrl = `${url}/api/v1/video/list?page=${page}&size=${pageSize.value}`
  
  fetch(fetchUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('admin_token')
    }
  })
    .then(res => res.json())
    .then(res => {
      // 适配新后端结构: { code: 0, data: [...], total: 10 }
      if (res.code === 0) {
        tableData.value = res.data
        total.value = res.total
      } else {
        ElMessage.error(res.message || '获取数据失败')
      }
    })
    .catch(err => {
      console.error(err)
      ElMessage.error('网络请求错误')
    })
    .finally(() => {
      loading.value = false
    })
}

// 初始化加载
onMounted(() => {
  getData()
})

// 分页切换事件
const handlePageChange = (page: number) => {
  getData(page)
}

// --- 表单与弹窗逻辑 ---
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formData = ref<any>({
  id: '',
  name: '',
  title: '',
  image: '',
  url: '',
  description: '',
  status: 1
})

const handleAdd = () => {
  formData.value = {
    id: '',
    name: '',
    title: '',
    image: '',
    url: '',
    description: '',
    status: 1
  }
  dialogTitle.value = '新增视频'
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  formData.value = { ...row,status: Number(row.status) } // 浅拷贝
  dialogTitle.value = '修改视频'
  dialogVisible.value = true
}

const handleSubmit = async () => {
  // 时间格式化辅助
  const formatTime = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  }

  const now = formatTime(new Date())
  const isEdit = !!formData.value.id
  
  // 准备提交数据
  const payload = { ...formData.value }
  payload.updateAt = now
  if (!isEdit) payload.createAt = now

  const endpoint = isEdit ? 'api/v1/video/edit' : 'api/v1/video/save'

  try {
    const res = await fetch(url + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('admin_token')
      },
      body: JSON.stringify(payload)
    })
    const data = await res.json()

    if (data.code === 0 || res.ok) {
      ElMessage.success(isEdit ? '修改成功' : '新增成功')
      dialogVisible.value = false
      getData(currentPage.value) // 保持在当前页刷新
    }
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm('确定要删除吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    fetch(`${url}api/v1/video/del?id=${row.id}`, {
      method: 'GET', // 建议后端后续改为 DELETE
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('admin_token')
      }
    })
    .then(res => res.json())
    .then(() => {
      ElMessage.success('删除成功')
      // 如果当前页只有一条数据且不是第一页，删除后跳回上一页
      const page = (tableData.value.length === 1 && currentPage.value > 1) 
        ? currentPage.value - 1 
        : currentPage.value
      getData(page)
    })
    .catch(() => ElMessage.error('删除失败'))
  })
}
</script>

<style scoped>
.video-manage {
  padding: 0 20px;
}

.header {
  display: flex;
  justify-content: flex-end;
}
</style>

