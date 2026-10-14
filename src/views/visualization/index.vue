<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { init, use } from 'echarts/core'
import type { ECharts } from 'echarts/core'
import type { EChartsOption } from 'echarts'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const router = useRouter()
const todayChartRef = ref<HTMLDivElement>()
const monthChartRef = ref<HTMLDivElement>()
const statusChartRef = ref<HTMLDivElement>()
const buildingChartRef = ref<HTMLDivElement>()
const currentTime = ref('')
const energyToday = ref(0)
const energyMonth = ref(0)
const onlineRate = ref(0)

const charts: ECharts[] = []
let refreshTimer: ReturnType<typeof setInterval> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined

const colors = {
  cyan: '#44e5ff',
  blue: '#4b8dff',
  purple: '#9b7bff',
  green: '#39d6a3',
  orange: '#ffb454',
  muted: '#8296b5',
  grid: 'rgba(126, 164, 207, 0.12)',
}

function makeLineOption(
  labels: string[],
  values: number[],
  color: string,
  unit: string,
): EChartsOption {
  return {
    animationDuration: 700,
    animationDurationUpdate: 900,
    grid: { top: 24, right: 18, bottom: 22, left: 42 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(7, 20, 42, 0.94)',
      borderColor: 'rgba(68, 229, 255, 0.3)',
      textStyle: { color: '#dcecff', fontSize: 11 },
      formatter: (items) => {
        const item = Array.isArray(items) ? items[0] : items
        return `${item?.name ?? ''}<br/>能耗：${item?.value ?? 0} ${unit}`
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: 'rgba(130, 150, 181, 0.28)' } },
      axisTick: { show: false },
      axisLabel: { color: colors.muted, fontSize: 10, interval: 'auto' },
    },
    yAxis: {
      type: 'value',
      name: unit,
      nameTextStyle: { color: colors.muted, fontSize: 10, padding: [0, 0, 0, -22] },
      splitNumber: 4,
      axisLabel: { color: colors.muted, fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: colors.grid, type: 'dashed' } },
    },
    series: [
      {
        type: 'line',
        data: values,
        smooth: 0.42,
        symbol: 'circle',
        symbolSize: 5,
        showSymbol: false,
        lineStyle: { color, width: 2.5, shadowColor: color, shadowBlur: 12 },
        itemStyle: { color, borderColor: '#07152c', borderWidth: 2 },
        areaStyle: {
          color: `${color}24`,
        },
      },
    ],
  }
}

function updateClock() {
  currentTime.value = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date())
}

