<template>
    
        <div class="header-left">
          <el-icon class="collapse-icon"><Fold /></el-icon>
          <span class="breadcrumb">Dashboard / Overview</span>
        </div>
        <div class="header-right">
          <el-dropdown trigger="click" @command="handleCommand">
            <span class="user-dropdown">
              <el-avatar size="small" src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png"></el-avatar>
              Admin <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">Profile</el-dropdown-item>
                <el-dropdown-item command="logout" divided>Logout</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'

const router = useRouter()

const handleCommand = (command: string) => {
  if (command === 'logout') {
    ElMessageBox.confirm('Are you sure you want to log out?', 'Warning', {
      confirmButtonText: 'OK',
      cancelButtonText: 'Cancel',
      type: 'warning'
    }).then(() => {
      localStorage.removeItem('admin_token')
      router.push('/login')
    }).catch(() => {})
  }
}
</script>
<style scoped>


.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.collapse-icon {
  font-size: 20px;
  cursor: pointer;
}

.breadcrumb {
  font-size: 14px;
}

.user-dropdown {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 8px;
}
</style>