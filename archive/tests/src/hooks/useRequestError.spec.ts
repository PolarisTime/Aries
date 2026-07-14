import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { errorMock, isCanceledMock, readRequestErrorMock } = vi.hoisted(() => ({
  errorMock: vi.fn(),
  isCanceledMock: vi.fn(),
  readRequestErrorMock: vi.fn(() => ({ handled: false })),
}))

vi.mock('@/utils/antd-app', () => ({
  message: { error: errorMock },
}))

vi.mock('@/api/request-errors', () => ({
  isCanceledRequestError: (...args: unknown[]) => isCanceledMock(...args),
  readRequestError: (...args: unknown[]) => readRequestErrorMock(...args),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

import { useRequestError } from './useRequestError'

describe('useRequestError', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows error message from Error instance', () => {
    const { result } = renderHook(() => useRequestError())
    result.current.showError(new Error('Something went wrong'))
    expect(errorMock).toHaveBeenCalledWith('Something went wrong')
  })

  it('shows error message from string', () => {
    const { result } = renderHook(() => useRequestError())
    result.current.showError('直接错误')
    expect(errorMock).toHaveBeenCalledWith('直接错误')
  })

  it('uses fallback for falsy error', () => {
    const { result } = renderHook(() => useRequestError())
    result.current.showError(null, '默认错误消息')
    expect(errorMock).toHaveBeenCalledWith('默认错误消息')
  })

  it('uses default fallback when none provided', () => {
    const { result } = renderHook(() => useRequestError())
    result.current.showError(null)
    expect(errorMock).toHaveBeenCalledWith('hooks.requestError.requestFailed')
  })

  it('does not show error for canceled request', () => {
    isCanceledMock.mockReturnValue(true)
    const { result } = renderHook(() => useRequestError())
    result.current.showError(new Error('canceled'))
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('does not show an error already handled by the request layer', () => {
    readRequestErrorMock.mockReturnValue({ handled: true })
    const { result } = renderHook(() => useRequestError())

    result.current.showError(new Error('服务暂时不可用'))

    expect(errorMock).not.toHaveBeenCalled()
  })

  it('converts non-Error to string for display', () => {
    const { result } = renderHook(() => useRequestError())
    result.current.showError(42)
    expect(errorMock).toHaveBeenCalledWith('42')
  })

  it('converts object to string for display', () => {
    const { result } = renderHook(() => useRequestError())
    result.current.showError({ custom: 'err' })
    expect(errorMock).toHaveBeenCalledWith('[object Object]')
  })
})
