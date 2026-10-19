import { describe, expect, it } from 'vitest'
import type { ModulePageConfig } from '@/types/module-page'
import { buildRouterHref } from '@/utils/router-search'
import {
  buildRouteFilterSyncKey,
  buildRouteFilterSyncState,
  consumeCreateIntentSearch,
  consumeOpenDetailIntentSearch,
  consumeParentImportIntentSearch,
  consumeRouteFilterSearch,
  consumeRouteKeywordSearch,
  ONE_SHOT_INTENT_PARAMS,
  parseRouteParams,
  ROUTE_FILTER_PARAMS,
  ROUTE_KEYWORD_PARAMS,
  shouldConsumeRouteKeyword,
  supportsFilterField,
} from '@/views/modules/use-business-grid-route-sync'

const purchaseOrderConfig: ModulePageConfig = {
  key: 'purchase-order',
  title: '采购订单',
  kicker: '',
  description: '',
  primaryNoKey: 'orderNo',
  filters: [],
  columns: [],
  detailFields: [],
  data: [],
  buildOverview: () => [],
}

const configWithStatus = {
  filters: [{ key: 'status' }, { key: 'keyword' }],
} as unknown as ModulePageConfig

describe('parseRouteParams', () => {
  it('解析详情深链参数', () => {
    const params = parseRouteParams('?docNo=PO-001&openDetail=1')
    expect(params.docNo).toBe('PO-001')
    expect(params.shouldOpenDetail).toBe(true)
    expect(params.routeKeyword).toBe('PO-001')
  })

  it('还原 TanStack Router 为字符串编码的雪花 ID', () => {
    const params = parseRouteParams(
      '?sourceModule=sales-order&sourceRecordId=%22350692799655452672%22&counterpartyId=%221983421000000000001%22',
    )

    expect(params.sourceRecordId).toBe('350692799655452672')
    expect(params.initialValues.counterpartyId).toBe('1983421000000000001')
  })

  it('解析被 TanStack Router 编码的创建标记', () => {
    expect(parseRouteParams('?create=%221%22').shouldCreate).toBe(true)
    expect(parseRouteParams('?openDetail=%221%22').shouldOpenDetail).toBe(true)
  })

  it('解析 trackId 与来源模块', () => {
    const params = parseRouteParams(
      '?trackId=1983421000000000001&sourceModule=material&sourceRecordId=100&openDetail=1',
    )
    expect(params.trackId).toBe('1983421000000000001')
    expect(params.sourceModule).toBe('material')
    expect(params.sourceRecordId).toBe('100')
  })

  it('解析待处理筛选意图 status', () => {
    const params = parseRouteParams('?status=待审核')
    expect(params.status).toBe('待审核')
    expect(params.referencedBy).toBe('')
    expect(params.routeKeyword).toBe('')
    expect(params.shouldOpenDetail).toBe(false)
  })

  it('解析下游模块关联筛选意图', () => {
    expect(parseRouteParams('?referencedBy=freight-bill').referencedBy).toBe(
      'freight-bill',
    )
    expect(parseRouteParams('?referencedBy=none').referencedBy).toBe('none')
  })

  it('解析客户筛选深链参数', () => {
    const params = parseRouteParams('?customerId=1983421000000000001')
    expect(params.customerId).toBe('1983421000000000001')
  })

  it('空查询串返回全空值', () => {
    const params = parseRouteParams('')
    expect(params.docNo).toBe('')
    expect(params.trackId).toBe('')
    expect(params.status).toBe('')
    expect(params.shouldOpenDetail).toBe(false)
  })

  it('消费新建意图时移除 create 参数并保留其他查询条件', () => {
    expect(
      consumeCreateIntentSearch(
        '?create=1&counterpartyId=100&counterpartyName=客户A',
      ),
    ).toBe('counterpartyId=100&counterpartyName=%E5%AE%A2%E6%88%B7A')
  })

  it('消费父级导入意图时移除 sourceModule/sourceRecordId, 防止重复填入', () => {
    expect(
      consumeParentImportIntentSearch(
        '?sourceModule=purchase-order&sourceRecordId=361443612338167808&counterpartyId=100',
      ),
    ).toBe('counterpartyId=100')
  })

  it('消费父级导入意图后无剩余参数时返回空串', () => {
    expect(
      consumeParentImportIntentSearch(
        '?sourceModule=purchase-order&sourceRecordId=361443612338167808',
      ),
    ).toBe('')
  })

  it('消费自动打开详情意图时仅移除 openDetail, 保留 docNo/trackId 关键字', () => {
    expect(
      consumeOpenDetailIntentSearch(
        '?docNo=SO-1&openDetail=1&trackId=361443612338167808',
      ),
    ).toBe('docNo=SO-1&trackId=361443612338167808')
  })

  it('消费自动打开详情意图后无剩余参数时返回空串', () => {
    expect(consumeOpenDetailIntentSearch('?openDetail=1')).toBe('')
  })

  it('一次性意图登记表: 所有触发型参数均已登记, 避免遗漏消费', () => {
    // 这些参数会在动作成功后从 URL 移除; 新增此类参数必须登记在此。
    expect(ONE_SHOT_INTENT_PARAMS.create).toContain('create')
    expect(ONE_SHOT_INTENT_PARAMS.openDetail).toContain('openDetail')
    expect(ONE_SHOT_INTENT_PARAMS.parentImport).toEqual([
      'sourceModule',
      'sourceRecordId',
    ])
  })

  it('一次性意图消费不误删持续型筛选参数', () => {
    const search = '?docNo=SO-1&openDetail=1&create=1&status=已审核'
    const afterDetail = consumeOpenDetailIntentSearch(search)
    expect(afterDetail).toContain('docNo=SO-1')
    expect(afterDetail).toContain('status=')
    expect(afterDetail).not.toContain('openDetail')
    const afterCreate = consumeCreateIntentSearch(afterDetail)
    expect(afterCreate).not.toContain('create=1')
    expect(afterCreate).toContain('docNo=SO-1')
  })
})

