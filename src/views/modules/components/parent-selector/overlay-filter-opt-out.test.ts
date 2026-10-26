import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SELECTOR_FILTER_OMISSIONS,
  getParentCandidateFilterContract,
  getParentCandidateSelectorOmissions,
  type ParentCandidateFilterContract,
  type ParentCandidateSource,
} from '@/api/contracts/parent-candidate-contracts'
import { salesOrdersPageConfig } from '@/config/business-pages/operations/sales-order-page'
import type {
  ModuleFilterDefinition,
  ModulePageConfig,
} from '@/types/module-page'
import { buildOverlayFilterConfig } from './use-parent-selector-data'

/**
 * 导入弹层筛选区的口径锁定：**默认全放行 + 显式排除（opt-out）**。
 *
 * 这组用例存在的意义是「能区分两种口径」：
 * 旧的允许清单写法下，上游 5 个筛选只会显示 2 个（客户、项目）；
 * opt-out 下同一份输入必须显示 5 个（默认共享排除清单为空，全部放行）。
 * 因此断言不写"等于某个集合"就完事，而是显式断言 keyword / status / deliveryDate
 * 这些**旧口径下不会出现**的字段必须出现 —— 否则退回白名单时用例会静默变绿。
 *
 * <p>`referencedBy`（被引用状态）筛选已整体下线，不再作为任何用例的载体；
 * 「不会被带进弹层」这件事改由真实模块用例与默认排除清单为空来锁定。</p>
 */

/** 销售订单列表页真实存在的 5 个筛选，作为「上游有 5 个筛选」的标准输入。 */
const UPSTREAM_FILTERS: ModuleFilterDefinition[] = [
  { key: 'keyword', label: '订单编号', type: 'input' },
  { key: 'customerId', label: '客户', type: 'select' },
  { key: 'status', label: '单据状态', type: 'segmented' },
  { key: 'projectId', label: '项目', type: 'select' },
  { key: 'deliveryDate', label: '送货日期', type: 'dateRange' },
]

function makePageConfig(
  filters: ModuleFilterDefinition[],
  key: ModulePageConfig['key'] = 'sales-order',
): ModulePageConfig {
  return {
    key,
    title: '上游单据',
    kicker: '',
    description: '',
    filters,
    columns: [],
    detailFields: [],
    data: [],
    buildOverview: () => [],
  }
}

/** 能力齐全的请求契约：5 个筛选全都能变成 query 参数。 */
const FULL_CONTRACT: ParentCandidateFilterContract = {
  nativeFilterKeys: [
    'keyword',
    'customerId',
    'status',
    'projectId',
    'startDate',
    'endDate',
  ],
  dateRangeMapping: {
    deliveryDate: { startKey: 'startDate', endKey: 'endDate' },
  },
}

const ALL_SOURCES: ParentCandidateSource[] = [
  'purchase-order-import',
  'sales-order-purchase-source',
  'sales-order-outbound-import',
  'freight-sales-order-import',
  'customer-statement',
  'freight-statement',
]

function filterKeys(config: ModulePageConfig) {
  return config.filters.map((filter) => filter.key)
}

function filterOf(config: ModulePageConfig, key: string) {
  return config.filters.find((filter) => filter.key === key)
}

