import { describe, expect, it } from 'vitest'
import type { AppPageDefinition } from '@/config/page-registry'
import type { ModulePageConfig } from '@/types/module-page'
import { resolveBusinessGridInitialConfig } from '@/views/modules/business-grid-view-utils'

const purchaseOrderPageDef = {
  key: 'purchase-order',
  menuKey: '/purchase-order',
  title: '采购订单',
  searchable: true,
  view: 'business-grid',
  icon: 'ShoppingCartOutlined',
  menuParent: 'purchase',
  moduleKey: 'purchase-order',
  resourceKey: 'purchase-order',
} satisfies AppPageDefinition

const purchaseOrderConfig = {
  key: 'purchase-order',
  title: '采购订单',
  kicker: '',
  description: '',
  filters: [],
  columns: [],
  detailFields: [],
  data: [],
  buildOverview: () => [],
} satisfies ModulePageConfig

describe('resolveBusinessGridInitialConfig', () => {
  it('returns loader config when module key matches the current page', () => {
    expect(
      resolveBusinessGridInitialConfig(
        purchaseOrderPageDef,
        purchaseOrderConfig,
      ),
    ).toBe(purchaseOrderConfig)
  })

  it('drops stale loader config from another module', () => {
    expect(
      resolveBusinessGridInitialConfig(
        {
          ...purchaseOrderPageDef,
          moduleKey: 'sales-order',
        },
        purchaseOrderConfig,
      ),
    ).toBeUndefined()
  })
})