function refreshCharts() {
  const hourLabels = Array.from({ length: 12 }, (_, index) => `${String(index * 2).padStart(2, '0')}:00`)
  const dayValues = Array.from({ length: 12 }, (_, index) =>
    Math.round(38 + 20 * Math.sin((index / 11) * Math.PI) + Math.random() * 14),
  )
  const daysInMonth = new Date().getDate()
  const monthLabels = Array.from({ length: daysInMonth }, (_, index) => `${index + 1}日`)
  const monthValues = Array.from({ length: daysInMonth }, (_, index) =>
    Math.round(680 + 150 * Math.sin((index / Math.max(1, daysInMonth - 1)) * Math.PI) + Math.random() * 90),
  )

  todayChart?.setOption(makeLineOption(hourLabels, dayValues, colors.cyan, 'kWh'), true)
  monthChart?.setOption(makeLineOption(monthLabels, monthValues, colors.purple, 'kWh'), true)

  const online = 68 + Math.round(Math.random() * 5)
  const offline = 17 + Math.round(Math.random() * 4)
  const warning = 100 - online - offline
  onlineRate.value = online
  statusChart?.setOption({
    animationDurationUpdate: 700,
    tooltip: {
      trigger: 'item',
      formatter: '{b}：{c} 台（{d}%）',
      backgroundColor: 'rgba(7, 20, 42, 0.94)',
      borderColor: 'rgba(68, 229, 255, 0.3)',
      textStyle: { color: '#dcecff', fontSize: 11 },
    },
    legend: {
      bottom: 0,
      left: 'center',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: colors.muted, fontSize: 10 },
      data: ['在线', '离线', '告警'],
    },
    series: [
      {
        type: 'pie',
        radius: ['48%', '70%'],
        center: ['50%', '43%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#0c1a32', borderWidth: 3, borderRadius: 5 },
        label: { show: false },
        emphasis: {
          scale: true,
          label: { show: true, color: '#e5f2ff', fontSize: 12, formatter: '{b}\n{d}%' },
        },
        data: [
          { value: online, name: '在线', itemStyle: { color: colors.green } },
          { value: offline, name: '离线', itemStyle: { color: colors.blue } },
          { value: warning, name: '告警', itemStyle: { color: colors.orange } },
        ],
      },
    ],
  }, true)

  const buildingNames = ['A座', 'B座', 'C座', 'D座', '能源站', '仓储中心']
  const buildingValues = buildingNames.map(() => 18 + Math.round(Math.random() * 50))
  buildingChart?.setOption({
    animationDurationUpdate: 700,
    grid: { top: 22, right: 14, bottom: 22, left: 34 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(7, 20, 42, 0.94)',
      borderColor: 'rgba(68, 229, 255, 0.3)',
      textStyle: { color: '#dcecff', fontSize: 11 },
    },
    xAxis: {
      type: 'category',
      data: buildingNames,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(130, 150, 181, 0.28)' } },
      axisLabel: { color: colors.muted, fontSize: 10, interval: 0, rotate: 18, margin: 12 },
    },
    yAxis: {
      type: 'value',
      name: '台',
      nameTextStyle: { color: colors.muted, fontSize: 10 },
      axisLabel: { color: colors.muted, fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: colors.grid, type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        data: buildingValues,
        barWidth: '42%',
        showBackground: true,
        backgroundStyle: { color: 'rgba(77, 130, 197, 0.08)', borderRadius: [5, 5, 0, 0] },
        itemStyle: {
          borderRadius: [5, 5, 0, 0],
          color: colors.cyan,
        },
      },
    ],
  }, true)

  energyToday.value = dayValues.reduce((sum, value) => sum + value, 0)
  energyMonth.value = monthValues.reduce((sum, value) => sum + value, 0)
}

const todayChartRefMap = () => todayChartRef.value
const monthChartRefMap = () => monthChartRef.value
const statusChartRefMap = () => statusChartRef.value
const buildingChartRefMap = () => buildingChartRef.value

let todayChart: ECharts | undefined
let monthChart: ECharts | undefined
let statusChart: ECharts | undefined
let buildingChart: ECharts | undefined

function resizeCharts() {
  charts.forEach((chart) => chart.resize())
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await document.documentElement.requestFullscreen()
    }
  } catch (error) {
    console.error('切换全屏失败', error)
  }
}

onMounted(() => {
  const elements = [
    todayChartRefMap(),
    monthChartRefMap(),
    statusChartRefMap(),
    buildingChartRefMap(),
  ]
  for (const element of elements) {
    if (element) charts.push(init(element, undefined, { renderer: 'canvas' }))
  }
  ;[todayChart, monthChart, statusChart, buildingChart] = charts

  updateClock()
  refreshCharts()
  refreshTimer = setInterval(refreshCharts, 3000)
  clockTimer = setInterval(updateClock, 1000)
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (clockTimer) clearInterval(clockTimer)
  window.removeEventListener('resize', resizeCharts)
  charts.forEach((chart) => chart.dispose())
})
</script>

