// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { PurchaseOrderPickerModal } from './PurchaseOrderPickerModal'
import {
  remainingLinkableQuota,
  remainingLinkableTon,
} from './purchase-order-picker-tonnage'

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
    actualWeightTon: null,
    issuedDone: false,
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
  actualWeightTon: null,
  issuedDone: false,
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

  /** 从可选的 mock prop 上安全取调用记录(render 返回的 props 类型里该字段是可选的)。 */
  const pickCallArg = (fn: unknown) =>
    (fn as { mock: { calls: Array<[unknown]> } }).mock.calls[0][0]

  /** 取 `onConfirmLinks` 收到的那一组 {record, allocatedTon}。 */
  const pickRecords = (picks: unknown) =>
    picks as Array<{ record: PurchaseOrderTonnageRecord; allocatedTon: number }>

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
          actualWeightTon: null,
          issuedDone: false,
        },
        new Map([['301', 4]]),
      ),
    ).toBe(6)
    // 无本单据关联时直接用服务端剩余
    expect(remainingLinkableTon(records[0], undefined)).toBe(10)
  })

  /**
   * P1-11 回归: 额度用尽的行不允许「显示一个正数 + 打『已关联完』标签」同屏矛盾。
   *
   * <p>数据取自实测的单据 C: 采购订单明细行 订货 2.300 / 已开 0, 而本单据已在它上面
   * 关联了 5 吨(手填未保存)。旧实现直接渲染服务端 `remainingWeight = 2.300`, 同时用
   * `remainingLinkableTon = 2.300 − 5 = −2.7 <= 0` 打上「已关联完」标签 —— 同一行既说
   * 「还剩 2.300」又说「已关联完」。修复后单元格取同一个出口 `remainingLinkableQuota`。</p>
   *
   * <p>注意是「本单已关联 5」这个差额让两种口径区分开: 若本单没关联过任何吨位, 服务端剩余
   * 与可关联额度同值, 这个用例就会变成"恰好通过"的空断言。</p>
   */
  it('额度用尽时额度列显示 0, 不与「已关联完」标签同屏出现正数', async () => {
    const exhausting: PurchaseOrderTonnageRecord = {
      ...records[0],
      purchaseOrderItemId: '356133791502172160',
      orderNo: 'PO-C-1',
      brand: '永钢',
      orderedWeight: 2.3,
      issuedWeight: 0,
      remainingWeight: 2.3,
      actualWeightTon: 0,
      issuedDone: false,
    }
    api.fetchPurchaseOrderTonnages.mockResolvedValue([exhausting])
    render({
      linkedTonByItemId: new Map([[exhausting.purchaseOrderItemId, 5]]),
    })
    await flush()
    await flush()

    // 额度用尽 → 默认隐藏; 打开开关让它可见
    const toggle = document.querySelector<HTMLInputElement>(
      '.price-compare-purchase-order-picker-toggle input[type="checkbox"]',
    )
    expect(toggle).not.toBeNull()
    act(() => {
      toggle?.click()
    })

    const row = tableRows()[0] as HTMLElement
    expect(row).toBeTruthy()
    const rowText = row.textContent ?? ''
    // 标签在: 额度已用尽(本单据已关联 5 > 可关联 2.3)
    expect(rowText).toContain('已关联完')

    /*
     * 只取「额度」那一格来断言, 不能拿整行文本: 同一行的「订货吨位」本来就是 2.300,
     * 整行 `not.toContain('2.300')` 会误判(实测第一次跑就踩到)。按表头列名定位单元格。
     */
    const modalTable = document.querySelector('.ant-modal .ant-table')
    const headers = Array.from(
      modalTable?.querySelectorAll('thead th') ?? [],
    ).map((th) => th.textContent?.trim() ?? '')
    const quotaIndex = headers.indexOf('剩余可关联吨位')
    expect(
      quotaIndex,
      `未找到「剩余可关联吨位」列头, 实得 ${JSON.stringify(headers)}`,
    ).toBeGreaterThan(-1)
    const quotaCell = row.querySelectorAll('td')[quotaIndex] as HTMLElement
    expect(quotaCell).toBeTruthy()
    expect(
      (quotaCell.textContent ?? '').trim(),
      '额度用尽的行该格必须是 0, 不能是服务端 remainingWeight 2.300',
    ).toBe('0.000')
  })

  it('remainingLinkableQuota: 数值 / 已关联量 / 是否用尽 由同一次计算给出', () => {
    const record: PurchaseOrderTonnageRecord = {
      ...records[0],
      orderedWeight: 2.3,
      issuedWeight: 0,
      remainingWeight: 2.3,
      actualWeightTon: 0,
    }
    const quota = remainingLinkableQuota(record, new Map([['301', 5]]))
    expect(quota.remaining).toBeCloseTo(-2.7, 8)
    expect(quota.linkedHere).toBe(5)
    expect(quota.exhausted).toBe(true)
    // 未用尽的情形同样收敛在同一处
    const fresh = remainingLinkableQuota(record, undefined)
    expect(fresh.remaining).toBeCloseTo(2.3, 8)
    expect(fresh.exhausted).toBe(false)
    // 标量出口与结构化出口必须一致(前者是后者的投影, 不是第二份实现)
    expect(remainingLinkableTon(record, new Map([['301', 5]]))).toBeCloseTo(
      quota.remaining,
      8,
    )
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
      actualWeightTon: null,
      issuedDone: false,
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
    // 回调形状变为「明细行 + 用户确认的分配吨位」: 此处只断言顺序, 分配量由专门用例覆盖
    expect(
      pickRecords(pickCallArg(props.onConfirmLinks)).map((pick) => pick.record),
    ).toEqual([second, records[0]])
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
      actualWeightTon: null,
      issuedDone: false,
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
      actualWeightTon: null,
      issuedDone: false,
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
    expect(
      pickRecords(pickCallArg(props.onConfirmLinks)).map((pick) => pick.record),
    ).toEqual([records[0], second])
  })

  it('分配吨位默认按勾选顺序摊报单吨位, 且可逐行手动改写后回传', async () => {
    const second: PurchaseOrderTonnageRecord = {
      ...records[0],
      purchaseOrderId: '99',
      purchaseOrderItemId: '302',
      orderNo: 'PO-302',
      orderedWeight: 70,
      issuedWeight: 0,
      remainingWeight: 70,
      actualWeightTon: null,
      issuedDone: false,
    }
    api.fetchPurchaseOrderTonnages.mockResolvedValue([records[0], second])
    // 本行报单 30 吨, 两条明细行各够: 默认先把 30 摊给第一条, 第二条拿 0
    const props = render({ reportedTon: 30, onConfirmLinks: vi.fn() })
    await flush()
    await flush()

    act(() => {
      checkInput('PO-88')?.click()
    })
    act(() => {
      checkInput('PO-302')?.click()
    })
    await flush()

    const allocInputs = () =>
      Array.from(
        document.querySelectorAll<HTMLInputElement>(
          '.price-compare-purchase-order-picker-alloc input',
        ),
      )
    // 默认分配: 30 全给第一条(订货 40 吃得下), 第二条 0
    expect(allocInputs().map((input) => Number(input.value))).toEqual([30, 0])

    // 手动改写为 18 / 12: 一单货覆盖两个批次时由业务决定归属, 不按勾选顺序定
    act(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method -- 原生 value setter 必须以输入元素为 receiver 调用
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set
      setter?.call(allocInputs()[0], '18')
      allocInputs()[0].dispatchEvent(new Event('input', { bubbles: true }))
      setter?.call(allocInputs()[1], '12')
      allocInputs()[1].dispatchEvent(new Event('input', { bubbles: true }))
    })
    await flush()
    act(() => {
      confirmButton()?.click()
    })

    expect(
      pickRecords(pickCallArg(props.onConfirmLinks)).map(
        (pick) => pick.allocatedTon,
      ),
    ).toEqual([18, 12])
  })

  it('分配合计超过本行报单吨位时禁用确认(后端同样校验 Σ ≤ 报单吨位)', async () => {
    const second: PurchaseOrderTonnageRecord = {
      ...records[0],
      purchaseOrderId: '99',
      purchaseOrderItemId: '302',
      orderNo: 'PO-302',
      orderedWeight: 70,
      issuedWeight: 0,
      remainingWeight: 70,
      actualWeightTon: null,
      issuedDone: false,
    }
    api.fetchPurchaseOrderTonnages.mockResolvedValue([records[0], second])
    // 报单只有 10 吨, 但两条明细行各可摊到 10 → 合计 20 > 10 必须拦住
    render({ reportedTon: 10, onConfirmLinks: vi.fn() })
    await flush()
    await flush()

    act(() => {
      checkInput('PO-88')?.click()
    })
    act(() => {
      checkInput('PO-302')?.click()
    })
    await flush()

    const allocInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        '.price-compare-purchase-order-picker-alloc input',
      ),
    )
    act(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method -- 原生 value setter 必须以输入元素为 receiver 调用
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set
      setter?.call(allocInputs[0], '10')
      allocInputs[0].dispatchEvent(new Event('input', { bubbles: true }))
      setter?.call(allocInputs[1], '10')
      allocInputs[1].dispatchEvent(new Event('input', { bubbles: true }))
    })
    await flush()

    expect(confirmButton()?.disabled).toBe(true)
    expect(document.body.textContent).toContain('超过本行报单吨位')
  })
})
