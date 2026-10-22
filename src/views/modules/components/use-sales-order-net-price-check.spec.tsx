// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { MaterialPriceMatch } from '@/api/market/steel-quotes'
import { salesOrdersPageConfig } from '@/config/business-pages/operations/sales-order-page'
import type { ModuleRecord } from '@/types/module-page'
import { useNetPriceMatchStore } from '../net-price-match-store'
import { NetPriceMatchChip } from './NetPriceMatchChip'
import { SalesOrderNetPriceCheck } from './SalesOrderNetPriceCheck'
import { resetNetPriceCheckState } from './use-sales-order-net-price-check'

/**
 * 只读详情面（详情弹窗 / 列表行「+」展开）的网价匹配自动核查。
 *
 * <p>背景（真实缺陷）: 「网价匹配」列的取值来自页面级快照, 原先只有编辑器的取价组件会写入。
 * 只读详情面没有取价工具栏, 于是这一列在详情页永远是「未核查」, 提示语还让用户去点一个
 * 不存在的按钮。这里锁定三件事:</p>
 * <ol>
 *   <li>单据有取价快照时，按**当时的**取价日/规则核查，不按今天的项目配置重算；</li>
 *   <li>无快照时按与编辑器相同的优先级（单据记录 → 项目上次使用 → 唯一一条）确定规则；</li>
 *   <li>确定不出口径（多条规定且无记录）或当日无行情时**不猜**：不写任何匹配结论。</li>
 * </ol>
 */

const {
  fetchMaterialPriceMatchesMock,
  fetchPricingQuoteResolutionMock,
  fetchProjectPriceRulesMock,
  fetchProjectOptionsMock,
  fetchProjectQuoteConfigMock,
} = vi.hoisted(() => ({
  fetchMaterialPriceMatchesMock: vi.fn(),
  fetchPricingQuoteResolutionMock: vi.fn(),
  fetchProjectPriceRulesMock: vi.fn(),
  fetchProjectOptionsMock: vi.fn(),
  fetchProjectQuoteConfigMock: vi.fn(),
}))

vi.mock('@/api/market/steel-quotes', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/api/market/steel-quotes')>()
  return { ...actual, fetchMaterialPriceMatches: fetchMaterialPriceMatchesMock }
})

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

vi.mock('@/api/master/project-price-rules', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/api/master/project-price-rules')>()
  return { ...actual, fetchProjectPriceRules: fetchProjectPriceRulesMock }
})

vi.mock('@/api/master/project-options', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/api/master/project-options')>()
  return {
    ...actual,
    fetchProjectOptions: fetchProjectOptionsMock,
    fetchProjectQuoteConfig: fetchProjectQuoteConfigMock,
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
  quoteDate: '2026-10-16',
  period: '上午',
  ...overrides,
})

/** 一条位于网价索引里的行: materialId 命中 → 网价 3220。 */
const pricedRow = match({ materialId: 'm1', price: 3220 })

const record = (overrides: Partial<ModuleRecord> = {}): ModuleRecord => ({
  id: 'order-1',
  projectId: 'p1',
  customerId: 'c1',
  orderDate: '2026-10-15',
  deliveryDate: '2026-10-16',
  items: [
    {
      id: 'r1',
      materialId: 'm1',
      brand: '萍钢',
      category: '直条',
      material: 'HRB400E',
      spec: '22',
      length: '9米',
      unitPrice: 3270,
    },
  ],
  ...overrides,
})

