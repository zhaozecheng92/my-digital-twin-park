<script setup lang="ts">
import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
} from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import * as THREE from 'three'
import { init, use } from 'echarts/core'
import type { ECharts } from 'echarts/core'
import type { EChartsOption } from 'echarts'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { fetchDeviceList } from '@/api/device'
import type { DeviceItem } from '@/types'
import { navigateBack } from '@/utils/navigation'

use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const router = useRouter()
const todayChartRef = ref<HTMLDivElement>()
const monthChartRef = ref<HTMLDivElement>()
const statusChartRef = ref<HTMLDivElement>()
const buildingChartRef = ref<HTMLDivElement>()
const sceneContainer = ref<HTMLDivElement>()
const currentTime = ref('')
const energyToday = ref(0)
const energyMonth = ref(0)
const onlineRate = ref(0)
const sceneLoading = ref(true)
const sceneDataError = ref(false)
const sceneRenderError = ref(false)
const buildingDialogVisible = ref(false)
const selectedBuilding = ref<CampusBuilding | null>(null)
const sceneDevices = ref<DeviceItem[]>([])

const charts: ECharts[] = []
let refreshTimer: ReturnType<typeof setInterval> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined
let deviceRefreshTimer: ReturnType<typeof setInterval> | undefined
let sceneRenderer: THREE.WebGLRenderer | undefined
let scene: THREE.Scene | undefined
let camera: THREE.PerspectiveCamera | undefined
let sceneAnimationFrame = 0
let sceneResizeObserver: ResizeObserver | undefined
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const pickableBuildings: THREE.Mesh[] = []
const alertMarkers = new Map<string, THREE.Group>()
const orbitTarget = new THREE.Vector3(0, 0.6, 0)
let orbitYaw = Math.PI / 4
let orbitPitch = 0.76
let orbitDistance = 15
let activePointerId: number | null = null
let pointerStartX = 0
let pointerStartY = 0
let pointerLastX = 0
let pointerLastY = 0
let pointerMoved = false
let pageUpdatesActive = false

interface CampusBuilding {
  name: string
  area: string
  x: number
  z: number
  width: number
  depth: number
  height: number
  color: number
}

const campusBuildings: CampusBuilding[] = [
  { name: '园区入口', area: 'A区入口', x: -4.2, z: 3.1, width: 2.6, depth: 1.8, height: 1.5, color: 0x247b9d },
  { name: '第一车间', area: 'B区车间', x: -3.2, z: -1.2, width: 3.4, depth: 2.6, height: 3.1, color: 0x286d91 },
  { name: '仓储中心', area: 'C区仓储', x: 2.7, z: -1.3, width: 3.6, depth: 2.8, height: 2.5, color: 0x315e89 },
  { name: '能源站', area: 'D区能源站', x: 4.1, z: 3.2, width: 2.7, depth: 2, height: 2, color: 0x367c85 },
]

const selectedDevices = computed(() =>
  selectedBuilding.value
    ? sceneDevices.value.filter((device) => device.area === selectedBuilding.value?.area)
    : [],
)
const selectedWarningCount = computed(
  () => selectedDevices.value.filter((device) => device.status === 'warning').length,
)
const sceneWarningAreaCount = computed(
  () => new Set(sceneDevices.value.filter((device) => device.status === 'warning').map((device) => device.area)).size,
)
const selectedOnlineCount = computed(
  () => selectedDevices.value.filter((device) => device.status === 'online').length,
)
const selectedBuildingStatus = computed(() => {
  if (selectedWarningCount.value > 0) return `${selectedWarningCount.value} 台设备告警`
  return selectedDevices.value.length ? '设备正常' : '暂无设备数据'
})

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
  initializeCharts()
  charts.forEach((chart) => {
    const element = chart.getDom()
    if (element.clientWidth && element.clientHeight) chart.resize()
  })
  resizeScene()
}

function initializeCharts() {
  const elements = [
    todayChartRefMap(),
    monthChartRefMap(),
    statusChartRefMap(),
    buildingChartRefMap(),
  ]
  const existingCharts = [todayChart, monthChart, statusChart, buildingChart]

  elements.forEach((element, index) => {
    if (!element?.clientWidth || !element.clientHeight || existingCharts[index]) return
    const chart = init(element, undefined, { renderer: 'canvas' })
    charts.push(chart)
    existingCharts[index] = chart
  })
  ;[todayChart, monthChart, statusChart, buildingChart] = existingCharts
}

