<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createDevice, deleteDevice, fetchDeviceList, updateDevice } from '@/api/device'
import { useUserStore } from '@/stores/user'
import type { DeviceForm, DeviceItem, DeviceStatus } from '@/types'
import {
  isValidDeviceArea,
  isValidDeviceModel,
  isValidDeviceName,
} from '@/utils/validate'

const userStore = useUserStore()
const loading = ref(false)
const tableData = ref<DeviceItem[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = ref('新增设备')
const formRef = ref<FormInstance>()

const query = reactive({
  name: '',
  status: '' as DeviceStatus | '',
  page: 1,
  pageSize: 8,
})

const form = reactive<DeviceForm>({
  name: '',
  model: '',
  status: 'online',
  area: '',
})

const rules: FormRules<DeviceForm> = {
  name: [
    { required: true, message: '请输入设备名', trigger: 'blur' },
    {
      validator: (_unused, value: string, callback) => {
        void _unused
        if (!isValidDeviceName(value)) {
          callback(new Error('设备名为 2-32 位中文/字母/数字/下划线/短横线'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
  model: [
    { required: true, message: '请输入型号', trigger: 'blur' },
    {
      validator: (_unused, value: string, callback) => {
        void _unused
        if (!isValidDeviceModel(value)) {
          callback(new Error('型号需字母或数字开头，2-20 位，可含 . _ -'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  area: [
    { required: true, message: '请输入所属区域', trigger: 'blur' },
    {
      validator: (_unused, value: string, callback) => {
        void _unused
        if (!isValidDeviceArea(value)) {
          callback(new Error('区域为 2-20 位中文/字母/数字/下划线/短横线'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
}

const statusMap: Record<DeviceStatus, { label: string; type: 'success' | 'info' | 'warning' }> = {
  online: { label: '在线', type: 'success' },
  offline: { label: '离线', type: 'info' },
  warning: { label: '告警', type: 'warning' },
}

async function loadList() {
  loading.value = true
  try {
    const res = await fetchDeviceList(query)
    tableData.value = res.data.list
    total.value = res.data.total
  } catch {
    // The Axios response interceptor displays the request error.
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  void loadList()
}

function handleReset() {
  query.name = ''
  query.status = ''
  query.page = 1
  void loadList()
}

function resetForm() {
  form.id = undefined
  form.name = ''
  form.model = ''
  form.status = 'online'
  form.area = ''
}

function openCreate() {
  resetForm()
  dialogTitle.value = '新增设备'
  dialogVisible.value = true
}

function openEdit(row: DeviceItem) {
  form.id = row.id
  form.name = row.name
  form.model = row.model
  form.status = row.status
  form.area = row.area
  dialogTitle.value = '编辑设备'
  dialogVisible.value = true
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  try {
    if (form.id) {
      await updateDevice(form.id, form)
      ElMessage.success('更新成功')
    } else {
      await createDevice(form)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    await loadList()
  } catch {
    // The Axios response interceptor displays the request error.
  }
}

async function handleDelete(row: DeviceItem) {
  try {
    await ElMessageBox.confirm(`确认删除设备「${row.name}」？此操作不可恢复。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await deleteDevice(row.id)
    ElMessage.success('已删除')
    await loadList()
  } catch {
    // The Axios response interceptor displays the request error.
  }
}

onMounted(() => {
  void loadList()
})
</script>

<template>
  <el-card shadow="never">
    <el-form :inline="true" class="search" @submit.prevent="handleSearch">
      <el-form-item label="设备名">
        <el-input v-model="query.name" clearable placeholder="输入设备名筛选" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="全部状态" style="width: 160px">
          <el-option label="在线" value="online" />
          <el-option label="离线" value="offline" />
          <el-option label="告警" value="warning" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button v-permission="'device:add'" type="success" @click="openCreate">新增设备</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="tableData" stripe border>
      <el-table-column prop="name" label="设备名" min-width="140" />
      <el-table-column prop="model" label="型号" min-width="140" />
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="statusMap[row.status as DeviceStatus].type">
            {{ statusMap[row.status as DeviceStatus].label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="area" label="所属区域" min-width="140" />
      <el-table-column prop="createdAt" label="接入时间" min-width="170" />
      <el-table-column v-if="userStore.hasPermission('device:edit') || userStore.hasPermission('device:delete')" label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button v-permission="'device:edit'" type="primary" link @click="openEdit(row)">
            编辑
          </el-button>
          <el-button v-permission="'device:delete'" type="danger" link @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadList"
      />
    </div>
  </el-card>

  <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
      <el-form-item label="设备名" prop="name">
        <el-input v-model="form.name" placeholder="例如：入口摄像头01" />
      </el-form-item>
      <el-form-item label="型号" prop="model">
        <el-input v-model="form.model" placeholder="例如：CAM-X200-A1" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="form.status" style="width: 100%">
          <el-option label="在线" value="online" />
          <el-option label="离线" value="offline" />
          <el-option label="告警" value="warning" />
        </el-select>
      </el-form-item>
      <el-form-item label="所属区域" prop="area">
        <el-input v-model="form.area" placeholder="例如：A区入口" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="submitForm">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.search {
  margin-bottom: 8px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