<template>
  <main class="screen">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark"><i /></span>
        <div>
          <h1>数字孪生园区</h1>
          <p>DIGITAL TWIN · SMART CAMPUS</p>
        </div>
      </div>
      <div class="screen-title">
        <span class="title-rule" />
        <h2>园区综合态势可视化</h2>
        <span class="title-rule" />
      </div>
      <div class="top-actions">
        <div class="live-clock">
          <span class="live-dot" />
          <span>{{ currentTime }}</span>
        </div>
        <button class="action-button" type="button" @click="toggleFullscreen">全屏</button>
        <button class="action-button back-button" type="button" @click="router.push('/')">返回后台</button>
      </div>
    </header>

    <section class="dashboard-grid">
      <article class="panel energy-panel">
        <div class="panel-heading">
          <div>
            <span class="panel-index">01 / ENERGY</span>
            <h3>今日能耗趋势</h3>
          </div>
          <span class="unit-chip">kWh</span>
        </div>
        <div class="metric-line">
          <strong>{{ energyToday.toLocaleString() }}</strong>
          <span>今日累计用电</span>
          <i class="trend-up">↗ 实时</i>
        </div>
        <div ref="todayChartRef" class="chart" />
      </article>

      <article class="panel energy-panel">
        <div class="panel-heading">
          <div>
            <span class="panel-index">02 / ENERGY</span>
            <h3>本月能耗趋势</h3>
          </div>
          <span class="unit-chip">kWh</span>
        </div>
        <div class="metric-line">
          <strong>{{ energyMonth.toLocaleString() }}</strong>
          <span>本月累计用电</span>
          <i class="trend-up">↗ 实时</i>
        </div>
        <div ref="monthChartRef" class="chart" />
      </article>

      <section class="scene" aria-label="3D园区场景预留区域">
        <div class="scene-grid" />
        <div class="scene-orbit orbit-one" />
        <div class="scene-orbit orbit-two" />
        <div class="scene-halo" />
        <div class="scene-building building-one"><i /></div>
        <div class="scene-building building-two"><i /></div>
        <div class="scene-building building-three"><i /></div>
        <div class="scene-building building-four"><i /></div>
        <div class="scene-label">
          <span class="scene-live"><i /> DIGITAL TWIN SCENE</span>
          <h3>3D 园区实景</h3>
          <p>三维场景接入区域 · 实时数据驱动</p>
        </div>
        <div class="scene-coordinates">120°08′ E&nbsp;&nbsp; 30°16′ N</div>
        <div class="scene-corner corner-tl" />
        <div class="scene-corner corner-tr" />
        <div class="scene-corner corner-bl" />
        <div class="scene-corner corner-br" />
      </section>

      <article class="panel status-panel">
        <div class="panel-heading">
          <div>
            <span class="panel-index">03 / DEVICES</span>
            <h3>设备运行状态</h3>
          </div>
          <span class="status-total">设备健康率 <b>{{ onlineRate }}%</b></span>
        </div>
        <div ref="statusChartRef" class="chart pie-chart" />
      </article>

      <article class="panel building-panel">
        <div class="panel-heading">
          <div>
            <span class="panel-index">04 / BUILDINGS</span>
            <h3>楼栋设备分布</h3>
          </div>
          <span class="unit-chip">设备数量</span>
        </div>
        <div ref="buildingChartRef" class="chart" />
      </article>
    </section>

    <footer class="footer">
      <span>SMART CAMPUS · DIGITAL TWIN PLATFORM</span>
      <span><i class="live-dot" /> 数据每 3 秒自动更新</span>
    </footer>
  </main>
</template>

<style scoped>
.screen {
  --bg: #071329;
  --panel: rgba(12, 29, 55, 0.88);
  --line: rgba(108, 159, 211, 0.18);
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  color: #e4f1ff;
  background:
    radial-gradient(ellipse at 50% 45%, rgba(20, 78, 126, 0.2), transparent 42%),
    radial-gradient(ellipse at 50% 100%, rgba(12, 79, 112, 0.16), transparent 45%),
    var(--bg);
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.topbar {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(230px, 1fr) minmax(280px, 1.2fr) minmax(260px, 1fr);
  align-items: center;
  min-height: 76px;
  padding: 0 28px;
  border-bottom: 1px solid var(--line);
  background: rgba(5, 17, 36, 0.74);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.16);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid rgba(68, 229, 255, 0.46);
  border-radius: 10px;
  background: rgba(68, 229, 255, 0.08);
  box-shadow: 0 0 20px rgba(68, 229, 255, 0.12), inset 0 0 14px rgba(68, 229, 255, 0.08);
}

