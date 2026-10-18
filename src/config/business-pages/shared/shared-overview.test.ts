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
      { label: 'modules.overview.totalAmount', value: '174,732.78 元' },
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
    // 选中口径: 数值只算选中行(2 张 / 30 吨 / 400 元)
    // mock 的 t 不插值, 因此前缀就是 key 本身; 真实界面渲染为「已选 2 项」
    expect(selCount.label).toBe(
      'modules.overview.scopeSelection · modules.overview.documentCount',
    )
    expect(selCount.value).toBe('2 张')
    // 选中第 1、3 行: 重量 10+30=40, 金额 100+300=400
    expect(selWeight.value).toBe('40.000 吨')
    expect(selAmount.value).toBe('400.00 元')
    // 整页口径: 数值仍是本页 3 行, 且**带上了「本页合计」前缀**
    expect(pageCount.label).toBe(
      'modules.overview.scopePage · modules.overview.documentCount',
    )
    expect(pageCount.value).toBe('3 张')
    expect(pageWeight.value).toBe('60.000 吨')
    expect(pageAmount.value).toBe('600.00 元')
  })

  it('口径前缀与数值必须同步: 同一标签不能在同一屏读出两个数', () => {
    const items = buildScopedOverview({ buildItems, pageRows, selectedRows })
    // 六个 label 全部唯一 -> 不存在"同名标签两个数"
    const labels = items.map((item) => item.label)
    expect(new Set(labels).size).toBe(labels.length)
    // 每一项 label 都带口径前缀
    expect(
      labels.every((label) => label.includes('modules.overview.scope')),
    ).toBe(true)
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