describe('buildOverlayFilterConfig（opt-out 口径）', () => {
  it('上游 5 个筛选、接口全支持时全部显示：默认排除清单为空', () => {
    const config = buildOverlayFilterConfig(
      'sales-order',
      makePageConfig(UPSTREAM_FILTERS),
      {},
      FULL_CONTRACT,
    )

    expect(filterKeys(config)).toEqual([
      'keyword',
      'customerId',
      'status',
      'projectId',
      'deliveryDate',
    ])
    // 关键区分点：这三项在旧的「只放行客户/项目」白名单下不会出现
    expect(filterKeys(config)).toContain('keyword')
    expect(filterKeys(config)).toContain('status')
    expect(filterKeys(config)).toContain('deliveryDate')
    // 旧白名单只有这两个，若口径退回白名单，下面这条会失败
    expect(filterKeys(config)).not.toEqual(['customerId', 'projectId'])
  })

  it('语义排除仍可逐源追加：接口支持也挡在弹层外', () => {
    // referencedBy 下线后，共享默认清单已清空（全放行）
    expect(DEFAULT_SELECTOR_FILTER_OMISSIONS).toEqual([])
    const config = buildOverlayFilterConfig(
      'sales-order',
      makePageConfig(UPSTREAM_FILTERS),
      {},
      // status 在 FULL_CONTRACT 里是受支持的 query 参数，排除只能来自语义清单
      { ...FULL_CONTRACT, selectorFilterOmissions: ['status'] },
    )

    expect(filterKeys(config)).not.toContain('status')
    expect(filterKeys(config)).toEqual([
      'keyword',
      'customerId',
      'projectId',
      'deliveryDate',
    ])
  })

  it('新增页面筛选无需再改第二处：接口支持即自动出现在弹层', () => {
    const pageWithExtra = makePageConfig([
      ...UPSTREAM_FILTERS,
      { key: 'salesName', label: '业务员', type: 'select' },
    ])
    const config = buildOverlayFilterConfig(
      'sales-order',
      pageWithExtra,
      {},
      {
        ...FULL_CONTRACT,
        nativeFilterKeys: [
          ...(FULL_CONTRACT.nativeFilterKeys ?? []),
          'salesName',
        ],
      },
    )

    expect(filterKeys(config)).toContain('salesName')
  })

  it('接口不接受的 key 不放行（否则是改了没反应死筛选）', () => {
    const pageWithUnsupported = makePageConfig([
      ...UPSTREAM_FILTERS,
      { key: 'warehouseId', label: '仓库', type: 'select' },
    ])
    const config = buildOverlayFilterConfig(
      'sales-order',
      pageWithUnsupported,
      {},
      FULL_CONTRACT,
    )

    expect(filterKeys(config)).not.toContain('warehouseId')
    // 其余照常全放行，不因为一个不支持的 key 收窄整体
    expect(filterKeys(config)).toHaveLength(5)
  })

  it('编辑器注入的固定筛选不占筛选格子（也不进用户 draft）', () => {
    const config = buildOverlayFilterConfig(
      'sales-order',
      makePageConfig(UPSTREAM_FILTERS),
      { customerId: '123' },
      FULL_CONTRACT,
    )

    expect(filterKeys(config)).not.toContain('customerId')
    expect(filterKeys(config)).toEqual([
      'keyword',
      'status',
      'projectId',
      'deliveryDate',
    ])
  })

  it('上游没有 keyword 时补一个输入框（候选检索主入口）', () => {
    const config = buildOverlayFilterConfig(
      'sales-order',
      makePageConfig([{ key: 'customerId', label: '客户', type: 'select' }]),
      {},
      FULL_CONTRACT,
    )

    expect(filterOf(config, 'keyword')).toMatchObject({ type: 'input' })
  })

  it('dateRange 保持单个筛选（不拆成起/止两格），segmented 保持胶囊类型', () => {
    const config = buildOverlayFilterConfig(
      'sales-order',
      makePageConfig(UPSTREAM_FILTERS),
      {},
      FULL_CONTRACT,
    )

    // 折行由工具行 flex-wrap 负责；这里锁定"整段区间仍是一个格子"
    expect(
      filterKeys(config).filter((key) => key === 'deliveryDate'),
    ).toHaveLength(1)
    expect(filterOf(config, 'deliveryDate')).toMatchObject({
      type: 'dateRange',
    })
    // segmented 按 ModuleFilterChip 渲染（胶囊 + 弹出选项），因此窄行放得下
    expect(filterOf(config, 'status')).toMatchObject({ type: 'segmented' })
  })

  it('dateRange 缺少 dateRangeMapping 时被能力守卫剔除', () => {
    const config = buildOverlayFilterConfig(
      'sales-order',
      makePageConfig(UPSTREAM_FILTERS),
      {},
      { ...FULL_CONTRACT, dateRangeMapping: {} },
    )

    expect(filterKeys(config)).not.toContain('deliveryDate')
  })
})

