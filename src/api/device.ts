import request from '@/utils/request'
import type { ApiResult, DeviceForm, DeviceItem, DeviceQuery, PageResult } from '@/types'

export function fetchDeviceList(params: DeviceQuery) {
  return request.get<ApiResult<PageResult<DeviceItem>>, ApiResult<PageResult<DeviceItem>>>(
    '/device/list',
    { params },
  )
}

export function createDevice(data: DeviceForm) {
  return request.post<ApiResult<DeviceItem>, ApiResult<DeviceItem>>('/device', data)
}

export function updateDevice(id: number, data: DeviceForm) {
  return request.put<ApiResult<DeviceItem>, ApiResult<DeviceItem>>(`/device/${id}`, data)
}

export function deleteDevice(id: number) {
  return request.delete<ApiResult<boolean>, ApiResult<boolean>>(`/device/${id}`)
}
