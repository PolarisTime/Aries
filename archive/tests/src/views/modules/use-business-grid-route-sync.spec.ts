import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import {
  resolveAutoOpenDetailTarget,
  useBusinessGridRouteSync,
} from './use-business-grid-route-sync'

type RouteSyncProps = Parameters<typeof useBusinessGridRouteSync>[0]

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

describe('resolveAutoOpenDetailTarget', () => {
  it('returns null when no config', () => {
    const result = resolveAutoOpenDetailTarget({
      config: undefined,
      records: [],
      searchStr: '?openDetail=1',
      autoOpenedRouteKey: '',
    })
    expect(result).toBeNull()
  })

  it('returns null when shouldOpenDetail is not set', () => {
    const result = resolveAutoOpenDetailTarget({
      config: purchaseOrderConfig,
      records: [],
      searchStr: '?docNo=PO2026000032',
      autoOpenedRouteKey: '',
    })
    expect(result).toBeNull()
  })

  it('returns null when no routeKey and docNo is present', () => {
    const result = resolveAutoOpenDetailTarget({
      config: purchaseOrderConfig,
      records: [],
      searchStr: '?openDetail=1',
      autoOpenedRouteKey: '',
    })
    expect(result).toBeNull()
  })

  it('returns null when autoOpenedRouteKey matches routeKey', () => {
    const result = resolveAutoOpenDetailTarget({
      config: purchaseOrderConfig,
      records: [],
      searchStr: '?docNo=PO2026000032&openDetail=1',
      autoOpenedRouteKey: 'doc:PO2026000032',
    })
    expect(result).toBeNull()
  })

  it('falls back to trackId detail lookup when current page does not contain the docNo record', () => {
    const result = resolveAutoOpenDetailTarget({
      config: purchaseOrderConfig,
      records: [],
      searchStr: '?docNo=PO2026000032&trackId=1914876201459236001&openDetail=1',
      autoOpenedRouteKey: '',
    })

    expect(result).toEqual({
      nextAutoOpenedRouteKey: 'track:1914876201459236001',
      target: '1914876201459236001',
    })
  })

  it('keeps full snowflake trackId precision from the raw query string', () => {
    const result = resolveAutoOpenDetailTarget({
      config: purchaseOrderConfig,
      records: [],
      searchStr: '?docNo=PO2026000032&trackId=308251467645452288&openDetail=1',
      autoOpenedRouteKey: '',
    })

    expect(result).toEqual({
      nextAutoOpenedRouteKey: 'track:308251467645452288',
      target: '308251467645452288',
    })
  })

  it('uses the matched row when the current page already contains the target record', () => {
    const record = {
      id: '1914876201459236001',
      orderNo: 'PO2026000032',
    } satisfies ModuleRecord

    const result = resolveAutoOpenDetailTarget({
      config: purchaseOrderConfig,
      records: [record],
      searchStr: '?docNo=PO2026000032&trackId=1914876201459236001&openDetail=1',
      autoOpenedRouteKey: '',
    })

    expect(result).toEqual({
      nextAutoOpenedRouteKey: 'track:1914876201459236001',
      target: record,
    })
  })

  it('does not consume the auto-open state when only docNo is present and the row is not available yet', () => {
    const result = resolveAutoOpenDetailTarget({
      config: purchaseOrderConfig,
      records: [],
      searchStr: '?docNo=PO2026000032&openDetail=1',
      autoOpenedRouteKey: '',
    })

    expect(result).toBeNull()
  })

  it('finds record by trackId when trackId matches record.id', () => {
    const record = {
      id: '1914876201459236001',
      orderNo: 'PO2026000032',
    } satisfies ModuleRecord

    const result = resolveAutoOpenDetailTarget({
      config: purchaseOrderConfig,
      records: [record],
      searchStr: '?docNo=PO2026000032&trackId=1914876201459236001&openDetail=1',
      autoOpenedRouteKey: '',
    })

    expect(result).toEqual({
      nextAutoOpenedRouteKey: 'track:1914876201459236001',
      target: record,
    })
  })

  it('returns null when docNo record not found and no trackId', () => {
    const result = resolveAutoOpenDetailTarget({
      config: purchaseOrderConfig,
      records: [],
      searchStr: '?docNo=NONEXISTENT&openDetail=1',
      autoOpenedRouteKey: '',
    })
    expect(result).toBeNull()
  })

  it('uses id as the default primary number key', () => {
    const record = {
      id: 'PO2026000032',
    } satisfies ModuleRecord

    const result = resolveAutoOpenDetailTarget({
      config: {
        ...purchaseOrderConfig,
        primaryNoKey: undefined,
      },
      records: [record],
      searchStr: '?docNo=PO2026000032&openDetail=1',
      autoOpenedRouteKey: '',
    })

    expect(result).toEqual({
      nextAutoOpenedRouteKey: 'doc:PO2026000032',
      target: record,
    })
  })

  it('falls back to trackId when available rows have empty ids', () => {
    const result = resolveAutoOpenDetailTarget({
      config: purchaseOrderConfig,
      records: [
        {
          id: '',
          orderNo: 'PO2026000032',
        },
      ],
      searchStr: '?trackId=1914876201459236001&openDetail=1',
      autoOpenedRouteKey: '',
    })

    expect(result).toEqual({
      nextAutoOpenedRouteKey: 'track:1914876201459236001',
      target: '1914876201459236001',
    })
  })
})

