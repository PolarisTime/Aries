// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement, useEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PricingQuoteResolution } from '@/api/market/pricing-quote-resolutions'
import type { MaterialPriceMatch } from '@/api/market/steel-quotes'
import type { ModuleLineItem } from '@/types/module-page'
import { bindAntdAppApi } from '@/utils/antd-app'
import { useNetPriceMatchStore } from '../net-price-match-store'
import { SalesOrderNetPriceFiller } from './SalesOrderNetPriceFiller'

/** 二次确认弹层的最小契约(modal.confirm 的入参)。 */
interface ConfirmOptions {
  title?: unknown
  content?: unknown
  onOk?: () => void
  onCancel?: () => void
}

const {
  confirmMock,
  confirmCalls,
  fetchMaterialPriceMatchesMock,
  fetchSteelQuoteCalendarsMock,
  fetchProjectPriceRulesMock,
  fetchPricingQuoteResolutionMock,
} = vi.hoisted(() => ({
  confirmCalls: [] as ConfirmOptions[],
  confirmMock: vi.fn(),
  fetchMaterialPriceMatchesMock: vi.fn(),
  fetchSteelQuoteCalendarsMock: vi.fn(),
  fetchProjectPriceRulesMock: vi.fn(),
  fetchPricingQuoteResolutionMock: vi.fn(),
}))

vi.mock('@/api/market/pricing-quote-resolutions', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/api/market/pricing-quote-resolutions')
    >()
  return {
    ...actual,
    fetchPricingQuoteResolution: fetchPricingQuoteResolutionMock,
  }
})

vi.mock('@/api/market/steel-quotes', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/api/market/steel-quotes')>()
  return {
    ...actual,
    fetchMaterialPriceMatches: fetchMaterialPriceMatchesMock,
    fetchSteelQuoteCalendars: fetchSteelQuoteCalendarsMock,
  }
})

vi.mock('@/api/master/project-price-rules', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/api/master/project-price-rules')>()
  return {
    ...actual,
    fetchProjectPriceRules: fetchProjectPriceRulesMock,
  }
})

const match = (overrides: Partial<MaterialPriceMatch>): MaterialPriceMatch => ({
  materialId: null,
  materialCode: null,
  brand: null,
  material: null,
  category: null,
  spec: null,
  length: null,
  status: '匹配',
  basePrice: null,
  price: null,
  quoteDate: '2026-09-22',
  period: '下午',
  ...overrides,
})

function Harness({
  initialItems,
  status,
  lastPriceRuleId,
}: {
  initialItems: ModuleLineItem[]
  status: string
  lastPriceRuleId?: string
}) {
  const [items, setItems] = useState(initialItems)
  return createElement(SalesOrderNetPriceFiller, {
    currentStatus: status,
    formValues: {
      deliveryDate: '2026-09-22',
      projectId: 'p1',
      projectName: '项目',
    },
    items,
    setItems: (updater) => setItems((prev) => updater(prev)),
    setFormValue: () => {},
    saving: false,
    projectOptions: [
      {
        id: 'p1',
        projectName: '项目',
        ...(lastPriceRuleId ? { lastPriceRuleId } : {}),
      },
    ],
  })
}

/** 观测状态：明细与 setFormValue 的落地值，供取价与保存载荷断言使用。 */
interface ObservedState {
  items: ModuleLineItem[]
  fields: Record<string, unknown>
  /** 用例侧改写明细的入口(模拟用户手工改单价)。 */
  replaceItems?: (items: ModuleLineItem[]) => void
}

/**
 * 观测部件：把明细与表单字段回写到外层 observed。
 *
 * <p>回写统一放在 effect 里（渲染期改外层变量会被 React Compiler 判为 immutability 违规，
 * 渲染期访问 ref 又是 refs 违规）；setFormValue 逐次合并 state，因此快照字段可整体断言。</p>
 */
function ObservedFiller({
  observed,
  initialItems,
}: {
  observed: ObservedState
  initialItems?: ModuleLineItem[]
}) {
  const [items, setItems] = useState<ModuleLineItem[]>(
    initialItems ?? [
      {
        id: 'r1',
        materialId: 'm1',
        brand: '中天',
        category: '螺纹钢',
        material: 'HRB400E',
        spec: '12',
        length: '9米',
        unitPrice: 1,
      },
    ],
  )
  const [fields, setFields] = useState<Record<string, unknown>>({})
  const observedRef = useRef(observed)
  useEffect(() => {
    observedRef.current.items = items
    observedRef.current.fields = fields
    observedRef.current.replaceItems = setItems
  }, [items, fields])
  return createElement(SalesOrderNetPriceFiller, {
    currentStatus: '交付核定',
    formValues: { deliveryDate: '2026-09-22', projectId: 'p1' },
    items,
    setItems: (updater) => setItems((prev) => updater(prev)),
    setFormValue: (key, value) =>
      setFields((prev) => ({ ...prev, [key]: value })),
    saving: false,
    projectOptions: [{ id: 'p1', projectName: '项目' }],
  })
}

