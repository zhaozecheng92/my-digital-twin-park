export type UserRole = 'admin' | 'visitor'

export type DeviceStatus = 'online' | 'offline' | 'warning'

export interface ApiResult<T = unknown> {
  code: number
  message: string
  data: T
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResult {
  token: string
}

export interface UserInfo {
  id: number
  username: string
  nickname: string
  role: UserRole
  roles: UserRole[]
  permissions: string[]
  avatar: string
}

export interface DeviceItem {
  id: number
  name: string
  model: string
  status: DeviceStatus
  area: string
  createdAt: string
}

export interface DeviceQuery {
  name?: string
  status?: DeviceStatus | ''
  page?: number
  pageSize?: number
}

export interface PageResult<T> {
  list: T[]
  total: number
}

export interface DeviceForm {
  id?: number
  name: string
  model: string
  status: DeviceStatus
  area: string
}
