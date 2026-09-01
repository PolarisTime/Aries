import { describe, expect, it } from 'vitest'
import type { ModulePageConfig } from '@/types/module-page'
import { buildRouterHref } from '@/utils/router-search'
import {
  buildRouteFilterSyncKey,
  buildRouteFilterSyncState,
  consumeCreateIntentSearch,
  parseRouteParams,
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
    expect(params.routeKeyword).toBe('')
    expect(params.shouldOpenDetail).toBe(false)
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
