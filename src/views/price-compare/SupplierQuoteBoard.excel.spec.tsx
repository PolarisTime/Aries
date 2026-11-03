// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import i18n from 'i18next'
import type { SupplierPriceGrid } from '@/api/market/supplier-price-lists'

/*
 * 报价表的 Excel 式操作（区域选择 / Delete / Tab / Ctrl+D / Ctrl+R / 算式 / 异常价 /
 * 批量调价 / 列宽）。纯逻辑由 `supplier-quote-*.ts` 的单测覆盖，这里验的是**接线**：
 * 按键真的落到了草稿、焦点真的移动了、列宽真的记住了。
 */

const priceApi = vi.hoisted(() => ({
  fetchSpecRows: vi.fn(),
  fetchSupplierPriceGrid: vi.fn(),
  addSupplierPriceColumn: vi.fn(),
  saveSupplierPriceColumnItems: vi.fn(),
  removeSupplierPriceColumn: vi.fn(),
}))

const supplierApi = vi.hoisted(() => ({ fetchSupplierOptions: vi.fn() }))
const materialBrands = vi.hoisted(() => ({ useMaterialBrands: vi.fn() }))
const permissions = vi.hoisted(() => ({ canWrite: true }))
const feedback = vi.hoisted(() => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  modal: { confirm: vi.fn() },
}))

vi.mock('@/api/market/supplier-price-lists', () => priceApi)
vi.mock('@/api/master/supplier-options', () => supplierApi)
vi.mock('@/hooks/useMaterialBrands', () => materialBrands)
vi.mock('@/utils/antd-app', () => feedback)
vi.mock('@/hooks/usePermission', () => ({
  useHasPermission: () => permissions.canWrite,
}))

import { SupplierQuotePage } from './SupplierQuotePage'

const ROW_A = {
  brand: '中天',
  category: '直条',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
}
const ROW_B = {
  brand: '中天',
  category: '直条',
  material: 'HRB400E',
  spec: 14,
  length: '9米',
}

const SUPPLIER = {
  id: 's1',
  supplierCode: 'S001',
  supplierName: '浙江铁都钢材有限公司',
  brands: ['中天'],
  value: 's1',
  label: '浙江铁都钢材有限公司',
}

const COLUMN = {
  listId: 'l1',
  supplierId: 's1',
  supplierName: '浙江铁都钢材有限公司',
  quotedOn: '2026-10-29',
  updatedAt: null,
  warehouse: null,
  version: 3,
}

/** 永钢那一列（异常价用例里才有价格）。 */
const COLUMN_WY = { ...COLUMN, listId: 'l2', supplierName: '永钢集团' }

/** 中天一行 3280、一行 3300；这是「单价 4 位数字」的常见形态。 */
function gridOfZhongtian(): SupplierPriceGrid {
  return {
    brandName: '中天',
    columns: [COLUMN],
    rows: [
      {
        ...ROW_A,
        prices: { l1: 3280 },
        priceStatuses: { l1: 'NORMAL' },
        remarks: {},
      },
      {
        ...ROW_B,
        prices: { l1: 3300 },
        priceStatuses: {},
        remarks: {},
      },
    ],
  }
}

/**
 * 异常价边界夹具：两行的最低价都是 3280。
 *
 * <p>3280 × 1.05 = 3444 —— 恰好 5% **不算**异常，3445 才算。用两行同基准的不同价把
 * 「≥」与「>」两种口径区分开：若实现写成 `>=`，12 那一行会被错标。</p>
 */
function gridOfYonggang(): SupplierPriceGrid {
  return {
    brandName: '永钢',
    columns: [COLUMN_WY],
    rows: [
      {
        ...ROW_A,
        prices: { l2: 3444 },
        priceStatuses: {},
        remarks: {},
      },
      {
        ...ROW_B,
        prices: { l2: 3445 },
        priceStatuses: {},
        remarks: {},
      },
    ],
  }
}

/** 保存载荷里不含 brand（品牌由价格表列本身确定），断言时从行夹具里剔除。 */
const withoutBrand = (row: Record<string, unknown>) => {
  const { brand: _brand, ...rest } = row
  return rest
}

/** 自动保存的防抖时长是 800ms：等过去再断言。 */
const flushAutosave = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 900))
  })
}

