// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { PurchaseOrderPickerModal } from './PurchaseOrderPickerModal'
import { remainingLinkableTon } from './purchase-order-picker-tonnage'

const api = vi.hoisted(() => ({ fetchPurchaseOrderTonnages: vi.fn() }))
vi.mock('@/api/market/quote-sheets', async () => {
  const actual = await vi.importActual('@/api/market/quote-sheets')
  return {
    ...actual,
    fetchPurchaseOrderTonnages: api.fetchPurchaseOrderTonnages,
  }
})

const records: PurchaseOrderTonnageRecord[] = [
  {
    purchaseOrderId: '88',
    purchaseOrderItemId: '301',
    orderNo: 'PO-88',
    supplierName: '沙钢',
    category: '螺纹钢',
    material: 'HRB400E',
    spec: '12',
    length: '9米',
    brand: '中天',
    orderedWeight: 40,
    issuedWeight: 30,
    remainingWeight: 10,
    status: '正常',
  },
]

/** 剩余可关联吨位为 0 的另一品牌明细行(同规格, 用于"区分品牌"与"默认隐藏"用例)。 */
const doneRecord: PurchaseOrderTonnageRecord = {
  ...records[0],
  purchaseOrderId: '99',
  purchaseOrderItemId: '302',
  orderNo: 'PO-99',
  brand: '永钢',
  orderedWeight: 20,
  issuedWeight: 20,
  remainingWeight: 0,
}