function renderScene(time: number) {
  if (!pageUpdatesActive) return

  sceneAnimationFrame = window.requestAnimationFrame(renderScene)
  alertMarkers.forEach((marker) => {
    if (!marker.visible) return
    const pulse = 1 + (Math.sin(time * 0.004) + 1) * 0.16
    marker.scale.setScalar(pulse)
    const ring = marker.userData.ring as THREE.Mesh
    const material = ring.material as THREE.MeshBasicMaterial
    material.opacity = 0.38 + (Math.sin(time * 0.004) + 1) * 0.24
  })
  if (scene && camera && sceneRenderer) sceneRenderer.render(scene, camera)
}

function startPageUpdates() {
  if (pageUpdatesActive) return
  pageUpdatesActive = true
  updateClock()
  window.requestAnimationFrame(() => {
    if (!pageUpdatesActive) return
    initializeCharts()
    refreshCharts()
    resizeCharts()
  })
  if (sceneContainer.value) sceneResizeObserver?.observe(sceneContainer.value)
  sceneAnimationFrame = window.requestAnimationFrame(renderScene)
  refreshTimer = setInterval(refreshCharts, 3000)
  clockTimer = setInterval(updateClock, 1000)
  deviceRefreshTimer = setInterval(() => void loadSceneDevices(), 30000)
  window.addEventListener('resize', resizeCharts)
}

function stopPageUpdates() {
  if (!pageUpdatesActive) return
  pageUpdatesActive = false
  if (refreshTimer) clearInterval(refreshTimer)
  if (clockTimer) clearInterval(clockTimer)
  if (deviceRefreshTimer) clearInterval(deviceRefreshTimer)
  refreshTimer = undefined
  clockTimer = undefined
  deviceRefreshTimer = undefined
  window.cancelAnimationFrame(sceneAnimationFrame)
  sceneAnimationFrame = 0
  sceneResizeObserver?.disconnect()
  window.removeEventListener('resize', resizeCharts)
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

function updateSceneCamera() {
  if (!camera) return

  camera.position.set(
    orbitTarget.x + orbitDistance * Math.cos(orbitPitch) * Math.sin(orbitYaw),
    orbitTarget.y + orbitDistance * Math.sin(orbitPitch),
    orbitTarget.z + orbitDistance * Math.cos(orbitPitch) * Math.cos(orbitYaw),
  )
  camera.lookAt(orbitTarget)
}

function resizeScene() {
  const container = sceneContainer.value
  if (!container || !sceneRenderer || !camera) return

  const { width, height } = container.getBoundingClientRect()
  if (!width || !height) return

  sceneRenderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.fov = THREE.MathUtils.radToDeg(
    2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(52) / 2) / Math.min(camera.aspect, 1)),
  )
  camera.updateProjectionMatrix()
}

function createBuildingLabel(name: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (context) {
    context.fillStyle = 'rgba(5, 17, 34, 0.84)'
    context.beginPath()
    context.roundRect(8, 8, 496, 112, 20)
    context.fill()
    context.strokeStyle = 'rgba(68, 229, 255, 0.62)'
    context.lineWidth = 3
    context.stroke()
    context.fillStyle = '#e7f5ff'
    context.font = '600 42px "Microsoft YaHei", sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(name, 256, 64)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const label = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
  )
  label.scale.set(2.5, 0.62, 1)
  return label
}