describe('supportsFilterField', () => {
  const configWithStatus = {
    filters: [{ key: 'status' }, { key: 'keyword' }],
  } as unknown as ModulePageConfig

  it('白名单命中返回 true', () => {
    expect(supportsFilterField(configWithStatus, 'status')).toBe(true)
  })

  it('白名单未命中或 config 缺失返回 false', () => {
    expect(supportsFilterField(configWithStatus, 'unknown')).toBe(false)
    expect(supportsFilterField(undefined, 'status')).toBe(false)
  })
})

describe('route filter synchronization', () => {
  it('builds the route filter state from defaults and supported deep-link fields', () => {
    const config = {
      ...configWithStatus,
      key: 'customer-statement',
      filters: [{ key: 'status' }, { key: 'customerId' }],
    } as unknown as ModulePageConfig

    expect(
      buildRouteFilterSyncState({
        config,
        defaultFilters: { orderDate: ['2026-05-01', '2026-05-31'] },
        routeParams: parseRouteParams(
          '?customerId=1983421000000000001&status=待审核',
        ),
      }),
    ).toEqual({
      orderDate: ['2026-05-01', '2026-05-31'],
      customerId: '1983421000000000001',
      status: '待审核',
    })
  })

  it('removes pending-only mode for explicit status deep links', () => {
    const config = {
      ...configWithStatus,
      key: 'purchase-order',
    } as unknown as ModulePageConfig

    expect(
      buildRouteFilterSyncState({
        config,
        defaultFilters: { pendingOnly: 'true' },
        routeParams: parseRouteParams('?status=完成采购'),
      }),
    ).toEqual({ status: '完成采购' })
  })

  it('removes pending-only mode for explicit reference deep links', () => {
    const config = {
      ...configWithStatus,
      key: 'purchase-order',
      filters: [{ key: 'referencedBy' }],
    } as unknown as ModulePageConfig

    expect(
      buildRouteFilterSyncState({
        config,
        defaultFilters: { pendingOnly: 'true' },
        routeParams: parseRouteParams('?referencedBy=sales-order'),
      }),
    ).toEqual({ referencedBy: 'sales-order' })
  })

  it('keeps the synchronization key stable when callback inputs are recreated', () => {
    const routeParams = parseRouteParams('?create=1')
    const first = buildRouteFilterSyncKey({
      config: purchaseOrderConfig,
      defaultFilters: { orderDate: ['2026-05-01', '2026-05-31'] },
      routeParams,
      hasSetFilters: true,
    })
    const second = buildRouteFilterSyncKey({
      config: { ...purchaseOrderConfig },
      defaultFilters: { orderDate: ['2026-05-01', '2026-05-31'] },
      routeParams: parseRouteParams('?create=1'),
      hasSetFilters: true,
    })

    expect(second).toBe(first)
    expect(
      buildRouteFilterSyncKey({
        config: purchaseOrderConfig,
        defaultFilters: { orderDate: ['2026-05-01', '2026-06-01'] },
        routeParams,
        hasSetFilters: true,
      }),
    ).not.toBe(first)
  })
})

