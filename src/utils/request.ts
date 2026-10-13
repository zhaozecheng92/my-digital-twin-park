import axios, { type AxiosAdapter } from 'axios'
import { ElMessage } from 'element-plus'
import { dispatchMock } from '@/mock'
import type { ApiResult } from '@/types'
import { getToken, removeToken } from './storage'

const service = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

const mockAdapter: AxiosAdapter = async (config) => {
  const payload = await dispatchMock(config)
  return {
    data: payload,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }
}

service.defaults.adapter = mockAdapter

service.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

service.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiResult
    if (payload.code !== 200) {
      ElMessage.error(payload.message || '请求失败')
      if (payload.code === 401) {
        removeToken()
        window.location.assign('/login')
      }
      return Promise.reject(new Error(payload.message || '请求失败'))
    }
    return payload as never
  },
  (error: unknown) => {
    ElMessage.error('网络异常，请稍后重试')
    return Promise.reject(error)
  },
)

export default service
