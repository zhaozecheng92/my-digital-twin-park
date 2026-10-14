<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchDeviceList } from '@/api/device'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const router = useRouter()
const total = ref(0)
const online = ref(0)
const warning = ref(0)

onMounted(async () => {
  try {
    const [all, on, warn] = await Promise.all([
      fetchDeviceList({ page: 1, pageSize: 1 }),
      fetchDeviceList({ page: 1, pageSize: 1, status: 'online' }),
      fetchDeviceList({ page: 1, pageSize: 1, status: 'warning' }),
    ])
    total.value = all.data.total
    online.value = on.data.total
    warning.value = warn.data.total
  } catch {
    // The Axios response interceptor displays the request error.
  }
})
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <h1>园区工作台</h1>
      <el-button type="primary" @click="router.push('/visualization')">打开可视化大屏</el-button>
    </div>
    <el-alert
      :title="`当前身份：${userStore.roleLabel}。导航菜单由角色动态生成（RBAC）。`"
      type="success"
      show-icon
      :closable="false"
    />

    <el-row :gutter="16" class="cards">
      <el-col :span="8">
        <el-card shadow="hover">
          <p>设备总数</p>
          <h2>{{ total }}</h2>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <p>在线设备</p>
          <h2>{{ online }}</h2>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <p>告警设备</p>
          <h2>{{ warning }}</h2>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-heading h1 {
  margin: 0;
  color: #1f2937;
  font-size: 22px;
}

.cards {
  margin-top: 4px;
}

.el-card p {
  margin: 0;
  color: #64748b;
}

.el-card h2 {
  margin: 12px 0 0;
  font-size: 32px;
}
</style>
