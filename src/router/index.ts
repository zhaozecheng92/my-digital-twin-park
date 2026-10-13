import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getToken } from '@/utils/storage'
import { constantRoutes } from './routes'

const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes,
})

const whiteList = ['/login', '/403']

router.beforeEach(async (to) => {
  const token = getToken()

  if (!token) {
    if (whiteList.includes(to.path)) return true
    return `/login?redirect=${encodeURIComponent(to.fullPath)}`
  }

  if (to.path === '/login') return '/'

  const userStore = useUserStore()

  if (userStore.routesReady) return true

  try {
    await userStore.fetchUserInfo()
    const accessRoutes = userStore.generateRoutes()
    accessRoutes.forEach((route) => router.addRoute(route))
    return { path: to.fullPath, replace: true }
  } catch {
    userStore.resetSession()
    return '/login'
  }
})

export function resetRouter() {
  for (const name of ['Layout', 'DeviceLayout', 'SystemLayout']) {
    if (router.hasRoute(name)) router.removeRoute(name)
  }
}

export default router
