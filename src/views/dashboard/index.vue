<script setup lang="ts">
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  Bell,
  CircleCheck,
  DataLine,
  Monitor,
  Refresh,
  Setting,
  WarningFilled,
} from '@element-plus/icons-vue'
import { init, use } from 'echarts/core'
import type { ECharts } from 'echarts/core'
import type { EChartsOption } from 'echarts'
import { PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { fetchDeviceList } from '@/api/device'
import { useUserStore } from '@/stores/user'
import type { DeviceItem, DeviceStatus } from '@/types'

use([PieChart, TitleComponent, TooltipComponent, CanvasRenderer])

const userStore = useUserStore()
const router = useRouter()
const chartContainer = ref<HTMLDivElement>()
const total = ref(0)
const online = ref(0)
const warning = ref(0)
const offline = ref(0)
const recentDevices = ref<DeviceItem[]>([])
const loading = ref(false)
const loadError = ref(false)
const lastUpdated = ref('')

let deviceStatusChart: ECharts | undefined
let chartResizeObserver: ResizeObserver | undefined
let dashboardActive = false

const today = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
}).format(new Date())

const onlineRate = computed(() =>
  total.value ? ((online.value / total.value) * 100).toFixed(1) : '0.0',
)

const statusItems = computed(() => [
  { label: '在线运行', value: online.value, status: 'online' as const },
  { label: '设备告警', value: warning.value, status: 'warning' as const },
  { label: '离线设备', value: offline.value, status: 'offline' as const },
])

const statusLabels: Record<DeviceStatus, string> = {
  online: '在线',
  warning: '告警',
  offline: '离线',
}

const quickActions = computed(() => [
  {
    title: '设备管理',
    description: '查看并管理园区设备',
    icon: Monitor,
    path: userStore.roles.includes('admin') ? '/device/list' : '/device/view',
    color: 'blue',
  },
  {
    title: '园区可视化',
    description: '查看园区空间运行态势',
    icon: DataLine,
    path: '/visualization',
    color: 'violet',
  },
  ...(userStore.roles.includes('admin')
    ? [
        {
          title: '角色权限',
          description: '配置系统角色与访问权限',
          icon: Setting,
          path: '/system/role',
          color: 'amber',
        },
      ]
    : []),
])

function updateDeviceStatusChart() {
  const element = chartContainer.value
  if (!deviceStatusChart || !dashboardActive || !element?.clientWidth || !element.clientHeight) return

  const option: EChartsOption = {
    animationDuration: 650,
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 台 ({d}%)',
    },
    title: [
      {
        text: String(total.value),
        left: 'center',
        top: '36%',
        textStyle: {
          color: '#182230',
          fontSize: 30,
          fontWeight: 700,
        },
      },
      {
        text: '台设备',
        left: 'center',
        top: '53%',
        textStyle: {
          color: '#8792a2',
          fontSize: 12,
          fontWeight: 400,
        },
      },
    ],
    series: [
      {
        name: '设备状态',
        type: 'pie',
        radius: ['66%', '84%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 5,
          borderRadius: 8,
        },
        label: { show: false },
        emphasis: { scale: true, scaleSize: 7 },
        data: [
          { value: online.value, name: '在线', itemStyle: { color: '#22b98a' } },
          { value: warning.value, name: '告警', itemStyle: { color: '#f0a33a' } },
          { value: offline.value, name: '离线', itemStyle: { color: '#c8d0dc' } },
        ],
      },
    ],
  }

  deviceStatusChart.setOption(option, true)
}

function resizeDeviceStatusChart() {
  const element = chartContainer.value
  if (!dashboardActive || !element?.clientWidth || !element.clientHeight) return
  if (deviceStatusChart) {
    deviceStatusChart.resize()
  } else {
    deviceStatusChart = init(element, undefined, { renderer: 'canvas' })
  }
  updateDeviceStatusChart()
}