describe('供应商报价表：Excel 式网格操作', () => {
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

    permissions.canWrite = true
    priceApi.fetchSpecRows.mockReset().mockResolvedValue([ROW_A, ROW_B])
    priceApi.fetchSupplierPriceGrid
      .mockReset()
      .mockResolvedValue(gridOfZhongtian())
    priceApi.addSupplierPriceColumn.mockReset().mockResolvedValue(COLUMN)
    priceApi.saveSupplierPriceColumnItems.mockReset().mockResolvedValue({
      ...COLUMN,
      version: 4,
    })
    priceApi.removeSupplierPriceColumn.mockReset().mockResolvedValue(undefined)
    supplierApi.fetchSupplierOptions.mockReset().mockResolvedValue([SUPPLIER])
    materialBrands.useMaterialBrands = vi.fn(() => ['中天', '永钢'])
    feedback.message.success.mockReset()
    feedback.message.error.mockReset()
    feedback.message.info.mockReset()
    feedback.message.warning.mockReset()
    feedback.modal.confirm.mockReset()

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

  const flush = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  /** 轮询等待某个断言条件成立（网格与价格是异步回来的，固定 flush 次数不稳）。 */
  async function waitFor(predicate: () => boolean, timeout = 2000) {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeout) {
      if (predicate()) return
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
      })
    }
  }

  async function render() {
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
    await flush()
    await waitFor(
      () =>
        container.querySelectorAll(
          '.ant-table-tbody tr:not(.ant-table-measure-row)',
        ).length > 0,
    )
    // 价格回显（服务端 3280/3300）也等一等：逐格断言都基于它
    await waitFor(() => cellInput('中天 HRB400E 12 9米')?.value === '3280')
  }

  const cellInput = (label: string) =>
    container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)

  /** 往格子里敲文本（等价用户输入）。 */
  async function typeInto(input: HTMLInputElement | null, value: string) {
    expect(input, '未找到目标格').not.toBeNull()
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set?.call(input, value)
      input?.dispatchEvent(new Event('input', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  /**
   * 键盘事件。
   *
   * <p>键盘操作挂在表格容器上（捕获阶段），所以事件必须从格子往上冒泡 —— 直接派发到格子本身，
   * 才能真正验证「焦点在格子里的按键」这条路，而不是绕过组件直接调内部函数。</p>
   */
  async function keyDown(
    target: Element | null,
    key: string,
    options: KeyboardEventInit = {},
  ) {
    expect(target, '未找到按键目标').not.toBeNull()
    // cancelable 必须为真：只有可取消的事件才能用 defaultPrevented 判断「表格有没有拦截这个键」
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key,
      ...options,
    })
    await act(async () => {
      target?.dispatchEvent(event)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    return event
  }

  /**
   * 指针按下（选区入口）。
   *
   * <p>jsdom 没有 PointerEvent，用 MouseEvent 派发同名事件即可 —— React 的
   * `onPointerDown` 是按事件类型注册的，`button` / `shiftKey` 也从 MouseEvent 上读。</p>
   */
  async function pointerDown(
    target: Element | null,
    options: MouseEventInit = {},
  ) {
    expect(target, '未找到指针目标').not.toBeNull()
    await act(async () => {
      target?.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          button: 0,
          ...options,
        }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('Tab / Shift+Tab 在可写格子间横向移动（行优先）', async () => {
    await render()

    const first = cellInput('中天 HRB400E 12 9米')
    const second = cellInput('中天 HRB400E 14 9米')
    await act(async () => {
      first?.focus()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(document.activeElement).toBe(first)

    // 只有一个定尺列：Tab 走到下一行
    await keyDown(first, 'Tab')
    expect(document.activeElement).toBe(second)

    // Shift+Tab 回到上一行
    await keyDown(second, 'Tab', { shiftKey: true })
    expect(document.activeElement).toBe(first)
  })

  it('Delete 清空选区：走草稿 + 自动保存，载荷里少一条', async () => {
    await render()

    const target = cellInput('中天 HRB400E 12 9米')
    await pointerDown(target)
    await keyDown(target, 'Delete')
    await flushAutosave()

    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledTimes(1)
    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledWith(
      'l1',
      3,
      [{ ...withoutBrand(ROW_B), price: 3300 }],
    )
    // 界面同步清空
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('')
    expect(feedback.message.success).toHaveBeenCalled()
  })

  it('Shift+单击扩成两格选区后 Ctrl+D 向下填充', async () => {
    await render()

    const source = cellInput('中天 HRB400E 12 9米')
    const target = cellInput('中天 HRB400E 14 9米')
    await pointerDown(source)
    await pointerDown(target, { shiftKey: true })
    // 工具栏如实报出选中格数
    expect(container.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.selectionCount', { count: 2 }),
    )

    await keyDown(source, 'd', { ctrlKey: true })

    // 源格 3280 填到下一行（覆盖原来的 3300）
    expect(cellInput('中天 HRB400E 14 9米')?.value).toBe('3280')
    expect(feedback.message.success).toHaveBeenCalled()

    // 不只改界面：草稿要真的落库（整列替换，两行都提交）
    await flushAutosave()
    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledTimes(1)
    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledWith(
      'l1',
      3,
      [
        // ROW_A 服务端带 priceStatus=NORMAL，整列替换必须原样带回（否则状态被重置）
        { ...withoutBrand(ROW_A), price: 3280, priceStatus: 'NORMAL' },
        { ...withoutBrand(ROW_B), price: 3280 },
      ],
    )
  })

  it('Esc 清掉选区：否则有选区时 Ctrl+D / Ctrl+R 会一直被表格拦截', async () => {
    await render()

    const cell = cellInput('中天 HRB400E 12 9米')
    await pointerDown(cell)
    expect(container.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.selectionCount', { count: 1 }),
    )

    // 焦点在格子里、还没开始输入（没有 data-editing）：Esc 归表格，用来收掉选区
    await keyDown(cell, 'Escape')
    expect(container.textContent).not.toContain(
      i18n.t('priceCompare.supplierPrice.selectionCount', { count: 1 }),
    )
  })

  it('Enter 求值算式：在当前价上加 50（3280 → 3330），半截算式不落草稿', async () => {
    await render()

    const cell = cellInput('中天 HRB400E 12 9米')
    // 半截算式不落草稿：只有回车才整体求值
    await typeInto(cell, '3280+50')
    await keyDown(cell, 'Enter')

    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3330')
    expect(feedback.message.warning).not.toHaveBeenCalled()
  })

  it('算式非法时提示并保持原价（不落草稿、不发保存）', async () => {
    await render()

    const cell = cellInput('中天 HRB400E 12 9米')
    await typeInto(cell, '3200+')
    await keyDown(cell, 'Enter')

    // `3200+` 是半截算式：求值失败。文本留在格子里让用户就地改，但**不能**落草稿
    expect(feedback.message.warning).toHaveBeenCalledTimes(1)
    await flushAutosave()
    expect(priceApi.saveSupplierPriceColumnItems).not.toHaveBeenCalled()
    // 失焦后文本被丢弃，格子回到已提交值（服务端价 3280）
    await act(async () => {
      cell?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3280')
  })

  it('异常价边界：恰好高 5%（3444）不标黄，超过（3445）标黄', async () => {
    supplierApi.fetchSupplierOptions.mockResolvedValue([
      { ...SUPPLIER, brands: ['中天', '永钢'] },
    ])
    // 商品资料里也要有永钢：列只按「该品牌真实经营的材质 × 定尺」生成
    priceApi.fetchSpecRows.mockResolvedValue([
      ROW_A,
      ROW_B,
      { ...ROW_A, brand: '永钢' },
      { ...ROW_B, brand: '永钢' },
    ])
    // 两行的中天都报 3280：这样 12 行的基准与 14 行相同，3444/3445 才构成同一基准下的边界
    const flatZhongtian: SupplierPriceGrid = {
      brandName: '中天',
      columns: [COLUMN],
      rows: [
        { ...ROW_A, prices: { l1: 3280 }, priceStatuses: {}, remarks: {} },
        { ...ROW_B, prices: { l1: 3280 }, priceStatuses: {}, remarks: {} },
      ],
    }
    priceApi.fetchSupplierPriceGrid.mockImplementation((brandName: string) =>
      Promise.resolve(brandName === '永钢' ? gridOfYonggang() : flatZhongtian),
    )

    await render()

    const boundary = cellInput('永钢 HRB400E 12 9米')
    const over = cellInput('永钢 HRB400E 14 9米')
    expect(boundary?.value).toBe('3444')
    expect(over?.value).toBe('3445')

    expect(boundary?.classList.contains('supplier-price-cell-abnormal')).toBe(
      false,
    )
    expect(over?.classList.contains('supplier-price-cell-abnormal')).toBe(true)
    // 基准价（本行最低）不标黄
    expect(
      cellInput('中天 HRB400E 12 9米')?.classList.contains(
        'supplier-price-cell-abnormal',
      ),
    ).toBe(false)
  })

  it('批量调价 +50：选中的格子按当前价相对调整', async () => {
    await render()

    const cell = cellInput('中天 HRB400E 12 9米')
    await pointerDown(cell)

    const batchButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find((node) =>
      node.textContent?.includes(
        i18n.t('priceCompare.supplierPrice.batchAdjust'),
      ),
    )
    expect(batchButton).toBeDefined()
    await act(async () => {
      batchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // 弹窗在 portal 里（挂在 document.body 上），不在 container 内
    const modalInput = document.querySelector<HTMLInputElement>(
      `.ant-modal input[aria-label="${i18n.t('priceCompare.supplierPrice.batchAdjust')}"]`,
    )
    expect(modalInput, '未打开批量调价弹窗').not.toBeNull()
    await typeInto(modalInput, '+50')

    const okButton = document.querySelector<HTMLButtonElement>(
      '.ant-modal-footer .ant-btn-primary',
    )
    expect(okButton).not.toBeNull()
    await act(async () => {
      okButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3330')
    expect(feedback.message.success).toHaveBeenCalled()
  })

  it('列宽可用键盘调整并写入本地记忆（拖动之外的等价路径）', async () => {
    await render()

    const handle = container.querySelector<HTMLElement>(
      '.supplier-price-col-resize',
    )
    expect(handle, '表头没有列宽把手').not.toBeNull()
    // 默认 64px（4 位数字）
    expect(handle?.getAttribute('aria-valuenow')).toBe('64')

    await keyDown(handle, 'ArrowRight')

    expect(handle?.getAttribute('aria-valuenow')).toBe('72')
    const stored = JSON.parse(
      window.localStorage.getItem('aries:supplier-quote-widths:s1') ?? '{}',
    ) as Record<string, Record<string, number>>
    expect(
      Object.values(stored).flatMap((columns) => Object.values(columns)),
    ).toContain(72)

    // Home 恢复默认
    await keyDown(handle, 'Home')
    expect(handle?.getAttribute('aria-valuenow')).toBe('64')
  })

  /*
   * 离开格子前统一收尾算式（blur / Tab / ↑↓）。
   *
   * 敲算式是"边想边敲"，用户经常敲完直接按 Tab / 点下一格；这时如果只是把文本丢掉，
   * 数据就静默丢了。所以离开前必须整体求值一次。
   */
  it('输入 3200+50 后按 Tab：草稿 3250，900ms 后保存载荷为 3250 且不残留 3200', async () => {
    await render()

    const cell = cellInput('中天 HRB400E 12 9米')
    await typeInto(cell, '3200+50')
    await keyDown(cell, 'Tab')

    // 离开即提交：格子里显示结果而不是原文本
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3250')

    await flushAutosave()
    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledTimes(1)
    const payload = priceApi.saveSupplierPriceColumnItems.mock.calls[0]?.[2] as
      | { price: number }[]
      | undefined
    expect(payload?.map((item) => item.price)).toEqual([3250, 3300])
    // 明确锁住"不残留原价"：3200 不该出现在任何条目里
    expect(payload?.map((item) => item.price)).not.toContain(3200)
  })

  it('输入算式后失焦（点别处）同样提交，不需要回车', async () => {
    await render()

    const cell = cellInput('中天 HRB400E 12 9米')
    await typeInto(cell, '3200+50')
    await act(async () => {
      cell?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3250')
    await flushAutosave()
    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledWith(
      'l1',
      3,
      [
        { ...withoutBrand(ROW_A), price: 3250, priceStatus: 'NORMAL' },
        { ...withoutBrand(ROW_B), price: 3300 },
      ],
    )
  })

  it('失败的算式离开格子时回退到已提交值，且只提示一次', async () => {
    await render()

    const cell = cellInput('中天 HRB400E 12 9米')
    await typeInto(cell, '3200+')
    await keyDown(cell, 'Tab')

    // 回退到服务端价，不残留半截算式
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3280')
    // Tab 收尾 + 随后的 blur 不能重复报警（同一段文本只处理一次）
    expect(feedback.message.warning).toHaveBeenCalledTimes(1)
    await flushAutosave()
    expect(priceApi.saveSupplierPriceColumnItems).not.toHaveBeenCalled()
  })

  /*
   * 去重只作用于**一次编辑会话**。
   *
   * Tab 收尾后紧接着的 blur 不能再提交一次（否则同一个算式会算两遍），但用户回头对同一格
   * 再敲一次同样的算式时必须照常生效 —— 两者靠"新一轮输入就清标记"区分。
   */
  it('同一格连续两次 +50：第二次仍然生效（3330 → 3380）', async () => {
    await render()

    const cell = cellInput('中天 HRB400E 12 9米')
    await typeInto(cell, '+50')
    await keyDown(cell, 'Tab')
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3330')

    // 回到同一格，再敲一次一模一样的 +50
    await typeInto(cellInput('中天 HRB400E 12 9米'), '+50')
    await keyDown(cellInput('中天 HRB400E 12 9米'), 'Tab')
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3380')

    await flushAutosave()
    const payload = priceApi.saveSupplierPriceColumnItems.mock.calls[0]?.[2] as
      | { price: number }[]
      | undefined
    expect(payload?.map((item) => item.price)).toEqual([3380, 3300])
  })

  it('Esc 放弃后重输同一算式仍生效', async () => {
    await render()

    const cell = cellInput('中天 HRB400E 12 9米')
    await typeInto(cell, '+50')
    // Esc = 放弃本次输入：不回显、不提交
    await keyDown(cell, 'Escape')
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3280')

    // 重新输入同样的 +50，不能被「已处理」标记吞掉
    await typeInto(cellInput('中天 HRB400E 12 9米'), '+50')
    await keyDown(cellInput('中天 HRB400E 12 9米'), 'Tab')
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3330')
  })

  /*
   * Delete 与"正在输入"的关系：一旦格子里有未提交文本，Delete 属于输入框（删字符），
   * 表格不能把整块选区清空 —— 否则敲到一半想删个字会把一片价格删掉。
   */
  it('正在输入时 Delete 不拦截：不清选区，交给输入框', async () => {
    await render()

    const cell = cellInput('中天 HRB400E 12 9米')
    await pointerDown(cell)
    await typeInto(cell, '3290')

    const del = await keyDown(cell, 'Delete')
    expect(del.defaultPrevented).toBe(false)
    // 值仍是刚敲的 3290，没有被清成空
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3290')
    expect(cellInput('中天 HRB400E 12 9米')?.getAttribute('data-editing')).toBe(
      'true',
    )
  })

  it('未输入时 Delete 才由表格清格（与上一条互为对照）', async () => {
    await render()

    const cell = cellInput('中天 HRB400E 12 9米')
    await pointerDown(cell)

    const del = await keyDown(cell, 'Delete')
    expect(del.defaultPrevented).toBe(true)
    await flushAutosave()
    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledWith(
      'l1',
      3,
      [{ ...withoutBrand(ROW_B), price: 3300 }],
    )
  })

  it('批量调价：空输入时确认按钮禁用（不再静默返回）', async () => {
    await render()

    await pointerDown(cellInput('中天 HRB400E 12 9米'))
    const batchButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find((node) =>
      node.textContent?.includes(
        i18n.t('priceCompare.supplierPrice.batchAdjust'),
      ),
    )
    await act(async () => {
      batchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const okButton = () =>
      document.querySelector<HTMLButtonElement>(
        '.ant-modal-footer .ant-btn-primary',
      )
    expect(okButton()?.disabled).toBe(true)

    const modalInput = document.querySelector<HTMLInputElement>(
      `.ant-modal input[aria-label="${i18n.t('priceCompare.supplierPrice.batchAdjust')}"]`,
    )
    await typeInto(modalInput, '+50')
    expect(okButton()?.disabled).toBe(false)
  })

  it('「已选 N 格」只算可写格：商品资料里没有的组合不计入', async () => {
    supplierApi.fetchSupplierOptions.mockResolvedValue([
      { ...SUPPLIER, brands: ['中天', '永钢'] },
    ])
    // 永钢只有 12 这一档：14 的格子不存在（矩形选区里有个洞）
    priceApi.fetchSpecRows.mockResolvedValue([
      ROW_A,
      ROW_B,
      { ...ROW_A, brand: '永钢' },
    ])
    priceApi.fetchSupplierPriceGrid.mockImplementation((brandName: string) =>
      Promise.resolve(
        brandName === '永钢'
          ? {
              brandName: '永钢',
              columns: [COLUMN_WY],
              rows: [
                {
                  ...ROW_A,
                  prices: { l2: 3400 },
                  priceStatuses: {},
                  remarks: {},
                },
              ],
            }
          : gridOfZhongtian(),
      ),
    )
    await render()

    // 从 中天14（第 2 行第 1 列）Shift 扩展到 永钢12（第 1 行第 2 列）
    await pointerDown(cellInput('中天 HRB400E 14 9米'))
    await pointerDown(cellInput('永钢 HRB400E 12 9米'), { shiftKey: true })

    // 矩形是 2×2 = 4 格，但 永钢14 不存在 → 只有 3 格可写
    expect(container.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.selectionCount', { count: 3 }),
    )
  })

  /*
   * 最低价高亮：只有 class 而没有样式时，用户分不出「最便宜」和「普通价」。
   * 强调色取 success 系 token，与异常价（warning 黄）/ 选中态（primary 蓝）分属不同色系。
   */
  it('本行最低价格子的强调色只在样式表里（组件不再内联色值）', async () => {
    await render()

    const cheapest = cellInput('中天 HRB400E 12 9米')
    expect(cheapest?.classList.contains('supplier-price-cheapest')).toBe(true)
    // 唯一的色值来源是 supplier-price.css 的 .supplier-price-cheapest（success 色系，
    // 与异常价 warning、选中态 primary 区分）；组件里若重新加内联样式这里会红
    expect(cheapest?.getAttribute('style')).toBeNull()

    // 选中态与最低价可以同时成立：样式表里 selected 声明更靠后，视觉以选区为准
    await pointerDown(cheapest)
    expect(cheapest?.classList.contains('supplier-price-cell-selected')).toBe(
      true,
    )
  })

  it('异常价的 Tooltip 文案写明高出的比例与本行最低价', async () => {
    supplierApi.fetchSupplierOptions.mockResolvedValue([
      { ...SUPPLIER, brands: ['中天', '永钢'] },
    ])
    priceApi.fetchSpecRows.mockResolvedValue([
      ROW_A,
      ROW_B,
      { ...ROW_A, brand: '永钢' },
      { ...ROW_B, brand: '永钢' },
    ])
    const flatZhongtian: SupplierPriceGrid = {
      brandName: '中天',
      columns: [COLUMN],
      rows: [
        { ...ROW_A, prices: { l1: 3280 }, priceStatuses: {}, remarks: {} },
        { ...ROW_B, prices: { l1: 3280 }, priceStatuses: {}, remarks: {} },
      ],
    }
    priceApi.fetchSupplierPriceGrid.mockImplementation((brandName: string) =>
      Promise.resolve(brandName === '永钢' ? gridOfYonggang() : flatZhongtian),
    )
    await render()

    const abnormal = cellInput('永钢 HRB400E 14 9米')
    expect(abnormal).not.toBeNull()
    /*
     * 键盘聚焦即打开说明气泡（antd Tooltip 的 hover 触发同时响应 focus；React 19 监听
     * focusin，所以两个焦点事件都要派发）。这也是读屏 / 键盘用户读到「高出多少」的路径。
     */
    await act(async () => {
      abnormal?.dispatchEvent(
        new MouseEvent('mouseover', { bubbles: true, relatedTarget: null }),
      )
      await new Promise((resolve) => setTimeout(resolve, 300))
    })
    const bubble = document.querySelector<HTMLElement>('.ant-tooltip')
    expect(bubble, '聚焦异常价后未渲染出说明气泡').not.toBeNull()
    expect(bubble?.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.abnormalPrice', {
        ratio: 5,
        min: 3280,
      }),
    )
  })
})
