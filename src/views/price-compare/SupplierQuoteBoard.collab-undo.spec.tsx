// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import i18n from 'i18next'
import type { SupplierPriceGrid } from '@/api/market/supplier-price-lists'
import { createFakeCollabNetwork } from './collab/collab-fake-provider'
import type { CollabSessionOutcome } from './collab/collab-session-api'

const priceApi = vi.hoisted(() => ({
  fetchSpecRows: vi.fn(),
  fetchSupplierPriceGrid: vi.fn(),
  fetchQuotedSuppliers: vi.fn(),
  addSupplierPriceColumn: vi.fn(),
  saveSupplierPriceColumnItems: vi.fn(),
  removeSupplierPriceColumn: vi.fn(),
}))

const supplierApi = vi.hoisted(() => ({ fetchSupplierOptions: vi.fn() }))
const brandSpecsApi = vi.hoisted(() => ({
  fetchSupplierBrandSpecs: vi.fn(),
}))
const baseRulesApi = vi.hoisted(() => ({
  basePriceRulesQueryKey: (supplierId: string, brandName: string) => [
    'supplier-base-price-rules',
    supplierId,
    brandName,
  ],
  fetchSupplierBasePriceRules: vi.fn(),
}))

const feedback = vi.hoisted(() => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  modal: { confirm: vi.fn() },
  notification: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    destroy: vi.fn(),
  },
}))

const collabHarness = vi.hoisted(() => ({
  enabled: true,
  network: null as ReturnType<typeof createFakeCollabNetwork> | null,
  requestSession: vi.fn<(listId: string) => Promise<CollabSessionOutcome>>(),
}))

vi.mock('@/api/market/supplier-price-lists', () => priceApi)
vi.mock('@/api/master/supplier-options', () => supplierApi)
vi.mock('@/api/master/supplier-brand-specs', () => brandSpecsApi)
vi.mock('@/api/market/supplier-base-price-rules', () => baseRulesApi)
vi.mock('@/utils/antd-app', () => feedback)
vi.mock('@/hooks/usePermission', () => ({
  useHasPermission: () => true,
}))
vi.mock('./collab/collab-config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./collab/collab-config')>()
  return {
    ...actual,
    isCollabFeatureEnabled: () => collabHarness.enabled,
  }
})
vi.mock('./collab/collab-provider', () => ({
  loadHocuspocusTransportFactory: () => {
    if (!collabHarness.network) {
      throw new Error('collabHarness.network 未初始化')
    }
    return Promise.resolve(collabHarness.network.createTransport)
  },
}))
vi.mock('./collab/collab-session-api', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('./collab/collab-session-api')>()
  return {
    ...actual,
    requestCollabSession: (listId: string) =>
      collabHarness.requestSession(listId),
  }
})

import { SupplierQuotePage } from './SupplierQuotePage'

const ROW_ZHONGTIAN = {
  brand: '中天',
  category: '直条',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
}

const ROW_SHAGANG = {
  brand: '沙钢',
  category: '直条',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
}

const SUPPLIER = {
  id: 's1',
  supplierCode: 'S001',
  supplierName: '浙江铁都钢材有限公司',
  brands: ['中天', '沙钢'],
  value: 's1',
  label: '浙江铁都钢材有限公司',
}

const COL_ZHONGTIAN = {
  listId: 'list-zt',
  supplierId: 's1',
  supplierName: SUPPLIER.supplierName,
  quotedOn: '2026-10-29',
  updatedAt: null,
  warehouse: null,
  version: 1,
}

const COL_SHAGANG = {
  listId: 'list-sg',
  supplierId: 's1',
  supplierName: SUPPLIER.supplierName,
  quotedOn: '2026-10-29',
  updatedAt: null,
  warehouse: null,
  version: 1,
}

const grantedSession = (listId: string): CollabSessionOutcome => ({
  kind: 'session',
  session: {
    room: `supplier-price:${listId}`,
    url: 'ws://fake/collab',
    token: 'fake-token',
    writable: true,
    color: '#1677ff',
    expiresAt: null,
  },
})

const flushAutosave = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 900))
  })
}