describe('真实模块：物流单导入销售订单', () => {
  it('销售订单 5 个筛选 → 弹层 4 个（status 无接口参数、referencedBy 筛选已下线）', () => {
    const contract = getParentCandidateFilterContract(
      'freight-sales-order-import',
    )
    const config = buildOverlayFilterConfig(
      'sales-order',
      salesOrdersPageConfig,
      {},
      contract,
    )

    expect(filterKeys(config)).toEqual([
      'keyword',
      'customerId',
      'projectId',
      'deliveryDate',
    ])
    /*
     * status 被剔除的原因是**接口能力**：后端
     * V2FreightBillController.salesOrderCandidates 只收 keyword / customerId /
     * customerName / projectId / projectName / settlementCompanyId /
     * startDate / endDate / currentRecordId，没有 status。
     * 放行它会让用户以为"按草稿过滤"生效，实际列表不变。
     */
    expect(filterKeys(config)).not.toContain('status')
    // referencedBy 筛选已整体下线（页面配置里已无此项），弹层不会再有它
    expect(filterKeys(config)).not.toContain('referencedBy')
    // 不是旧白名单的 2 个
    expect(filterKeys(config)).not.toEqual(['customerId', 'projectId'])
  })
})

describe('六个候选来源的守卫用例', () => {
  it.each(ALL_SOURCES)('%s：契约只声明请求参数，不再有显示白名单', (source) => {
    const contract = getParentCandidateFilterContract(source)

    /*
     * 「白名单声明」若被人加回来，这里的 key 集合就会多出字段。
     * 允许的只有三个：两个请求参数契约 + 一个语义排除清单覆盖。
     */
    const allowedKeys = [
      'dateRangeMapping',
      'nativeFilterKeys',
      'selectorFilterOmissions',
    ]
    for (const key of Object.keys(contract)) {
      expect(allowedKeys).toContain(key)
    }
    expect(Object.keys(contract)).toEqual(
      expect.arrayContaining(['dateRangeMapping', 'nativeFilterKeys']),
    )
    // 请求参数之外不应该再有"决定弹层显示哪些筛选"的声明
    expect(contract).not.toHaveProperty('allowedKeys')
    expect(contract).not.toHaveProperty('candidateFilterKeys')
    expect(contract).not.toHaveProperty('visibleFilterKeys')
  })

  it.each(ALL_SOURCES)('%s：显示的每个筛选都能真正变成请求参数', (source) => {
    const contract = getParentCandidateFilterContract(source)
    const config = buildOverlayFilterConfig(
      'sales-order',
      makePageConfig(UPSTREAM_FILTERS),
      {},
      contract,
    )
    const requestKeys = new Set([
      ...(contract.nativeFilterKeys || []),
      ...Object.keys(contract.dateRangeMapping || {}),
    ])

    // 漂移守卫：弹层里能改的筛选，必须都能进 query，否则是"改了没反应"
    for (const key of filterKeys(config)) {
      expect(requestKeys.has(key)).toBe(true)
    }
  })

  it.each(ALL_SOURCES)(
    '%s：已下线的 referencedBy 不会进入弹层筛选',
    (source) => {
      const contract = getParentCandidateFilterContract(source)
      const config = buildOverlayFilterConfig(
        'sales-order',
        makePageConfig(UPSTREAM_FILTERS),
        {},
        contract,
      )

      expect(filterKeys(config)).not.toContain('referencedBy')
      // 默认共享排除清单不再声明它（清单清空），逐源排除清单也不该再出现
      expect(DEFAULT_SELECTOR_FILTER_OMISSIONS).not.toContain('referencedBy')
      expect(getParentCandidateSelectorOmissions(source)).not.toContain(
        'referencedBy',
      )
      // 真实页面配置里也已没有该筛选，真实弹层同样不会有
      expect(
        filterKeys(
          buildOverlayFilterConfig(
            'sales-order',
            salesOrdersPageConfig,
            {},
            contract,
          ),
        ),
      ).not.toContain('referencedBy')
    },
  )
})
