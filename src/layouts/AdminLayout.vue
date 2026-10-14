<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter, type RouteRecordRaw } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const activeMenu = computed(() => {
  if (route.path.startsWith('/device/detail/')) {
    return userStore.roles.includes('admin') ? '/device/list' : '/device/view'
  }
  return route.path
})

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
    <el-header class="header">
      <router-link class="brand" to="/">
        <span class="brand-mark" />
        <span class="brand-text">孪生园区后台</span>
      </router-link>
      <el-menu
        :default-active="activeMenu"
        mode="horizontal"
        router
        background-color="transparent"
        text-color="#475569"
        active-text-color="#4f70e8"
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
      <div class="header-user">
        <el-tag size="small" effect="plain" type="primary">{{ userStore.roleLabel }}</el-tag>
        <span class="user-name">{{ userStore.nickname }}</span>
        <el-button type="danger" link @click="handleLogout">退出</el-button>
      </div>
    </el-header>
    <el-main class="main">
      <div class="workspace">
        <router-view />
      </div>
    </el-main>
  </el-container>
</template>

<style scoped>
.layout {
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #f2f3ff;
}

.brand {
  height: 64px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #334155;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
  text-decoration: none;
}

.brand-mark {
  width: 10px;
  flex: 0 0 10px;
  height: 10px;
  border-radius: 50%;
  background: #7188f5;
  box-shadow: 0 0 0 5px rgba(113, 136, 245, 0.12);
}

.brand-text {
  font-size: 15px;
}

.header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 24px;
  height: 64px;
  padding: 0 28px;
  background: rgba(255, 255, 255, 0.82);
  border-bottom: 1px solid #e7e9f4;
  backdrop-filter: blur(16px);
}

.header :deep(.el-menu) {
  min-width: 0;
  flex: 1;
  height: 64px;
  border-bottom: none;
  background: transparent;
}

.header :deep(.el-menu--horizontal > .el-menu-item),
.header :deep(.el-menu--horizontal > .el-sub-menu .el-sub-menu__title) {
  height: 64px;
  line-height: 64px;
  border-bottom-width: 2px;
  font-size: 14px;
}

.header :deep(.el-menu--horizontal > .el-menu-item.is-active),
.header :deep(.el-menu--horizontal > .el-sub-menu.is-active .el-sub-menu__title) {
  color: #4f70e8;
  border-bottom-color: #7188f5;
}

.header-user {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #475569;
  font-size: 13px;
}

.main {
  display: flex;
  flex: 1;
  min-height: 0;
  width: 100%;
  padding: 10px;
  overflow: auto;
  background: #f2f3ff;
}

.workspace {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 7px;
  border: 1px solid #eceef8;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 5px 20px rgba(73, 82, 146, 0.045);
}

@media (max-width: 900px) {
  .header {
    gap: 14px;
    padding: 0 16px;
  }

  .brand {
    gap: 8px;
  }

  .brand-text {
    font-size: 14px;
  }

  .header-user {
    gap: 7px;
  }

  .user-name {
    display: none;
  }

  .main {
    padding: 14px;
  }

  .workspace {
    flex: 1;
    padding: 14px;
  }
}

@media (max-width: 600px) {
  .header {
    gap: 8px;
    padding: 0 10px;
  }

  .brand-text {
    max-width: 90px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header :deep(.el-menu) {
    overflow-x: auto;
    overflow-y: hidden;
  }

  .header :deep(.el-menu--horizontal) {
    width: 0;
  }

  .header :deep(.el-menu--horizontal > .el-menu-item),
  .header :deep(.el-menu--horizontal > .el-sub-menu .el-sub-menu__title) {
    padding: 0 10px;
    font-size: 12px;
  }

  .header-user {
    gap: 4px;
  }

  .header-user :deep(.el-tag) {
    display: none;
  }

  .main {
    padding: 10px;
  }

  .workspace {
    min-height: 0;
    padding: 10px;
    border-radius: 10px;
  }
}
</style>
