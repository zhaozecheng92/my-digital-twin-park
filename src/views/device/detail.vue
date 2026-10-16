<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchDeviceDetail } from '@/api/device'
import { useUserStore } from '@/stores/user'
import type { DeviceItem, DeviceStatus } from '@/types'
import { navigateBack } from '@/utils/navigation'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const device = ref<DeviceItem | null>(null)

const statusMap: Record<DeviceStatus, { label: string; type: 'success' | 'info' | 'warning' }> = {
  online: { label: '在线', type: 'success' },
  offline: { label: '离线', type: 'info' },
  warning: { label: '告警', type: 'warning' },
}

const status = computed(() =>
  device.value ? statusMap[device.value.status] : undefined,
)

function goBack() {
  navigateBack(router, userStore.roles.includes('admin') ? '/device/list' : '/device/view')
}

async function loadDetail() {
  const id = Number(route.params.id)
  if (!Number.isSafeInteger(id) || id <= 0) {
    device.value = null
    return
  }

  loading.value = true
  try {
    const res = await fetchDeviceDetail(id)
    device.value = res.data
  } catch {
    device.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadDetail()
})

watch(() => route.params.id, () => {
  void loadDetail()
})
</script>

<template>
  <el-card shadow="never" class="detail-card" v-loading="loading">
    <template #header>
      <div class="detail-header">
        <el-button type="primary" plain :icon="ArrowLeft" @click="goBack">
          返回上一层
        </el-button>
        <span>设备详情</span>
      </div>
    </template>

    <el-descriptions v-if="device" :column="2" border>
      <el-descriptions-item label="设备名">{{ device.name }}</el-descriptions-item>
      <el-descriptions-item label="设备编号">{{ device.id }}</el-descriptions-item>
      <el-descriptions-item label="型号">{{ device.model }}</el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag :type="status?.type">{{ status?.label }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="所属区域">{{ device.area }}</el-descriptions-item>
      <el-descriptions-item label="接入时间">{{ device.createdAt }}</el-descriptions-item>
    </el-descriptions>

    <el-empty v-else-if="!loading" description="未找到该设备" />
  </el-card>
</template>

<style scoped>
/* .detail-card {
  min-height: calc(100vh - 100px);
} */

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
}
</style>
