import type { RouteRecordRaw } from 'vue-router'
import type { UserRole } from '@/types'

export function hasRoutePermission(roles: UserRole[], route: RouteRecordRaw): boolean {
  const allow = route.meta?.roles
  if (!allow || allow.length === 0) return true
  return roles.some((role) => allow.includes(role))
}

export function filterAsyncRoutes(
  routes: RouteRecordRaw[],
  roles: UserRole[],
): RouteRecordRaw[] {
  const accessed: RouteRecordRaw[] = []

  for (const route of routes) {
    const cloned: RouteRecordRaw = { ...route }
    if (!hasRoutePermission(roles, cloned)) continue

    if (cloned.children?.length) {
      cloned.children = filterAsyncRoutes(cloned.children, roles)
      if (cloned.children.length === 0) continue
      if (cloned.redirect && cloned.children[0]) {
        const parentPath = cloned.path === '/' ? '' : cloned.path
        cloned.redirect = `${parentPath}/${cloned.children[0].path}`.replace(
          /\/+/g,
          '/',
        )
      }
    }

    accessed.push(cloned)
  }

  return accessed
}
