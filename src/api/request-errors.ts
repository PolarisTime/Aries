import axios from 'axios'

const HANDLED_REQUEST_ERROR_FLAG = '__leoRequestErrorHandled'

export function markHandledRequestError(error: unknown) {
  if (error && typeof error === 'object') {
    ;(error as Record<string, unknown>)[HANDLED_REQUEST_ERROR_FLAG] = true
  }
}

export function isHandledRequestError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      (error as Record<string, unknown>)[HANDLED_REQUEST_ERROR_FLAG] === true,
  )
}

export function isCanceledRequestError(error: unknown) {
  if (axios.isCancel(error)) {
    return true
  }

  if (!error || typeof error !== 'object') {
    return false
  }

  const code = String((error as Record<string, unknown>).code || '')
  const name = String((error as Record<string, unknown>).name || '')
  const message = String((error as Record<string, unknown>).message || '')
    .trim()
    .toLowerCase()

  return (
    code === 'ERR_CANCELED' ||
    name === 'AbortError' ||
    name === 'CanceledError' ||
    message === 'canceled' ||
    message === 'cancelled' ||
    message === 'the operation was aborted' ||
    message === 'signal is aborted without reason'
  )
}
