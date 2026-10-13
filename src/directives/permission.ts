import type { App, DirectiveBinding } from 'vue'
import { useUserStore } from '@/stores/user'

export function setupPermissionDirective(app: App) {
  app.directive('permission', {
    mounted(el: HTMLElement, binding: DirectiveBinding<string>) {
      const userStore = useUserStore()
      if (!userStore.hasPermission(binding.value)) {
        el.parentElement?.removeChild(el)
      }
    },
  })
}
