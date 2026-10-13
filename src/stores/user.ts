import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { getUserInfoApi, loginApi } from '@/api/auth'
import { asyncRoutes } from '@/router/routes'
import { filterAsyncRoutes } from '@/router/permission'
import type { LoginPayload, UserInfo, UserRole } from '@/types'
import { getToken, removeToken, setToken } from '@/utils/storage'

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken())
  const userInfo = ref<UserInfo | null>(null)
  const menuRoutes = ref<RouteRecordRaw[]>([])
  const routesReady = ref(false)

  const roles = computed<UserRole[]>(() => userInfo.value?.roles ?? [])
  const permissions = computed(() => userInfo.value?.permissions ?? [])
  const nickname = computed(() => userInfo.value?.nickname ?? '')
  const roleLabel = computed(() =>
    userInfo.value?.role === 'admin' ? '管理员' : '访客',
  )

  function hasPermission(code: string): boolean {
    return permissions.value.includes(code)
  }

  async function login(payload: LoginPayload) {
    const res = await loginApi(payload)
    token.value = res.data.token
    setToken(res.data.token)
  }

  async function fetchUserInfo() {
    const res = await getUserInfoApi()
    userInfo.value = res.data
    return res.data
  }

  function generateRoutes() {
    const accessed = filterAsyncRoutes(asyncRoutes, roles.value)
    menuRoutes.value = accessed
    routesReady.value = true
    return accessed
  }

  function resetSession() {
    token.value = ''
    userInfo.value = null
    menuRoutes.value = []
    routesReady.value = false
    removeToken()
  }

  return {
    token,
    userInfo,
    menuRoutes,
    routesReady,
    roles,
    permissions,
    nickname,
    roleLabel,
    hasPermission,
    login,
    fetchUserInfo,
    generateRoutes,
    resetSession,
  }
})
