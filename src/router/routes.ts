import type { RouteRecordRaw } from 'vue-router'

const Layout = () => import('@/layouts/AdminLayout.vue')

export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { hidden: true, title: '登录' },
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: { hidden: true, title: '无权限' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { hidden: true, title: '未找到' },
  },
]

/**
 * 动态路由：meta.roles 决定谁能看到该菜单。
 * 登录后按角色 filter + router.addRoute，这就是简历上的 RBAC 动态路由。
 */
export const asyncRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Layout',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: {
          title: '工作台',
          icon: 'Odometer',
          roles: ['admin', 'visitor'],
        },
      },
    ],
  },
  {
    path: '/device',
    name: 'DeviceLayout',
    component: Layout,
    redirect: '/device/list',
    meta: { title: '设备中心', icon: 'Monitor', roles: ['admin', 'visitor'] },
    children: [
      {
        path: 'list',
        name: 'DeviceList',
        component: () => import('@/views/device/index.vue'),
        meta: {
          title: '设备管理',
          icon: 'List',
          roles: ['admin'],
        },
      },
      {
        path: 'view',
        name: 'DeviceView',
        component: () => import('@/views/device/index.vue'),
        meta: {
          title: '设备查看',
          icon: 'View',
          roles: ['visitor'],
        },
      },
    ],
  },
  {
    path: '/system',
    name: 'SystemLayout',
    component: Layout,
    redirect: '/system/role',
    meta: { title: '系统管理', icon: 'Setting', roles: ['admin'] },
    children: [
      {
        path: 'role',
        name: 'RolePermission',
        component: () => import('@/views/system/role.vue'),
        meta: {
          title: '角色权限',
          icon: 'UserFilled',
          roles: ['admin'],
        },
      },
    ],
  },
]

