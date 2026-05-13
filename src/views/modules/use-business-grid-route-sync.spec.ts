import { describe, expect, it } from 'vitest'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { resolveAutoOpenDetailTarget } from './use-business-grid-route-sync'

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
})