.brand-mark i,
.live-dot,
.scene-live i,
.footer .live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cyan, #44e5ff);
  box-shadow: 0 0 12px #44e5ff;
}

.brand h1 {
  margin: 0;
  color: #e7f5ff;
  font-size: 16px;
  font-weight: 650;
  letter-spacing: 0.08em;
}

.brand p {
  margin: 3px 0 0;
  color: #6f89aa;
  font-size: 9px;
  letter-spacing: 0.14em;
}

.screen-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.screen-title h2 {
  margin: 0;
  color: #e8f6ff;
  font-size: clamp(17px, 1.55vw, 23px);
  font-weight: 600;
  letter-spacing: 0.18em;
  text-shadow: 0 0 20px rgba(68, 229, 255, 0.24);
}

.title-rule {
  width: clamp(18px, 3vw, 56px);
  height: 1px;
  background: linear-gradient(90deg, transparent, #44e5ff);
}

.title-rule:last-child {
  transform: rotate(180deg);
}

.top-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.live-clock {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  margin-right: 8px;
  color: #8da6c6;
  font-size: 11px;
  white-space: nowrap;
}

.live-dot {
  flex: 0 0 auto;
  animation: pulse 1.8s infinite;
}

.action-button {
  flex: 0 0 auto;
  padding: 7px 12px;
  border: 1px solid rgba(110, 157, 204, 0.28);
  border-radius: 6px;
  color: #b7cce5;
  background: rgba(27, 53, 86, 0.45);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  white-space: nowrap;
  transition: 0.2s ease;
}

.action-button:hover {
  border-color: rgba(68, 229, 255, 0.64);
  color: #e5fbff;
  background: rgba(68, 229, 255, 0.1);
}

.dashboard-grid {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(250px, 0.95fr) minmax(300px, 1.12fr) minmax(250px, 0.95fr);
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
  padding: 16px 22px 12px;
}

.panel {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 15px 16px 10px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background:
    linear-gradient(135deg, rgba(18, 42, 74, 0.58), transparent 54%),
    var(--panel);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.14), inset 0 1px rgba(202, 232, 255, 0.035);
}

.panel::before {
  position: absolute;
  top: -1px;
  left: 16px;
  width: 38px;
  height: 2px;
  background: #44e5ff;
  box-shadow: 0 0 12px rgba(68, 229, 255, 0.72);
  content: '';
}

