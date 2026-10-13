/** 设备名：2-32 位中文/字母/数字/下划线/短横线 */
export const DEVICE_NAME_PATTERN = /^[\u4e00-\u9fa5a-zA-Z0-9_-]{2,32}$/

/** 型号：字母或数字开头，2-20 位，允许点、下划线、短横线 */
export const DEVICE_MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{1,19}$/

/** 所属区域：2-20 位中文/字母/数字/下划线/短横线 */
export const DEVICE_AREA_PATTERN = /^[\u4e00-\u9fa5a-zA-Z0-9_-]{2,20}$/

export function isValidDeviceName(value: string): boolean {
  return DEVICE_NAME_PATTERN.test(value.trim())
}

export function isValidDeviceModel(value: string): boolean {
  return DEVICE_MODEL_PATTERN.test(value.trim())
}

export function isValidDeviceArea(value: string): boolean {
  return DEVICE_AREA_PATTERN.test(value.trim())
}