describe('router search serialization', () => {
  it('builds a complete href without JSON-quoting string values', () => {
    expect(
      buildRouterHref('/sales-outbound', {
        sourceModule: 'sales-order',
        sourceRecordId: '350692799655452672',
      }),
    ).toBe(
      '/sales-outbound?sourceModule=sales-order&sourceRecordId=350692799655452672',
    )
  })
})

describe('重置筛选必须同时清 URL —— 否则刷新后筛选静默复活', () => {
  /*
   * 实测缺陷: 由「采购入库」点引用跳转进入 /purchase-order?docNo=368855989580988416,
   * 手动清空筛选框后点「重置」—— 界面清空、列表恢复 30 条, 但 URL 仍带 docNo;
   * 按 F5 后筛选框被自动填回、列表只剩 1 条。
   */
  it('清掉 docNo 这类持续型筛选参数', () => {
    expect(consumeRouteFilterSearch('?docNo=368855989580988416')).toBe('')
  })

  it('docNo / trackId / customerId / status / referencedBy 全部清掉', () => {
    const search =
      '?docNo=PO-1&trackId=361443612338167808&customerId=1983421000000000001&status=待审核&referencedBy=freight-bill'
    expect(consumeRouteFilterSearch(search)).toBe('')
  })

  it('保留一次性意图参数(重置不是消费意图, 不能顺手删掉 create/openDetail)', () => {
    const next = consumeRouteFilterSearch('?docNo=PO-1&create=1&openDetail=1')
    expect(next).toContain('create=1')
    expect(next).toContain('openDetail=1')
    expect(next).not.toContain('docNo')
  })

  it('保留预填型业务字段(如 counterpartyId), 它们不属于筛选', () => {
    const next = consumeRouteFilterSearch(
      '?docNo=PO-1&counterpartyId=1983421000000000001&counterpartyName=%E5%AE%A2%E6%88%B7A',
    )
    expect(next).toContain('counterpartyId=1983421000000000001')
    expect(next).toContain('counterpartyName=%E5%AE%A2%E6%88%B7A')
    expect(next).not.toContain('docNo')
  })

  it('没有筛选参数时原样返回(幂等, 避免无谓的 history.replace)', () => {
    expect(consumeRouteFilterSearch('?create=1')).toBe('create=1')
    expect(consumeRouteFilterSearch('')).toBe('')
  })

  it('参数清单是唯一来源: 每个参数都在 ROUTE_FILTER_PARAMS 里', () => {
    expect(ROUTE_FILTER_PARAMS).toEqual([
      'docNo',
      'trackId',
      'customerId',
      'status',
      'referencedBy',
    ])
    // 逐项验证: 清单里的每个参数都能被单独清掉
    for (const key of ROUTE_FILTER_PARAMS) {
      expect(consumeRouteFilterSearch(`?${key}=x`)).toBe('')
    }
  })
})

