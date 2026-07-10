import axios from 'axios'
import { safe } from '@/utils/type-narrowing'

const FLAG = '__leoRequestErrorHandled'

export interface RequestError extends Error {
  status?: number
  code?: number
  traceId?: string
}

export interface RequestErrorMetadata {
  status?: number
  code?: number
  traceId?: string
  handled: boolean
}

function readFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }
  return value
}

/** 读取规范化请求错误中的传输层与业务错误信息。 */
export function readRequestError(error: unknown): RequestErrorMetadata {
  if (!error || typeof error !== 'object') {
    return { handled: false }
  }

  const source = error as Record<string, unknown>
  const traceId =
    typeof source.traceId === 'string' && source.traceId.trim()
      ? source.traceId
      : undefined

  return {
    status: readFiniteNumber(source.status),
    code: readFiniteNumber(source.code),
    traceId,
    handled: source[FLAG] === true,
  }
}

/** 判断 Error 是否携带由请求层保留的结构化元数据。 */
export function isRequestError(error: unknown): error is RequestError {
  if (!(error instanceof Error)) {
    return false
  }

  const metadata = readRequestError(error)
  return (
    metadata.status !== undefined ||
    metadata.code !== undefined ||
    metadata.traceId !== undefined ||
    metadata.handled
  )
}

/** 将 error 标记为已处理，避免重复弹窗 */
export function markHandledRequestError(error: unknown): void {
  if (error && typeof error === 'object') {
    ;(error as Record<string, unknown>)[FLAG] = true
  }
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
