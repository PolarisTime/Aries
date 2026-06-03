import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { listAllBusinessModuleRowsMock, messageInfoMock, modalInfoMock, tMock } = vi.hoisted(() => ({
  listAllBusinessModuleRowsMock: vi.fn(),
  messageInfoMock: vi.fn(),
  modalInfoMock: vi.fn(),
  tMock: vi.fn((key: string) => key),
}))

vi.mock('@/api/business', () => ({
  listAllBusinessModuleRows: listAllBusinessModuleRowsMock,
}))

vi.mock('@/utils/antd-app', () => ({
  message: { info: messageInfoMock },
  modal: { info: modalInfoMock },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: tMock }),
}))

import { useBusinessGridFreightActions } from './useBusinessGridFreightActions'

describe('useBusinessGridFreightActions', () => {
  const defaultProps = {
    submittedFilters: { status: 'pending' },
    formatCellValue: vi.fn((value: unknown, type?: string) => {
      if (type === 'weight') return `${value} kg`
      if (type === 'amount') return `¥${value}`
      return String(value)
    }),
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns openFreightSummary function', () => {
    const { result } = renderHook(() => useBusinessGridFreightActions(defaultProps))
    expect(result.current.openFreightSummary).toBeDefined()
  })

  it('shows info message when no freight data', async () => {
    listAllBusinessModuleRowsMock.mockResolvedValue([])

    const { result } = renderHook(() => useBusinessGridFreightActions(defaultProps))
    await act(async () => {
      await result.current.openFreightSummary()
    })

    expect(messageInfoMock).toHaveBeenCalledWith('hooks.freightActions.noFreightData')
  })

  it('shows modal with freight summary when data exists', async () => {
    const rows = [
      { totalWeight: 100, totalFreight: 500, paidAmount: 300 },
      { totalWeight: 200, totalFreight: 800, paidAmount: 600 },
    ]
    listAllBusinessModuleRowsMock.mockResolvedValue(rows)

    const { result } = renderHook(() => useBusinessGridFreightActions(defaultProps))
    await act(async () => {
      await result.current.openFreightSummary()
    })

    expect(modalInfoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'hooks.freightActions.freightSummaryTitle',
        width: 720,
      })
    )
  })

  it('calculates totals correctly', async () => {
    const rows = [
      { totalWeight: 100, totalFreight: 500, paidAmount: 300 },
      { totalWeight: 200, totalFreight: 800, paidAmount: 600 },
    ]
    listAllBusinessModuleRowsMock.mockResolvedValue(rows)

    const { result } = renderHook(() => useBusinessGridFreightActions(defaultProps))
    await act(async () => {
      await result.current.openFreightSummary()
    })

    expect(defaultProps.formatCellValue).toHaveBeenCalledWith(300, 'weight')
    expect(defaultProps.formatCellValue).toHaveBeenCalledWith(1300, 'amount')
    expect(defaultProps.formatCellValue).toHaveBeenCalledWith(900, 'amount')
  })

  it('handles missing values in rows', async () => {
    const rows = [
      { totalWeight: null, totalFreight: undefined, paidAmount: 0 },
      { totalWeight: 100, totalFreight: 500, paidAmount: null },
    ]
    listAllBusinessModuleRowsMock.mockResolvedValue(rows)

    const { result } = renderHook(() => useBusinessGridFreightActions(defaultProps))
    await act(async () => {
      await result.current.openFreightSummary()
    })

    expect(defaultProps.formatCellValue).toHaveBeenCalledWith(100, 'weight')
    expect(defaultProps.formatCellValue).toHaveBeenCalledWith(500, 'amount')
  })

  it('calculates unpaid amount correctly', async () => {
    const rows = [
      { totalFreight: 1000, paidAmount: 300, unpaidAmount: 700 },
      { totalFreight: 500, paidAmount: 500, unpaidAmount: 0 },
    ]
    listAllBusinessModuleRowsMock.mockResolvedValue(rows)

    const { result } = renderHook(() => useBusinessGridFreightActions(defaultProps))
    await act(async () => {
      await result.current.openFreightSummary()
    })

    expect(defaultProps.formatCellValue).toHaveBeenCalledWith(700, 'amount')
  })

  it('uses totalFreight - paidAmount when unpaidAmount is missing', async () => {
    const rows = [
      { totalFreight: 1000, paidAmount: 300 },
      { totalFreight: 500, paidAmount: 200 },
    ]
    listAllBusinessModuleRowsMock.mockResolvedValue(rows)

    const { result } = renderHook(() => useBusinessGridFreightActions(defaultProps))
    await act(async () => {
      await result.current.openFreightSummary()
    })

    expect(defaultProps.formatCellValue).toHaveBeenCalledWith(1000, 'amount')
  })
})