async function loadDeviceStats() {
  loading.value = true
  loadError.value = false

  try {
    const [allResult, onlineResult, warningResult, recentResult] = await Promise.all([
      fetchDeviceList({ page: 1, pageSize: 1 }),
      fetchDeviceList({ page: 1, pageSize: 1, status: 'online' }),
      fetchDeviceList({ page: 1, pageSize: 1, status: 'warning' }),
      fetchDeviceList({ page: 1, pageSize: 5 }),
    ])

    total.value = allResult.data.total
    online.value = onlineResult.data.total
    warning.value = warningResult.data.total
    offline.value = Math.max(0, total.value - online.value - warning.value)
    recentDevices.value = recentResult.data.list
    lastUpdated.value = new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date())
    updateDeviceStatusChart()
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function openDevices() {
  void router.push(userStore.roles.includes('admin') ? '/device/list' : '/device/view')
}

function openVisualization() {
  void router.push('/visualization')
}

function statusType(status: DeviceStatus): 'success' | 'warning' | 'info' {
  if (status === 'online') return 'success'
  if (status === 'warning') return 'warning'
  return 'info'
}

onMounted(() => {
  chartResizeObserver = new ResizeObserver(resizeDeviceStatusChart)
  void loadDeviceStats()
})

onActivated(() => {
  dashboardActive = true
  const element = chartContainer.value
  if (!element) return

  chartResizeObserver?.observe(element)
  void nextTick().then(() =>
    requestAnimationFrame(() => {
      if (!dashboardActive) return
      resizeDeviceStatusChart()
    }),
  )
})

onDeactivated(() => {
  dashboardActive = false
  chartResizeObserver?.disconnect()
})

onBeforeUnmount(() => {
  dashboardActive = false
  chartResizeObserver?.disconnect()
  deviceStatusChart?.dispose()
  deviceStatusChart = undefined
})
</script>

<template>
  <div class="dashboard">
    <header class="page-heading">
      <div>
        <div class="eyebrow">PARK OPERATIONS</div>
        <h1>早上好，{{ userStore.nickname }}</h1>
        <p class="heading-caption">{{ today }} <span class="caption-divider">/</span> 欢迎回来，查看园区今日运行概况。</p>
      </div>
      <div class="heading-actions">
        <span v-if="lastUpdated" class="updated-at">
          <span class="live-dot" />
          更新于 {{ lastUpdated }}
        </span>
        <el-button class="overview-button" @click="openVisualization">
          <el-icon><DataLine /></el-icon>
          园区可视化
          <el-icon class="button-arrow"><ArrowRight /></el-icon>
        </el-button>
      </div>
    </header>

    <section class="welcome-banner">
      <div class="banner-copy">
        <div class="banner-kicker"><span class="banner-kicker-line" /> 园区运营中心</div>
        <h2>让园区运行，尽在掌握。</h2>
        <p>从设备状态到现场动态，在这里快速了解园区运行情况。</p>
      </div>
      <div class="banner-status" :class="{ 'has-warning': warning > 0 }">
        <div class="banner-status-icon">
          <el-icon><component :is="warning > 0 ? WarningFilled : CircleCheck" /></el-icon>
        </div>
        <div>
          <div class="banner-status-label">设备运行状态</div>
          <div class="banner-status-value">
            {{ warning > 0 ? `${warning} 台设备需要关注` : '整体运行平稳' }}
          </div>
        </div>
        <el-button class="banner-link" text @click="openDevices">
          查看设备 <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>
      <div class="banner-orbit banner-orbit-one" />
      <div class="banner-orbit banner-orbit-two" />
      <div class="banner-glow" />
    </section>

    <el-alert
      v-if="loadError"
      title="设备数据加载失败，请检查网络后重试。"
      type="error"
      show-icon
      :closable="false"
      class="load-error"
    >
      <template #default>
        <el-button link type="danger" @click="loadDeviceStats">重新加载</el-button>
      </template>
    </el-alert>

    <section class="metrics-grid" aria-label="设备统计">
      <article class="metric-card">
        <div class="metric-top">
          <span class="metric-label">设备总数</span>
          <span class="metric-icon icon-blue"><el-icon><Monitor /></el-icon></span>
        </div>
        <div class="metric-value" v-loading="loading">{{ total }}<span class="metric-unit">台</span></div>
        <div class="metric-foot"><span class="foot-dot dot-blue" /> 园区接入设备</div>
      </article>

      <article class="metric-card">
        <div class="metric-top">
          <span class="metric-label">在线设备</span>
          <span class="metric-icon icon-green"><el-icon><CircleCheck /></el-icon></span>
        </div>
        <div class="metric-value" v-loading="loading">{{ online }}<span class="metric-unit">台</span></div>
        <div class="metric-foot"><span class="foot-dot dot-green" /> 当前在线率 {{ onlineRate }}%</div>
      </article>

      <article class="metric-card">
        <div class="metric-top">
          <span class="metric-label">告警设备</span>
          <span class="metric-icon icon-amber"><el-icon><Bell /></el-icon></span>
        </div>
        <div class="metric-value" v-loading="loading">{{ warning }}<span class="metric-unit">台</span></div>
        <div class="metric-foot"><span class="foot-dot dot-amber" /> {{ warning > 0 ? '请及时查看设备告警' : '暂无待处理告警' }}</div>
      </article>

      <article class="metric-card">
        <div class="metric-top">
          <span class="metric-label">离线设备</span>
          <span class="metric-icon icon-slate"><el-icon><DataLine /></el-icon></span>
        </div>
        <div class="metric-value" v-loading="loading">{{ offline }}<span class="metric-unit">台</span></div>
        <div class="metric-foot"><span class="foot-dot dot-slate" /> {{ lastUpdated ? `数据更新于 ${lastUpdated}` : '等待设备数据' }}</div>
      </article>
    </section>

    <section class="content-grid">
      <article class="surface-card status-card">
        <div class="section-heading">
          <div>
            <div class="section-eyebrow">DEVICE OVERVIEW</div>
            <h2>设备状态分布</h2>
            <p>实时掌握园区设备运行情况</p>
          </div>
          <el-button
            class="refresh-button"
            :icon="Refresh"
            :loading="loading"
            aria-label="刷新设备数据"
            @click="loadDeviceStats"
          />
        </div>
        <div class="status-content">
          <div ref="chartContainer" class="status-chart" role="img" aria-label="园区设备状态分布图" />
          <div class="status-legend">
            <div v-for="item in statusItems" :key="item.status" class="legend-row">
              <div class="legend-description">
                <span class="legend-dot" :class="`legend-${item.status}`" />
                <span>{{ item.label }}</span>
              </div>
              <div class="legend-value">{{ item.value }}<span> 台</span></div>
              <div class="legend-track">
                <span
                  class="legend-progress"
                  :class="`legend-${item.status}`"
                  :style="{ width: `${total ? (item.value / total) * 100 : 0}%` }"
                />
              </div>
            </div>
            <div class="legend-footnote">
              <span class="live-dot" /> 数据来自设备中心
            </div>
          </div>
        </div>
      </article>

      <article class="surface-card shortcut-card">
        <div class="section-heading">
          <div>
            <div class="section-eyebrow">QUICK ACCESS</div>
            <h2>快捷入口</h2>
            <p>常用功能，一步直达</p>
          </div>
        </div>
        <div class="shortcut-list">
          <button
            v-for="action in quickActions"
            :key="action.path"
            class="shortcut-item"
            type="button"
            @click="router.push(action.path)"
          >
            <span class="shortcut-icon" :class="`shortcut-${action.color}`">
              <el-icon><component :is="action.icon" /></el-icon>
            </span>
            <span class="shortcut-copy">
              <span class="shortcut-title">{{ action.title }}</span>
              <span class="shortcut-description">{{ action.description }}</span>
            </span>
            <el-icon class="shortcut-arrow"><ArrowRight /></el-icon>
          </button>
        </div>
        <div class="role-note">
          <span class="role-note-mark" />
          当前以 <strong>{{ userStore.roleLabel }}</strong> 身份访问，菜单权限由角色动态控制
        </div>
      </article>
    </section>

    <section class="surface-card devices-card">
      <div class="section-heading devices-heading">
        <div>
          <div class="section-eyebrow">CONNECTED DEVICES</div>
          <h2>设备一览</h2>
          <p>园区近期接入的设备</p>
        </div>
        <el-button class="all-devices-button" text @click="openDevices">
          全部设备 <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>

      <div v-loading="loading" class="device-list">
        <div v-if="recentDevices.length" class="device-list-header">
          <span>设备名称</span>
          <span>设备型号</span>
          <span>所属区域</span>
          <span>设备状态</span>
        </div>
        <button
          v-for="device in recentDevices"
          :key="device.id"
          class="device-row"
          type="button"
          @click="router.push(`/device/detail/${device.id}`)"
        >
          <span class="device-name">
            <span class="device-avatar"><el-icon><Monitor /></el-icon></span>
            <span>{{ device.name }}</span>
          </span>
          <span class="device-model">{{ device.model }}</span>
          <span class="device-area">{{ device.area }}</span>
          <span class="device-status">
            <el-tag :type="statusType(device.status)" effect="light" round size="small">
              {{ statusLabels[device.status] }}
            </el-tag>
          </span>
        </button>
        <el-empty v-if="!loading && !recentDevices.length && !loadError" description="暂无设备数据" :image-size="64" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  --ink: #182230;
  --muted: #8792a2;
  --line: #edf0f4;
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  /* max-width: 1440px; */
  min-height: 100%;
  margin: 0 auto;
  padding: 16px 18px 24px;
  border-radius: 10px;
  background: #f2f3ff;
  color: var(--ink);
}