describe('供应商报价表：实时协作与混合模式撤销重做', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    if (!window.matchMedia) {
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    }
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    window.localStorage.clear()

    collabHarness.enabled = true
    collabHarness.network = createFakeCollabNetwork()
    collabHarness.requestSession.mockReset()

    supplierApi.fetchSupplierOptions.mockReset().mockResolvedValue([SUPPLIER])
    brandSpecsApi.fetchSupplierBrandSpecs.mockReset().mockResolvedValue([])
    baseRulesApi.fetchSupplierBasePriceRules.mockReset().mockResolvedValue(null)
    priceApi.fetchSpecRows
      .mockReset()
      .mockResolvedValue([ROW_ZHONGTIAN, ROW_SHAGANG])
    priceApi.fetchQuotedSuppliers.mockReset().mockResolvedValue([])
    priceApi.addSupplierPriceColumn.mockReset().mockResolvedValue(COL_SHAGANG)
    priceApi.saveSupplierPriceColumnItems
      .mockReset()
      .mockImplementation((listId: string, version: number) =>
        Promise.resolve({
          ...(listId === COL_ZHONGTIAN.listId ? COL_ZHONGTIAN : COL_SHAGANG),
          version: version + 1,
        }),
      )
    priceApi.removeSupplierPriceColumn.mockReset().mockResolvedValue(undefined)
    feedback.message.success.mockReset()
    feedback.message.warning.mockReset()
    feedback.message.error.mockReset()
    feedback.message.info.mockReset()

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    queryClient.clear()
    document.body.innerHTML = ''
  })

  async function waitFor(predicate: () => boolean, timeout = 2500) {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeout) {
      if (predicate()) return
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
      })
    }
  }

  const cellInput = (label: string) =>
    container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)

  const undoButton = () =>
    container.querySelector<HTMLButtonElement>(
      `button[aria-label="${i18n.t('priceCompare.supplierPrice.undoTooltip')}"]`,
    )

  const redoButton = () =>
    container.querySelector<HTMLButtonElement>(
      `button[aria-label="${i18n.t('priceCompare.supplierPrice.redoTooltip')}"]`,
    )

  async function renderBoard() {
    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(SupplierQuotePage) as ReactNode,
        ),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await waitFor(
      () =>
        cellInput('中天 HRB400E 12 9米') !== null &&
        cellInput('沙钢 HRB400E 12 9米') !== null,
    )
    // 等待协作连接完成并进入 collab 态
    await waitFor(() => Boolean(container.querySelector('.collab-status-bar')))
  }

  async function commitCell(label: string, text: string) {
    const input = cellInput(label)
    expect(input, `未找到价格格 ${label}`).not.toBeNull()
    await act(async () => {
      input?.focus()
      Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set?.call(input, text)
      input?.dispatchEvent(new Event('input', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await act(async () => {
      input?.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
        }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  async function clickButton(button: HTMLButtonElement | null) {
    expect(button).not.toBeNull()
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('混合模式（品牌 A 协作 + 品牌 B REST）按操作顺序交替撤销与重做，不屏蔽 REST 品牌', async () => {
    // 只有「中天」拿到了协作会话，「沙钢」拒绝/未开协作继续走 REST
    collabHarness.requestSession.mockImplementation((listId) =>
      Promise.resolve(
        listId === COL_ZHONGTIAN.listId
          ? grantedSession(listId)
          : { kind: 'unavailable', reason: 'not-enabled' },
      ),
    )
    priceApi.fetchSupplierPriceGrid.mockImplementation((brandName: string) =>
      Promise.resolve<SupplierPriceGrid>(
        brandName === '中天'
          ? {
              brandName: '中天',
              columns: [COL_ZHONGTIAN],
              rows: [
                {
                  ...ROW_ZHONGTIAN,
                  prices: { [COL_ZHONGTIAN.listId]: 3280 },
                  priceStatuses: {},
                  remarks: {},
                },
              ],
            }
          : {
              brandName: '沙钢',
              columns: [COL_SHAGANG],
              rows: [
                {
                  ...ROW_SHAGANG,
                  prices: { [COL_SHAGANG.listId]: 3400 },
                  priceStatuses: {},
                  remarks: {},
                },
              ],
            },
      ),
    )

    await renderBoard()
    await waitFor(
      () =>
        cellInput('中天 HRB400E 12 9米')?.value === '3280' &&
        cellInput('沙钢 HRB400E 12 9米')?.value === '3400',
    )

    // 1. 改协作品牌（中天）
    await commitCell('中天 HRB400E 12 9米', '3310')
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3310')

    // 2. 改 REST 品牌（沙钢）并等待自动保存落库
    await commitCell('沙钢 HRB400E 12 9米', '3460')
    await flushAutosave()
    expect(cellInput('沙钢 HRB400E 12 9米')?.value).toBe('3460')
    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledTimes(1)

    // 3. 再改协作品牌（中天）
    await commitCell('中天 HRB400E 12 9米', '3320')
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3320')

    // 第 1 次撤销：只撤中天（3320 → 3310），沙钢保持 3460
    await clickButton(undoButton())
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3310')
    expect(cellInput('沙钢 HRB400E 12 9米')?.value).toBe('3460')

    // 第 2 次撤销：只撤沙钢（3460 → 3400），中天保持 3310，并触发 REST 回写
    await clickButton(undoButton())
    expect(cellInput('沙钢 HRB400E 12 9米')?.value).toBe('3400')
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3310')
    await flushAutosave()
    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledTimes(2)

    // 第 3 次撤销：撤中天第一步（3310 → 3280）
    await clickButton(undoButton())
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3280')
    expect(undoButton()?.disabled).toBe(true)

    // 依次重做 3 步
    await clickButton(redoButton())
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3310')
    await clickButton(redoButton())
    expect(cellInput('沙钢 HRB400E 12 9米')?.value).toBe('3460')
    await clickButton(redoButton())
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3320')
    expect(redoButton()?.disabled).toBe(true)
  }, 12000)

  it('多品牌同时协作时按操作顺序逐品牌撤销，且相对算式基于最新协作价格计算', async () => {
    collabHarness.requestSession.mockImplementation((listId) =>
      Promise.resolve(grantedSession(listId)),
    )
    priceApi.fetchSupplierPriceGrid.mockImplementation((brandName: string) =>
      Promise.resolve<SupplierPriceGrid>(
        brandName === '中天'
          ? {
              brandName: '中天',
              columns: [COL_ZHONGTIAN],
              rows: [
                {
                  ...ROW_ZHONGTIAN,
                  prices: { [COL_ZHONGTIAN.listId]: 3280 },
                  priceStatuses: {},
                  remarks: {},
                },
              ],
            }
          : {
              brandName: '沙钢',
              columns: [COL_SHAGANG],
              rows: [
                {
                  ...ROW_SHAGANG,
                  prices: { [COL_SHAGANG.listId]: 3400 },
                  priceStatuses: {},
                  remarks: {},
                },
              ],
            },
      ),
    )

    await renderBoard()
    await waitFor(
      () =>
        cellInput('中天 HRB400E 12 9米')?.value === '3280' &&
        cellInput('沙钢 HRB400E 12 9米')?.value === '3400',
    )

    // 改中天为 3500，再在其上用相对算式 +50（应得 3550，而非旧服务端价 3280+50=3330）
    await commitCell('中天 HRB400E 12 9米', '3500')
    await commitCell('中天 HRB400E 12 9米', '+50')
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3550')

    // 再改沙钢为 3480
    await commitCell('沙钢 HRB400E 12 9米', '3480')
    expect(cellInput('沙钢 HRB400E 12 9米')?.value).toBe('3480')

    // 第 1 次撤销只撤沙钢（中天不动）
    await clickButton(undoButton())
    expect(cellInput('沙钢 HRB400E 12 9米')?.value).toBe('3400')
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3550')

    // 第 2 次撤销撤中天算式（3550 → 3500）
    await clickButton(undoButton())
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3500')

    // 第 3 次撤销撤中天首次改价（3500 → 3280）
    await clickButton(undoButton())
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3280')
    expect(undoButton()?.disabled).toBe(true)
  }, 12000)
})