function createBuilding(building: CampusBuilding) {
  if (!scene) return

  const group = new THREE.Group()
  group.position.set(building.x, 0, building.z)
  group.userData.area = building.area

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: building.color,
    roughness: 0.48,
    metalness: 0.36,
    emissive: 0x061c2c,
    emissiveIntensity: 0.48,
  })
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(building.width, building.height, building.depth),
    bodyMaterial,
  )
  body.name = building.area
  body.position.y = building.height / 2
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)
  pickableBuildings.push(body)

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(building.width + 0.16, 0.16, building.depth + 0.16),
    new THREE.MeshStandardMaterial({
      color: 0x43bed0,
      roughness: 0.38,
      metalness: 0.5,
      emissive: 0x0b3444,
      emissiveIntensity: 0.7,
    }),
  )
  roof.position.y = building.height + 0.08
  roof.castShadow = true
  group.add(roof)

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x67dafa,
    emissive: 0x2787a5,
    emissiveIntensity: 0.9,
    roughness: 0.28,
    metalness: 0.25,
  })
  const windowWidth = Math.min(0.32, building.width / 7)
  const columns = Math.max(2, Math.floor(building.width / 0.72))
  const floors = Math.max(1, Math.floor(building.height / 0.85))
  for (let floor = 0; floor < floors; floor += 1) {
    for (let column = 0; column < columns; column += 1) {
      const windowMesh = new THREE.Mesh(
        new THREE.BoxGeometry(windowWidth, 0.25, 0.045),
        windowMaterial,
      )
      windowMesh.position.set(
        -building.width / 2 + ((column + 1) * building.width) / (columns + 1),
        0.45 + floor * 0.72,
        building.depth / 2 + 0.025,
      )
      group.add(windowMesh)
    }
  }

  const label = createBuildingLabel(building.name)
  label.position.y = building.height + 0.62
  group.add(label)
  scene.add(group)

  const marker = new THREE.Group()
  marker.position.set(building.x, building.height + 0.32, building.z)
  marker.visible = false
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xff465b }),
  )
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.035, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xff465b, transparent: true, opacity: 0.9 }),
  )
  ring.rotation.x = -Math.PI / 2
  marker.add(beacon, ring)
  marker.userData.ring = ring
  scene.add(marker)
  alertMarkers.set(building.area, marker)
}

function updateAlertMarkers() {
  const warningAreas = new Set(
    sceneDevices.value
      .filter((device) => device.status === 'warning')
      .map((device) => device.area),
  )

  alertMarkers.forEach((marker, area) => {
    marker.visible = warningAreas.has(area)
  })

  pickableBuildings.forEach((buildingMesh) => {
    const material = buildingMesh.material as THREE.MeshStandardMaterial
    const isSelected = selectedBuilding.value?.area === buildingMesh.name
    material.emissive.setHex(isSelected ? 0x155b72 : 0x061c2c)
    material.emissiveIntensity = isSelected ? 1.2 : 0.48
  })
}

async function loadSceneDevices() {
  sceneLoading.value = true
  sceneDataError.value = false
  try {
    const result = await fetchDeviceList({ page: 1, pageSize: 1000 })
    sceneDevices.value = result.data.list
    updateAlertMarkers()
  } catch {
    sceneDataError.value = true
  } finally {
    sceneLoading.value = false
  }
}

function updatePointerPosition(event: PointerEvent) {
  const canvas = sceneRenderer?.domElement
  if (!canvas) return false

  const bounds = canvas.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return false
  pointer.set(
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
  )
  return true
}

function pickBuilding(event: PointerEvent) {
  if (!camera || !updatePointerPosition(event)) return

  raycaster.setFromCamera(pointer, camera)
  const [hit] = raycaster.intersectObjects(pickableBuildings, false)
  const building = hit
    ? campusBuildings.find((item) => item.area === hit.object.name)
    : undefined
  if (!building) return

  selectedBuilding.value = building
  buildingDialogVisible.value = true
  updateAlertMarkers()
}

function handleScenePointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  activePointerId = event.pointerId
  pointerStartX = event.clientX
  pointerStartY = event.clientY
  pointerLastX = event.clientX
  pointerLastY = event.clientY
  pointerMoved = false
  sceneRenderer?.domElement.setPointerCapture(event.pointerId)
}