.page-heading,
.heading-actions,
.metric-top,
.section-heading,
.legend-description,
.device-name {
  display: flex;
  align-items: center;
}

.page-heading,
.section-heading {
  justify-content: space-between;
  gap: 20px;
}

.page-heading {
  min-height: 70px;
}

.eyebrow,
.section-eyebrow {
  color: #96a0ae;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.page-heading h1 {
  margin: 5px 0 3px;
  color: var(--ink);
  font-size: 28px;
  font-weight: 650;
  letter-spacing: -0.04em;
  line-height: 1.25;
}

.heading-caption {
  color: var(--muted);
  font-size: 14px;
}

.caption-divider {
  margin: 0 6px;
  color: #c5ccd6;
}

.heading-actions {
  flex: 0 0 auto;
  gap: 18px;
}

.updated-at {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #8a95a4;
  font-size: 12px;
}

.live-dot,
.foot-dot,
.legend-dot {
  display: inline-block;
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.live-dot {
  background: #22b98a;
  box-shadow: 0 0 0 3px rgba(34, 185, 138, 0.12);
}

.overview-button {
  height: 38px;
  padding: 0 14px;
  border-color: #e7ebf1;
  border-radius: 9px;
  color: #45556a;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 2px 5px rgba(25, 42, 70, 0.03);
}

.overview-button:hover,
.all-devices-button:hover {
  border-color: #cbd8fb;
  color: #496be3;
}

.button-arrow {
  margin-left: 3px;
  color: #98a2b1;
}

.welcome-banner {
  position: relative;
  display: flex;
  min-height: 154px;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  padding: 26px 32px;
  border: 1px solid #e7eafb;
  border-radius: 14px;
  background: linear-gradient(112deg, #f5f6ff 0%, #f2f4ff 56%, #eef2ff 100%);
  box-shadow: 0 8px 22px rgba(73, 82, 146, 0.06);
}

.banner-copy,
.banner-status {
  position: relative;
  z-index: 1;
}

.banner-kicker {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #7183ce;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.banner-kicker-line {
  width: 17px;
  height: 1px;
  background: #7188f5;
}

.banner-copy h2 {
  margin: 10px 0 6px;
  color: #25324a;
  font-size: 25px;
  font-weight: 600;
  letter-spacing: -0.03em;
}

.banner-copy p {
  color: #78849a;
  font-size: 14px;
}

.banner-status {
  display: flex;
  min-width: 276px;
  align-items: center;
  gap: 12px;
  padding: 15px 14px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 3px 12px rgba(73, 82, 146, 0.045);
}

.banner-status-icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  background: #eaf8f2;
  color: #27ae83;
  font-size: 17px;
}

.has-warning .banner-status-icon {
  background: #fff5e8;
  color: #e6a13c;
}

.banner-status-label {
  margin-bottom: 4px;
  color: #8994a3;
  font-size: 12px;
}

.banner-status-value {
  color: #344258;
  font-size: 14px;
  font-weight: 600;
}

.banner-link {
  margin-left: auto;
  color: #6479cc;
  font-size: 13px;
}

.banner-link:hover {
  color: #4f64ba;
}

.banner-orbit {
  position: absolute;
  right: 18%;
  width: 285px;
  height: 285px;
  border: 1px solid rgba(113, 136, 245, 0.09);
  border-radius: 50%;
  pointer-events: none;
}

.banner-orbit-one {
  top: -166px;
}

.banner-orbit-two {
  top: -131px;
  right: calc(18% + 35px);
}

.banner-glow {
  position: absolute;
  top: -80px;
  right: 8%;
  width: 350px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(113, 136, 245, 0.12), transparent 68%);
  pointer-events: none;
}

