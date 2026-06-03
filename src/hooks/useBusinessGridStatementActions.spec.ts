import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { useQueryMock, generateBusinessPrimaryNoMock, getBusinessModuleDetailMock,
  saveBusinessModuleMock, listAllStatementCandidatesMock, isDisplaySwitchEnabledMock,
  listDisplaySwitchesMock, buildCustomerStatementDraftDataMock,
  buildSupplierStatementDraftDataMock, buildFreightStatementDraftDataMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn().mockReturnValue({ data: [] }),
  generateBusinessPrimaryNoMock: vi.fn().mockResolvedValue('NO-001'),
  getBusinessModuleDetailMock: vi.fn(),
  saveBusinessModuleMock: vi.fn().mockResolvedValue(undefined),
  listAllStatementCandidatesMock: vi.fn(),
  isDisplaySwitchEnabledMock: vi.fn().mockReturnValue(false),
  listDisplaySwitchesMock: vi.fn().mockResolvedValue([]),
  buildCustomerStatementDraftDataMock: vi.fn().mockReturnValue({}),
  buildSupplierStatementDraftDataMock: vi.fn().mockReturnValue({}),
  buildFreightStatementDraftDataMock: vi.fn().mockReturnValue({}),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
}))

vi.mock('@/api/business', () => ({
  generateBusinessPrimaryNo: generateBusinessPrimaryNoMock,
  getBusinessModuleDetail: getBusinessModuleDetailMock,
  saveBusinessModule: saveBusinessModuleMock,
}))

vi.mock('@/api/statements', () => ({
  listAllStatementCandidates: listAllStatementCandidatesMock,
}))

vi.mock('@/api/system-settings', () => ({
  isDisplaySwitchEnabled: isDisplaySwitchEnabledMock,
  listDisplaySwitches: listDisplaySwitchesMock,
}))

vi.mock('@/module-system/module-adapter-statement-drafts', () => ({
  buildCustomerStatementDraftData: buildCustomerStatementDraftDataMock,
  buildSupplierStatementDraftData: buildSupplierStatementDraftDataMock,
  buildFreightStatementDraftData: buildFreightStatementDraftDataMock,
}))

vi.mock('@/utils/clone-utils', () => ({
  cloneLineItems: vi.fn(),
}))

vi.mock('i18next', () => ({
  default: { t: vi.fn((key: string) => key) },
}))

import { useBusinessGridStatementActions } from './useBusinessGridStatementActions'

describe('useBusinessGridStatementActions', () => {
  const defaultProps = {
    refreshModuleQueries: vi.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    vi.resetAllMocks()
    useQueryMock.mockReturnValue({ data: [] })
  })

  it('returns handleStatementGenerate function', () => {
    const { result } = renderHook(() => useBusinessGridStatementActions(defaultProps))
    expect(result.current.handleStatementGenerate).toBeDefined()
  })

  it('generates supplier statement', async () => {
    const candidates = [
      { id: '1', supplierName: 'Supplier A', inboundDate: '2024-01-15' },
      { id: '2', supplierName: 'Supplier A', inboundDate: '2024-01-20' },
    ]
    listAllStatementCandidatesMock.mockResolvedValue(candidates)
    getBusinessModuleDetailMock.mockResolvedValue({ data: {} })

    const { result } = renderHook(() => useBusinessGridStatementActions(defaultProps))
    await act(async () => {
      await result.current.handleStatementGenerate(
        'supplier',
        'Supplier A',
        '2024-01-01',
        '2024-01-31'
      )
    })

    expect(saveBusinessModuleMock).toHaveBeenCalledWith('supplier-statement', expect.any(Object))
    expect(defaultProps.refreshModuleQueries).toHaveBeenCalled()
  })

  it('generates customer statement', async () => {
    const candidates = [
      { id: '1', customerName: 'Customer A', deliveryDate: '2024-01-15' },
    ]
    listAllStatementCandidatesMock.mockResolvedValue(candidates)
    getBusinessModuleDetailMock.mockResolvedValue({ data: {} })

    const { result } = renderHook(() => useBusinessGridStatementActions(defaultProps))
    await act(async () => {
      await result.current.handleStatementGenerate(
        'customer',
        'Customer A',
        '2024-01-01',
        '2024-01-31'
      )
    })

    expect(saveBusinessModuleMock).toHaveBeenCalledWith('customer-statement', expect.any(Object))
  })

  it('generates freight statement', async () => {
    const candidates = [
      { id: '1', carrierName: 'Carrier A', billTime: '2024-01-15' },
    ]
    listAllStatementCandidatesMock.mockResolvedValue(candidates)
    getBusinessModuleDetailMock.mockResolvedValue({ data: {} })

    const { result } = renderHook(() => useBusinessGridStatementActions(defaultProps))
    await act(async () => {
      await result.current.handleStatementGenerate(
        'freight',
        'Carrier A',
        '2024-01-01',
        '2024-01-31'
      )
    })

    expect(saveBusinessModuleMock).toHaveBeenCalledWith('freight-statement', expect.any(Object))
  })

  it('throws error when no candidate documents found', async () => {
    listAllStatementCandidatesMock.mockResolvedValue([])

    const { result } = renderHook(() => useBusinessGridStatementActions(defaultProps))
    await expect(
      act(async () => {
        await result.current.handleStatementGenerate(
          'supplier',
          'Supplier A',
          '2024-01-01',
          '2024-01-31'
        )
      })
    ).rejects.toThrow()
  })

  it('filters candidates by date range', async () => {
    const candidates = [
      { id: '1', supplierName: 'Supplier A', inboundDate: '2024-01-15' },
      { id: '2', supplierName: 'Supplier A', inboundDate: '2024-02-15' },
    ]
    listAllStatementCandidatesMock.mockResolvedValue(candidates)
    getBusinessModuleDetailMock.mockResolvedValue({ data: {} })

    const { result } = renderHook(() => useBusinessGridStatementActions(defaultProps))
    await act(async () => {
      await result.current.handleStatementGenerate(
        'supplier',
        'Supplier A',
        '2024-01-01',
        '2024-01-31'
      )
    })

    expect(getBusinessModuleDetailMock).toHaveBeenCalledTimes(1)
  })

  it('filters candidates by counterparty name', async () => {
    const candidates = [
      { id: '1', supplierName: 'Supplier A', inboundDate: '2024-01-15' },
      { id: '2', supplierName: 'Supplier B', inboundDate: '2024-01-15' },
    ]
    listAllStatementCandidatesMock.mockResolvedValue(candidates)
    getBusinessModuleDetailMock.mockResolvedValue({ data: {} })

    const { result } = renderHook(() => useBusinessGridStatementActions(defaultProps))
    await act(async () => {
      await result.current.handleStatementGenerate(
        'supplier',
        'Supplier A',
        '2024-01-01',
        '2024-01-31'
      )
    })

    expect(getBusinessModuleDetailMock).toHaveBeenCalledTimes(1)
  })
})