function handleScenePointerMove(event: PointerEvent) {
  const canvas = sceneRenderer?.domElement
  if (!canvas) return

  if (activePointerId === event.pointerId) {
    const deltaX = event.clientX - pointerStartX
    const deltaY = event.clientY - pointerStartY
    const movementX = event.clientX - pointerLastX
    const movementY = event.clientY - pointerLastY
    pointerLastX = event.clientX
    pointerLastY = event.clientY
    if (!pointerMoved && Math.hypot(deltaX, deltaY) > 4) pointerMoved = true
    if (pointerMoved) {
      orbitYaw -= movementX * 0.008
      orbitPitch = THREE.MathUtils.clamp(orbitPitch + movementY * 0.006, 0.18, 1.35)
      updateSceneCamera()
    }
    return
  }

  if (camera && updatePointerPosition(event)) {
    raycaster.setFromCamera(pointer, camera)
    canvas.style.cursor = raycaster.intersectObjects(pickableBuildings, false).length
      ? 'pointer'
      : 'grab'
  }
}

function handleScenePointerUp(event: PointerEvent) {
  if (activePointerId !== event.pointerId) return

  const canvas = sceneRenderer?.domElement
  if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
  if (!pointerMoved) pickBuilding(event)
  activePointerId = null
}

function handleSceneWheel(event: WheelEvent) {
  event.preventDefault()
  orbitDistance = THREE.MathUtils.clamp(orbitDistance + event.deltaY * 0.012, 8, 24)
  updateSceneCamera()
}

function createThreeScene() {
  const container = sceneContainer.value
  if (!container) return

  try {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050b14)
    scene.fog = new THREE.Fog(0x050b14, 18, 34)

    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    updateSceneCamera()

    sceneRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    sceneRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    sceneRenderer.outputColorSpace = THREE.SRGBColorSpace
    sceneRenderer.toneMapping = THREE.ACESFilmicToneMapping
    sceneRenderer.toneMappingExposure = 1.25
    sceneRenderer.shadowMap.enabled = true
    sceneRenderer.shadowMap.type = THREE.PCFShadowMap
    sceneRenderer.domElement.setAttribute('aria-label', '可旋转的园区三维场景，点击楼栋查看设备状态')
    sceneRenderer.domElement.style.cursor = 'grab'
    container.prepend(sceneRenderer.domElement)

    scene.add(new THREE.HemisphereLight(0x9ddcff, 0x101c2b, 2.2))
    const keyLight = new THREE.DirectionalLight(0xc5eaff, 3.1)
    keyLight.position.set(-6, 12, 8)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    scene.add(keyLight)
    const rimLight = new THREE.PointLight(0x1bbdd5, 16, 22)
    rimLight.position.set(5, 7, -5)
    scene.add(rimLight)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 15),
      new THREE.MeshStandardMaterial({
        color: 0x0a1725,
        roughness: 0.88,
        metalness: 0.18,
      }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.06
    ground.receiveShadow = true
    scene.add(ground)

    const grid = new THREE.GridHelper(20, 40, 0x1b7287, 0x12364b)
    grid.position.y = -0.045
    const gridMaterial = grid.material as THREE.Material
    gridMaterial.transparent = true
    gridMaterial.opacity = 0.38
    scene.add(grid)

    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x101f30,
      roughness: 0.75,
      metalness: 0.22,
      emissive: 0x07121d,
    })
    const road = new THREE.Mesh(new THREE.BoxGeometry(12, 0.035, 0.72), roadMaterial)
    road.position.set(0, -0.005, 1.15)
    scene.add(road)

    campusBuildings.forEach(createBuilding)
    resizeScene()

    const canvas = sceneRenderer.domElement
    canvas.addEventListener('pointerdown', handleScenePointerDown)
    canvas.addEventListener('pointermove', handleScenePointerMove)
    canvas.addEventListener('pointerup', handleScenePointerUp)
    canvas.addEventListener('pointercancel', handleScenePointerUp)
    canvas.addEventListener('wheel', handleSceneWheel, { passive: false })

    sceneResizeObserver = new ResizeObserver(resizeScene)
  } catch (error) {
    sceneRenderError.value = true
    console.error('初始化园区三维场景失败', error)
  }
}