.load-error {
  border-radius: 9px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.metric-card,
.surface-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 3px 12px rgba(26, 43, 69, 0.025);
}

.metric-card {
  min-width: 0;
  padding: 17px 18px 15px;
}

.metric-top {
  justify-content: space-between;
  gap: 8px;
}

.metric-label {
  color: #778395;
  font-size: 14px;
  font-weight: 500;
}

.metric-icon {
  display: grid;
  width: 31px;
  height: 31px;
  place-items: center;
  border-radius: 9px;
  font-size: 15px;
}

.icon-blue {
  background: #eef3ff;
  color: #6683ee;
}

.icon-green {
  background: #eaf8f2;
  color: #27ae83;
}

.icon-amber {
  background: #fff5e8;
  color: #e6a13c;
}

.icon-slate {
  background: #f0f3f7;
  color: #7c8ba0;
}

.metric-value {
  min-height: 43px;
  margin-top: 11px;
  color: var(--ink);
  font-size: 31px;
  font-weight: 650;
  letter-spacing: -0.055em;
  line-height: 1.2;
}

.metric-unit {
  margin-left: 5px;
  color: #8893a2;
  font-size: 14px;
  font-weight: 450;
  letter-spacing: 0;
}

.metric-foot {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 18px;
  overflow: hidden;
  color: #8994a3;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.foot-dot {
  width: 6px;
  height: 6px;
}

