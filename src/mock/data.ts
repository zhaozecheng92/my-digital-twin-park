import Mock from 'mockjs'
import type { DeviceItem, UserInfo, UserRole } from '@/types'

const AREAS = ['A区入口', 'B区车间', 'C区仓储', 'D区能源站']
const MODELS = ['CAM-X200', 'TH-88Pro', 'GW-360', 'AC-Lite']
const STATUSES = ['online', 'offline', 'warning']
const DEVICE_NAMES = ['环境监测器', '智能路灯', '巡检机器人', '水位传感器', '能源计量表']

export const ACCOUNT_MAP: Record<
  string,
  { password: string; user: UserInfo }
> = {
  admin: {
    password: '123456',
    user: {
      id: 1,
      username: 'admin',
      nickname: '系统管理员',
      role: 'admin',
      roles: ['admin'],
      permissions: ['device:add', 'device:edit', 'device:delete'],
      avatar: '',
    },
  },
  visitor: {
    password: '123456',
    user: {
      id: 2,
      username: 'visitor',
      nickname: '园区访客',
      role: 'visitor',
      roles: ['visitor'],
      permissions: [],
      avatar: '',
    },
  },
}

export function tokenOf(role: UserRole): string {
  return `mock-${role}-token`
}

export function roleFromToken(token: string): UserRole | null {
  if (token === tokenOf('admin')) return 'admin'
  if (token === tokenOf('visitor')) return 'visitor'
  return null
}

export function createDeviceSeed(): DeviceItem[] {
  const { list } = Mock.mock({
    'list|16': [
      {
        'id|+1': 1,
        name: () => `${Mock.Random.pick(DEVICE_NAMES)}${Mock.Random.natural(1, 99)}`,
        model: () =>
          `${Mock.Random.pick(MODELS)}-${Mock.mock('@string("upper", 2)')}`,
        status: () => Mock.Random.pick(STATUSES),
        area: () => Mock.Random.pick(AREAS),
        createdAt: () => Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
      },
    ],
  }) as { list: DeviceItem[] }

  return list
}
