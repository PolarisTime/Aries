// @vitest-environment jsdom
import dayjs from 'dayjs'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/authStore'
import { message, modal } from '@/utils/antd-app'
import { type SheetsStore, useSheetsStore } from './useSheetsStore'

const api = vi.hoisted(() => ({
  fetchQuoteSheets: vi.fn(),
  fetchQuoteSheet: vi.fn(),
  createQuoteSheet: vi.fn(),
  updateQuoteSheet: vi.fn(),
  deleteQuoteSheet: vi.fn(),
  updateQuoteSheetHeader: vi.fn(),
  addQuoteSheetItem: vi.fn(),
  updateQuoteSheetItem: vi.fn(),
  deleteQuoteSheetItem: vi.fn(),
  fetchQuoteProjectConfig: vi.fn(),
  saveQuoteProjectConfig: vi.fn(),
  acquireQuoteSheetEditLock: vi.fn(),
  fetchQuoteSheetEditLock: vi.fn(),
  releaseQuoteSheetEditLock: vi.fn(),
}))

vi.mock('@/api/market/quote-sheets', () => ({
  fetchQuoteSheets: api.fetchQuoteSheets,
  fetchQuoteSheet: api.fetchQuoteSheet,
  createQuoteSheet: api.createQuoteSheet,
  updateQuoteSheet: api.updateQuoteSheet,
  deleteQuoteSheet: api.deleteQuoteSheet,
  updateQuoteSheetHeader: api.updateQuoteSheetHeader,
  addQuoteSheetItem: api.addQuoteSheetItem,
  updateQuoteSheetItem: api.updateQuoteSheetItem,
  deleteQuoteSheetItem: api.deleteQuoteSheetItem,
}))

vi.mock('@/api/market/quote-edit-locks', () => ({
  acquireQuoteSheetEditLock: api.acquireQuoteSheetEditLock,
  fetchQuoteSheetEditLock: api.fetchQuoteSheetEditLock,
  releaseQuoteSheetEditLock: api.releaseQuoteSheetEditLock,
}))

vi.mock('@/api/market/quote-project-configs', () => ({
  fetchQuoteProjectConfig: api.fetchQuoteProjectConfig,
  saveQuoteProjectConfig: api.saveQuoteProjectConfig,
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    destroy: vi.fn(),
  },
  modal: {
    confirm: vi.fn(),
  },
}))

function sheetRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: '9001',
    sheetNo: '9001',
    name: '批次 1',
    projectId: '100',
    projectName: '云潮筝鸣府',
    orderDate: '2026-09-16',
    refDate: '2026-09-16',
    refPeriod: '上午',
    lengthPremium: 30,
    locked: false,
    status: '报价',
    version: '0',
    brands: [{ brandName: '中天', freight: 30, sortOrder: 0 }],
    items: [
      {
        id: '7001',
        category: '螺纹钢',
        material: 'HRB400',
        spec: 12,
        length: '9米',
        prices: [
          {
            brandName: '中天',
            spotPrice: 3200,
            supplierId: '5001',
            supplierName: '杭州物资',
          },
        ],
      },
    ],
    ...overrides,
  }
}

const configRecord = {
  projectId: '100',
  lengthPremium: 30,
  hrb400eFallback: false,
  products: [],
  designatedBrands: [],
  version: '0',
  brands: [{ brandName: '中天', freight: 30, categories: [], sortOrder: 0 }],
}