.dot-blue {
  background: #7590ee;
}

.dot-green {
  background: #2ab88a;
}

.dot-amber {
  background: #eda944;
}

.dot-slate {
  background: #99a6b8;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.85fr);
  gap: 14px;
}

.surface-card {
  min-width: 0;
  padding: 20px 21px;
}

.section-heading {
  align-items: flex-start;
}

.section-heading h2 {
  margin: 5px 0 4px;
  color: var(--ink);
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.015em;
}

.section-heading p {
  color: #98a1ae;
  font-size: 12px;
}

.section-eyebrow {
  font-size: 10px;
  letter-spacing: 0.13em;
}

.refresh-button {
  width: 31px;
  height: 31px;
  padding: 0;
  border-color: #edf0f4;
  border-radius: 8px;
  color: #8b96a5;
}

.refresh-button:hover {
  border-color: #dce5fb;
  color: #5874df;
}

.status-content {
  display: grid;
  grid-template-columns: minmax(165px, 0.9fr) minmax(145px, 1fr);
  align-items: center;
  gap: 24px;
  min-height: 216px;
  margin-top: 6px;
}

.status-chart {
  width: 100%;
  height: 216px;
  min-width: 0;
}

.status-legend {
  display: flex;
  flex-direction: column;
  gap: 17px;
  padding-right: 5px;
}

.legend-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
}

.legend-description {
  gap: 8px;
  color: #687587;
  font-size: 13px;
}

