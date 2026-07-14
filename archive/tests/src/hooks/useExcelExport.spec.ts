import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { exportModuleDataMock, messageSuccessMock, messageErrorMock, tMock } =
  vi.hoisted(() => ({
    exportModuleDataMock: vi.fn(),
    messageSuccessMock: vi.fn(),
    messageErrorMock: vi.fn(),
    tMock: vi.fn((key: string) => key),
  }))

vi.mock('@/api/common-export', () => ({
  exportModuleData: exportModuleDataMock,
}))

vi.mock('@/utils/antd-app', () => ({
  message: { success: messageSuccessMock, error: messageErrorMock },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: tMock }),
}))

import { useExcelExport } from './useExcelExport'

describe('useExcelExport', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('initializes with exporting false', () => {
    const { result } = renderHook(() => useExcelExport('sales-order'))
    expect(result.current.exporting).toBe(false)
  })

  it('sets exporting to true during export', async () => {
    exportModuleDataMock.mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() => useExcelExport('sales-order'))
    act(() => {
      result.current.handleExport()
    })

    expect(result.current.exporting).toBe(true)
  })

  it('sets exporting to false after successful export', async () => {
    exportModuleDataMock.mockResolvedValue(undefined)

    const { result } = renderHook(() => useExcelExport('sales-order'))
    await act(async () => {
      await result.current.handleExport()
    })

    expect(result.current.exporting).toBe(false)
  })

  it('shows success message after successful export', async () => {
    exportModuleDataMock.mockResolvedValue(undefined)

    const { result } = renderHook(() => useExcelExport('sales-order'))
    await act(async () => {
      await result.current.handleExport()
    })

    expect(messageSuccessMock).toHaveBeenCalledWith(
      'hooks.excelExport.exportSuccess',
    )
  })

  it('sets exporting to false after failed export', async () => {
    exportModuleDataMock.mockRejectedValue(new Error('Export failed'))

    const { result } = renderHook(() => useExcelExport('sales-order'))
    await act(async () => {
      await result.current.handleExport()
    })

    expect(result.current.exporting).toBe(false)
  })

  it('shows error message with error details on failure', async () => {
    exportModuleDataMock.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useExcelExport('sales-order'))
    await act(async () => {
      await result.current.handleExport()
    })

    expect(messageErrorMock).toHaveBeenCalledWith('Network error')
  })

  it('shows default error message for non-Error failures', async () => {
    exportModuleDataMock.mockRejectedValue('Unknown error')

    const { result } = renderHook(() => useExcelExport('sales-order'))
    await act(async () => {
      await result.current.handleExport()
    })

    expect(messageErrorMock).toHaveBeenCalledWith(
      'hooks.excelExport.exportFailed',
    )
  })

  it('calls exportModuleData with correct module and params', async () => {
    exportModuleDataMock.mockResolvedValue(undefined)
    const params = { status: 'pending', page: 1 }

    const { result } = renderHook(() => useExcelExport('sales-order'))
    await act(async () => {
      await result.current.handleExport(params)
    })

    expect(exportModuleDataMock).toHaveBeenCalledWith('sales-order', params)
  })

  it('uses empty params as default', async () => {
    exportModuleDataMock.mockResolvedValue(undefined)

    const { result } = renderHook(() => useExcelExport('sales-order'))
    await act(async () => {
      await result.current.handleExport()
    })

    expect(exportModuleDataMock).toHaveBeenCalledWith('sales-order', {})
  })
})