.panel-heading {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.panel-index {
  display: block;
  margin-bottom: 5px;
  color: #54759c;
  font-size: 9px;
  letter-spacing: 0.14em;
}

.panel-heading h3 {
  margin: 0;
  color: #dcecff;
  font-size: 14px;
  font-weight: 550;
}

.unit-chip,
.status-total {
  color: #7e9bbd;
  font-size: 10px;
}

.unit-chip {
  padding: 4px 7px;
  border: 1px solid rgba(120, 160, 201, 0.16);
  border-radius: 4px;
  background: rgba(107, 148, 190, 0.07);
}

.status-total b {
  margin-left: 4px;
  color: #4de1b2;
  font-size: 13px;
}

.metric-line {
  display: flex;
  flex: 0 0 auto;
  align-items: baseline;
  gap: 8px;
  margin-top: 7px;
}

.metric-line strong {
  color: #eff8ff;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.metric-line > span {
  color: #7892b2;
  font-size: 10px;
}

.trend-up {
  margin-left: auto;
  color: #3ed6a1;
  font-size: 10px;
  font-style: normal;
}

.chart {
  flex: 1;
  width: 100%;
  min-height: 0;
}

.pie-chart {
  min-height: 120px;
}

.scene {
  position: relative;
  grid-column: 2;
  grid-row: 1 / 3;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(68, 196, 235, 0.16);
  border-radius: 10px;
  background:
    radial-gradient(ellipse at 50% 54%, rgba(19, 105, 145, 0.14), transparent 50%),
    linear-gradient(180deg, rgba(8, 28, 54, 0.26), rgba(6, 19, 40, 0.82));
}

.scene-grid {
  position: absolute;
  inset: 18% -15% 8%;
  opacity: 0.45;
  background-image:
    linear-gradient(rgba(57, 187, 222, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(57, 187, 222, 0.12) 1px, transparent 1px);
  background-position: center;
  background-size: 34px 34px;
  transform: perspective(440px) rotateX(58deg) scale(1.35);
  mask-image: linear-gradient(transparent, #000 28%, #000 78%, transparent);
}

.scene-orbit {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(72%, 340px);
  aspect-ratio: 1;
  border: 1px solid rgba(67, 211, 239, 0.17);
  border-radius: 50%;
  transform: translate(-50%, -50%) rotateX(67deg);
}

.orbit-two {
  width: min(54%, 255px);
  border-color: rgba(103, 139, 255, 0.2);
  transform: translate(-50%, -50%) rotateX(67deg) rotateZ(35deg);
}

.scene-halo {
  position: absolute;
  top: 49%;
  left: 50%;
  width: 34%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: rgba(44, 211, 238, 0.12);
  filter: blur(42px);
  transform: translate(-50%, -50%);
}

.scene-building {
  position: absolute;
  bottom: 38%;
  left: 50%;
  width: clamp(30px, 6vw, 66px);
  height: clamp(82px, 18vh, 160px);
  border: 1px solid rgba(93, 222, 250, 0.52);
  background:
    repeating-linear-gradient(0deg, transparent 0 11px, rgba(79, 207, 241, 0.18) 12px),
    linear-gradient(100deg, rgba(27, 130, 170, 0.28), rgba(22, 60, 101, 0.72));
  box-shadow: 0 0 24px rgba(37, 193, 229, 0.12), inset 0 0 22px rgba(42, 191, 226, 0.13);
  clip-path: polygon(0 10%, 78% 0, 100% 8%, 100% 100%, 0 100%);
  transform: translate(-50%, 0);
}

.scene-building i {
  position: absolute;
  inset: 14% 18%;
  background: repeating-linear-gradient(90deg, rgba(74, 218, 249, 0.7) 0 2px, transparent 2px 10px);
  opacity: 0.48;
}

.building-one {
  margin-left: -24%;
  height: clamp(64px, 13vh, 120px);
  opacity: 0.72;
  transform: skewY(-7deg);
}

.building-two {
  margin-left: 21%;
  height: clamp(70px, 14vh, 132px);
  opacity: 0.8;
  transform: skewY(6deg);
}

.building-three {
  margin-left: -5%;
  bottom: 34%;
  width: clamp(40px, 7vw, 80px);
  height: clamp(112px, 24vh, 205px);
}

.building-four {
  margin-left: 38%;
  bottom: 39%;
  width: clamp(24px, 4vw, 46px);
  height: clamp(54px, 11vh, 102px);
  opacity: 0.58;
}

.scene-label {
  position: absolute;
  top: 10%;
  left: 0;
  width: 100%;
  text-align: center;
}

.scene-live {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #67b9d8;
  font-size: 9px;
  letter-spacing: 0.16em;
}

.scene-live i {
  width: 5px;
  height: 5px;
}

.scene-label h3 {
  margin: 9px 0 5px;
  color: #d9efff;
  font-size: clamp(17px, 1.7vw, 24px);
  font-weight: 500;
  letter-spacing: 0.14em;
  text-shadow: 0 0 20px rgba(68, 229, 255, 0.24);
}

.scene-label p {
  margin: 0;
  color: #6684a6;
  font-size: 10px;
}

.scene-coordinates {
  position: absolute;
  right: 14px;
  bottom: 12px;
  color: #567598;
  font-size: 9px;
  letter-spacing: 0.08em;
}

.scene-corner {
  position: absolute;
  width: 15px;
  height: 15px;
  border-color: rgba(68, 229, 255, 0.52);
}

.corner-tl {
  top: 10px;
  left: 10px;
  border-top: 1px solid;
  border-left: 1px solid;
}

.corner-tr {
  top: 10px;
  right: 10px;
  border-top: 1px solid;
  border-right: 1px solid;
}

.corner-bl {
  bottom: 10px;
  left: 10px;
  border-bottom: 1px solid;
  border-left: 1px solid;
}

.corner-br {
  right: 10px;
  bottom: 10px;
  border-right: 1px solid;
  border-bottom: 1px solid;
}

.footer {
  display: flex;
  flex: 0 0 26px;
  align-items: center;
  justify-content: space-between;
  padding: 0 26px;
  color: #536f92;
  font-size: 9px;
  letter-spacing: 0.12em;
}

.footer > span:last-child {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  letter-spacing: 0;
}

.footer .live-dot {
  width: 5px;
  height: 5px;
}

@keyframes pulse {
  50% {
    opacity: 0.45;
    box-shadow: 0 0 4px #44e5ff;
  }
}

@media (max-width: 900px) {
  .topbar {
    grid-template-columns: 1fr auto;
    min-height: 68px;
    padding: 0 16px;
  }

  .screen-title {
    display: none;
  }

  .dashboard-grid {
    grid-template-columns: minmax(210px, 1fr) minmax(210px, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(180px, 0.85fr) minmax(0, 1fr);
    gap: 10px;
    padding: 12px;
  }

  .scene {
    grid-column: 1 / 3;
    grid-row: 2;
  }

  .energy-panel:first-child {
    grid-column: 1;
    grid-row: 1;
  }

  .energy-panel:nth-child(2) {
    grid-column: 2;
    grid-row: 1;
  }

  .status-panel {
    grid-column: 1;
    grid-row: 3;
  }

  .building-panel {
    grid-column: 2;
    grid-row: 3;
  }
}

@media (max-width: 560px) {
  .topbar {
    min-height: 58px;
    padding: 0 10px;
  }

  .brand {
    gap: 8px;
  }

  .brand-mark {
    width: 28px;
    height: 28px;
  }

  .brand h1 {
    font-size: 13px;
  }

  .brand p,
  .live-clock,
  .back-button {
    display: none;
  }

  .top-actions {
    gap: 6px;
  }

  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: minmax(0, 0.9fr) minmax(148px, 0.65fr) minmax(0, 0.9fr);
    gap: 7px;
    padding: 8px;
  }

  .panel {
    padding: 9px 9px 6px;
    border-radius: 7px;
  }

  .panel-index {
    margin-bottom: 3px;
    font-size: 7px;
  }

  .panel-heading h3 {
    font-size: 11px;
  }

  .metric-line {
    gap: 5px;
    margin-top: 4px;
  }

  .metric-line strong {
    font-size: 15px;
  }

  .metric-line > span,
  .trend-up,
  .unit-chip,
  .status-total {
    font-size: 8px;
  }

  .scene-label {
    top: 6%;
  }

  .scene-label p {
    font-size: 8px;
  }

  .scene-building {
    bottom: 25%;
  }

  .scene-coordinates {
    font-size: 7px;
  }

  .footer {
    flex-basis: 20px;
    padding: 0 10px;
    font-size: 7px;
  }
}

@media (max-height: 560px) and (min-width: 901px) {
  .topbar {
    min-height: 58px;
  }

  .dashboard-grid {
    gap: 8px;
    padding: 8px 14px;
  }

  .panel {
    padding: 9px 12px 5px;
  }

  .metric-line {
    margin-top: 3px;
  }

  .footer {
    flex-basis: 18px;
  }
}
</style>