.legend-dot {
  width: 8px;
  height: 8px;
}

.legend-value {
  color: #263244;
  font-size: 14px;
  font-weight: 650;
}

.legend-value span {
  color: #9aa4b1;
  font-size: 12px;
  font-weight: 400;
}

.legend-track {
  grid-column: 1 / -1;
  height: 4px;
  overflow: hidden;
  border-radius: 4px;
  background: #f0f2f5;
}

.legend-progress {
  display: block;
  height: 100%;
  min-width: 0;
  border-radius: inherit;
  transition: width 0.3s ease;
}

.legend-online {
  background-color: #22b98a;
}

.legend-warning {
  background-color: #f0a33a;
}

.legend-offline {
  background-color: #c8d0dc;
}

.legend-footnote {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 1px;
  color: #9ba5b1;
  font-size: 12px;
}

.legend-footnote .live-dot {
  width: 6px;
  height: 6px;
}

.shortcut-card {
  display: flex;
  flex-direction: column;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  margin-top: 10px;
}

.shortcut-item {
  display: flex;
  min-height: 63px;
  align-items: center;
  gap: 11px;
  padding: 9px 2px;
  border: 0;
  border-bottom: 1px solid #f0f2f5;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.16s ease;
}

.shortcut-item:last-child {
  border-bottom: 0;
}

.shortcut-item:hover .shortcut-arrow {
  transform: translateX(3px);
  color: #6680e6;
}

.shortcut-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  font-size: 15px;
}

.shortcut-blue {
  background: #edf3ff;
  color: #6481e9;
}

.shortcut-violet {
  background: #f1efff;
  color: #8271dc;
}

.shortcut-amber {
  background: #fff5e8;
  color: #e4a040;
}

.shortcut-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.shortcut-title {
  color: #394658;
  font-size: 13px;
  font-weight: 600;
}

.shortcut-description {
  overflow: hidden;
  color: #98a2af;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortcut-arrow {
  color: #b2bac5;
  font-size: 13px;
  transition: color 0.16s ease, transform 0.16s ease;
}

.role-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  padding: 11px 10px;
  border-radius: 8px;
  background: #f7f8fa;
  color: #929caa;
  font-size: 11px;
  line-height: 1.5;
}

.role-note strong {
  color: #697587;
  font-weight: 600;
}

.role-note-mark {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #7a91e6;
}

.devices-card {
  padding-bottom: 10px;
}

.devices-heading {
  margin-bottom: 14px;
}

.all-devices-button {
  height: 30px;
  padding: 0 8px;
  color: #77859a;
  font-size: 13px;
}

.all-devices-button .el-icon {
  margin-left: 2px;
}

.device-list {
  min-height: 64px;
}

.device-list-header,
.device-row {
  display: grid;
  grid-template-columns: minmax(180px, 1.4fr) minmax(130px, 1fr) minmax(110px, 0.9fr) minmax(90px, 0.7fr);
  align-items: center;
  gap: 14px;
}

.device-list-header {
  padding: 0 10px 9px;
  border-bottom: 1px solid #edf0f4;
  color: #9aa3b0;
  font-size: 12px;
}

.device-row {
  width: 100%;
  min-height: 49px;
  padding: 6px 10px;
  border: 0;
  border-bottom: 1px solid #f1f3f6;
  background: transparent;
  color: #596678;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.device-row:last-child {
  border-bottom: 0;
}

.device-row:hover {
  border-radius: 7px;
  background: #f8faff;
}

