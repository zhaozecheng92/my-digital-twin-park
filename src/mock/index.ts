import type { AxiosRequestConfig } from 'axios'
import type {
  ApiResult,
  DeviceForm,
  DeviceItem,
  DeviceQuery,
  LoginPayload,
  PageResult,
  UserInfo,
} from '@/types'
import { ACCOUNT_MAP, createDeviceSeed, roleFromToken, tokenOf } from './data'

let devices: DeviceItem[] = createDeviceSeed()
let nextId = devices.reduce((max, item) => Math.max(max, item.id), 0) + 1

function ok<T>(data: T, message = 'ok'): ApiResult<T> {
  return { code: 200, message, data }
}

function fail(message: string, code = 400): ApiResult<null> {
  return { code, message, data: null }
}

function readBody<T>(config: AxiosRequestConfig): T {
  if (!config.data) return {} as T
  if (typeof config.data === 'string') return JSON.parse(config.data) as T
  return config.data as T
}

function readToken(config: AxiosRequestConfig): string {
  const header = config.headers
  const raw =
    (header?.Authorization as string | undefined) ??
    (header?.authorization as string | undefined) ??
    ''
  return raw.replace(/^Bearer\s+/i, '')
}

function isUserInfo(value: UserInfo | ApiResult<null>): value is UserInfo {
  return 'username' in value
}

function requireUser(config: AxiosRequestConfig): UserInfo | ApiResult<null> {
  const role = roleFromToken(readToken(config))
  if (!role) return fail('登录已过期，请重新登录', 401)
  return ACCOUNT_MAP[role].user
}

function normalizePath(url = ''): string {
  const withoutQuery = url.split('?')[0] ?? ''
  return withoutQuery.replace(/^\/api/, '') || '/'
}

function matchId(path: string, prefix: string): number | null {
  const matched = path.match(new RegExp(`^${prefix}/(\\d+)$`))
  if (!matched?.[1]) return null
  return Number(matched[1])
}

export async function dispatchMock(config: AxiosRequestConfig): Promise<ApiResult> {
  await new Promise((resolve) => setTimeout(resolve, 220))

  const method = (config.method ?? 'get').toUpperCase()
  const path = normalizePath(config.url)

  if (method === 'POST' && path === '/auth/login') {
    const body = readBody<LoginPayload>(config)
    const account = ACCOUNT_MAP[body.username]
    if (!account || account.password !== body.password) {
      return fail('账号或密码错误')
    }
    return ok({ token: tokenOf(account.user.role) })
  }

  if (method === 'GET' && path === '/auth/info') {
    const user = requireUser(config)
    if (!isUserInfo(user)) return user
    return ok(user)
  }

  if (method === 'GET' && path === '/device/list') {
    const user = requireUser(config)
    if (!isUserInfo(user)) return user
    const query = (config.params ?? {}) as DeviceQuery
    const name = (query.name ?? '').trim()
    const status = query.status ?? ''
    const page = Number(query.page ?? 1)
    const pageSize = Number(query.pageSize ?? 10)

    const filtered = devices.filter((item) => {
      const matchName = name ? item.name.includes(name) : true
      const matchStatus = status ? item.status === status : true
      return matchName && matchStatus
    })

    const start = (page - 1) * pageSize
    const result: PageResult<DeviceItem> = {
      list: filtered.slice(start, start + pageSize),
      total: filtered.length,
    }
    return ok(result)
  }

  if (method === 'POST' && path === '/device') {
    const user = requireUser(config)
    if (!isUserInfo(user)) return user
    if (!user.permissions.includes('device:add')) return fail('无权新增设备', 403)
    const body = readBody<DeviceForm>(config)
    const created: DeviceItem = {
      id: nextId++,
      name: body.name.trim(),
      model: body.model.trim(),
      status: body.status,
      area: body.area.trim(),
      createdAt: MockDate(),
    }
    devices.unshift(created)
    return ok(created, '新增成功')
  }

  const updateId = matchId(path, '/device')
  if (method === 'PUT' && updateId !== null) {
    const user = requireUser(config)
    if (!isUserInfo(user)) return user
    if (!user.permissions.includes('device:edit')) return fail('无权编辑设备', 403)
    const target = devices.find((item) => item.id === updateId)
    if (!target) return fail('设备不存在', 404)
    const body = readBody<DeviceForm>(config)
    target.name = body.name.trim()
    target.model = body.model.trim()
    target.status = body.status
    target.area = body.area.trim()
    return ok(target, '更新成功')
  }

  if (method === 'DELETE' && updateId !== null) {
    const user = requireUser(config)
    if (!isUserInfo(user)) return user
    if (!user.permissions.includes('device:delete')) return fail('无权删除设备', 403)
    const exists = devices.some((item) => item.id === updateId)
    if (!exists) return fail('设备不存在', 404)
    devices = devices.filter((item) => item.id !== updateId)
    return ok(true, '删除成功')
  }

  return fail(`未匹配的 Mock 接口：${method} ${path}`, 404)
}

function MockDate(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}
