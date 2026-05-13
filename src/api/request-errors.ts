import axios from 'axios'
import { safe } from '@/utils/type-narrowing'

const FLAG = '__leoRequestErrorHandled'

/** 将 error 标记为已处理，避免重复弹窗 */
export function markHandledRequestError(error: unknown): void {
  if (error && typeof error === 'object') {
    ;(error as Record<string, unknown>)[FLAG] = true
  }
}

/** 检查 error 是否已被标记 */
export function isHandledRequestError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  return (error as Record<string, unknown>)[FLAG] === true
}

/** 检查是否为取消请求错误 */
export function isCanceledRequestError(error: unknown): boolean {
  if (axios.isCancel(error)) return true
  if (!error || typeof error !== 'object') return false

  const s = safe(error as Record<string, unknown>)
  const code = s.str('code')
  const name = s.str('name').trim().toLowerCase()
  const message = s.str('message').trim().toLowerCase()

  return (
    code === 'ERR_CANCELED' ||
    name === 'aborterror' ||
    name === 'cancelederror' ||
    message === 'canceled' ||
    message === 'cancelled' ||
    message === 'the operation was aborted' ||
    message === 'signal is aborted without reason'
  )
}
