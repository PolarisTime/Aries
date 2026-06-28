import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import {
  resolveAutoOpenDetailTarget,
  useBusinessGridRouteSync,
} from './use-business-grid-route-sync'

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
})

describe('useBusinessGridRouteSync', () => {
  function renderRouteSync(searchStr: string) {
    const handlers = {
      clearSelection: vi.fn(),
      openDetail: vi.fn(),
      setFilters: vi.fn(),
      setPage: vi.fn(),
      setSubmittedFilters: vi.fn(),
      updateFilter: vi.fn(),
    }

    renderHook(() =>
      useBusinessGridRouteSync({
        location: {
          searchStr,
        } as never,
        config: purchaseOrderConfig,
        records: [],
        defaultFilters: { orderDate: ['2026-05-29', '2026-06-28'] },
        ...handlers,
      }),
    )

    return handlers
  }

  it('keeps default filters when URL has no route keyword', () => {
    const handlers = renderRouteSync('')

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
    const handlers = renderRouteSync('?docNo=PO2026000032')

    expect(handlers.setFilters).toHaveBeenCalledWith({
      orderDate: ['2026-05-29', '2026-06-28'],
      keyword: 'PO2026000032',
    })
    expect(handlers.setSubmittedFilters).toHaveBeenCalledWith({
      orderDate: ['2026-05-29', '2026-06-28'],
      keyword: 'PO2026000032',
    })
  })
})
