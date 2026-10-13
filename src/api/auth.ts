import request from '@/utils/request'
import type { ApiResult, LoginPayload, LoginResult, UserInfo } from '@/types'

export function loginApi(data: LoginPayload) {
  return request.post<ApiResult<LoginResult>, ApiResult<LoginResult>>(
    '/auth/login',
    data,
  )
}

export function getUserInfoApi() {
  return request.get<ApiResult<UserInfo>, ApiResult<UserInfo>>('/auth/info')
}