describe('只读详情面的网价核查', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    useNetPriceMatchStore.getState().clear()
    resetNetPriceCheckState()
    fetchMaterialPriceMatchesMock.mockReset()
    fetchPricingQuoteResolutionMock.mockReset()
    fetchProjectPriceRulesMock.mockReset()
    fetchProjectOptionsMock.mockReset()
    fetchProjectQuoteConfigMock.mockReset()
    fetchMaterialPriceMatchesMock.mockResolvedValue([pricedRow])
    fetchProjectQuoteConfigMock.mockResolvedValue({})
    fetchProjectPriceRulesMock.mockResolvedValue([])
    fetchProjectOptionsMock.mockResolvedValue([])
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    useNetPriceMatchStore.getState().clear()
    resetNetPriceCheckState()
  })

  const mount = (nextRecord: ModuleRecord | null) => {
    act(() => {
      root.render(
        createElement(SalesOrderNetPriceCheck, { record: nextRecord }),
      )
    })
  }

  const waitFor = async (predicate: () => boolean, label: string) => {
    const startedAt = Date.now()
    while (!predicate()) {
      if (Date.now() - startedAt > 2000) {
        throw new Error(`等待超时: ${label}`)
      }
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })
    }
  }

  const entries = () => useNetPriceMatchStore.getState().entries

  it('单据有取价快照时按快照的取价日/价格规定核查, 不再重复解析', async () => {
    mount(
      record({
        priceQuoteDate: '2026-10-16',
        priceQuotePeriod: '上午',
        priceRuleId: 'rule-1',
        priceFloatMode: 'ADD',
        priceFloatValue: 50,
      }),
    )

    await waitFor(() => entries().r1 !== undefined, '写入核查结论')

    // 单价 3270 = 网价 3220 + 加价 50 → 匹配
    expect(entries().r1).toMatchObject({
      state: 'MATCHED',
      expectedPrice: 3270,
      currentPrice: 3270,
    })
    // 快照齐备时不调解析接口（历史单据不能被今天的配置重新解释）
    expect(fetchPricingQuoteResolutionMock).not.toHaveBeenCalled()
    expect(fetchProjectPriceRulesMock).not.toHaveBeenCalled()
    expect(fetchProjectOptionsMock).not.toHaveBeenCalled()
    const [quoteDate, period, options] =
      fetchMaterialPriceMatchesMock.mock.calls[0]
    expect(quoteDate).toBe('2026-10-16')
    expect(period).toBe('上午')
    expect(options).toEqual({ source: undefined, region: undefined })
  })

  it('无快照时按「单据记录 → 项目上次使用」取规则, 并带项目的数据源/地区取行情', async () => {
    fetchPricingQuoteResolutionMock.mockResolvedValue({
      projectId: 'p1',
      basis: 'DELIVERY',
      offsetDays: 0,
      priceClosedSettleDirection: 'NEXT',
      priceClosedSettleDays: 2,
      periodPolicy: 'AUTO',
      targetIsTradingDay: true,
      quoteDate: '2026-10-16',
      period: '上午',
      quoteAvailable: true,
    })
    fetchProjectPriceRulesMock.mockResolvedValue([
      {
        id: 'rule-1',
        name: '加价 30',
        mode: 'ADD',
        amount: 30,
        sortOrder: 0,
      },
    ])
    fetchProjectOptionsMock.mockResolvedValue([
      {
        id: 'p1',
        value: 'p1',
        label: '海宁项目',
        customerId: 'c1',
        projectCode: 'XM-1',
        projectName: '海宁项目',
        lastPriceRuleId: 'rule-1',
        allowedBrands: [],
        allowedMaterials: [],
      },
    ])
    fetchProjectQuoteConfigMock.mockResolvedValue({
      quoteSource: 'MYSTEEL',
      quoteRegion: '杭州',
    })
    mount(
      record({ items: [{ ...(record().items ?? [])[0], unitPrice: 3250 }] }),
    )

    await waitFor(() => entries().r1 !== undefined, '写入核查结论')

    // 单价 3250 = 网价 3220 + 加价 30 → 匹配
    expect(entries().r1).toMatchObject({
      state: 'MATCHED',
      expectedPrice: 3250,
    })
    expect(fetchProjectOptionsMock).toHaveBeenCalledWith('c1')
    expect(fetchMaterialPriceMatchesMock.mock.calls[0][2]).toEqual({
      source: 'MYSTEEL',
      region: '杭州',
    })
  })

  it('多条价格规定且单据未记录时不猜: 不写结论, 并留下失败原因', async () => {
    fetchPricingQuoteResolutionMock.mockResolvedValue({
      projectId: 'p1',
      basis: 'DELIVERY',
      offsetDays: 0,
      priceClosedSettleDirection: 'NEXT',
      priceClosedSettleDays: 2,
      periodPolicy: 'AUTO',
      targetIsTradingDay: true,
      quoteDate: '2026-10-16',
      period: '上午',
      quoteAvailable: true,
    })
    fetchProjectPriceRulesMock.mockResolvedValue([
      { id: 'rule-1', name: '加价 30', mode: 'ADD', amount: 30, sortOrder: 0 },
      {
        id: 'rule-2',
        name: '减价 20',
        mode: 'SUBTRACT',
        amount: 20,
        sortOrder: 1,
      },
    ])
    mount(record())

    await waitFor(
      () =>
        useNetPriceMatchStore.getState().documents['order-1']?.status ===
        'error',
      '记录失败原因',
    )

    expect(entries()).toEqual({})
    expect(
      useNetPriceMatchStore.getState().documents['order-1']?.error,
    ).toContain('价格规定')
    // 规则未定时不该去拉行情
    expect(fetchMaterialPriceMatchesMock).not.toHaveBeenCalled()
  })

  it('当日无行情时不写结论(保持未核查), 并说明原因', async () => {
    fetchPricingQuoteResolutionMock.mockResolvedValue({
      projectId: 'p1',
      basis: 'DELIVERY',
      offsetDays: 0,
      priceClosedSettleDirection: 'NEXT',
      priceClosedSettleDays: 2,
      periodPolicy: 'AUTO',
      targetIsTradingDay: false,
      quoteDate: null,
      period: null,
      quoteAvailable: false,
    })
    mount(record())

    await waitFor(
      () =>
        useNetPriceMatchStore.getState().documents['order-1']?.status ===
        'error',
      '记录失败原因',
    )

    expect(entries()).toEqual({})
    expect(fetchMaterialPriceMatchesMock).not.toHaveBeenCalled()
  })

  it('单价被字段级权限脱敏(全空)时不核查, 不发任何请求', async () => {
    mount(
      record({
        items: [{ ...(record().items ?? [])[0], unitPrice: null }],
      }),
    )

    await act(async () => {
      await Promise.resolve()
    })
    expect(fetchPricingQuoteResolutionMock).not.toHaveBeenCalled()
    expect(fetchMaterialPriceMatchesMock).not.toHaveBeenCalled()
    expect(entries()).toEqual({})
  })

  it('销售订单配置的挂载点写库后, 行内标识读到真实结论(不再停在「未核查」)', async () => {
    const extras = salesOrdersPageConfig.renderDetailExtras
    expect(typeof extras).toBe('function')
    const target = record({
      priceQuoteDate: '2026-10-16',
      priceQuotePeriod: '上午',
      priceFloatMode: 'ADD',
      priceFloatValue: 50,
    })

    act(() => {
      root.render(
        createElement(
          'div',
          null,
          extras?.({ record: target }),
          createElement(NetPriceMatchChip, { itemId: 'r1' }),
        ),
      )
    })

    await waitFor(
      () => (container.textContent ?? '').includes('匹配'),
      '行内标识读到匹配结论',
    )
    expect(entries().r1?.state).toBe('MATCHED')
    expect(container.textContent).not.toContain('未核查')
  })

  it('同一张单被两处同时展示时只核查一次, 关掉一处不清另一处的结果', async () => {
    const target = record({
      priceQuoteDate: '2026-10-16',
      priceQuotePeriod: '上午',
      priceFloatMode: 'ADD',
      priceFloatValue: 50,
    })
    const second = document.createElement('div')
    document.body.appendChild(second)
    const secondRoot = createRoot(second)

    mount(target)
    act(() => {
      secondRoot.render(
        createElement(SalesOrderNetPriceCheck, { record: target }),
      )
    })
    await waitFor(() => entries().r1 !== undefined, '写入核查结论')
    expect(fetchMaterialPriceMatchesMock).toHaveBeenCalledTimes(1)

    // 关掉其中一处(例如详情弹窗), 行展开处的标识不能退回「未核查」
    act(() => secondRoot.unmount())
    second.remove()
    expect(entries().r1?.state).toBe('MATCHED')

    // 两处都关掉后才清理这张单的结果
    act(() => root.unmount())
    expect(entries().r1).toBeUndefined()
    container.remove()
    // afterEach 还会再 unmount 一次, 这里重新挂一个空 root 满足其调用
    root = createRoot(container)
  })
})
