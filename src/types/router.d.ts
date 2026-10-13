import 'vue-router'
import type { UserRole } from './index'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    icon?: string
    hidden?: boolean
    roles?: UserRole[]
  }
}