describe('PurchaseOrderPickerModal', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    api.fetchPurchaseOrderTonnages.mockReset().mockResolvedValue(records)
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
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    act(() => root.unmount())
    container.remove()
    document.body.innerHTML = ''
    queryClient.clear()
    vi.clearAllMocks()
  })

  const render = (
    overrides: Partial<Parameters<typeof PurchaseOrderPickerModal>[0]> = {},
  ) => {
    const props: Parameters<typeof PurchaseOrderPickerModal>[0] = {
      open: true,
      selectedItemId: undefined,
      onSelect: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    }
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(PurchaseOrderPickerModal, props),
        ),
      )
    })
    return props
  }

  const flush = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  const tableRows = () =>
    Array.from(document.querySelectorAll('.ant-table-tbody tr.ant-table-row'))

  /** 多选列的复选框: aria-label 用订单号(同一规格多品牌时唯一的可读标识)。 */
  const checkInput = (orderNo: string) =>
    document.querySelector<HTMLInputElement>(
      `.price-compare-purchase-order-picker-check input[aria-label="${orderNo}"]`,
    )

  const confirmButton = () =>
    document.querySelector<HTMLButtonElement>(
      '.price-compare-purchase-order-picker-confirm',
    )

  it('材质/规格/长度列同时展示品牌', async () => {
    render()
    await flush()
    await flush()
    const variety = document.querySelector(
      '.price-compare-purchase-order-picker-variety',
    )
    expect(variety?.textContent).toContain('HRB400E')
    expect(variety?.textContent).toContain('中天')
  })

  it('同一规格多品牌的多张订单按行展示品牌, 可区分', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([...records, doneRecord])
    render()
    await flush()
    await flush()
    const brands = Array.from(
      document.querySelectorAll('.price-compare-purchase-order-picker-brand'),
    ).map((node) => node.textContent)
    expect(brands).toContain('中天')
    // 剩余 0 的行默认隐藏, 需开关才能看到永钢
    expect(brands).not.toContain('永钢')
  })

  it('剩余可关联吨位为 0 的明细行默认隐藏, 开关后可显示且不可选', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([...records, doneRecord])
    const props = render()
    await flush()
    await flush()

    // 默认只渲染还有剩余额度的行
    expect(tableRows()).toHaveLength(1)
    const toggle = document.querySelector<HTMLInputElement>(
      '.price-compare-purchase-order-picker-toggle input[type="checkbox"]',
    )
    expect(toggle).not.toBeNull()
    // 开关文案写明被隐藏的条数, 数据不会显得"丢了"
    expect(
      document.querySelector('.price-compare-purchase-order-picker-toggle')
        ?.textContent,
    ).toContain('显示已关联完的订单（1）')

    act(() => {
      toggle?.click()
    })
    expect(tableRows()).toHaveLength(2)

    const doneRow = tableRows()[1] as HTMLElement
    expect(doneRow.textContent).toContain('永钢')
    expect(doneRow.textContent).toContain('已关联完')
    expect(doneRow.getAttribute('aria-disabled')).toBe('true')
    expect(doneRow.tabIndex).toBe(-1)

    act(() => {
      doneRow.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(props.onSelect).not.toHaveBeenCalled()
  })

  it('默认只列与当前行材质/规格/长度一致的明细行, 开关放行其他规格', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([
      {
        ...records[0],
        purchaseOrderItemId: '301',
        orderNo: 'PO-301',
        material: 'HRB400E',
        spec: '16',
        length: '9米',
      },
      {
        ...records[0],
        purchaseOrderItemId: '302',
        orderNo: 'PO-302',
        material: 'HRB400E',
        spec: '12',
        length: '9米',
      },
      {
        ...records[0],
        purchaseOrderItemId: '303',
        orderNo: 'PO-303',
        material: 'HRB400E',
        spec: '16',
        length: '12米',
      },
      {
        ...records[0],
        purchaseOrderItemId: '304',
        orderNo: 'PO-304',
        material: 'HRB400',
      },
    ])
    // 当前行: HRB400E / 16 / 9米
    render({ matchVariety: { material: 'HRB400E', spec: 16, length: '9米' } })
    await flush()
    await flush()

    const textOf = () => tableRows().map((row) => row.textContent ?? '')
    expect(textOf().some((text) => text.includes('PO-301'))).toBe(true)
    expect(textOf().some((text) => text.includes('PO-302'))).toBe(false)
    expect(textOf().some((text) => text.includes('PO-303'))).toBe(false)
    expect(textOf().some((text) => text.includes('PO-304'))).toBe(false)

    // 开关文案带出被筛掉的条数, 勾选后其他规格的行可以放行
    const toggles = [
      ...document.querySelectorAll<HTMLInputElement>(
        '.price-compare-purchase-order-picker-toggle input[type="checkbox"]',
      ),
    ]
    const varietyToggle = toggles.find((input) =>
      (input.closest('label')?.textContent ?? '').includes('材质/规格不一致'),
    )
    expect(varietyToggle).toBeTruthy()
    act(() => {
      varietyToggle?.click()
    })
    await flush()
    const after = textOf()
    expect(after.some((text) => text.includes('PO-302'))).toBe(true)
    expect(after.some((text) => text.includes('PO-303'))).toBe(true)
    expect(after.some((text) => text.includes('PO-304'))).toBe(true)
  })

  it('未传 matchVariety 时不筛选(保持原行为)', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([
      { ...records[0], purchaseOrderItemId: '301', orderNo: 'PO-301' },
      {
        ...records[0],
        purchaseOrderItemId: '302',
        orderNo: 'PO-302',
        spec: '12',
      },
    ])
    render()
    await flush()
    await flush()
    const texts = tableRows().map((row) => row.textContent ?? '')
    expect(texts.some((text) => text.includes('PO-301'))).toBe(true)
    expect(texts.some((text) => text.includes('PO-302'))).toBe(true)
  })

  it('matchVariety 值为空或占位符「-」的项不参与筛选', async () => {
    // 盘螺这类订单行没有长度: 长度目标为空时不应把可选项全部筛掉
    api.fetchPurchaseOrderTonnages.mockResolvedValue([
      {
        ...records[0],
        purchaseOrderItemId: '301',
        orderNo: 'PO-301',
        material: 'HRB400',
        spec: '8',
        length: '-',
      },
    ])
    render({
      matchVariety: { material: 'HRB400', spec: 8, length: '-' },
    })
    await flush()
    await flush()
    const texts = tableRows().map((row) => row.textContent ?? '')
    expect(texts.some((text) => text.includes('PO-301'))).toBe(true)
  })

  it('全部行都已关联完时给出可操作的空态提示(而非"暂无采购订单")', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([doneRecord])
    render()
    await flush()
    await flush()
    expect(tableRows()).toHaveLength(0)
    expect(document.querySelector('.ant-empty')?.textContent).toContain(
      '勾选上方开关',
    )
  })

  it('本单据已关联吨位吃满的行默认隐藏, 开关内可看到已关联数量', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([records[0]])
    render({ linkedTonByItemId: new Map([['301', 10]]) })
    await flush()
    await flush()
    // 服务端 remainingWeight 10, 本单据已用 10 → 剩余 0
    expect(tableRows()).toHaveLength(0)

    const toggle = document.querySelector<HTMLInputElement>(
      '.price-compare-purchase-order-picker-toggle input[type="checkbox"]',
    )
    act(() => {
      toggle?.click()
    })
    const doneRow = tableRows()[0] as HTMLElement
    expect(doneRow.textContent).toContain('已关联完')
    expect(doneRow.getAttribute('aria-disabled')).toBe('true')
  })

  it('当前已关联行即使剩余为 0 也保持可见且标记选中', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([doneRecord])
    render({ selectedItemId: doneRecord.purchaseOrderItemId })
    await flush()
    await flush()
    expect(tableRows()).toHaveLength(1)
    expect(tableRows()[0].getAttribute('aria-selected')).toBe('true')
  })

  it('remainingLinkableTon: 服务端剩余缺失时回退到 订货-已开 并扣减本单据已关联吨位', () => {
    expect(
      remainingLinkableTon(
        {
          ...records[0],
          orderedWeight: 40,
          issuedWeight: 30,
          remainingWeight: Number.NaN,
        },
        new Map([['301', 4]]),
      ),
    ).toBe(6)
    // 无本单据关联时直接用服务端剩余
    expect(remainingLinkableTon(records[0], undefined)).toBe(10)
  })

  it('打开时从后端拉取并渲染明细行, 展示规格/订货/已开/剩余', async () => {
    render()
    await flush()
    await flush()
    const modal = document.querySelector('.ant-modal')
    expect(modal?.textContent).toContain('选择采购订单规格行')
    expect(modal?.textContent).toContain('PO-88')
    expect(modal?.textContent).toContain('沙钢')
    expect(modal?.textContent).toContain('40.000')
  })

  it('点击行触发 onSelect(完整记录)', async () => {
    const props = render()
    await flush()
    await flush()
    const row = Array.from(
      document.querySelectorAll('.ant-table-tbody tr.ant-table-row'),
    )[0] as HTMLElement
    act(() => {
      row.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(props.onSelect).toHaveBeenCalledWith(records[0])
  })

  it('明细行可键盘聚焦, Enter/Space 触发 onSelect', async () => {
    const props = render()
    await flush()
    await flush()
    const row = document.querySelector<HTMLElement>(
      '.ant-table-tbody tr.ant-table-row',
    )
    expect(row).not.toBeNull()
    // 行必须可聚焦, 否则键盘用户能搜、能看、不能选
    expect(row?.tabIndex).toBe(0)
    expect(
      row?.classList.contains('price-compare-purchase-order-picker-row'),
    ).toBe(true)

    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      row?.dispatchEvent(enter)
    })
    expect(enter.defaultPrevented).toBe(true)
    expect(props.onSelect).toHaveBeenCalledWith(records[0])

    const space = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      row?.dispatchEvent(space)
    })
    // Enter 与 Space 各触发一次
    expect(props.onSelect).toHaveBeenCalledTimes(2)
    expect(props.onSelect).toHaveBeenLastCalledWith(records[0])
  })

  it('未选中行未标记 aria-selected, 选中行标记为 true', async () => {
    render({ selectedItemId: records[0].purchaseOrderItemId })
    await flush()
    await flush()
    const row = document.querySelector<HTMLElement>(
      '.ant-table-tbody tr.ant-table-row',
    )
    expect(row?.getAttribute('aria-selected')).toBe('true')
  })

  it('关键字搜索下沉到后端(防抖后带 keyword 请求)', async () => {
    vi.useFakeTimers()
    try {
      render()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      const input = document.querySelector(
        '.ant-modal input.ant-input',
      ) as HTMLInputElement
      act(() => {
        // eslint-disable-next-line @typescript-eslint/unbound-method -- 原生 value setter 必须以输入元素为 receiver 调用
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set
        setter?.call(input, 'PO-88')
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400)
      })
      const calls = api.fetchPurchaseOrderTonnages.mock.calls
      expect(calls.some((c) => c[0]?.keyword === 'PO-88')).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('未勾选任何明细行时「确认（0）」按钮禁用', async () => {
    render({ onConfirmLinks: vi.fn() })
    await flush()
    await flush()
    const confirm = confirmButton()
    expect(confirm).not.toBeNull()
    expect(confirm?.textContent).toContain('确认（0）')
    expect(confirm?.disabled).toBe(true)
  })

  it('勾选两张后确认按勾选顺序回调, 且不触发"点行=选一张"的旧路径', async () => {
    const second: PurchaseOrderTonnageRecord = {
      ...records[0],
      purchaseOrderId: '99',
      purchaseOrderItemId: '302',
      orderNo: 'PO-302',
      brand: '永钢',
      orderedWeight: 70,
      issuedWeight: 0,
      remainingWeight: 70,
    }
    api.fetchPurchaseOrderTonnages.mockResolvedValue([records[0], second])
    const props = render({ onConfirmLinks: vi.fn() })
    await flush()
    await flush()

    expect(confirmButton()?.disabled).toBe(true)
    // 先勾第二张、再勾第一张: 回调顺序必须是勾选顺序, 不是列表顺序
    act(() => {
      checkInput('PO-302')?.click()
    })
    act(() => {
      checkInput('PO-88')?.click()
    })
    await flush()
    expect(confirmButton()?.disabled).toBe(false)
    expect(confirmButton()?.textContent).toContain('确认（2）')

    act(() => {
      confirmButton()?.click()
    })
    expect(props.onConfirmLinks).toHaveBeenCalledTimes(1)
    expect(props.onConfirmLinks).toHaveBeenCalledWith([second, records[0]])
    // 勾选在单元格内被截住: 否则会顺带触发行的单选路径并关闭弹窗
    expect(props.onSelect).not.toHaveBeenCalled()
  })

  it('打开时用当前行已关联的明细行回填勾选态', async () => {
    const second: PurchaseOrderTonnageRecord = {
      ...records[0],
      purchaseOrderId: '99',
      purchaseOrderItemId: '302',
      orderNo: 'PO-302',
      orderedWeight: 70,
      issuedWeight: 0,
      remainingWeight: 70,
    }
    api.fetchPurchaseOrderTonnages.mockResolvedValue([records[0], second])
    render({
      selectedItemId: '301',
      selectedItemIds: ['302'],
      onConfirmLinks: vi.fn(),
    })
    await flush()
    await flush()

    expect(checkInput('PO-302')?.checked).toBe(true)
    expect(checkInput('PO-302')?.getAttribute('aria-label')).toBe('PO-302')
    expect(checkInput('PO-88')?.checked).toBe(false)
    expect(confirmButton()?.textContent).toContain('确认（1）')
    expect(confirmButton()?.disabled).toBe(false)
  })

  it('取消勾选后计数回落, 归零时按钮重新禁用', async () => {
    render({ onConfirmLinks: vi.fn() })
    await flush()
    await flush()
    act(() => {
      checkInput('PO-88')?.click()
    })
    expect(confirmButton()?.textContent).toContain('确认（1）')

    act(() => {
      checkInput('PO-88')?.click()
    })
    expect(confirmButton()?.textContent).toContain('确认（0）')
    expect(confirmButton()?.disabled).toBe(true)
  })

  it('已关联行被本单据吃满也保持可见, 确认不会把隐藏的关联丢掉', async () => {
    const second: PurchaseOrderTonnageRecord = {
      ...records[0],
      purchaseOrderId: '99',
      purchaseOrderItemId: '302',
      orderNo: 'PO-302',
      brand: '永钢',
      orderedWeight: 20,
      issuedWeight: 0,
      remainingWeight: 20,
    }
    api.fetchPurchaseOrderTonnages.mockResolvedValue([records[0], second])
    const props = render({
      selectedItemId: '301',
      selectedItemIds: ['301', '302'],
      // 本单据已把两张明细行的额度都用尽: 旧逻辑会把 302 藏进"已关联完"开关后面
      linkedTonByItemId: new Map([
        ['301', 10],
        ['302', 20],
      ]),
      onConfirmLinks: vi.fn(),
    })
    await flush()
    await flush()

    expect(tableRows()).toHaveLength(2)
    expect(confirmButton()?.textContent).toContain('确认（2）')
    act(() => {
      confirmButton()?.click()
    })
    // 勾选集合来自打开时的回填: 两条都还在, 不会静默掉一条
    expect(props.onConfirmLinks).toHaveBeenCalledWith([records[0], second])
  })
})
