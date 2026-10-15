<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { init, use } from 'echarts/core'
import type { ECharts } from 'echarts/core'
import type { EChartsOption } from 'echarts'
import { PieChart } from 'echarts/charts'
import { LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { fetchDeviceList } from '@/api/device'
import { useUserStore } from '@/stores/user'

use([PieChart, LegendComponent, TitleComponent, TooltipComponent, CanvasRenderer])

const userStore = useUserStore()
const router = useRouter()
const chartContainer = ref<HTMLDivElement>()
const total = ref(0)
const online = ref(0)
const warning = ref(0)
const offline = ref(0)

const loading = ref(false)
const loadError = ref(false)

let deviceStatusChart: ECharts | undefined
let chartResizeObserver: ResizeObserver | undefined

function updateDeviceStatusChart() {
  if (!deviceStatusChart) return

  const option: EChartsOption = {
    animationDuration: 700,
    animationDurationUpdate: 500,
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 台 ({d}%)',
    },
    legend: {
      bottom: 0,
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#64748b', fontSize: 12 },
    },
    title: {
      text: String(total.value),
      subtext: '设备总数',
      left: 'center',
      top: '35%',
      textStyle: {
        color: '#1e293b',
        fontSize: 28,
        fontWeight: 600,
      },
      subtextStyle: {
        color: '#64748b',
        fontSize: 12,
        lineHeight: 24,
      },
    },
    series: [
      {
        name: '设备状态',
        type: 'pie',
        radius: ['52%', '74%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 3,
          borderRadius: 5,
        },
        label: { show: false },
        emphasis: {
          scale: true,
          label: {
            show: true,
            color: '#334155',
            fontSize: 13,
            formatter: '{b}\n{d}%',
          },
        },
        data: [
          { value: online.value, name: '在线', itemStyle: { color: '#34c38f' } },
          { value: offline.value, name: '离线', itemStyle: { color: '#94a3b8' } },
          { value: warning.value, name: '告警', itemStyle: { color: '#f5a623' } },
        ],
      },
    ],
  }

  deviceStatusChart.setOption(option, true)
}

async function loadDeviceStats() {
  loading.value = true
  loadError.value = false

  try {
    const [allResult, onlineResult, warningResult] = await Promise.all([
      fetchDeviceList({ page: 1, pageSize: 1 }),
      fetchDeviceList({ page: 1, pageSize: 1, status: 'online' }),
      fetchDeviceList({ page: 1, pageSize: 1, status: 'warning' }),
    ])

    total.value = allResult.data.total
    online.value = onlineResult.data.total
    warning.value = warningResult.data.total
    offline.value = Math.max(0, total.value - online.value - warning.value)
    updateDeviceStatusChart()
  } catch {
    loadError.value = true
    // The Axios response interceptor displays the request error.
  } finally {
    loading.value = false
  }
}

function openVisualization() {
  void router.push('/visualization')
}

onMounted(() => {
  const element = chartContainer.value
  if (element) {
    deviceStatusChart = init(element, undefined, { renderer: 'canvas' })
    chartResizeObserver = new ResizeObserver(() => deviceStatusChart?.resize())
    chartResizeObserver.observe(element)
  }

  void loadDeviceStats()
})

onBeforeUnmount(() => {
  chartResizeObserver?.disconnect()
  deviceStatusChart?.dispose()
  deviceStatusChart = undefined
})
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <div>
        <h1>园区工作台</h1>
        <p>园区设备运行概览</p>
      </div>
      <el-button type="primary" @click="openVisualization">打开可视化大屏</el-button>
    </div>

    <el-alert
      :title="`当前身份：${userStore.roleLabel}。导航菜单由角色动态生成（RBAC）。`"
      type="success"
      show-icon
      :closable="false"
    />

    <el-row :gutter="16" class="cards">
      <el-col :xs="24" :sm="12" :md="8">
        <el-card shadow="hover" class="stat-card">
          <p>设备总数</p>
          <h2 v-loading="loading">{{ total }}</h2>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-card shadow="hover" class="stat-card">
          <p>在线设备</p>
          <h2 v-loading="loading">{{ online }}</h2>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-card shadow="hover" class="stat-card">
          <p>告警设备</p>
          <h2 v-loading="loading">{{ warning }}</h2>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="chart-card">
      <template #header>
        <div class="chart-heading">
          <div>
            <h2>设备状态分布</h2>
            <p>根据当前设备数据统计</p>
          </div>
          <el-button :loading="loading" @click="loadDeviceStats">刷新</el-button>
        </div>
      </template>
      <el-alert
        v-if="loadError"
        title="设备统计加载失败，请检查网络后重试。"
        type="error"
        show-icon
        :closable="false"
        class="chart-error"
      />
      <div ref="chartContainer" class="status-chart" />
    </el-card>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-heading,
.chart-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-heading h1,
.chart-heading h2 {
  margin: 0;
  color: #1f2937;
}

.page-heading h1 {
  font-size: 22px;
}

.page-heading p,
.chart-heading p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 13px;
}

.cards {
  row-gap: 16px;
}

.stat-card {
  height: 100%;
}

.stat-card p {
  margin: 0;
  color: #64748b;
}

.stat-card h2 {
  min-height: 38px;
  margin: 12px 0 0;
  color: #1e293b;
  font-size: 32px;
}

.chart-card {
  min-height: 390px;
}

.chart-heading h2 {
  font-size: 17px;
}

.status-chart {
  width: 100%;
  height: 300px;
}

.chart-error {
  margin-bottom: 8px;
}

@media (max-width: 600px) {
  .page-heading h1 {
    font-size: 19px;
  }

  .chart-card {
    min-height: 340px;
  }

  .status-chart {
    height: 260px;
  }

}
</style>
