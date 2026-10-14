// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement, useEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PricingQuoteResolution } from '@/api/market/pricing-quote-resolutions'
import type { MaterialPriceMatch } from '@/api/market/steel-quotes'
import type { ModuleLineItem } from '@/types/module-page'
import { SalesOrderNetPriceFiller } from './SalesOrderNetPriceFiller'

const {
  fetchMaterialPriceMatchesMock,
  fetchSteelQuoteCalendarsMock,
  fetchProjectPriceRulesMock,
  fetchPricingQuoteResolutionMock,
} = vi.hoisted(() => ({
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
}

/**
 * 观测部件：把明细与表单字段回写到外层 observed。
 *
 * <p>回写统一放在 effect 里（渲染期改外层变量会被 React Compiler 判为 immutability 违规，
 * 渲染期访问 ref 又是 refs 违规）；setFormValue 逐次合并 state，因此快照字段可整体断言。</p>
 */
function ObservedFiller({ observed }: { observed: ObservedState }) {
  const [items, setItems] = useState<ModuleLineItem[]>([
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
  ])
  const [fields, setFields] = useState<Record<string, unknown>>({})
  const observedRef = useRef(observed)
  useEffect(() => {
    observedRef.current.items = items
    observedRef.current.fields = fields
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

  const createObserved = (): ObservedState => ({ items: [], fields: {} })

  const mountObserved = async (observed: ObservedState) => {
    await act(async () => {
      root.render(createElement(ObservedFiller, { observed }))
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

  it('非交付核定状态不渲染取价按钮', async () => {
    await act(async () => {
      root.render(
        createElement(Harness, { initialItems: [row({})], status: '已审核' }),
      )
      await Promise.resolve()
    })
    expect(container.querySelector('button')).toBeNull()
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
  })

  it('解析失败提示同样落在信息区容器里(不会把面板压短)', async () => {
    fetchPricingQuoteResolutionMock.mockRejectedValue(new Error('boom'))
    const observed = createObserved()
    await mountObserved(observed)
    await openNetPriceDialog()

    const box = document.querySelector('.pricing-quote-summary')
    expect(box).not.toBeNull()
    expect(box?.textContent).toContain('取价基准解析失败')
    expect(box?.querySelector('.ant-alert')).not.toBeNull()
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
})