describe('useBusinessGridRouteSync', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  function renderRouteSync(
    searchStr: string,
    overrides: Partial<RouteSyncProps> = {},
  ) {
    const handlers = {
      clearSelection: vi.fn(),
      openDetail: vi.fn(),
      setFilters: vi.fn(),
      setPage: vi.fn(),
      setSubmittedFilters: vi.fn(),
      updateFilter: vi.fn(),
    }

    const props: RouteSyncProps = {
      location: {
        searchStr,
      } as RouteSyncProps['location'],
      config: purchaseOrderConfig,
      records: [],
      defaultFilters: { orderDate: ['2026-05-29', '2026-06-28'] },
      ...handlers,
      ...overrides,
    }

    const hook = renderHook(
      (currentProps: RouteSyncProps) => useBusinessGridRouteSync(currentProps),
      {
        initialProps: props,
      },
    )

    return {
      handlers,
      props,
      ...hook,
    }
  }

  function withSearchStr(searchStr: string): RouteSyncProps['location'] {
    return {
      searchStr,
    } as RouteSyncProps['location']
  }

  it('keeps default filters when URL has no route keyword', () => {
    const { handlers } = renderRouteSync('')

    expect(handlers.setPage).toHaveBeenCalledWith(1)
    expect(handlers.clearSelection).toHaveBeenCalled()
    expect(handlers.setFilters).toHaveBeenCalledWith({
      orderDate: ['2026-05-29', '2026-06-28'],
    })
    expect(handlers.setSubmittedFilters).toHaveBeenCalledWith({
      orderDate: ['2026-05-29', '2026-06-28'],
    })
    expect(handlers.updateFilter).not.toHaveBeenCalled()
  })

  it('merges route keyword with default filters', () => {
    const { handlers } = renderRouteSync('?docNo=PO2026000032')

    expect(handlers.setFilters).toHaveBeenCalledWith({
      orderDate: ['2026-05-29', '2026-06-28'],
      keyword: 'PO2026000032',
    })
    expect(handlers.setSubmittedFilters).toHaveBeenCalledWith({
      orderDate: ['2026-05-29', '2026-06-28'],
      keyword: 'PO2026000032',
    })
  })

  it('uses window search before the router fallback search string', () => {
    window.history.replaceState(null, '', '/modules?trackId=WINDOW-TRACK')

    const { handlers } = renderRouteSync('?docNo=FALLBACK-DOC')

    expect(handlers.setFilters).toHaveBeenCalledWith({
      orderDate: ['2026-05-29', '2026-06-28'],
      keyword: 'WINDOW-TRACK',
    })
    expect(handlers.setSubmittedFilters).toHaveBeenCalledWith({
      orderDate: ['2026-05-29', '2026-06-28'],
      keyword: 'WINDOW-TRACK',
    })
  })

  it('clears keyword directly when filter state setter is unavailable', () => {
    const { handlers } = renderRouteSync('', {
      defaultFilters: undefined,
      setFilters: undefined,
    })

    expect(handlers.setFilters).not.toHaveBeenCalled()
    expect(handlers.updateFilter).toHaveBeenCalledWith('keyword', '')
    expect(handlers.setSubmittedFilters).toHaveBeenCalledWith({})
  })

  it('updates keyword directly when filter state setter is unavailable', () => {
    const { handlers } = renderRouteSync('?trackId=1914876201459236001', {
      setFilters: undefined,
    })

    expect(handlers.setFilters).not.toHaveBeenCalled()
    expect(handlers.updateFilter).toHaveBeenCalledWith(
      'keyword',
      '1914876201459236001',
    )
    expect(handlers.setSubmittedFilters).toHaveBeenCalledWith({
      orderDate: ['2026-05-29', '2026-06-28'],
      keyword: '1914876201459236001',
    })
  })

  it('auto-opens the matched detail only once for the same route key', () => {
    const record = {
      id: '1914876201459236001',
      orderNo: 'PO2026000032',
    } satisfies ModuleRecord
    const { handlers, props, rerender } = renderRouteSync(
      '?trackId=1914876201459236001&openDetail=1',
      {
        records: [record],
      },
    )

    expect(handlers.openDetail).toHaveBeenCalledWith(record)

    handlers.openDetail.mockClear()
    rerender({
      ...props,
      records: [{ ...record }],
    })

    expect(handlers.openDetail).not.toHaveBeenCalled()
  })

  it('resets auto-open state after the open detail flag is removed', () => {
    const record = {
      id: '1914876201459236001',
      orderNo: 'PO2026000032',
    } satisfies ModuleRecord
    const { handlers, props, rerender } = renderRouteSync(
      '?trackId=1914876201459236001&openDetail=1',
      {
        records: [record],
      },
    )

    expect(handlers.openDetail).toHaveBeenCalledWith(record)

    handlers.openDetail.mockClear()
    rerender({
      ...props,
      location: withSearchStr('?trackId=1914876201459236001'),
    })
    expect(handlers.openDetail).not.toHaveBeenCalled()

    rerender({
      ...props,
      location: withSearchStr('?trackId=1914876201459236001&openDetail=1'),
    })
    expect(handlers.openDetail).toHaveBeenCalledWith(record)
  })

  it('does not auto-open detail when route params cannot resolve a target', () => {
    const { handlers } = renderRouteSync('?docNo=PO2026000032&openDetail=1', {
      config: undefined,
    })

    expect(handlers.openDetail).not.toHaveBeenCalled()
  })
})