.device-name {
  min-width: 0;
  gap: 9px;
  overflow: hidden;
  color: #445064;
  font-size: 13px;
  font-weight: 550;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-avatar {
  display: grid;
  width: 27px;
  height: 27px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #f8f9fb;
  color: #8290a4;
  font-size: 13px;
}

.device-model,
.device-area {
  overflow: hidden;
  color: #8994a3;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-status :deep(.el-tag) {
  border: 0;
  font-size: 12px;
}

.device-list :deep(.el-empty) {
  padding: 8px 0 15px;
}

@media (max-width: 1050px) {
  .dashboard {
    padding: 12px 10px 20px;
  }

  .content-grid {
    grid-template-columns: minmax(0, 1.1fr) minmax(275px, 0.9fr);
  }

  .status-content {
    grid-template-columns: minmax(140px, 0.8fr) minmax(120px, 1fr);
    gap: 12px;
  }

  .metric-card {
    padding-right: 14px;
    padding-left: 14px;
  }
}

@media (max-width: 760px) {
  .dashboard {
    gap: 14px;
    padding: 8px 4px 16px;
  }

  .page-heading {
    align-items: flex-start;
  }

  .page-heading h1 {
    font-size: 23px;
  }

  .heading-caption {
    max-width: 390px;
    font-size: 12px;
    line-height: 1.6;
  }

  .heading-actions {
    flex-direction: column-reverse;
    align-items: flex-end;
    gap: 7px;
  }

  .updated-at {
    font-size: 11px;
  }

  .overview-button {
    height: 34px;
    padding: 0 10px;
    font-size: 12px;
  }

  .welcome-banner {
    min-height: 140px;
    padding: 20px;
  }

  .banner-copy h2 {
    font-size: 21px;
  }

  .banner-copy p {
    max-width: 310px;
    font-size: 12px;
    line-height: 1.6;
  }

  .banner-status {
    min-width: unset;
    padding: 11px;
  }

  .banner-link {
    display: none;
  }

  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .metric-card {
    padding: 13px;
  }

  .metric-value {
    font-size: 27px;
  }

  .content-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .surface-card {
    padding: 16px;
  }

  .shortcut-list {
    margin-top: 5px;
  }

  .shortcut-item {
    min-height: 56px;
  }

  .role-note {
    margin-top: 10px;
  }
}

@media (max-width: 480px) {
  .page-heading {
    gap: 8px;
  }

  .page-heading h1 {
    font-size: 20px;
  }

  .eyebrow {
    font-size: 10px;
  }

  .heading-caption {
    max-width: 220px;
    font-size: 11px;
  }

  .heading-actions {
    gap: 6px;
  }

  .updated-at {
    gap: 5px;
    font-size: 10px;
  }

  .overview-button {
    gap: 4px;
    font-size: 11px;
  }

  .overview-button .button-arrow {
    display: none;
  }

  .welcome-banner {
    min-height: unset;
    align-items: flex-start;
    flex-direction: column;
    gap: 17px;
    padding: 17px;
  }

  .banner-copy h2 {
    font-size: 20px;
  }

  .banner-status {
    width: 100%;
    padding: 9px 10px;
  }

  .banner-status-value {
    font-size: 12px;
  }

  .banner-orbit {
    right: -34%;
  }

  .metric-card {
    padding: 11px;
  }

  .metric-label {
    font-size: 12px;
  }

  .metric-icon {
    width: 27px;
    height: 27px;
    font-size: 13px;
  }

  .metric-value {
    min-height: 38px;
    margin-top: 8px;
    font-size: 26px;
  }

  .metric-foot {
    font-size: 11px;
  }

  .surface-card {
    padding: 14px 12px;
  }

  .status-content {
    grid-template-columns: minmax(115px, 0.9fr) minmax(110px, 1fr);
    gap: 6px;
    min-height: 185px;
  }

  .status-chart {
    height: 185px;
  }

  .status-legend {
    gap: 13px;
    padding-right: 0;
  }

  .legend-description {
    gap: 6px;
    font-size: 12px;
  }

  .legend-value {
    font-size: 12px;
  }

  .device-list-header {
    display: none;
  }

  .device-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px 8px;
    padding: 8px 4px;
  }

  .device-name {
    grid-column: 1;
  }

  .device-model {
    grid-column: 1;
    padding-left: 36px;
  }

  .device-area {
    grid-column: 2;
    grid-row: 1;
    max-width: 90px;
    text-align: right;
  }

  .device-status {
    grid-column: 2;
    grid-row: 2;
    justify-self: end;
  }
 }
</style>