describe('useSheetsStore 服务端数据源', () => {
  let container: HTMLDivElement
  let root: Root
  let rootUnmounted: boolean

  beforeEach(() => {
    vi.useFakeTimers()
    rootUnmounted = false
    api.fetchQuoteSheets.mockReset().mockResolvedValue([sheetRecord()])
    api.fetchQuoteSheet.mockReset().mockResolvedValue(sheetRecord())
    api.createQuoteSheet.mockReset()
    api.updateQuoteSheet.mockReset().mockResolvedValue(sheetRecord())
    api.deleteQuoteSheet.mockReset().mockResolvedValue(undefined)
    api.updateQuoteSheetHeader
      .mockReset()
      .mockResolvedValue(sheetRecord({ version: '1' }))
    api.addQuoteSheetItem.mockReset().mockResolvedValue({
      item: {
        id: '7002',
        category: '螺纹钢',
        material: 'HRB400E',
        spec: 12,
        length: '9米',
        prices: [],
      },
      version: '1',
    })
    api.updateQuoteSheetItem.mockReset().mockResolvedValue({
      item: {
        id: '7001',
        category: '螺纹钢',
        material: 'HRB400E',
        spec: 12,
        length: '9米',
        prices: [],
      },
      version: '1',
    })
    api.deleteQuoteSheetItem.mockReset().mockResolvedValue({ version: '1' })
    api.acquireQuoteSheetEditLock.mockReset().mockResolvedValue({
      sheetId: '9001',
      locked: true,
      mine: true,
      ttlSeconds: 120,
    })
    api.fetchQuoteSheetEditLock.mockReset().mockResolvedValue({
      sheetId: '9001',
      locked: false,
      mine: false,
      ttlSeconds: 120,
    })
    api.releaseQuoteSheetEditLock.mockReset().mockResolvedValue(undefined)
    api.fetchQuoteProjectConfig.mockReset().mockResolvedValue(configRecord)
    api.saveQuoteProjectConfig.mockReset().mockResolvedValue(configRecord)
    vi.mocked(modal.confirm).mockReset()
    vi.mocked(message.info).mockReset()
    useAuthStore.setState({ token: 'token', isAuthenticated: true })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    if (!rootUnmounted) act(() => root.unmount())
    container.remove()
    vi.useRealTimers()
  })

  function renderStore(routeActive = true) {
    let result!: SheetsStore
    function Probe({ active }: { active: boolean }) {
      result = useSheetsStore({ routeActive: active })
      return null
    }
    act(() => {
      root.render(createElement(Probe, { active: routeActive }))
    })
    return {
      get current() {
        return result
      },
      setRouteActive(next: boolean) {
        act(() => {
          root.render(createElement(Probe, { active: next }))
        })
      },
    }
  }

  async function hydrate(store: { current: SheetsStore }) {
    await act(async () => {
      await Promise.resolve()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })
    return store
  }

  it('从服务端加载单据与项目配置, 不回填 localStorage', async () => {
    const store = renderStore()
    await hydrate(store)

    expect(api.fetchQuoteSheets).toHaveBeenCalledTimes(1)
    expect(store.current.loading).toBe(false)
    expect(store.current.sheets).toHaveLength(1)
    expect(store.current.active.name).toBe('批次 1')
    expect(store.current.rows).toHaveLength(1)
    expect(store.current.config.brands).toHaveLength(1)
    expect(localStorage.getItem('aries-price-compare-v5')).toBeNull()
  })

  it('表头变更后防抖只发头字段(不携带 brands/items)', async () => {
    const store = renderStore()
    await hydrate(store)

    act(() => {
      store.current.patchSheet(store.current.activeId, { locked: true })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(api.updateQuoteSheetHeader).toHaveBeenCalledTimes(1)
    const [id, payload] = api.updateQuoteSheetHeader.mock.calls[0] as [
      string,
      { locked: boolean; brands?: unknown; items?: unknown },
    ]
    expect(id).toBe('9001')
    expect(payload.locked).toBe(true)
    expect(payload.brands).toBeUndefined()
    expect(payload.items).toBeUndefined()
  })

  it('供应商随现货价一并走行级保存', async () => {
    const store = renderStore()
    await hydrate(store)

    const inputKey = `中天:${store.current.rows[0].id}`
    act(() => {
      store.current.patchSheet(store.current.activeId, {
        inputs: {
          [inputKey]: {
            spot: 3200,
            supplierId: '5002',
            supplierName: '沙钢贸易',
          },
        },
      })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(api.updateQuoteSheetItem).toHaveBeenCalledTimes(1)
    const [, itemId, payload] = api.updateQuoteSheetItem.mock.calls[0] as [
      string,
      string,
      { prices: { supplierId?: string }[] },
    ]
    expect(itemId).toBe('7001')
    expect(payload.prices[0].supplierId).toBe('5002')
  })

  it('不完整单据不触发保存', async () => {
    api.fetchQuoteSheets.mockResolvedValue([])
    const store = renderStore()
    await hydrate(store)

    act(() => {
      store.current.patchSheet(store.current.activeId, { refPeriod: '下午' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
    })

    expect(api.createQuoteSheet).not.toHaveBeenCalled()
    expect(api.updateQuoteSheet).not.toHaveBeenCalled()
  })

  it('表头保存携带 If-Match 版本号并回填新版本', async () => {
    api.updateQuoteSheetHeader.mockResolvedValue(sheetRecord({ version: '1' }))
    const store = renderStore()
    await hydrate(store)
    expect(store.current.active.version).toBe('0')

    act(() => {
      store.current.patchSheet(store.current.activeId, { locked: true })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    const [, , expectedVersion] = api.updateQuoteSheetHeader.mock.calls[0] as [
      string,
      unknown,
      string,
    ]
    expect(expectedVersion).toBe('0')
    expect(store.current.active.version).toBe('1')
  })

  it('行删除调用行级删除端点并携带 If-Match', async () => {
    const store = renderStore()
    await hydrate(store)

    act(() => {
      store.current.setRows((list) => list.filter((row) => row.id !== '7001'))
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(api.deleteQuoteSheetItem).toHaveBeenCalledTimes(1)
    expect(api.deleteQuoteSheetItem.mock.calls[0]).toEqual([
      '9001',
      '7001',
      '0',
    ])
  })

  it('新增行调用行级新增端点', async () => {
    const store = renderStore()
    await hydrate(store)

    act(() => {
      store.current.setRows((list) => [
        ...list,
        {
          id: 'local1',
          category: '螺纹钢',
          material: 'HRB400E',
          spec: 12,
          length: '9米',
        },
      ])
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(api.addQuoteSheetItem).toHaveBeenCalledTimes(1)
    expect(api.addQuoteSheetItem.mock.calls[0][0]).toBe('9001')
  })

  it('行级写后回填服务端权威版本而非本地 +1 猜测', async () => {
    api.updateQuoteSheetItem.mockResolvedValue({
      item: {
        id: '7001',
        category: '螺纹钢',
        material: 'HRB400E',
        spec: 12,
        length: '9米',
        prices: [],
      },
      version: '7',
    })
    const store = renderStore()
    await hydrate(store)
    expect(store.current.active.version).toBe('0')

    const inputKey = `中天:${store.current.rows[0].id}`
    act(() => {
      store.current.patchSheet(store.current.activeId, {
        inputs: { [inputKey]: { spot: 3300 } },
      })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(api.updateQuoteSheetItem).toHaveBeenCalledTimes(1)
    expect(store.current.active.version).toBe('7')
  })

  it('保存遇到他人签出锁冲突时提示并进入只读(不弹版本冲突窗)', async () => {
    api.updateQuoteSheetHeader.mockRejectedValue({ status: 409, code: 4090 })
    api.fetchQuoteSheetEditLock.mockResolvedValue({
      sheetId: '9001',
      locked: true,
      mine: false,
      ownerName: '李四',
      ttlSeconds: 120,
    })
    const store = renderStore()
    await hydrate(store)

    act(() => {
      store.current.patchSheet(store.current.activeId, { locked: true })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(vi.mocked(message.warning)).toHaveBeenCalled()
    expect(vi.mocked(modal.confirm)).not.toHaveBeenCalled()
    expect(store.current.readOnly).toBe(true)
    expect(store.current.editLock?.ownerName).toBe('李四')
  })

  it('保存冲突时提示并支持重新加载丢弃本地改动', async () => {
    api.updateQuoteSheetHeader.mockRejectedValue({ status: 412, code: 4120 })
    const store = renderStore()
    await hydrate(store)

    act(() => {
      store.current.patchSheet(store.current.activeId, { locked: true })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(vi.mocked(modal.confirm)).toHaveBeenCalledTimes(1)
    expect(store.current.conflict).toEqual({
      kind: 'sheet',
      id: store.current.activeId,
    })

    api.fetchQuoteSheet.mockResolvedValue(sheetRecord({ locked: false }))
    const options = vi.mocked(modal.confirm).mock.calls[0][0] as {
      onCancel: () => Promise<void>
    }
    await act(async () => {
      await options.onCancel()
    })

    expect(store.current.conflict).toBeNull()
    expect(store.current.active.locked).toBe(false)
  })

  it('同一资源连续两次 409 只弹一次冲突弹窗', async () => {
    api.updateQuoteSheetHeader.mockRejectedValue({ status: 412, code: 4120 })
    const store = renderStore()
    await hydrate(store)

    act(() => {
      store.current.patchSheet(store.current.activeId, { locked: true })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })
    expect(vi.mocked(modal.confirm)).toHaveBeenCalledTimes(1)

    act(() => {
      store.current.patchSheet(store.current.activeId, { name: '批次 1 改' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(vi.mocked(modal.confirm)).toHaveBeenCalledTimes(1)
    expect(store.current.conflict).toEqual({
      kind: 'sheet',
      id: store.current.activeId,
    })
  })

  it('以我的覆盖成功后回填最新版本且不重发旧版本', async () => {
    api.updateQuoteSheetHeader.mockRejectedValue({ status: 412, code: 4120 })
    const store = renderStore()
    await hydrate(store)

    act(() => {
      store.current.patchSheet(store.current.activeId, { locked: true })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })
    expect(vi.mocked(modal.confirm)).toHaveBeenCalledTimes(1)

    api.fetchQuoteSheet.mockResolvedValue(sheetRecord({ version: '5' }))
    api.updateQuoteSheet.mockResolvedValue(sheetRecord({ version: '6' }))
    const options = vi.mocked(modal.confirm).mock.calls[0][0] as {
      onOk: () => Promise<void>
    }
    await act(async () => {
      await options.onOk()
    })

    expect(api.updateQuoteSheet).toHaveBeenCalledTimes(1)
    expect(api.updateQuoteSheet.mock.calls[0][2]).toBe('5')
    expect(store.current.active.version).toBe('6')
    expect(vi.mocked(modal.confirm)).toHaveBeenCalledTimes(1)
    expect(store.current.conflict).toBeNull()
  })

  it('以我的覆盖仍冲突时保留同一弹窗且重试一次', async () => {
    api.updateQuoteSheetHeader.mockRejectedValue({ status: 412, code: 4120 })
    const store = renderStore()
    await hydrate(store)

    act(() => {
      store.current.patchSheet(store.current.activeId, { locked: true })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })
    expect(vi.mocked(modal.confirm)).toHaveBeenCalledTimes(1)

    api.fetchQuoteSheet.mockResolvedValue(sheetRecord({ version: '5' }))
    api.updateQuoteSheet.mockRejectedValue({ status: 412, code: 4120 })
    const options = vi.mocked(modal.confirm).mock.calls[0][0] as {
      onOk: () => Promise<void>
    }
    await act(async () => {
      try {
        await options.onOk()
      } catch {
        // 预期仍冲突: onOk 抛错以保持弹窗打开
      }
    })

    expect(api.updateQuoteSheet).toHaveBeenCalledTimes(2)
    expect(vi.mocked(modal.confirm)).toHaveBeenCalledTimes(1)
    expect(store.current.conflict).not.toBeNull()
  })

  it('聚焦时无未保存改动则静默刷新', async () => {
    const store = renderStore()
    await hydrate(store)
    api.fetchQuoteSheets.mockClear()

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(api.fetchQuoteSheets).toHaveBeenCalledTimes(1)
  })

  it('聚焦时存在未保存改动仅提示不覆盖本地', async () => {
    const store = renderStore()
    await hydrate(store)
    act(() => {
      store.current.patchSheet(store.current.activeId, { locked: true })
    })
    api.fetchQuoteSheets.mockClear()
    vi.mocked(message.info).mockClear()

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(api.fetchQuoteSheets).not.toHaveBeenCalled()
    expect(vi.mocked(message.info)).toHaveBeenCalled()
  })

  it('签出成功标记为我正在编辑且可编辑', async () => {
    const store = renderStore()
    await hydrate(store)
    await act(async () => {
      await store.current.acquireEditLock()
    })

    expect(api.acquireQuoteSheetEditLock).toHaveBeenCalledWith(
      '9001',
      undefined,
    )
    expect(store.current.editLock?.mine).toBe(true)
    expect(store.current.readOnly).toBe(false)
  })

  it('被他人签出时只读并显示对方名称', async () => {
    api.acquireQuoteSheetEditLock.mockRejectedValue({ status: 409, code: 4090 })
    api.fetchQuoteSheetEditLock.mockResolvedValue({
      sheetId: '9001',
      locked: true,
      mine: false,
      ownerName: '李四',
      ttlSeconds: 120,
    })
    const store = renderStore()
    await hydrate(store)
    await act(async () => {
      await store.current.acquireEditLock()
    })

    expect(store.current.readOnly).toBe(true)
    expect(store.current.editLock?.ownerName).toBe('李四')
  })

  it('释放编辑锁调用 DELETE 并清除状态', async () => {
    const store = renderStore()
    await hydrate(store)
    await act(async () => {
      await store.current.acquireEditLock()
      await store.current.releaseEditLock()
    })

    expect(api.releaseQuoteSheetEditLock).toHaveBeenCalledWith('9001')
    expect(store.current.editLock).toBeNull()
  })

  it('接管走二次确认弹窗', async () => {
    const store = renderStore()
    await hydrate(store)
    act(() => {
      void store.current.takeoverEditLock()
    })

    expect(vi.mocked(modal.confirm)).toHaveBeenCalled()
  })

  it('本地新建单据落库后聚焦刷新不重复且不再次创建', async () => {
    api.createQuoteSheet.mockResolvedValue(
      sheetRecord({ id: '9002', name: '批次 2' }),
    )
    const store = renderStore()
    await hydrate(store)

    act(() => {
      store.current.addSheet(
        '100',
        '云潮筝鸣府',
        '2026-09-16',
        '2026-09-16',
        '上午',
      )
    })
    const localId = store.current.activeId
    expect(store.current.sheets).toHaveLength(2)

    act(() => {
      store.current.setRows((list) =>
        list.map((row) => ({
          ...row,
          category: '螺纹钢',
          material: 'HRB400E',
          spec: 12,
          length: '9米',
        })),
      )
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })
    expect(api.createQuoteSheet).toHaveBeenCalledTimes(1)

    api.fetchQuoteSheets.mockResolvedValue([
      sheetRecord(),
      sheetRecord({ id: '9002', name: '批次 2' }),
    ])
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
    })

    const ids = store.current.sheets.map((sheet) => sheet.id)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
    expect(ids).toContain('9001')
    expect(ids).toContain('9002')
    expect(ids).not.toContain(localId)
    expect(api.createQuoteSheet).toHaveBeenCalledTimes(1)
  })

  it('刷新列表缺少已创建单据时保留本地单据与本地→服务端映射', async () => {
    api.createQuoteSheet.mockResolvedValue(
      sheetRecord({ id: '9002', name: '批次 2' }),
    )
    const store = renderStore()
    await hydrate(store)

    act(() => {
      store.current.addSheet(
        '100',
        '云潮筝鸣府',
        '2026-09-16',
        '2026-09-16',
        '上午',
      )
    })
    const localId = store.current.activeId
    act(() => {
      store.current.setRows((list) =>
        list.map((row) => ({
          ...row,
          category: '螺纹钢',
          material: 'HRB400E',
          spec: 12,
          length: '9米',
        })),
      )
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })
    expect(api.createQuoteSheet).toHaveBeenCalledTimes(1)

    // 服务端列表暂未包含新单据(陈旧): 本地单据应保留而不是被丢弃
    api.fetchQuoteSheets.mockResolvedValue([sheetRecord()])
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(store.current.sheets.map((sheet) => sheet.id)).toContain(localId)

    // 映射仍保留: 再次编辑走更新(9002)而不是重新创建
    act(() => {
      store.current.patchSheet(localId, { name: '批次 2 改' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })
    expect(api.createQuoteSheet).toHaveBeenCalledTimes(1)
    expect(api.updateQuoteSheetHeader).toHaveBeenCalledTimes(1)
    expect(api.updateQuoteSheetHeader.mock.calls[0][0]).toBe('9002')
  })

  it('冲突弹窗打开期间刷新不覆盖本地改动且仍可覆盖', async () => {
    api.updateQuoteSheetHeader.mockRejectedValue({ status: 412, code: 4120 })
    const store = renderStore()
    await hydrate(store)

    act(() => {
      store.current.patchSheet(store.current.activeId, { name: '本地改名' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })
    expect(vi.mocked(modal.confirm)).toHaveBeenCalledTimes(1)
    expect(store.current.active.name).toBe('本地改名')

    api.fetchQuoteSheets.mockClear()
    api.fetchQuoteSheets.mockResolvedValue([
      sheetRecord({ name: '服务端改名' }),
    ])
    api.fetchQuoteProjectConfig.mockClear()
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(api.fetchQuoteSheets).not.toHaveBeenCalled()
    expect(api.fetchQuoteProjectConfig).not.toHaveBeenCalled()
    expect(store.current.active.name).toBe('本地改名')

    api.fetchQuoteSheet.mockResolvedValue(sheetRecord({ version: '5' }))
    api.updateQuoteSheet.mockResolvedValue(sheetRecord({ version: '6' }))
    const options = vi.mocked(modal.confirm).mock.calls[0][0] as {
      onOk: () => Promise<void>
    }
    await act(async () => {
      await options.onOk()
    })
    expect(api.updateQuoteSheet).toHaveBeenCalledTimes(1)
    const payload = api.updateQuoteSheet.mock.calls[0][1] as { name: string }
    expect(payload.name).toBe('本地改名')
    expect(store.current.conflict).toBeNull()
  })

  it('刷新 await 期间的新编辑不会被覆盖', async () => {
    const store = renderStore()
    await hydrate(store)

    let resolveFetch!: (value: unknown) => void
    api.fetchQuoteSheets.mockClear()
    api.fetchQuoteSheets.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
    })
    expect(api.fetchQuoteSheets).toHaveBeenCalledTimes(1)

    act(() => {
      store.current.patchSheet(store.current.activeId, { name: '等待中改名' })
    })

    await act(async () => {
      resolveFetch([sheetRecord({ name: '服务端改名' })])
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(store.current.active.name).toBe('等待中改名')
  })

  it('表头保存返回 428 时进入版本冲突处理而非泛化报错', async () => {
    api.updateQuoteSheetHeader.mockRejectedValue({ status: 428, code: 4280 })
    const store = renderStore()
    await hydrate(store)
    vi.mocked(message.error).mockClear()

    act(() => {
      store.current.patchSheet(store.current.activeId, { locked: true })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(vi.mocked(modal.confirm)).toHaveBeenCalledTimes(1)
    expect(store.current.conflict).toEqual({
      kind: 'sheet',
      id: store.current.activeId,
    })
    expect(vi.mocked(message.error)).not.toHaveBeenCalled()
  })

  it('删除单据时关闭指向它的冲突弹窗', async () => {
    api.updateQuoteSheetHeader.mockRejectedValue({ status: 412, code: 4120 })
    const store = renderStore()
    await hydrate(store)

    act(() => {
      store.current.patchSheet(store.current.activeId, { locked: true })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })
    expect(vi.mocked(modal.confirm)).toHaveBeenCalledTimes(1)
    const targetId = store.current.activeId

    act(() => {
      store.current.removeSheet(targetId)
    })
    expect(store.current.conflict).toBeNull()
  })

  it('项目配置未加载完成时跳过保存, 加载完成后再发完整 prices', async () => {
    let resolveConfig!: (value: typeof configRecord) => void
    api.fetchQuoteProjectConfig.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveConfig = resolve
        }),
    )
    const store = renderStore()
    await hydrate(store)
    // 配置仍处于未加载状态
    expect(store.current.configLoaded).toBe(false)
    api.updateQuoteSheetItem.mockClear()
    api.updateQuoteSheetHeader.mockClear()

    const inputKey = `中天:${store.current.rows[0].id}`
    act(() => {
      store.current.patchSheet(store.current.activeId, {
        inputs: { [inputKey]: { spot: 3350, supplierId: '5001' } },
      })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    // 配置未加载: 不得发出任何写请求, 更不能发 prices: [] 清空服务端现货价
    expect(api.updateQuoteSheetItem).not.toHaveBeenCalled()
    expect(api.updateQuoteSheetHeader).not.toHaveBeenCalled()

    await act(async () => {
      resolveConfig(configRecord)
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(api.updateQuoteSheetItem).toHaveBeenCalledTimes(1)
    const [, itemId, payload] = api.updateQuoteSheetItem.mock.calls[0] as [
      string,
      string,
      {
        prices: { brandName: string; spotPrice?: number; supplierId?: string }[]
      },
    ]
    expect(itemId).toBe('7001')
    expect(payload.prices).toEqual([
      { brandName: '中天', spotPrice: 3350, supplierId: '5001' },
    ])
  })

  it('新建批次 create 成功后自动签出该单据', async () => {
    api.createQuoteSheet.mockResolvedValue(
      sheetRecord({ id: '9002', name: '批次 2' }),
    )
    const store = renderStore()
    await hydrate(store)
    api.acquireQuoteSheetEditLock.mockClear()

    act(() => {
      store.current.addSheet(
        '100',
        '云潮筝鸣府',
        '2026-09-16',
        '2026-09-16',
        '上午',
      )
    })
    act(() => {
      store.current.setRows((list) =>
        list.map((row) => ({
          ...row,
          category: '螺纹钢',
          material: 'HRB400E',
          spec: 12,
          length: '9米',
        })),
      )
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(api.createQuoteSheet).toHaveBeenCalledTimes(1)
    expect(api.acquireQuoteSheetEditLock).toHaveBeenCalledWith(
      '9002',
      undefined,
    )
  })

  it('离开路由后新批次落库不后台签出, 返回后补签出', async () => {
    api.createQuoteSheet.mockResolvedValue(
      sheetRecord({ id: '9002', name: '批次 2' }),
    )
    const store = renderStore()
    await hydrate(store)
    await act(async () => {
      await store.current.releaseEditLock()
    })
    api.acquireQuoteSheetEditLock.mockClear()
    api.releaseQuoteSheetEditLock.mockClear()

    act(() => {
      store.current.addSheet(
        '100',
        '云潮筝鸣府',
        '2026-09-16',
        '2026-09-16',
        '上午',
      )
    })
    act(() => store.setRouteActive(false))
    act(() => {
      store.current.setRows((list) =>
        list.map((row) => ({
          ...row,
          category: '螺纹钢',
          material: 'HRB400E',
          spec: 12,
          length: '9米',
        })),
      )
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(api.createQuoteSheet).toHaveBeenCalledTimes(1)
    // 已离开路由: create 成功也不得后台签出/续约
    expect(api.acquireQuoteSheetEditLock).not.toHaveBeenCalled()

    // 返回路由后由切换 effect 补签出
    act(() => store.setRouteActive(true))
    await act(async () => {
      await Promise.resolve()
    })
    expect(api.acquireQuoteSheetEditLock).toHaveBeenCalledWith(
      '9002',
      undefined,
    )
    expect(store.current.editLock?.mine).toBe(true)
  })

  it('切到未落库批次时释放上一批次编辑锁', async () => {
    const store = renderStore()
    await hydrate(store)
    await act(async () => {
      await store.current.acquireEditLock()
    })
    expect(store.current.editLock?.sheetId).toBe('9001')
    api.releaseQuoteSheetEditLock.mockClear()

    await act(async () => {
      store.current.addSheet(
        '100',
        '云潮筝鸣府',
        '2026-09-16',
        '2026-09-16',
        '上午',
      )
      // 释放任务内部先等待收尾保存, 需推进微任务
      for (let i = 0; i < 4; i += 1) {
        await Promise.resolve()
      }
    })

    expect(api.releaseQuoteSheetEditLock).toHaveBeenCalledWith('9001')
  })

  it('卸载时释放当前批次编辑锁', async () => {
    const store = renderStore()
    await hydrate(store)
    await act(async () => {
      await store.current.acquireEditLock()
    })
    api.releaseQuoteSheetEditLock.mockClear()

    await act(async () => {
      root.unmount()
      await vi.advanceTimersByTimeAsync(0)
    })
    rootUnmounted = true

    expect(api.releaseQuoteSheetEditLock).toHaveBeenCalledWith('9001')
  })

  it('离开比价路由立即释放编辑锁且不再续约', async () => {
    const store = renderStore()
    await hydrate(store)
    await act(async () => {
      await store.current.acquireEditLock()
    })
    expect(store.current.editLock?.mine).toBe(true)
    api.releaseQuoteSheetEditLock.mockClear()
    api.acquireQuoteSheetEditLock.mockClear()

    await act(async () => {
      store.setRouteActive(false)
      // 释放排在收尾保存之后, 需推进微任务
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(api.releaseQuoteSheetEditLock).toHaveBeenCalledWith('9001')
    expect(store.current.editLock).toBeNull()
    // 页面保持可见: 推进多个续约周期也不得再签出/续约
    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000)
    })
    expect(api.acquireQuoteSheetEditLock).not.toHaveBeenCalled()
  })

  it('返回比价路由重新签出编辑锁', async () => {
    const store = renderStore()
    await hydrate(store)
    await act(async () => {
      await store.current.acquireEditLock()
    })
    act(() => store.setRouteActive(false))
    api.releaseQuoteSheetEditLock.mockClear()
    api.acquireQuoteSheetEditLock.mockClear()

    act(() => store.setRouteActive(true))
    // 释放与重新签出串行: 需推进微任务等待前序释放完成
    await act(async () => {
      for (let i = 0; i < 8; i += 1) {
        await Promise.resolve()
      }
    })

    expect(api.acquireQuoteSheetEditLock).toHaveBeenCalledWith(
      '9001',
      undefined,
    )
    expect(store.current.editLock?.mine).toBe(true)
    expect(store.current.readOnly).toBe(false)
  })

  it('离开路由后迟到签出响应不误删返回时重新签出的锁', async () => {
    const store = renderStore()
    await hydrate(store)
    await act(async () => {
      await store.current.releaseEditLock()
    })
    api.acquireQuoteSheetEditLock.mockClear()
    api.releaseQuoteSheetEditLock.mockClear()

    let resolveFirst!: (value: unknown) => void
    api.acquireQuoteSheetEditLock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve
        }),
    )
    let pending!: Promise<boolean>
    act(() => {
      pending = store.current.acquireEditLock('9001')
    })
    expect(api.acquireQuoteSheetEditLock).toHaveBeenCalledTimes(1)

    // 首次签出响应仍未返回时离开并返回路由(释放与第二次签出串行排队在其后)
    act(() => store.setRouteActive(false))
    act(() => store.setRouteActive(true))

    // 迟到的首次响应到达: 代次已变化, 不得额外归还; 链继续推进释放与第二次签出
    await act(async () => {
      resolveFirst({
        sheetId: '9001',
        locked: true,
        mine: true,
        ttlSeconds: 120,
      })
      await pending
      for (let i = 0; i < 8; i += 1) {
        await Promise.resolve()
      }
    })

    expect(api.acquireQuoteSheetEditLock).toHaveBeenCalledTimes(2)
    expect(store.current.editLock?.mine).toBe(true)
    // 迟到响应不得追加释放: 仅离开路由自身的一次释放
    expect(api.releaseQuoteSheetEditLock).toHaveBeenCalledTimes(1)
    // 新锁续约正常: 推进一个周期应再次签出/续约
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(api.acquireQuoteSheetEditLock).toHaveBeenCalledTimes(3)
  })

  it('规格数量锁定随表头 PUT 携带 specQuantityLocked', async () => {
    const store = renderStore()
    await hydrate(store)

    act(() => {
      store.current.patchSheet(store.current.activeId, {
        specQuantityLocked: true,
      })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(api.updateQuoteSheetHeader).toHaveBeenCalledTimes(1)
    const [id, payload] = api.updateQuoteSheetHeader.mock.calls[0] as [
      string,
      { specQuantityLocked?: boolean; brands?: unknown; items?: unknown },
    ]
    expect(id).toBe('9001')
    expect(payload.specQuantityLocked).toBe(true)
    expect(payload.brands).toBeUndefined()
    expect(payload.items).toBeUndefined()
  })

  it('签出请求飞行中卸载不再续约且归还刚拿到的锁', async () => {
    const store = renderStore()
    await hydrate(store)
    // 清除初始自动签出留下的锁与计时器, 隔离本次飞行中的签出
    await act(async () => {
      await store.current.releaseEditLock()
    })
    api.acquireQuoteSheetEditLock.mockClear()
    api.releaseQuoteSheetEditLock.mockClear()

    let resolveLock!: (value: unknown) => void
    api.acquireQuoteSheetEditLock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLock = resolve
        }),
    )

    let pending!: Promise<boolean>
    act(() => {
      pending = store.current.acquireEditLock()
    })
    expect(api.acquireQuoteSheetEditLock).toHaveBeenCalledTimes(1)

    act(() => root.unmount())
    rootUnmounted = true

    await act(async () => {
      resolveLock({
        sheetId: '9001',
        locked: true,
        mine: true,
        ttlSeconds: 120,
      })
      await pending
    })

    // 已卸载: 不回写状态、不建续约, 立即归还刚拿到的锁
    expect(api.releaseQuoteSheetEditLock).toHaveBeenCalledWith('9001')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(130_000)
    })
    expect(api.acquireQuoteSheetEditLock).toHaveBeenCalledTimes(1)
  })

  it('切走后迟到的签出响应不回写状态也不再续约', async () => {
    const store = renderStore()
    await hydrate(store)
    await act(async () => {
      await store.current.releaseEditLock()
    })
    api.acquireQuoteSheetEditLock.mockClear()
    api.releaseQuoteSheetEditLock.mockClear()

    let resolveLock!: (value: unknown) => void
    api.acquireQuoteSheetEditLock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLock = resolve
        }),
    )
    let pending!: Promise<boolean>
    act(() => {
      pending = store.current.acquireEditLock('9001')
    })

    // 迟到响应到达前, 该目标已被释放(代次自增); 释放串行排在迟到的签出之后
    let releasePromise!: Promise<void>
    act(() => {
      releasePromise = store.current.releaseEditLock('9001')
    })
    await act(async () => {
      resolveLock({
        sheetId: '9001',
        locked: true,
        mine: true,
        ttlSeconds: 120,
      })
      await pending
      await releasePromise
    })

    expect(api.releaseQuoteSheetEditLock).toHaveBeenCalledWith('9001')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(130_000)
    })
    expect(api.acquireQuoteSheetEditLock).toHaveBeenCalledTimes(1)
  })

  it('配置未加载时被跳过的编辑在聚焦刷新后仍保留并补发', async () => {
    // 首次配置加载挂起: 保持未加载, 使编辑落入 configBlockedSaveRef
    api.fetchQuoteProjectConfig.mockImplementationOnce(
      () => new Promise(() => {}),
    )
    const store = renderStore()
    await hydrate(store)
    expect(store.current.configLoaded).toBe(false)
    api.updateQuoteSheetItem.mockClear()
    api.fetchQuoteSheets.mockClear()

    const inputKey = `中天:${store.current.rows[0].id}`
    act(() => {
      store.current.patchSheet(store.current.activeId, {
        inputs: { [inputKey]: { spot: 3350, supplierId: '5001' } },
      })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })
    expect(api.updateQuoteSheetItem).not.toHaveBeenCalled()

    // 聚焦: 先加载配置(默认 mock 可解析)并补跑被跳过的保存, 再判断刷新
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(api.fetchQuoteSheets).not.toHaveBeenCalled()
    expect(store.current.active.inputs[inputKey]).toEqual({
      spot: 3350,
      supplierId: '5001',
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })
    expect(api.updateQuoteSheetItem).toHaveBeenCalledTimes(1)
    const [, , payload] = api.updateQuoteSheetItem.mock.calls[0] as [
      string,
      string,
      { prices: { brandName: string; spotPrice?: number }[] },
    ]
    expect(payload.prices).toEqual([
      { brandName: '中天', spotPrice: 3350, supplierId: '5001' },
    ])
  })

  it('刷新重建列表时 activeId 跟随本地→服务端映射, 不回跳', async () => {
    api.createQuoteSheet.mockResolvedValue(
      sheetRecord({ id: '9002', name: '批次 2' }),
    )
    const store = renderStore()
    await hydrate(store)

    act(() => {
      store.current.addSheet(
        '100',
        '云潮筝鸣府',
        '2026-09-16',
        '2026-09-16',
        '上午',
      )
    })
    const localId = store.current.activeId
    act(() => {
      store.current.setRows((list) =>
        list.map((row) => ({
          ...row,
          category: '螺纹钢',
          material: 'HRB400E',
          spec: 12,
          length: '9米',
        })),
      )
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })
    expect(api.createQuoteSheet).toHaveBeenCalledTimes(1)
    expect(store.current.activeId).toBe(localId)

    api.fetchQuoteSheets.mockResolvedValue([
      sheetRecord(),
      sheetRecord({ id: '9002', name: '批次 2' }),
    ])
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(store.current.sheets.map((sheet) => sheet.id)).not.toContain(localId)
    expect(store.current.activeId).toBe('9002')
  })

  it('A→B→A 后迟到的旧签出响应不归还新一轮已持锁', async () => {
    api.fetchQuoteSheets.mockResolvedValue([
      sheetRecord(),
      sheetRecord({ id: '9002', name: '批次 2' }),
    ])
    const store = renderStore()
    await hydrate(store)
    // 清掉初始自动签出, 隔离本次飞行中的签出
    await act(async () => {
      await store.current.releaseEditLock()
    })
    api.acquireQuoteSheetEditLock.mockClear()
    api.releaseQuoteSheetEditLock.mockClear()

    let resolveOld!: (value: unknown) => void
    api.acquireQuoteSheetEditLock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve
        }),
    )
    let pending!: Promise<boolean>
    act(() => {
      pending = store.current.acquireEditLock('9001')
    })

    // A -> B -> A: 切换串行排队在迟到的旧签出之后
    act(() => {
      store.current.setActiveId('9002')
    })
    act(() => {
      store.current.setActiveId('9001')
    })

    // 旧响应此时才回到本地: 代次已过期, 链继续推进后续切换与新一轮签出
    await act(async () => {
      resolveOld({
        sheetId: '9001',
        locked: true,
        mine: true,
        ttlSeconds: 120,
      })
      await pending
      for (let i = 0; i < 12; i += 1) {
        await Promise.resolve()
      }
    })

    // 最终应持有 A 批次(9001), 旧响应不得删除新一轮锁
    expect(store.current.editLock?.sheetId).toBe('9001')
    expect(store.current.editLock?.mine).toBe(true)
    expect(store.current.readOnly).toBe(false)
  })

  it('行保存普通失败后聚焦刷新不覆盖本地且会重试保存', async () => {
    const store = renderStore()
    await hydrate(store)
    api.updateQuoteSheetItem.mockRejectedValueOnce(new Error('boom'))

    const inputKey = `中天:${store.current.rows[0].id}`
    act(() => {
      store.current.patchSheet(store.current.activeId, {
        inputs: { [inputKey]: { spot: 3400, supplierId: '5001' } },
      })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })
    expect(api.updateQuoteSheetItem).toHaveBeenCalledTimes(1)
    expect(vi.mocked(message.error)).toHaveBeenCalled()

    api.fetchQuoteSheets.mockClear()
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
    })

    // 存在保存失败的脏编辑: 不覆盖本地
    expect(api.fetchQuoteSheets).not.toHaveBeenCalled()
    expect(store.current.active.inputs[inputKey]).toEqual({
      spot: 3400,
      supplierId: '5001',
    })

    // 聚焦触发的重试保存
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })
    expect(api.updateQuoteSheetItem).toHaveBeenCalledTimes(2)
  })

  it('配置未加载被跳过的保存随单据删除而清理, 不永久关闭刷新', async () => {
    api.fetchQuoteSheets.mockResolvedValue([
      sheetRecord(),
      sheetRecord({ id: '9002', name: '批次 2' }),
    ])
    // 首次配置加载挂起: 保持未加载, 使编辑落入 configBlockedSaveRef
    api.fetchQuoteProjectConfig.mockImplementationOnce(
      () => new Promise(() => {}),
    )
    const store = renderStore()
    await hydrate(store)
    expect(store.current.configLoaded).toBe(false)

    const sheetId = store.current.activeId
    const inputKey = `中天:${store.current.rows[0].id}`
    act(() => {
      store.current.patchSheet(sheetId, {
        inputs: { [inputKey]: { spot: 3350, supplierId: '5001' } },
      })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })
    expect(api.updateQuoteSheetItem).not.toHaveBeenCalled()

    // 删除挂起保存的单据: 其 blocked 登记应被清理
    act(() => {
      store.current.removeSheet(sheetId)
    })
    api.fetchQuoteSheets.mockClear()
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(api.fetchQuoteSheets).toHaveBeenCalled()
  })

  it('addSheet 缺省报单日期使用本地时区而非 UTC', async () => {
    const nodeEnv = (
      globalThis as unknown as {
        process: { env: Record<string, string | undefined> }
      }
    ).process.env
    const originalTz = nodeEnv.TZ
    nodeEnv.TZ = 'Asia/Shanghai'
    try {
      // 23:30 UTC = 次日 07:30 (+08:00)
      vi.setSystemTime(new Date('2026-09-16T23:30:00Z'))
      api.fetchQuoteSheets.mockResolvedValue([])
      const store = renderStore()
      await hydrate(store)

      act(() => {
        store.current.addSheet('100', '云潮筝鸣府', '', '', '')
      })

      expect(store.current.active.orderDate).toBe(dayjs().format('YYYY-MM-DD'))
      expect(store.current.active.orderDate).toBe('2026-09-17')
    } finally {
      if (originalTz === undefined) delete nodeEnv.TZ
      else nodeEnv.TZ = originalTz
    }
  })
})
