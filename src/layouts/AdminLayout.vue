<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter, type RouteRecordRaw } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const collapsed = ref(false)

const activeMenu = computed(() => route.path)

interface MenuNode {
  fullPath: string
  title: string
  icon?: string
  children?: MenuNode[]
}

function joinPath(parent: string, child: string) {
  if (child.startsWith('/')) return child
  if (parent === '/') return `/${child}`
  return `${parent}/${child}`.replace(/\/+/g, '/')
}

function buildMenus(routes: RouteRecordRaw[], parentPath = ''): MenuNode[] {
  const menus: MenuNode[] = []

  for (const item of routes) {
    if (item.meta?.hidden) continue
    const fullPath = joinPath(parentPath, item.path)
    const children = (item.children ?? []).filter((child) => !child.meta?.hidden)

    if (children.length === 1 && !item.meta?.title) {
      const only = children[0]
      menus.push({
        fullPath: joinPath(fullPath, only.path),
        title: only.meta?.title ?? '未命名',
        icon: only.meta?.icon,
      })
      continue
    }

    if (children.length === 1) {
      const only = children[0]
      menus.push({
        fullPath: joinPath(fullPath, only.path),
        title: only.meta?.title ?? item.meta?.title ?? '未命名',
        icon: only.meta?.icon ?? item.meta?.icon,
      })
      continue
    }

    if (children.length > 1) {
      menus.push({
        fullPath,
        title: item.meta?.title ?? '未命名',
        icon: item.meta?.icon,
        children: buildMenus(children, fullPath),
      })
    }
  }

  return menus
}

const menus = computed(() => buildMenus(userStore.menuRoutes))

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确认退出当前账号？', '退出登录', {
      type: 'warning',
      confirmButtonText: '退出',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  userStore.resetSession()
  const { resetRouter } = await import('@/router')
  resetRouter()
  await router.push('/login')
}
</script>

<template>
  <el-container class="layout">
    <el-aside :width="collapsed ? '64px' : '220px'" class="aside">
      <div class="brand">
        <span class="brand-mark" />
        <span v-show="!collapsed" class="brand-text">孪生园区后台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="collapsed"
        router
        background-color="#0f172a"
        text-color="#cbd5e1"
        active-text-color="#22d3ee"
      >
        <template v-for="menu in menus" :key="menu.fullPath">
          <el-sub-menu v-if="menu.children?.length" :index="menu.fullPath">
            <template #title>
              <el-icon v-if="menu.icon">
                <component :is="menu.icon" />
              </el-icon>
              <span>{{ menu.title }}</span>
            </template>
            <el-menu-item
              v-for="child in menu.children"
              :key="child.fullPath"
              :index="child.fullPath"
            >
              <el-icon v-if="child.icon">
                <component :is="child.icon" />
              </el-icon>
              <span>{{ child.title }}</span>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="menu.fullPath">
            <el-icon v-if="menu.icon">
              <component :is="menu.icon" />
            </el-icon>
            <span>{{ menu.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <el-button text @click="collapsed = !collapsed">
          <el-icon>
            <Fold v-if="!collapsed" />
            <Expand v-else />
          </el-icon>
        </el-button>
        <div class="header-title">{{ route.meta.title }}</div>
        <div class="header-user">
          <el-tag size="small" effect="dark" type="success">{{ userStore.roleLabel }}</el-tag>
          <span>{{ userStore.nickname }}</span>
          <el-button type="danger" link @click="handleLogout">退出</el-button>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout {
  min-height: 100vh;
}

.aside {
  background: #0f172a;
  overflow: hidden;
  transition: width 0.2s ease;
}

.brand {
  height: 60px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  color: #e2e8f0;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.brand-mark {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #22d3ee;
  box-shadow: 0 0 12px #22d3ee;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.header-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.main {
  background: #f3f6fb;
}
</style>
