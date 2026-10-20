import { describe, expect, it, vi } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'

vi.mock('i18next', () => ({
  default: {
    t: (key: string) =>
      ({
        'modules.units.documentSheet': '张',
        'modules.units.ton': '吨',
        'modules.units.yuan': '元',
      })[key] ?? key,
  },
}))

import {
  buildAmountWeightOverview,
  buildScopedOverview,
} from '@/config/business-pages/shared/shared-overview'

describe('业务列表汇总单位', () => {
  it('在单据数量、重量和金额后显示对应单位', () => {
    const rows = [
      {
        id: '1',
        totalWeight: 55.833,
        totalAmount: 174732.78,
      } as ModuleRecord,
    ]

    expect(buildAmountWeightOverview(rows, 'totalAmount')).toEqual([
      { label: 'modules.overview.documentCount', value: '1 张' },
      { label: 'modules.overview.totalWeight', value: '55.833 吨' },
      { label: 'modules.overview.totalAmount', value: '174732.78 元' },
    ])
  })
})

describe('汇总口径标签(勾选后不得静默换数)', () => {
  const pageRows = [
    { id: '1', totalWeight: 10, totalAmount: 100 },
    { id: '2', totalWeight: 20, totalAmount: 200 },
    { id: '3', totalWeight: 30, totalAmount: 300 },
  ] as ModuleRecord[]
  const selectedRows = [pageRows[0], pageRows[2]]

  const buildItems = (rows: ModuleRecord[]) =>
    buildAmountWeightOverview(rows, 'totalAmount')

  it('未勾选时只返回本页合计, 标签保持原样(不加前缀)', () => {
    const items = buildScopedOverview({
      buildItems,
      pageRows,
      selectedRows: [],
    })
    expect(items.map((item) => item.label)).toEqual([
      'modules.overview.documentCount',
      'modules.overview.totalWeight',
      'modules.overview.totalAmount',
    ])
    expect(items[0].value).toBe('3 张')
  })

  it('勾选后先给「已选 N 项」口径, 再并列「本页合计」—— 两个数字各有名字', () => {
    const items = buildScopedOverview({ buildItems, pageRows, selectedRows })
    expect(items).toHaveLength(6)

    const [selCount, selWeight, selAmount, pageCount, pageWeight, pageAmount] =
      items
    // 选中口径: 数值只算选中行(2 张 / 40 吨 / 400 元)
    // mock 的 t 不插值, 因此 scope 就是 key 本身; 真实界面渲染为「已选 2 项」
    expect(selCount.scope).toBe('modules.overview.scopeSelection')
    expect(selCount.label).toBe('modules.overview.documentCount')
    expect(selCount.value).toBe('2 张')
    // 选中第 1、3 行: 重量 10+30=40, 金额 100+300=400
    expect(selWeight.value).toBe('40.000 吨')
    expect(selAmount.value).toBe('400.00 元')
    // 整页口径: 数值仍是本页 3 行, 口径挂在 scope 上, label 保持短名
    expect(pageCount.scope).toBe('modules.overview.scopePage')
    expect(pageCount.label).toBe('modules.overview.documentCount')
    expect(pageCount.value).toBe('3 张')
    expect(pageWeight.value).toBe('60.000 吨')
    expect(pageAmount.value).toBe('600.00 元')
  })

  /**
   * 口径与数值必须同步 —— 同一个标签不能在同一屏读出两个数。
   *
   * <p>改版后 label 刻意复用短名（单据数量/总重量/总金额），口径移到 `scope` 上由渲染层
   * 分组显示。因此不变量从「label 全唯一」升级为「**(scope, label) 全唯一**」：
   * 同一口径内不允许出现两个同名指标（那才会真的读串），跨口径重名则是预期的
   * —— 它们分属两个带标题的组。</p>
   */
  it('口径与数值必须同步: 同一口径内不能出现同名指标', () => {
    const items = buildScopedOverview({ buildItems, pageRows, selectedRows })
    // 勾选态下每一项都必须有口径，否则渲染层无法归组、数值会失去归属
    expect(items.every((item) => Boolean(item.scope))).toBe(true)
    const scopedLabels = items.map((item) => `${item.scope}||${item.label}`)
    expect(new Set(scopedLabels).size).toBe(scopedLabels.length)
    // 两个口径各自完整：选中组与整页组都覆盖三个指标
    const scopes = items.map((item) => item.scope)
    expect(new Set(scopes).size).toBe(2)
  })

  it('只选 1 行时口径也正确(边界)', () => {
    const items = buildScopedOverview({
      buildItems,
      pageRows,
      selectedRows: [pageRows[1]],
    })
    expect(items[0].value).toBe('1 张')
    expect(items[1].value).toBe('20.000 吨')
  })
})