describe('SalesOrderNetPriceFiller', () => {
  let container: HTMLDivElement
  let root: Root
  /** accept: 自动点确认; manual: 用例自行决定确认/取消。 */
  let confirmMode: 'accept' | 'manual'

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
    fetchMaterialPriceMatchesMock.mockReset()
    fetchSteelQuoteCalendarsMock.mockReset()
    fetchProjectPriceRulesMock.mockReset()
    fetchPricingQuoteResolutionMock.mockReset()
    confirmCalls.length = 0
    confirmMode = 'accept'
    confirmMock.mockReset()
    confirmMock.mockImplementation((options: ConfirmOptions) => {
      confirmCalls.push(options)
      // 默认自动确认(等价于用户点"取价并填入"); 需要验证"取消不改写"的用例切到 manual。
      if (confirmMode === 'accept') options.onOk?.()
    })
    // modal.confirm 没有静态回退: 生产由 AppAntdProvider 绑定, 测试里显式绑定。
    bindAntdAppApi({
      modal: { confirm: confirmMock },
    } as never)
    useNetPriceMatchStore.getState().clear()
    fetchProjectPriceRulesMock.mockResolvedValue([])
    fetchSteelQuoteCalendarsMock.mockResolvedValue([
      { quoteDate: '2026-09-22', periods: ['上午', '下午'] },
    ])
    fetchPricingQuoteResolutionMock.mockResolvedValue(resolution())
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    bindAntdAppApi(null)
    useNetPriceMatchStore.getState().clear()
    act(() => root.unmount())
    container.remove()
    document.querySelectorAll('.ant-modal-root').forEach((node) => {
      node.remove()
    })
  })

  const row = (overrides: Partial<ModuleLineItem>): ModuleLineItem => ({
    id: 'r1',
    materialId: 'm1',
    brand: '中天',
    category: '螺纹钢',
    material: 'HRB400E',
    spec: '12',
    length: '9米',
    unitPrice: 1,
    ...overrides,
  })

  /** 解析结果夹具：默认「送货日期当天有行情」，各用例按需覆盖。 */
  const resolution = (
    overrides: Partial<PricingQuoteResolution> = {},
  ): PricingQuoteResolution => ({
    projectId: 'p1',
    basis: 'DELIVERY',
    offsetDays: 0,
    settlePrevOnClosed: false,
    periodPolicy: 'AUTO',
    requestedPeriod: null,
    targetDate: '2026-09-22',
    targetIsTradingDay: true,
    quoteDate: '2026-09-22',
    period: '下午',
    quoteAvailable: true,
    suggestedDate: null,
    explanation: '送货日期 2026年09月22日 为交易日, 直接取当日行情',
    dateFallback: null,
    periodFallback: null,
    availablePeriods: ['上午', '下午'],
    ...overrides,
  })

  /** 按可见文字找工具栏按钮(工具栏里同时有「整单取网价」「重新核查网价」)。 */
  const buttonByText = (text: string) =>
    Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (node) => node.textContent?.includes(text),
    )

  const createObserved = (): ObservedState => ({ items: [], fields: {} })

  const mountObserved = async (
    observed: ObservedState,
    initialItems?: ModuleLineItem[],
  ) => {
    await act(async () => {
      root.render(createElement(ObservedFiller, { observed, initialItems }))
      await Promise.resolve()
    })
  }

  const openNetPriceDialog = async () => {
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  const clickOk = async () => {
    const okBtn = await waitForOkButton()
    await act(async () => {
      okBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  /** 点工具栏「重新核查网价」并等异步核查落地。 */
  const clickRecheck = async () => {
    await act(async () => {
      buttonByText('重新核查网价')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  /** 弹窗内的第 index 个 antd Select（顺序即渲染顺序: 价格规定 → 基准 → 时段策略 → 取价时段）。 */
  const modalSelect = (index: number) =>
    Array.from(
      document.querySelectorAll<HTMLElement>('.ant-modal .ant-select'),
    )[index]

  const pickSelectOption = async (
    select: HTMLElement | undefined,
    text: string,
  ) => {
    expect(select, '未找到目标下拉').toBeTruthy()
    await act(async () => {
      select?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const option = Array.from(
      document.querySelectorAll<HTMLElement>('.ant-select-item-option'),
    ).find((node) => node.textContent?.includes(text))
    expect(option, `下拉选项「${text}」未出现`).toBeTruthy()
    await act(async () => {
      option?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('非草稿/交付核定状态: 按钮置灰但可聚焦, 失焦前用 tooltip 说明原因(不静默禁用)', async () => {
    await act(async () => {
      root.render(
        createElement(Harness, { initialItems: [row({})], status: '已审核' }),
      )
      await Promise.resolve()
    })
    const applyBtn = buttonByText('整单取网价')
    expect(applyBtn, '仍要渲染按钮, 只是不可用').toBeTruthy()
    // aria-disabled 而非原生 disabled: 键盘用户仍能聚焦并读到原因(WCAG 2.5.8 命中区 + 说明可达)
    expect(applyBtn?.getAttribute('aria-disabled')).toBe('true')
    expect(applyBtn?.disabled).toBe(false)
    await act(async () => {
      applyBtn?.focus()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(document.body.textContent).toContain(
      '仅草稿与交付核定状态可整单取网价',
    )
    // 点击不打开取价弹层
    expect(document.body.textContent).not.toContain('按网价赋单价')
  })

  it('已审核状态点击整单取网价不会打开弹层', async () => {
    await act(async () => {
      root.render(
        createElement(Harness, { initialItems: [row({})], status: '已审核' }),
      )
      await Promise.resolve()
    })
    await act(async () => {
      buttonByText('整单取网价')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(document.querySelector('.ant-modal')).toBeNull()
  })

  it('草稿状态可用: 点击打开取价弹层', async () => {
    await act(async () => {
      root.render(
        createElement(Harness, { initialItems: [row({})], status: '草稿' }),
      )
      await Promise.resolve()
    })
    const applyBtn = buttonByText('整单取网价')
    expect(applyBtn?.getAttribute('aria-disabled')).toBe('false')
    await act(async () => {
      applyBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(document.body.textContent).toContain('按网价赋单价')
  })

  it('交付核定状态渲染「整单取网价」按钮', async () => {
    await act(async () => {
      root.render(
        createElement(Harness, { initialItems: [row({})], status: '交付核定' }),
      )
      await Promise.resolve()
    })
    expect(container.textContent).toContain('整单取网价')
  })

  it('取价后按所选价格规定加价填入单价, 无网价行保持原值', async () => {
    const observed: { items: ModuleLineItem[]; ruleId?: unknown } = {
      items: [],
    }
    fetchProjectPriceRulesMock.mockResolvedValue([
      { id: '50', name: '含税价', mode: 'ADD', amount: 30, sortOrder: 0 },
    ])
    fetchMaterialPriceMatchesMock.mockResolvedValue([
      match({ materialId: 'm1', price: '3400.00' }),
      // m2 无网价
      match({ materialId: 'm2', price: null, status: '无网价' }),
    ])

    function Stateful() {
      const [items, setItems] = useState<ModuleLineItem[]>([
        row({ id: 'r1', materialId: 'm1', unitPrice: 1 }),
        row({ id: 'r2', materialId: 'm2', unitPrice: 999 }),
      ])
      const [lastRuleId, setLastRuleId] = useState<unknown>(undefined)
      /*
       * 观测句柄包成 ref、回写统一放在 effect 里: 渲染期直接改外层变量会被 React Compiler
       * 判为 immutability 违规, 渲染期访问 ref 又是 refs 违规; 断言读到的仍是同一个 observed 对象。
       */
      const observedRef = useRef(observed)
      useEffect(() => {
        observedRef.current.items = items
        observedRef.current.ruleId = lastRuleId
      }, [items, lastRuleId])
      return createElement(SalesOrderNetPriceFiller, {
        currentStatus: '交付核定',
        formValues: {
          deliveryDate: '2026-09-22',
          projectId: 'p1',
        },
        items,
        setItems: (updater) => setItems((prev) => updater(prev)),
        setFormValue: (key, value) => {
          // 取价后会连续写入价格规定与 6 个取价快照字段: 这里只观测价格规定那一次。
          if (key === 'priceRuleId') setLastRuleId(value)
        },
        saving: false,
        projectOptions: [{ id: 'p1', projectName: '项目' }],
      })
    }

    await act(async () => {
      root.render(createElement(Stateful))
      await Promise.resolve()
    })
    // 打开弹层
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    // 确认取价
    const okBtn = await waitForOkButton()
    await act(async () => {
      okBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const byId = new Map(observed.items.map((i) => [i.id, i]))
    // 3400 + 30 = 3430
    expect(byId.get('r1')?.unitPrice).toBe(3430)
    // 无网价行保持原值
    expect(byId.get('r2')?.unitPrice).toBe(999)
    // 所选价格规定写入单据
    expect(observed.ruleId).toBe('50')
  })

  it('所选价格规定为减价时按减价填入', async () => {
    const observed: { items: ModuleLineItem[] } = { items: [] }
    fetchProjectPriceRulesMock.mockResolvedValue([
      { id: '60', name: '让利', mode: 'SUBTRACT', amount: 20, sortOrder: 0 },
    ])
    fetchMaterialPriceMatchesMock.mockResolvedValue([
      match({ materialId: 'm1', price: 3400 }),
    ])
    function Stateful() {
      const [items, setItems] = useState<ModuleLineItem[]>([
        row({ id: 'r1', materialId: 'm1', unitPrice: 1 }),
      ])
      // 同上: 观测句柄包成 ref, 在 effect 里回写, 避免渲染期修改外层变量
      const observedRef = useRef(observed)
      useEffect(() => {
        observedRef.current.items = items
      }, [items])
      return createElement(SalesOrderNetPriceFiller, {
        currentStatus: '交付核定',
        formValues: {
          deliveryDate: '2026-09-22',
          projectId: 'p1',
        },
        items,
        setItems: (updater) => setItems((prev) => updater(prev)),
        setFormValue: () => {},
        saving: false,
        projectOptions: [{ id: 'p1', projectName: '项目' }],
      })
    }
    await act(async () => {
      root.render(createElement(Stateful))
      await Promise.resolve()
    })
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const okBtn = await waitForOkButton()
    await act(async () => {
      okBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    // 3400 - 20 = 3380
    expect(observed.items[0]?.unitPrice).toBe(3380)
  })

  /** 解析成功：界面上应能直接读到基准日、实际取价日、实际时段与中文说明。 */
  it('解析成功时展示基准日/实际取价日/实际时段与说明', async () => {
    fetchPricingQuoteResolutionMock.mockResolvedValue(
      resolution({
        basis: 'ORDER',
        offsetDays: 2,
        targetDate: '2026-10-09',
        quoteDate: '2026-10-13',
        period: '中午',
        availablePeriods: ['上午', '中午'],
        explanation:
          '报单日期 2026年10月09日 为交易日, 取之后第 2 个交易日 2026年10月13日',
      }),
    )
    const observed = createObserved()
    await mountObserved(observed)
    await openNetPriceDialog()

    const modal = document.querySelector('.ant-modal')
    expect(modal?.textContent).toContain('取价基准日')
    expect(modal?.textContent).toContain('2026年10月09日')
    expect(modal?.textContent).toContain('实际取价日')
    expect(modal?.textContent).toContain('2026年10月13日')
    expect(modal?.textContent).toContain('实际取价时段')
    expect(modal?.textContent).toContain('中午')
    expect(modal?.textContent).toContain(
      '报单日期 2026年10月09日 为交易日, 取之后第 2 个交易日 2026年10月13日',
    )
  })

  /** 日期回退必须可见（醒目但不阻断）：展示后端给出的中文原因。 */
  it('dateFallback.applied=true 时展示日期回退原因', async () => {
    fetchPricingQuoteResolutionMock.mockResolvedValue(
      resolution({
        targetDate: '2026-09-21',
        quoteDate: '2026-09-18',
        dateFallback: {
          applied: true,
          from: '2026-09-21',
          to: '2026-09-18',
          reason:
            '送货日期 2026年09月21日 无行情(休市或未发布), 按最近的前一个交易日结算',
        },
      }),
    )
    const observed = createObserved()
    await mountObserved(observed)
    await openNetPriceDialog()

    const modal = document.querySelector('.ant-modal')
    expect(modal?.textContent).toContain('取价日期已回退')
    expect(modal?.textContent).toContain(
      '送货日期 2026年09月21日 无行情(休市或未发布), 按最近的前一个交易日结算',
    )
  })

  /** 时段回退同样必须可见：不能静默换成另一个时段。 */
  it('periodFallback.applied=true 时展示时段回退原因', async () => {
    fetchPricingQuoteResolutionMock.mockResolvedValue(
      resolution({
        periodPolicy: 'FIXED',
        requestedPeriod: '下午',
        period: '中午',
        periodFallback: {
          applied: true,
          from: '下午',
          to: '中午',
          reason: '当日没有「下午」行情, 已按可用时段「中午」取价',
        },
      }),
    )
    const observed = createObserved()
    await mountObserved(observed)
    await openNetPriceDialog()

    const modal = document.querySelector('.ant-modal')
    expect(modal?.textContent).toContain('取价时段已回退')
    expect(modal?.textContent).toContain(
      '当日没有「下午」行情, 已按可用时段「中午」取价',
    )
  })

  /** 人工覆盖：改时段策略与时段后用覆盖值重新解析，并以解析出的日期/时段取价。 */
  it('人工覆盖时段策略与时段后按覆盖值重新解析并取价', async () => {
    fetchPricingQuoteResolutionMock.mockImplementation(
      (_projectId: string, params: Record<string, unknown>) => {
        if (params?.period === '上午') {
          return Promise.resolve(
            resolution({
              periodPolicy: 'FIXED',
              requestedPeriod: '上午',
              quoteDate: '2026-09-26',
              period: '上午',
              availablePeriods: ['上午'],
            }),
          )
        }
        if (params?.periodPolicy === 'FIXED') {
          return Promise.resolve(
            resolution({
              periodPolicy: 'FIXED',
              requestedPeriod: '下午',
              quoteDate: '2026-09-25',
              period: '下午',
              availablePeriods: ['下午'],
            }),
          )
        }
        return Promise.resolve(resolution())
      },
    )
    fetchMaterialPriceMatchesMock.mockResolvedValue([
      match({ materialId: 'm1', price: '3400.00' }),
    ])
    const observed = createObserved()
    await mountObserved(observed)
    await openNetPriceDialog()

    // 弹窗内没有价格规定下拉: 第 1 个是基准, 第 2 个是时段策略。
    await pickSelectOption(modalSelect(1), '固定时段')
    expect(
      fetchPricingQuoteResolutionMock.mock.calls.at(-1)?.[1],
    ).toMatchObject({ periodPolicy: 'FIXED' })

    // 选固定时段后第 3 个下拉即取价时段。
    await pickSelectOption(modalSelect(2), '上午')
    expect(
      fetchPricingQuoteResolutionMock.mock.calls.at(-1)?.[1],
    ).toMatchObject({ periodPolicy: 'FIXED', period: '上午' })

    await clickOk()
    expect(fetchMaterialPriceMatchesMock.mock.calls[0]?.slice(0, 2)).toEqual([
      '2026-09-26',
      '上午',
    ])
  })

  /** 保存载荷：取价的 6 个快照字段必须随单据一起写入。 */
  it('取价后写入 6 个取价快照字段', async () => {
    fetchPricingQuoteResolutionMock.mockResolvedValue(
      resolution({
        basis: 'ORDER',
        offsetDays: 2,
        settlePrevOnClosed: true,
        targetDate: '2026-10-09',
        quoteDate: '2026-10-13',
        period: '中午',
      }),
    )
    fetchMaterialPriceMatchesMock.mockResolvedValue([
      match({ materialId: 'm1', price: '3400.00' }),
    ])
    const observed = createObserved()
    await mountObserved(observed)
    await openNetPriceDialog()
    await clickOk()

    expect(fetchMaterialPriceMatchesMock.mock.calls[0]?.slice(0, 2)).toEqual([
      '2026-10-13',
      '中午',
    ])
    expect(observed.fields).toMatchObject({
      priceTargetDate: '2026-10-09',
      priceQuoteDate: '2026-10-13',
      priceQuotePeriod: '中午',
      priceDateBasis: 'ORDER',
      priceDateOffsetDays: 2,
      priceClosedSettlePrev: true,
    })
  })

  /** 无行情：提示并阻止取价；采纳建议日期后按该日期重新解析并可正常取价。 */
  it('quoteAvailable=false 时提示并阻止取价, 采纳建议日期后重新解析', async () => {
    fetchPricingQuoteResolutionMock.mockImplementation(
      (_projectId: string, params: Record<string, unknown>) => {
        if (params?.quoteDate === '2026-10-09') {
          return Promise.resolve(
            resolution({
              basis: 'MANUAL',
              periodPolicy: 'MANUAL',
              targetDate: '2026-10-09',
              quoteDate: '2026-10-09',
              period: '中午',
              availablePeriods: ['上午', '中午'],
              explanation: '手工指定取价日期 2026年10月09日',
            }),
          )
        }
        return Promise.resolve(
          resolution({
            basis: 'MANUAL',
            periodPolicy: 'MANUAL',
            targetDate: '2026-10-11',
            quoteDate: '2026-10-11',
            period: null,
            quoteAvailable: false,
            suggestedDate: '2026-10-09',
            availablePeriods: [],
            explanation:
              '手工指定取价日期 2026年10月11日 当日无行情, 建议改为 2026年10月09日',
          }),
        )
      },
    )
    fetchMaterialPriceMatchesMock.mockResolvedValue([
      match({ materialId: 'm1', price: '3400.00' }),
    ])
    const observed = createObserved()
    await mountObserved(observed)
    await openNetPriceDialog()

    const modal = document.querySelector('.ant-modal')
    expect(modal?.textContent).toContain('实际取价日没有行情，无法取价')

    // 直接确认：不静默取价, 弹窗保持打开
    await clickOk()
    expect(fetchMaterialPriceMatchesMock).not.toHaveBeenCalled()
    expect(document.querySelector('.ant-modal')).not.toBeNull()

    // 采纳建议日期: 按建议日期重新解析
    const adoptBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-modal button'),
    ).find((btn) => btn.textContent?.includes('采纳建议日期'))
    expect(adoptBtn).toBeTruthy()
    await act(async () => {
      adoptBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(
      fetchPricingQuoteResolutionMock.mock.calls.at(-1)?.[1],
    ).toMatchObject({ basis: 'MANUAL', quoteDate: '2026-10-09' })
    expect(document.querySelector('.ant-modal')?.textContent).toContain('中午')

    await clickOk()
    expect(fetchMaterialPriceMatchesMock.mock.calls[0]?.slice(0, 2)).toEqual([
      '2026-10-09',
      '中午',
    ])
  })

  /**
   * 面板高度预算: jsdom 不做布局(所有元素 rect 都是 0), 因此用信息区里的**块级行结构**代表高度
   * —— 字段行数 / 说明(错误)槽位数 / 提示行数 / Space 块数。三态预算完全相同, 面板高度才可能差 0;
   * 一旦把错误"另起一行"(多一个槽位或 Alert 块), 预算立刻不等 ⇒ 用例变红。
   */
  const summaryHeightBudget = () => {
    const summary = document.querySelector('.pricing-quote-summary')
    expect(summary, '解析信息区容器不存在').not.toBeNull()
    return {
      blocks: summary?.querySelectorAll(':scope > .ant-space > .ant-space-item')
        .length,
      fields: summary?.querySelectorAll('.ant-descriptions-item').length,
      slots: summary?.querySelectorAll('.pricing-quote-summary-explanation')
        .length,
      alerts: summary?.querySelectorAll('.ant-alert').length,
    }
  }

  /**
   * 高度稳定性: 面板高度由内容决定, 而每次改覆盖值都会重新解析 ——
   * 「解析中」与「解析结果」必须是**同构骨架**(同样的四行描述 + 同一行说明位),
   * 否则弹层会随解析状态上下缩放一次(用户实测反馈: "下拉选择时窗口会上下缩放一下")。
   */
  it('解析信息区在「解析中」与「解析结果」两态同构(行数一致, 不会撑高/压短面板)', async () => {
    let resolveRequest: ((value: PricingQuoteResolution) => void) | undefined
    fetchPricingQuoteResolutionMock.mockReturnValue(
      new Promise<PricingQuoteResolution>((resolve) => {
        resolveRequest = resolve
      }),
    )
    const observed = createObserved()
    await mountObserved(observed)
    await openNetPriceDialog()

    const summary = () => document.querySelector('.pricing-quote-summary')
    const labelsOf = () =>
      Array.from(
        document.querySelectorAll(
          '.pricing-quote-summary .ant-descriptions-item-label',
        ),
      ).map((node) => node.textContent)

    const resolvingBox = summary()
    expect(resolvingBox, '解析中必须落在信息区容器里').not.toBeNull()
    expect(
      resolvingBox?.querySelector('.pricing-quote-summary-explanation')
        ?.textContent,
    ).toContain('正在解析取价基准…')
    // 骨架: 解析中就已经有四行口径(值为占位), 高度与结果态一致
    const resolvingLabels = labelsOf()
    expect(resolvingLabels).toHaveLength(4)
    const resolvingBudget = summaryHeightBudget()
    const resolvingValues = Array.from(
      document.querySelectorAll(
        '.pricing-quote-summary .ant-descriptions-item-content',
      ),
    ).map((node) => node.textContent)
    expect(resolvingValues).toEqual(['—', '—', '—', '—'])

    await act(async () => {
      resolveRequest?.(resolution())
      await Promise.resolve()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const resolvedBox = summary()
    expect(resolvedBox).toBe(resolvingBox)
    // 行数与标签逐字相同 ⇒ 解析落地时面板高度不变
    expect(labelsOf()).toEqual(resolvingLabels)
    expect(
      resolvedBox?.querySelectorAll('.ant-descriptions-item'),
    ).toHaveLength(4)
    expect(
      resolvedBox?.querySelector('.pricing-quote-summary-explanation')
        ?.textContent,
    ).toContain('送货日期 2026年09月22日 为交易日')
    expect(document.querySelectorAll('.pricing-quote-summary')).toHaveLength(1)
    // 高度预算逐项相同(块 / 字段行 / 说明位槽 / 提示行)
    expect(summaryHeightBudget()).toEqual(resolvingBudget)
  })

  /**
   * 错误态位移: 解析失败过去会把整块信息换成 Alert(四行口径消失、多出一个提示块), 面板上下跳一次。
   * 现在错误文案**就地替换说明位**、与说明共用同一个槽位, 所以失败态与结果态的面板高度预算必须
   * 完全相同; 若把错误改回"另起一行", 下面的预算断言立刻变红。
   */
  it('解析失败就地替换说明位: 错误态与结果态的面板高度差为 0(另起一行则变红)', async () => {
    const observed = createObserved()
    await mountObserved(observed)
    await openNetPriceDialog()

    // 先落地结果态, 记住高度预算
    expect(
      document.querySelector(
        '.pricing-quote-summary .pricing-quote-summary-explanation',
      )?.textContent,
    ).toContain('为交易日')
    const resolvedBudget = summaryHeightBudget()
    expect(resolvedBudget).toEqual({
      blocks: 2,
      fields: 4,
      slots: 1,
      alerts: 0,
    })

    // 解析接口打挂(用户场景: 后端 500 / 断网), 再改一项覆盖值触发重新解析 ⇒ 失败态
    fetchPricingQuoteResolutionMock.mockRejectedValue(new Error('boom'))
    await pickSelectOption(modalSelect(0), '每次手工选择')

    const box = document.querySelector('.pricing-quote-summary')
    expect(box?.textContent).toContain('取价基准解析失败')
    expect(box?.textContent).toContain('boom')
    // 就地替换: 错误落在说明位同一个槽位里, 不另起 Alert / 不新增块
    const slot = box?.querySelector('.pricing-quote-summary-explanation')
    expect(slot?.textContent).toContain('取价基准解析失败：boom')
    expect(slot?.querySelector('[role="alert"]')).not.toBeNull()
    expect(box?.querySelector('.ant-alert')).toBeNull()
    // 面板高度差 0: 块数 / 字段行数 / 槽位数 / 提示行数逐项相同
    expect(summaryHeightBudget()).toEqual(resolvedBudget)
  })

  /**
   * 说明折叠: 说明位默认收起成一行(长说明超出省略号), 用户按需展开看全文。
   * 展开开关必须是键盘可达的控件(WCAG 2.1.1), 并用 aria-expanded / aria-controls 说明状态与目标。
   */
  it('说明位可折叠: 默认一行, 展开开关可键盘聚焦且 aria-expanded 同步', async () => {
    const observed = createObserved()
    await mountObserved(observed)
    await openNetPriceDialog()

    const toggleOf = () =>
      document.querySelector<HTMLButtonElement>(
        '.pricing-quote-summary-explanation-toggle',
      )
    const toggle = toggleOf()
    expect(toggle, '结果态应给出展开开关').not.toBeNull()
    expect(toggle?.tagName).toBe('BUTTON')
    // 收起态: 说明压成一行, aria-expanded=false 指向说明文案
    expect(toggle?.getAttribute('aria-expanded')).toBe('false')
    expect(toggle?.textContent?.replace(/\s+/g, '')).toBe('展开')
    const textId = toggle?.getAttribute('aria-controls') ?? ''
    expect(textId).not.toBe('')
    expect(document.getElementById(textId)?.textContent).toContain('为交易日')
    expect(
      document.querySelector('.pricing-quote-summary-explanation--expanded'),
    ).toBeNull()

    // 键盘可达: 开关可聚焦(Enter/Space 的原生激活等价于 click, jsdom 不实现键盘激活)
    await act(async () => {
      toggle?.focus()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(document.activeElement).toBe(toggle)

    await act(async () => {
      toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(
      document.querySelector('.pricing-quote-summary-explanation--expanded'),
    ).not.toBeNull()
    expect(toggleOf()?.getAttribute('aria-expanded')).toBe('true')
    expect(toggleOf()?.textContent?.replace(/\s+/g, '')).toBe('收起')
    // 展开态仍是同一个槽位、仍只有一行 ⇒ 高度预算的"槽位数"不变
    expect(summaryHeightBudget()).toEqual({
      blocks: 2,
      fields: 4,
      slots: 1,
      alerts: 0,
    })
  })

  async function waitForOkButton() {
    for (let i = 0; i < 30; i += 1) {
      const btn = document.querySelector<HTMLButtonElement>(
        '.ant-modal-footer .ant-btn-primary',
      )
      if (btn) return btn
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
    }
    throw new Error('确认按钮未出现')
  }

  it('整单取价前二次确认: 会改写多少行写进确认框, 取消则一行都不改', async () => {
    confirmMode = 'manual'
    fetchProjectPriceRulesMock.mockResolvedValue([
      { id: '50', name: '含税价', mode: 'ADD', amount: 30, sortOrder: 0 },
    ])
    fetchMaterialPriceMatchesMock.mockResolvedValue([
      match({ materialId: 'm1', price: 3400 }),
    ])
    const observed = createObserved()
    await mountObserved(observed, [
      row({ id: 'r1', materialId: 'm1', unitPrice: 1 }),
    ])
    await openNetPriceDialog()
    await clickOk()

    expect(confirmCalls).toHaveLength(1)
    expect(String(confirmCalls[0].title)).toContain('确认整单取网价')
    expect(String(confirmCalls[0].content)).toContain('改写 1 行单价')
    expect(String(confirmCalls[0].content)).toContain('本单共 1 行')

    await act(async () => {
      confirmCalls[0].onCancel?.()
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    // 取消 = 不改写, 也只关闭了确认框(弹层仍开着由用户决定)
    expect(observed.items[0].unitPrice).toBe(1)
    expect(observed.fields.priceRuleId).toBeUndefined()
  })

  it('确认后整单写入并给出结果摘要(成功 / 无网价保持原值 / 跳过)', async () => {
    fetchProjectPriceRulesMock.mockResolvedValue([
      { id: '50', name: '含税价', mode: 'ADD', amount: 30, sortOrder: 0 },
    ])
    fetchMaterialPriceMatchesMock.mockResolvedValue([
      match({ materialId: 'm1', price: 3400 }),
      match({ materialId: 'm2', price: null, status: '无网价' }),
    ])
    const observed = createObserved()
    await mountObserved(observed, [
      row({ id: 'r1', materialId: 'm1', unitPrice: 1 }),
      row({ id: 'r2', materialId: 'm2', material: 'HRB500', unitPrice: 999 }),
      // 空行(没有物料身份)既不计成功也不计无网价, 计入"跳过"
      { id: 'r3' } as ModuleLineItem,
    ])
    await openNetPriceDialog()
    await clickOk()
    // 默认 confirmMode=accept: 确认框自动点确定
    expect(observed.items.map((item) => item.unitPrice)).toEqual([
      3430,
      999,
      undefined,
    ])
    expect(confirmCalls).toHaveLength(1)
    expect(String(confirmCalls[0].content)).toContain('改写 1 行')
    expect(container.textContent).toContain('取价结果')
    expect(container.textContent).toContain(
      '成功 1 行 · 无网价 1 行（保持原值，请手工填写）· 跳过 1 行',
    )
  })

  it('单价已等于网价时不弹二次确认(没有行会被改写)', async () => {
    confirmMode = 'manual'
    fetchProjectPriceRulesMock.mockResolvedValue([
      { id: '50', name: '含税价', mode: 'ADD', amount: 30, sortOrder: 0 },
    ])
    fetchMaterialPriceMatchesMock.mockResolvedValue([
      match({ materialId: 'm1', price: 3400 }),
    ])
    const observed = createObserved()
    await mountObserved(observed, [
      row({ id: 'r1', materialId: 'm1', unitPrice: 3430 }),
    ])
    await openNetPriceDialog()
    await clickOk()

    expect(confirmCalls).toHaveLength(0)
    expect(observed.items[0].unitPrice).toBe(3430)
    expect(container.textContent).toContain('成功 1 行')
  })

  it('网价核查: 未核查 → 重查给出汇总, 手工改单价后重查数字随之变化', async () => {
    fetchProjectPriceRulesMock.mockResolvedValue([
      { id: '50', name: '含税价', mode: 'ADD', amount: 30, sortOrder: 0 },
    ])
    fetchMaterialPriceMatchesMock.mockResolvedValue([
      match({ materialId: 'm1', price: 3400 }),
      match({ materialId: 'm2', price: null, status: '无网价' }),
    ])
    const observed = createObserved()
    await mountObserved(observed, [
      // r1 单价已经是网价 + 加价 30
      row({ id: 'r1', materialId: 'm1', unitPrice: 3430 }),
      row({ id: 'r2', materialId: 'm2', unitPrice: 999 }),
    ])
    expect(container.textContent).toContain('网价匹配：2 行未核查')

    await clickRecheck()
    expect(container.textContent).toContain(
      '本单 2 行单价均与网价一致（1 行无网价，请手工填写）',
    )
    expect(useNetPriceMatchStore.getState().entries.r1?.state).toBe('MATCHED')
    expect(useNetPriceMatchStore.getState().entries.r2?.state).toBe('NO_PRICE')

    // 手工把 r1 改成与网价不一致: 汇总仍显示"上次核查"的结果(核查是显式动作, 不随输入自动漂移)
    await act(async () => {
      observed.replaceItems?.([
        row({ id: 'r1', materialId: 'm1', unitPrice: 3200 }),
        row({ id: 'r2', materialId: 'm2', unitPrice: 999 }),
      ])
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(container.textContent).toContain(
      '本单 2 行单价均与网价一致（1 行无网价，请手工填写）',
    )

    // 重查后数字才变化: 1 行与网价不一致
    await clickRecheck()
    expect(container.textContent).toContain('本单 2 行，1 行单价与网价不一致')
    expect(useNetPriceMatchStore.getState().entries.r1?.state).toBe('MISMATCH')
    // 问题行清单: 数量与可访问入口
    expect(container.textContent).toContain('网价匹配明细（1 行待处理）')
  })

  it('问题行清单在受控弹层里列出不匹配行', async () => {
    fetchProjectPriceRulesMock.mockResolvedValue([
      { id: '50', name: '含税价', mode: 'ADD', amount: 30, sortOrder: 0 },
    ])
    fetchMaterialPriceMatchesMock.mockResolvedValue([
      match({ materialId: 'm1', price: 3400 }),
    ])
    const observed = createObserved()
    await mountObserved(observed, [
      row({ id: 'r1', materialId: 'm1', material: 'HRB400E', unitPrice: 3200 }),
    ])
    await clickRecheck()
    expect(container.textContent).toContain('本单 1 行，1 行单价与网价不一致')

    await act(async () => {
      buttonByText('网价匹配明细')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const modal = Array.from(document.querySelectorAll('.ant-modal')).find(
      (m) => m.textContent?.includes('网价匹配明细'),
    )
    expect(modal).toBeTruthy()
    expect(modal?.textContent).toContain('HRB400E')
    // 差额是文字而非只放在悬浮提示里(键盘/读屏可达): 应有 3,430.00, 当前 3,200.00
    expect(modal?.textContent).toContain('3,430.00')
    expect(modal?.textContent).toContain('3,200.00')
    expect(modal?.textContent).toContain('定位到该行')
  })

  it('整单取价后自动重查一次: 行内标识与汇总立即反映新单价', async () => {
    fetchProjectPriceRulesMock.mockResolvedValue([
      { id: '50', name: '含税价', mode: 'ADD', amount: 30, sortOrder: 0 },
    ])
    fetchMaterialPriceMatchesMock.mockResolvedValue([
      match({ materialId: 'm1', price: 3400 }),
    ])
    const observed = createObserved()
    await mountObserved(observed, [
      row({ id: 'r1', materialId: 'm1', unitPrice: 1 }),
    ])
    expect(container.textContent).toContain('网价匹配：1 行未核查')

    await openNetPriceDialog()
    await clickOk()

    // 取价后自动重查: 写入的单价就是网价口径 ⇒ 立即变成"一致"
    expect(useNetPriceMatchStore.getState().entries.r1?.state).toBe('MATCHED')
    expect(container.textContent).toContain('本单 1 行单价均与网价一致')
  })

  it('核查失败(该日无行情)时给出原因, 不改动已有匹配结果', async () => {
    fetchProjectPriceRulesMock.mockResolvedValue([])
    fetchMaterialPriceMatchesMock.mockResolvedValue([])
    fetchPricingQuoteResolutionMock.mockResolvedValue(
      resolution({ quoteAvailable: false, period: null }),
    )
    const observed = createObserved()
    await mountObserved(observed, [
      row({ id: 'r1', materialId: 'm1', unitPrice: 1 }),
    ])
    await clickRecheck()
    expect(container.textContent).toContain('实际取价日没有行情，无法取价')
    expect(useNetPriceMatchStore.getState().entries.r1).toBeUndefined()
  })
})