describe('手动改搜索框必须同步清 URL —— 否则刷新后单号静默复活', () => {
  /*
   * 实测缺陷（用户报）：任意页面做单据号搜索会进入 `?docNo=…`；
   * 用户在界面上**手动**清空搜索框（不是点「重置」）后，界面与列表都正常，
   * 但 URL 仍带着 docNo —— 按 F5 后路由同步又把旧单号写回筛选框。
   *
   * 上一组用例覆盖的是「重置按钮」那条路径；这里覆盖手动改动这条路径。
   */

  it('只清关键字参数，保留 status/customerId 等用户没动的筛选', () => {
    const search =
      '?docNo=368855989580988416&status=%E8%8D%89%E7%A8%BF&customerId=1983421000000000001'
    const next = consumeRouteKeywordSearch(search)
    expect(next).not.toContain('docNo')
    expect(next).toContain('status=')
    expect(next).toContain('customerId=')
  })

  it('docNo 与 trackId 都是关键字来源，两者都清', () => {
    for (const key of ROUTE_KEYWORD_PARAMS) {
      expect(consumeRouteKeywordSearch(`?${key}=x`)).toBe('')
    }
  })

  it('保留一次性意图（清关键字不是取消创建/打开详情）', () => {
    const next = consumeRouteKeywordSearch('?docNo=PO-1&create=1&openDetail=1')
    expect(next).toContain('create=1')
    expect(next).toContain('openDetail=1')
  })

  it('无关键字参数时原样返回（幂等）', () => {
    expect(consumeRouteKeywordSearch('?status=x')).toBe('status=x')
    expect(consumeRouteKeywordSearch('')).toBe('')
  })

  it('关键字参数清单是唯一来源', () => {
    expect(ROUTE_KEYWORD_PARAMS).toEqual(['docNo', 'trackId'])
  })
})

describe('shouldConsumeRouteKeyword —— 何时把 URL 关键字判为「已被用户消费」', () => {
  it('界面关键字与 URL 一致：不消费（用户没动）', () => {
    expect(
      shouldConsumeRouteKeyword({
        routeKeyword: 'PO-1',
        currentKeyword: 'PO-1',
        appliedRouteKeyword: 'PO-1',
      }),
    ).toBe(false)
  })

  it('用户清空搜索框：消费', () => {
    expect(
      shouldConsumeRouteKeyword({
        routeKeyword: 'PO-1',
        currentKeyword: '',
        appliedRouteKeyword: 'PO-1',
      }),
    ).toBe(true)
  })

  it('用户改写成别的关键字：消费（否则刷新会跳回旧单号）', () => {
    expect(
      shouldConsumeRouteKeyword({
        routeKeyword: 'PO-1',
        currentKeyword: '3688',
        appliedRouteKeyword: 'PO-1',
      }),
    ).toBe(true)
  })

  /**
   * 深链刚进入的那一帧：界面关键字还是空，但路由还没把它写进去。
   * 此时若判为"用户改动"，深链会在生效前被清掉 —— 这条用例锁住该分支。
   */
  it('URL 关键字尚未应用到界面时不消费（保护深链首帧）', () => {
    expect(
      shouldConsumeRouteKeyword({
        routeKeyword: 'PO-1',
        currentKeyword: '',
        appliedRouteKeyword: '',
      }),
    ).toBe(false)
  })

  it('URL 没有关键字时不消费', () => {
    expect(
      shouldConsumeRouteKeyword({
        routeKeyword: '',
        currentKeyword: '',
        appliedRouteKeyword: '',
      }),
    ).toBe(false)
  })
})
