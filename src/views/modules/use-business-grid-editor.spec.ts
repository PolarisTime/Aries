import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getBusinessModuleDetail,
  listAllBusinessModuleRows,
} from '@/api/business'
import { getModuleConfig } from '@/api/module-contracts'
import { getBehaviorValue } from '@/module-system/module-behavior-registry'
import { useBusinessGridEditor } from '@/views/modules/use-business-grid-editor'

vi.mock('@/api/business', () => ({
  getBusinessModuleDetail: vi.fn(),
  listAllBusinessModuleRows: vi.fn(),
}))

vi.mock('@/api/module-contracts', () => ({
  getModuleConfig: vi.fn(),
}))

vi.mock('@/module-system/module-behavior-registry', () => ({
  getBehaviorValue: vi.fn(),
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (v: unknown) => String(v ?? ''),
}))

const getBusinessModuleDetailMock = vi.mocked(getBusinessModuleDetail)
const listAllBusinessModuleRowsMock = vi.mocked(listAllBusinessModuleRows)
const getModuleConfigMock = vi.mocked(getModuleConfig)
const getBehaviorValueMock = vi.mocked(getBehaviorValue)

describe('useBusinessGridEditor', () => {
  const defaultProps = {
    moduleKey: 'test-module',
    config: {
      readOnly: false,
      itemColumns: [],
    },
  }

  const detailProps = {
    ...defaultProps,
    config: {
      ...defaultProps.config,
      itemColumns: [{ key: 'sku', label: 'SKU' }],
    },
  }

  const useLockBehavior = () => {
    getBehaviorValueMock.mockImplementation((_moduleKey, key) => {
      const values = {
        lineItemLockSourceModule: 'sales-outbound',
        lineItemLockSourceField: 'salesOrderNo',
        lineItemLockTargetField: 'orderNo',
      }
      return values[key as keyof typeof values]
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    getModuleConfigMock.mockReturnValue({ readOnly: false })
    getBehaviorValueMock.mockReturnValue(undefined)
    getBusinessModuleDetailMock.mockResolvedValue({
      data: { id: 'detail-id', name: 'Detail' },
    })
    listAllBusinessModuleRowsMock.mockResolvedValue([])
  })

  it('returns initial state and exposes editor actions', () => {
    const { result } = renderHook(() => useBusinessGridEditor(defaultProps))

    expect(result.current.editorOpen).toBe(false)
    expect(result.current.editRecord).toBeNull()
    expect(result.current.editorLockRelatedRows).toEqual([])
    expect(result.current.editorLockLoading).toBe(false)
    expect(typeof result.current.openEditor).toBe('function')
    expect(typeof result.current.closeEditor).toBe('function')
    expect(typeof result.current.handleSaved).toBe('function')
  })

  it('opens editor with a record without fetching detail when item columns are absent', async () => {
    const record = { id: '1', name: 'Test' }
    const { result } = renderHook(() => useBusinessGridEditor(defaultProps))

    await act(async () => {
      await result.current.openEditor(record)
    })

    expect(result.current.editorOpen).toBe(true)
    expect(result.current.editRecord).toBe(record)
    expect(result.current.editorLockLoading).toBe(false)
    expect(getModuleConfigMock).toHaveBeenCalledWith('test-module')
    expect(getBusinessModuleDetailMock).not.toHaveBeenCalled()
    expect(listAllBusinessModuleRowsMock).not.toHaveBeenCalled()
  })

  it('opens editor for a new record and resets stale lock state', async () => {
    useLockBehavior()
    listAllBusinessModuleRowsMock.mockResolvedValue([{ id: 'locked-row' }])
    const { result } = renderHook(() => useBusinessGridEditor(defaultProps))

    await act(async () => {
      await result.current.openEditor({ id: '1', orderNo: 'SO-001' })
    })
    expect(result.current.editorLockRelatedRows).toEqual([{ id: 'locked-row' }])

    await act(async () => {
      await result.current.openEditor(null)
    })

    expect(result.current.editorOpen).toBe(true)
    expect(result.current.editRecord).toBeNull()
    expect(result.current.editorLockRelatedRows).toEqual([])
    expect(result.current.editorLockLoading).toBe(false)
  })

  it('closes editor and clears current record and related rows', async () => {
    useLockBehavior()
    listAllBusinessModuleRowsMock.mockResolvedValue([{ id: 'locked-row' }])
    const { result } = renderHook(() => useBusinessGridEditor(defaultProps))

    await act(async () => {
      await result.current.openEditor({ id: '1', orderNo: 'SO-001' })
    })

    act(() => {
      result.current.closeEditor()
    })

    expect(result.current.editorOpen).toBe(false)
    expect(result.current.editRecord).toBeNull()
    expect(result.current.editorLockRelatedRows).toEqual([])
  })

  it('clears lock rows after save while keeping the editor open record', async () => {
    useLockBehavior()
    listAllBusinessModuleRowsMock.mockResolvedValue([{ id: 'locked-row' }])
    const record = { id: '1', orderNo: 'SO-001' }
    const { result } = renderHook(() => useBusinessGridEditor(defaultProps))

    await act(async () => {
      await result.current.openEditor(record)
    })

    act(() => {
      result.current.handleSaved()
    })

    expect(result.current.editorOpen).toBe(true)
    expect(result.current.editRecord).toBe(record)
    expect(result.current.editorLockRelatedRows).toEqual([])
  })

  it('loads lock related rows by configured source fields and trims target value', async () => {
    useLockBehavior()
    const relatedRows = [{ id: 'source-row' }]
    listAllBusinessModuleRowsMock.mockResolvedValue(relatedRows)
    const { result } = renderHook(() => useBusinessGridEditor(defaultProps))

    await act(async () => {
      await result.current.openEditor({ id: '1', orderNo: ' SO-001 ' })
    })

    expect(listAllBusinessModuleRowsMock).toHaveBeenCalledWith(
      'sales-outbound',
      { salesOrderNo: 'SO-001' },
    )
    expect(result.current.editorLockRelatedRows).toBe(relatedRows)
  })

  it.each([
    ['source module', undefined, 'salesOrderNo', 'orderNo'],
    ['source field', 'sales-outbound', undefined, 'orderNo'],
    ['target field', 'sales-outbound', 'salesOrderNo', undefined],
  ])('skips lock row loading when %s behavior is missing', async (_label, sourceModule, sourceField, targetField) => {
    getBehaviorValueMock.mockImplementation((_moduleKey, key) => {
      const values = {
        lineItemLockSourceModule: sourceModule,
        lineItemLockSourceField: sourceField,
        lineItemLockTargetField: targetField,
      }
      return values[key as keyof typeof values]
    })
    const { result } = renderHook(() => useBusinessGridEditor(defaultProps))

    await act(async () => {
      await result.current.openEditor({ id: '1', orderNo: 'SO-001' })
    })

    expect(listAllBusinessModuleRowsMock).not.toHaveBeenCalled()
    expect(result.current.editorLockRelatedRows).toEqual([])
  })

  it('skips lock row loading when target value is empty after normalization', async () => {
    useLockBehavior()
    const { result } = renderHook(() => useBusinessGridEditor(defaultProps))

    await act(async () => {
      await result.current.openEditor({ id: '1', orderNo: '   ' })
    })

    expect(listAllBusinessModuleRowsMock).not.toHaveBeenCalled()
    expect(result.current.editorLockRelatedRows).toEqual([])
  })

  it('fetches detail when item columns exist and the record has no line items', async () => {
    getBusinessModuleDetailMock.mockResolvedValue({
      data: { id: '1', name: 'Detail', items: [{ id: 'item-1' }] },
    })
    const { result } = renderHook(() => useBusinessGridEditor(detailProps))

    await act(async () => {
      await result.current.openEditor({ id: '1', name: 'Summary' })
    })

    expect(getBusinessModuleDetailMock).toHaveBeenCalledWith('test-module', '1')
    expect(result.current.editRecord).toEqual({
      id: '1',
      name: 'Detail',
      items: [{ id: 'item-1' }],
    })
  })

  it('uses the summary record when endpoint is read-only', async () => {
    getModuleConfigMock.mockReturnValue({ readOnly: true })
    const record = { id: '1', name: 'Readonly summary' }
    const { result } = renderHook(() => useBusinessGridEditor(detailProps))

    await act(async () => {
      await result.current.openEditor(record)
    })

    expect(result.current.editRecord).toBe(record)
    expect(getBusinessModuleDetailMock).not.toHaveBeenCalled()
  })

  it('uses the summary record when detail fetch is required but line items are already present', async () => {
    const record = { id: '1', items: [{ id: 'item-1' }] }
    const { result } = renderHook(() => useBusinessGridEditor(detailProps))

    await act(async () => {
      await result.current.openEditor(record)
    })

    expect(result.current.editRecord).toBe(record)
    expect(getBusinessModuleDetailMock).not.toHaveBeenCalled()
  })

  it.each([
    { id: '' },
    { id: 0 },
  ])('uses the summary record when record id is empty: %o', async (record) => {
    const { result } = renderHook(() => useBusinessGridEditor(detailProps))

    await act(async () => {
      await result.current.openEditor(record)
    })

    expect(result.current.editRecord).toBe(record)
    expect(getBusinessModuleDetailMock).not.toHaveBeenCalled()
  })

  it('does not apply stale async open results after a newer open starts', async () => {
    let resolveDetail:
      | ((value: { data: { id: string; name: string } }) => void)
      | undefined
    getBusinessModuleDetailMock.mockReturnValue(
      new Promise((resolve) => {
        resolveDetail = resolve
      }),
    )
    const { result } = renderHook(() => useBusinessGridEditor(detailProps))

    let staleOpen: Promise<void> | undefined
    await act(async () => {
      staleOpen = result.current.openEditor({ id: 'stale' })
    })
    expect(result.current.editorLockLoading).toBe(true)

    await act(async () => {
      await result.current.openEditor(null)
    })

    await act(async () => {
      resolveDetail?.({ data: { id: 'stale', name: 'Stale detail' } })
      await staleOpen
    })

    expect(result.current.editorOpen).toBe(true)
    expect(result.current.editRecord).toBeNull()
    expect(result.current.editorLockRelatedRows).toEqual([])
    expect(result.current.editorLockLoading).toBe(false)
  })

  it('rethrows loading failures and leaves loading state for the failed version', async () => {
    const error = new Error('detail failed')
    getBusinessModuleDetailMock.mockRejectedValue(error)
    const { result } = renderHook(() => useBusinessGridEditor(detailProps))

    await act(async () => {
      await expect(result.current.openEditor({ id: '1' })).rejects.toThrow(
        error,
      )
    })

    expect(result.current.editorOpen).toBe(false)
    expect(result.current.editRecord).toBeNull()
    expect(result.current.editorLockLoading).toBe(true)
  })
})
