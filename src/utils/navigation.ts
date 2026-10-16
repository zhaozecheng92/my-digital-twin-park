import type { RouteLocationRaw, Router } from 'vue-router'

export function navigateBack(router: Router, fallback: RouteLocationRaw) {
  const previousPath = router.options.history.state.back
  const currentPath = router.currentRoute.value.fullPath

  if (
    typeof previousPath === 'string' &&
    previousPath !== currentPath &&
    !previousPath.startsWith('/login')
  ) {
    router.back()
    return
  }

  void router.push(fallback)
}