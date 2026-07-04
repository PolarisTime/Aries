import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  useRuntimeConfigMock,
  generateBusinessPrimaryNoMock,
  getBusinessModuleDetailMock,
  saveBusinessModuleMock,
  listAllStatementCandidatesMock,
  buildCustomerStatementDraftDataMock,
  buildSupplierStatementDraftDataMock,
  buildFreightStatementDraftDataMock,
} = vi.hoisted(() => ({
  useRuntimeConfigMock: vi.fn(),
  generateBusinessPrimaryNoMock: vi.fn().mockResolvedValue('NO-001'),
  getBusinessModuleDetailMock: vi.fn(),
  saveBusinessModuleMock: vi.fn().mockResolvedValue(undefined),
  listAllStatementCandidatesMock: vi.fn(),
  buildCustomerStatementDraftDataMock: vi.fn().mockReturnValue({}),
  buildSupplierStatementDraftDataMock: vi.fn().mockReturnValue({}),
  buildFreightStatementDraftDataMock: vi.fn().mockReturnValue({}),
}))

vi.mock('@/hooks/useRuntimeConfig', () => ({
  useRuntimeConfig: useRuntimeConfigMock,
}))

vi.mock('@/api/business', () => ({
  generateBusinessPrimaryNo: generateBusinessPrimaryNoMock,
  getBusinessModuleDetail: getBusinessModuleDetailMock,
  saveBusinessModule: saveBusinessModuleMock,
}))

vi.mock('@/api/statements', () => ({
  listAllStatementCandidates: listAllStatementCandidatesMock,
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
  const runtimeConfig = {
    business: {
      statement: {
        customerReceiptAmountZero: true,
        supplierFullPayment: true,
      },
    },
  }

  const defaultProps = {
    refreshModuleQueries: vi.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    vi.resetAllMocks()
    useRuntimeConfigMock.mockReturnValue({ data: runtimeConfig })
  })

  it('returns handleStatementGenerate function', () => {
    const { result } = renderHook(() =>
      useBusinessGridStatementActions(defaultProps),
    )
    expect(result.current.handleStatementGenerate).toBeDefined()
  })

  it('loads runtime config instead of display switches', () => {
    renderHook(() => useBusinessGridStatementActions(defaultProps))

    expect(useRuntimeConfigMock).toHaveBeenCalledTimes(1)
  })

  it('generates supplier statement', async () => {
    const candidates = [
      { id: '1', supplierName: 'Supplier A', inboundDate: '2024-01-15' },
      { id: '2', supplierName: 'Supplier A', inboundDate: '2024-01-20' },
    ]
    listAllStatementCandidatesMock.mockResolvedValue(candidates)
    getBusinessModuleDetailMock.mockResolvedValue({ data: {} })

    const { result } = renderHook(() =>
      useBusinessGridStatementActions(defaultProps),
    )
    await act(async () => {
      await result.current.handleStatementGenerate(
        'supplier',
        'Supplier A',
        '2024-01-01',
        '2024-01-31',
      )
    })

    expect(saveBusinessModuleMock).toHaveBeenCalledWith(
      'supplier-statement',
      expect.any(Object),
    )
    const draftOptions = buildSupplierStatementDraftDataMock.mock.calls[0]?.[0]
    expect(draftOptions.defaultFullPayment).toBe(true)
    expect(draftOptions.buildLineItemId()).toMatch(/^draft-supplier-\d+-0$/)
    expect(draftOptions.buildLineItemId()).toMatch(/^draft-supplier-\d+-1$/)
    expect(defaultProps.refreshModuleQueries).toHaveBeenCalled()
  })

  it('generates customer statement', async () => {
    const candidates = [
      { id: '1', customerName: 'Customer A', deliveryDate: '2024-01-15' },
    ]
    listAllStatementCandidatesMock.mockResolvedValue(candidates)
    getBusinessModuleDetailMock.mockResolvedValue({ data: {} })

    const { result } = renderHook(() =>
      useBusinessGridStatementActions(defaultProps),
    )
    await act(async () => {
      await result.current.handleStatementGenerate(
        'customer',
        'Customer A',
        '2024-01-01',
        '2024-01-31',
      )
    })

    expect(saveBusinessModuleMock).toHaveBeenCalledWith(
      'customer-statement',
      expect.any(Object),
    )
    const draftOptions = buildCustomerStatementDraftDataMock.mock.calls[0]?.[0]
    expect(draftOptions.defaultReceiptAmountZero).toBe(true)
  })

  it('generates freight statement', async () => {
    const candidates = [
      { id: '1', carrierName: 'Carrier A', billTime: '2024-01-15' },
    ]
    listAllStatementCandidatesMock.mockResolvedValue(candidates)
    getBusinessModuleDetailMock.mockResolvedValue({ data: {} })

    const { result } = renderHook(() =>
      useBusinessGridStatementActions(defaultProps),
    )
    await act(async () => {
      await result.current.handleStatementGenerate(
        'freight',
        'Carrier A',
        '2024-01-01',
        '2024-01-31',
      )
    })

    expect(saveBusinessModuleMock).toHaveBeenCalledWith(
      'freight-statement',
      expect.any(Object),
    )
  })

  it('throws error when no candidate documents found', async () => {
    listAllStatementCandidatesMock.mockResolvedValue([])

    const { result } = renderHook(() =>
      useBusinessGridStatementActions(defaultProps),
    )
    await expect(
      act(async () => {
        await result.current.handleStatementGenerate(
          'supplier',
          'Supplier A',
          '2024-01-01',
          '2024-01-31',
        )
      }),
    ).rejects.toThrow()
  })

  it('filters candidates by date range', async () => {
    const candidates = [
      { id: '1', supplierName: 'Supplier A', inboundDate: '2024-01-15' },
      { id: '2', supplierName: 'Supplier A', inboundDate: '2024-02-15' },
    ]
    listAllStatementCandidatesMock.mockResolvedValue(candidates)
    getBusinessModuleDetailMock.mockResolvedValue({ data: {} })

    const { result } = renderHook(() =>
      useBusinessGridStatementActions(defaultProps),
    )
    await act(async () => {
      await result.current.handleStatementGenerate(
        'supplier',
        'Supplier A',
        '2024-01-01',
        '2024-01-31',
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

    const { result } = renderHook(() =>
      useBusinessGridStatementActions(defaultProps),
    )
    await act(async () => {
      await result.current.handleStatementGenerate(
        'supplier',
        'Supplier A',
        '2024-01-01',
        '2024-01-31',
      )
    })

    expect(getBusinessModuleDetailMock).toHaveBeenCalledTimes(1)
  })
})
