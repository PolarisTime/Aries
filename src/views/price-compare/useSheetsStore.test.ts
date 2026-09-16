// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/authStore'
import { type SheetsStore, useSheetsStore } from './useSheetsStore'

const api = vi.hoisted(() => ({
  fetchQuoteSheets: vi.fn(),
  createQuoteSheet: vi.fn(),
  updateQuoteSheet: vi.fn(),
  deleteQuoteSheet: vi.fn(),
  fetchQuoteProjectConfig: vi.fn(),
  saveQuoteProjectConfig: vi.fn(),
}))

vi.mock('@/api/market/quote-sheets', () => ({
  fetchQuoteSheets: api.fetchQuoteSheets,
  createQuoteSheet: api.createQuoteSheet,
  updateQuoteSheet: api.updateQuoteSheet,
  deleteQuoteSheet: api.deleteQuoteSheet,
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
  brands: [{ brandName: '中天', freight: 30, categories: [], sortOrder: 0 }],
}

describe('useSheetsStore 服务端数据源', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.useFakeTimers()
    api.fetchQuoteSheets.mockReset().mockResolvedValue([sheetRecord()])
    api.createQuoteSheet.mockReset()
    api.updateQuoteSheet.mockReset().mockResolvedValue(sheetRecord())
    api.deleteQuoteSheet.mockReset().mockResolvedValue(undefined)
    api.fetchQuoteProjectConfig.mockReset().mockResolvedValue(configRecord)
    api.saveQuoteProjectConfig.mockReset().mockResolvedValue(configRecord)
    useAuthStore.setState({ token: 'token', isAuthenticated: true })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.useRealTimers()
  })

  function renderStore() {
    let result!: SheetsStore
    function Probe() {
      result = useSheetsStore()
      return null
    }
    act(() => {
      root.render(createElement(Probe))
    })
    return {
      get current() {
        return result
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

  it('完整单据变更后防抖 PUT 保存', async () => {
    const store = renderStore()
    await hydrate(store)

    act(() => {
      store.current.patchSheet(store.current.activeId, { locked: true })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(api.updateQuoteSheet).toHaveBeenCalledTimes(1)
    const [id, payload] = api.updateQuoteSheet.mock.calls[0] as [
      string,
      { locked: boolean; items: unknown[] },
    ]
    expect(id).toBe('9001')
    expect(payload.locked).toBe(true)
    expect(payload.items).toHaveLength(1)
  })

  it('供应商随现货价一并保存', async () => {
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

    const payload = api.updateQuoteSheet.mock.calls[0]?.[1] as {
      items: { prices: { supplierId?: string }[] }[]
    }
    expect(payload.items[0].prices[0].supplierId).toBe('5002')
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
})
