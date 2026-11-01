// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

type ConfirmParams = Parameters<typeof useParentSelectorConfirm>[0]

describe('useParentSelectorConfirm', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.clearAllMocks()
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  /** 新增 in-flight 状态需要真实 hook 环境：用最小 Probe 组件驱动。 */
  function renderConfirm(overrides: Partial<ConfirmParams> = {}): {
    get result(): ReturnType<typeof useParentSelectorConfirm>
  } {
    let captured!: ReturnType<typeof useParentSelectorConfirm>
    function Probe() {
      captured = useParentSelectorConfirm({
        parentModuleKey: 'purchase-order',
        selectedRows: [],
        displayFieldKey: 'orderNo',
        allowMultipleSelection: false,
        t,
        onSelect: vi.fn(),
        onClose: vi.fn(),
        ...overrides,
      })
      return null
    }
    act(() => {
      root.render(createElement(Probe))
    })
    return {
      get result() {
        return captured
      },
    }
  }

  it('selectedSummary 单选无选中行时为空提示', () => {
    const hook = renderConfirm()
    expect(hook.result.selectedSummary).toContain('selectedEmptyHint')
  })

  it('确认导入时专用候选端点直接透传行数据', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    const rows = [{ id: '9001', orderNo: 'PO-001' }] as ModuleRecord[]
    const hook = renderConfirm({
      candidateQueryType: 'purchase-order-import',
      selectedRows: rows,
      onSelect,
      onClose,
    })

    await act(async () => {
      await hook.result.handleImportRecords(rows)
    })

    expect(getBusinessModuleDetailMock).not.toHaveBeenCalled()
    expect(onSelect).toHaveBeenCalledWith(rows)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('普通模块确认导入时按需补全明细再回调', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    const rows = [{ id: '9001', orderNo: 'PO-001' }] as ModuleRecord[]
    const hook = renderConfirm({ selectedRows: rows, onSelect, onClose })

    await act(async () => {
      await hook.result.handleImportRecords(rows)
    })

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
    const hook = renderConfirm({
      candidateQueryType: 'purchase-order-import',
      selectedRows: rows,
      onSelect,
      onClose,
    })

    await act(async () => {
      await hook.result.handleImportRecords(rows)
    })

    expect(messageMock.error).toHaveBeenCalledWith('common.importParentFailed')
    expect(onSelect).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('明细解析失败时以异常消息提示且不回调 onSelect', async () => {
    getBusinessModuleDetailMock.mockRejectedValueOnce(new Error('明细加载失败'))
    const onSelect = vi.fn()
    const onClose = vi.fn()
    const rows = [{ id: '9001', orderNo: 'PO-001' }] as ModuleRecord[]
    const hook = renderConfirm({ selectedRows: rows, onSelect, onClose })

    await act(async () => {
      await hook.result.handleImportRecords(rows)
    })

    expect(messageMock.error).toHaveBeenCalledWith('明细加载失败')
    expect(onSelect).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('导入进行中 importing=true，结束后复位', async () => {
    let resolveDetail!: (value: ModuleRecord) => void
    getBusinessModuleDetailMock.mockImplementationOnce(
      () =>
        new Promise<ModuleRecord>((resolve) => {
          resolveDetail = resolve
        }) as never,
    )
    const onSelect = vi.fn()
    const onClose = vi.fn()
    const rows = [{ id: '9001', orderNo: 'PO-001' }] as ModuleRecord[]
    const hook = renderConfirm({ selectedRows: rows, onSelect, onClose })

    let pending!: Promise<void>
    act(() => {
      pending = hook.result.handleImportRecords(rows)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(hook.result.importing).toBe(true)

    await act(async () => {
      resolveDetail({ id: '9001', orderNo: 'PO-9001', items: [{ id: 'x' }] })
      await pending
    })
    expect(hook.result.importing).toBe(false)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('连点两次确认只执行一次（第二次被 in-flight 守卫忽略）', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    const rows = [{ id: '9001', orderNo: 'PO-001' }] as ModuleRecord[]
    const hook = renderConfirm({
      candidateQueryType: 'purchase-order-import',
      selectedRows: rows,
      onSelect,
      onClose,
    })

    await act(async () => {
      await Promise.all([
        hook.result.handleImportRecords(rows),
        hook.result.handleImportRecords(rows),
      ])
    })

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('等 onSelect 真正落地后才关闭弹层（导入中关闭会看到"关闭后仍回填"）', async () => {
    const events: string[] = []
    let finishImport!: () => void
    const onSelect = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          events.push('import:start')
          finishImport = () => {
            events.push('import:done')
            resolve()
          }
        }),
    )
    const onClose = vi.fn(() => {
      events.push('close')
    })
    const rows = [{ id: '9001', orderNo: 'PO-001' }] as ModuleRecord[]
    const hook = renderConfirm({
      candidateQueryType: 'purchase-order-import',
      selectedRows: rows,
      onSelect,
      onClose,
    })

    let pending!: Promise<void>
    act(() => {
      pending = hook.result.handleImportRecords(rows)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(onClose).not.toHaveBeenCalled()

    await act(async () => {
      finishImport()
      await pending
    })
    expect(events).toEqual(['import:start', 'import:done', 'close'])
  })

  it('导入落地失败（onSelect 抛错）时不关闭弹层', async () => {
    const onSelect = vi.fn(() => Promise.reject(new Error('回填失败')))
    const onClose = vi.fn()
    const rows = [{ id: '9001', orderNo: 'PO-001' }] as ModuleRecord[]
    const hook = renderConfirm({
      candidateQueryType: 'purchase-order-import',
      selectedRows: rows,
      onSelect,
      onClose,
    })

    await act(async () => {
      await hook.result.handleImportRecords(rows)
    })

    expect(onClose).not.toHaveBeenCalled()
    expect(messageMock.error).toHaveBeenCalledWith('回填失败')
    expect(hook.result.importing).toBe(false)
  })
})
