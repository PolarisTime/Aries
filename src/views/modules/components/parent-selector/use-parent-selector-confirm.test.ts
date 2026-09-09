import { describe, expect, it, vi } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import { useParentSelectorConfirm } from './use-parent-selector-confirm'

const { messageMock, getBusinessModuleDetailMock } = vi.hoisted(() => ({
  messageMock: {
    success: vi.fn(),
    error: vi.fn(),
  },
  getBusinessModuleDetailMock: vi.fn((_moduleKey: string, id: string) => ({
    id,
    orderNo: `PO-${id}`,
    items: [{ id: `${id}-1` }],
  })),
}))

vi.mock('@/utils/antd-app', () => ({
  message: messageMock,
}))

vi.mock('@/api/business/business-crud', () => ({
  getBusinessModuleDetail: (
    ...args: Parameters<typeof getBusinessModuleDetailMock>
  ) => getBusinessModuleDetailMock(...args),
}))

const t = (key: string) => key

describe('useParentSelectorConfirm', () => {
  it('selectedSummary 单选无选中行时为空提示', () => {
    const { selectedSummary } = useParentSelectorConfirm({
      parentModuleKey: 'purchase-order',
      selectedRows: [],
      displayFieldKey: 'orderNo',
      allowMultipleSelection: false,
      t,
      onSelect: vi.fn(),
      onClose: vi.fn(),
    })
    expect(selectedSummary).toContain('selectedEmptyHint')
  })

  it('确认导入时专用候选端点直接透传行数据', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    const rows = [{ id: '9001', orderNo: 'PO-001' }] as ModuleRecord[]
    const { handleImportRecords } = useParentSelectorConfirm({
      parentModuleKey: 'purchase-order',
      candidateQueryType: 'purchase-order-import',
      selectedRows: rows,
      displayFieldKey: 'orderNo',
      allowMultipleSelection: false,
      t,
      onSelect,
      onClose,
    })

    await handleImportRecords(rows)

    expect(getBusinessModuleDetailMock).not.toHaveBeenCalled()
    expect(onSelect).toHaveBeenCalledWith(rows)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('普通模块确认导入时按需补全明细再回调', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    const rows = [{ id: '9001', orderNo: 'PO-001' }] as ModuleRecord[]
    const { handleImportRecords } = useParentSelectorConfirm({
      parentModuleKey: 'purchase-order',
      selectedRows: rows,
      displayFieldKey: 'orderNo',
      allowMultipleSelection: false,
      t,
      onSelect,
      onClose,
    })

    await handleImportRecords(rows)

    expect(getBusinessModuleDetailMock).toHaveBeenCalledWith(
      'purchase-order',
      '9001',
    )
    const imported = onSelect.mock.calls[0][0] as ModuleRecord[]
    expect(imported[0].orderNo).toBe('PO-9001')
    expect(imported[0].items).toHaveLength(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('含已删除行时提示失败且不回调 onSelect', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    const rows = [
      { id: '9001', deletedFlag: true },
    ] as unknown as ModuleRecord[]
    const { handleImportRecords } = useParentSelectorConfirm({
      parentModuleKey: 'purchase-order',
      candidateQueryType: 'purchase-order-import',
      selectedRows: rows,
      displayFieldKey: 'orderNo',
      allowMultipleSelection: false,
      t,
      onSelect,
      onClose,
    })

    await handleImportRecords(rows)

    expect(messageMock.error).toHaveBeenCalledWith('modules.importParentFailed')
    expect(onSelect).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('明细解析失败时以异常消息提示且不回调 onSelect', async () => {
    getBusinessModuleDetailMock.mockRejectedValueOnce(new Error('明细加载失败'))
    const onSelect = vi.fn()
    const onClose = vi.fn()
    const rows = [{ id: '9001', orderNo: 'PO-001' }] as ModuleRecord[]
    const { handleImportRecords } = useParentSelectorConfirm({
      parentModuleKey: 'purchase-order',
      selectedRows: rows,
      displayFieldKey: 'orderNo',
      allowMultipleSelection: false,
      t,
      onSelect,
      onClose,
    })

    await handleImportRecords(rows)

    expect(messageMock.error).toHaveBeenCalledWith('明细加载失败')
    expect(onSelect).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