function disposeThreeScene() {
  sceneResizeObserver?.disconnect()

  const canvas = sceneRenderer?.domElement
  if (canvas) {
    canvas.removeEventListener('pointerdown', handleScenePointerDown)
    canvas.removeEventListener('pointermove', handleScenePointerMove)
    canvas.removeEventListener('pointerup', handleScenePointerUp)
    canvas.removeEventListener('pointercancel', handleScenePointerUp)
    canvas.removeEventListener('wheel', handleSceneWheel)
    canvas.remove()
  }

  scene?.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Sprite) {
      object.geometry?.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => {
        if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose()
        material.dispose()
      })
    }
  })
  sceneRenderer?.dispose()
  sceneRenderer = undefined
  scene = undefined
  camera = undefined
  pickableBuildings.length = 0
  alertMarkers.clear()
}

onMounted(() => {
  createThreeScene()
  void loadSceneDevices()
})

onActivated(startPageUpdates)
onDeactivated(stopPageUpdates)

onBeforeUnmount(() => {
  stopPageUpdates()
  charts.forEach((chart) => chart.dispose())
  disposeThreeScene()
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
        <button
          class="action-button back-button"
          type="button"
          @click="navigateBack(router, '/dashboard')"
        >
          <el-icon><ArrowLeft /></el-icon>
          返回上一层
        </button>
        <button class="action-button" type="button" @click="toggleFullscreen">全屏</button>
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

      <section ref="sceneContainer" class="scene" aria-label="可交互的园区三维场景">
        <div class="scene-grid" />
        <div class="scene-label">
          <span class="scene-live"><i /> DIGITAL TWIN SCENE</span>
          <h3>3D 园区实景</h3>
          <p>拖动旋转 · 滚轮缩放 · 点击楼栋查看状态</p>
        </div>
        <div class="scene-data-status" role="status">
          <span v-if="sceneLoading"><i class="loading-dot" /> 正在同步设备数据</span>
          <span v-else-if="sceneDataError" class="scene-error">设备数据加载失败</span>
          <span v-else-if="sceneRenderError" class="scene-error">3D 场景初始化失败</span>
          <span v-else>
            <i class="live-dot" /> {{ sceneDevices.length }} 台设备已接入
            <b v-if="sceneWarningAreaCount" class="scene-warning-count">{{ sceneWarningAreaCount }} 个区域告警</b>
          </span>
        </div>
        <div class="scene-legend">
          <span><i class="legend-normal" /> 运行正常</span>
          <span><i class="legend-warning" /> 区域告警</span>
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
      <span><i class="live-dot" /> 图表每 3 秒更新 · 设备状态每 30 秒同步</span>
    </footer>

    <el-dialog
      v-model="buildingDialogVisible"
      :title="selectedBuilding?.name ?? '楼栋设备状态'"
      width="420px"
      class="building-dialog"
      append-to-body
    >
      <template v-if="selectedBuilding">
        <div
          class="building-status-banner"
          :class="{ 'building-has-warning': selectedWarningCount > 0 }"
        >
          <span class="building-status-icon">{{ selectedWarningCount > 0 ? '!' : '✓' }}</span>
          <div>
            <strong>{{ selectedBuildingStatus }}</strong>
            <span>{{ selectedBuilding.area }}</span>
          </div>
        </div>
        <div class="building-stats">
          <div>
            <span>接入设备</span>
            <strong>{{ selectedDevices.length }}<small> 台</small></strong>
          </div>
          <div>
            <span>在线设备</span>
            <strong>{{ selectedOnlineCount }}<small> 台</small></strong>
          </div>
          <div>
            <span>告警设备</span>
            <strong :class="{ 'warning-number': selectedWarningCount > 0 }">
              {{ selectedWarningCount }}<small> 台</small>
            </strong>
          </div>
        </div>
        <div v-if="selectedDevices.length" class="building-device-list">
          <div class="building-device-heading">区域设备</div>
          <div v-for="device in selectedDevices" :key="device.id" class="building-device-row">
            <span>{{ device.name }}</span>
            <el-tag
              :type="device.status === 'warning' ? 'warning' : device.status === 'online' ? 'success' : 'info'"
              effect="light"
              size="small"
            >
              {{ device.status === 'warning' ? '告警' : device.status === 'online' ? '在线' : '离线' }}
            </el-tag>
          </div>
        </div>
        <el-empty v-else description="该区域暂无设备数据" :image-size="56" />
      </template>
    </el-dialog>
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
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
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
  background: #050b14;
  isolation: isolate;
}

.scene :deep(canvas) {
  position: absolute;
  z-index: 0;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.scene-grid {
  position: absolute;
  z-index: 1;
  inset: 0;
  background: linear-gradient(180deg, rgba(5, 11, 20, 0.52), transparent 28%, transparent 75%, rgba(5, 11, 20, 0.25));
  pointer-events: none;
}

.scene-label {
  position: absolute;
  z-index: 2;
  top: 12px;
  right: 12px;
  text-align: right;
  pointer-events: none;
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
  margin: 5px 0 3px;
  color: #d9efff;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-shadow: 0 0 20px rgba(68, 229, 255, 0.24);
}

.scene-label p {
  margin: 0;
  color: #6684a6;
  font-size: 9px;
}

.scene-data-status,
.scene-legend {
  position: absolute;
  z-index: 2;
  display: flex;
  align-items: center;
  border: 1px solid rgba(120, 160, 201, 0.18);
  border-radius: 5px;
  background: rgba(5, 17, 34, 0.78);
  color: #9ab2cf;
  font-size: 10px;
  backdrop-filter: blur(8px);
  pointer-events: none;
}

.scene-data-status {
  top: 12px;
  left: 12px;
  min-height: 28px;
  padding: 0 9px;
}

.scene-data-status > span,
.scene-legend > span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.scene-data-status .live-dot,
.loading-dot,
.legend-normal,
.legend-warning {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.scene-warning-count {
  margin-left: 3px;
  color: #ff7584;
  font-weight: 600;
}

.loading-dot {
  background: #44e5ff;
  animation: pulse 1.2s infinite;
}

.scene-error {
  color: #ff8c98;
}

.scene-legend {
  bottom: 12px;
  left: 12px;
  gap: 13px;
  padding: 7px 9px;
}

.legend-normal {
  background: #39d6a3;
  box-shadow: 0 0 8px rgba(57, 214, 163, 0.75);
}

.legend-warning {
  background: #ff465b;
  box-shadow: 0 0 8px rgba(255, 70, 91, 0.8);
}

.scene-coordinates {
  position: absolute;
  z-index: 2;
  right: 14px;
  bottom: 12px;
  color: #567598;
  font-size: 9px;
  letter-spacing: 0.08em;
  pointer-events: none;
}

.scene-corner {
  position: absolute;
  z-index: 2;
  width: 15px;
  height: 15px;
  border-color: rgba(68, 229, 255, 0.52);
  pointer-events: none;
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

.building-status-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px;
  border: 1px solid #cdeee2;
  border-radius: 9px;
  background: #f0faf6;
  color: #217f61;
}

.building-has-warning {
  border-color: #ffe1bd;
  background: #fff8ee;
  color: #b16a16;
}

.building-status-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: rgba(39, 174, 131, 0.12);
  font-size: 18px;
  font-weight: 700;
}

.building-has-warning .building-status-icon {
  background: rgba(230, 161, 60, 0.14);
}

.building-status-banner > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.building-status-banner strong {
  font-size: 14px;
}

.building-status-banner > div > span {
  color: #8492a3;
  font-size: 11px;
}

.building-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 14px;
}

.building-stats > div {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 12px;
  border: 1px solid #edf0f4;
  border-radius: 8px;
  background: #fafbfd;
}

.building-stats span {
  color: #8490a0;
  font-size: 11px;
}

.building-stats strong {
  color: #26364a;
  font-size: 20px;
}

.building-stats small {
  color: #8995a4;
  font-size: 11px;
  font-weight: 400;
}

.building-stats .warning-number {
  color: #dd8b24;
}

.building-device-list {
  margin-top: 18px;
}

.building-device-heading {
  margin-bottom: 8px;
  color: #637185;
  font-size: 12px;
  font-weight: 600;
}

.building-device-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 38px;
  border-bottom: 1px solid #f0f2f5;
  color: #536174;
  font-size: 12px;
}

.building-device-row:last-child {
  border-bottom: 0;
}

.building-device-row :deep(.el-tag) {
  border: 0;
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
  .live-clock {
    display: none;
  }

  .top-actions {
    gap: 6px;
  }

  .back-button {
    gap: 4px;
    padding: 6px 7px;
    font-size: 10px;
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
