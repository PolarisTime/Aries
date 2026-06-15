import { describe, expect, it } from 'vitest'
import { invoicePageConfigs } from '../finance/invoice-pages'
import { paymentPageConfigs } from '../finance/payment-pages'
import { masterMaterialPageConfigs } from '../master/master-material-pages'
import { masterPartyPageConfigs } from '../master/master-party-pages'
import { masterWarehousePageConfigs } from '../master/master-warehouse-pages'
import { contractOperationsPageConfigs } from '../operations/contract-operations'
import { purchaseOperationsPageConfigs } from '../operations/purchase-operations'
import { salesOperationsPageConfigs } from '../operations/sales-operations'
import { systemAccessPageConfigs } from '../system/system-access-pages'
import { systemOrganizationPageConfigs } from '../system/system-organization-pages'
import { permissionManagementPageConfig } from '../system/system-permission-management-page'

describe('invoicePageConfigs', () => {
  it('contains invoice-receipt and invoice-issue', () => {
    expect(Object.keys(invoicePageConfigs)).toEqual([
      'invoice-receipt',
      'invoice-issue',
    ])
  })

  it('each config has required fields', () => {
    for (const config of Object.values(invoicePageConfigs)) {
      expect(config.key).toBeTruthy()
      expect(config.title).toBeTruthy()
      expect(config.primaryNoKey).toBeTruthy()
      expect(Array.isArray(config.columns)).toBe(true)
    }
  })
})

describe('paymentPageConfigs', () => {
  it('contains receipt, payment, and ledger-adjustment', () => {
    const keys = Object.keys(paymentPageConfigs)
    expect(keys).toContain('receipt')
    expect(keys).toContain('payment')
    expect(keys).toContain('ledger-adjustment')
  })

  it('each config has required fields', () => {
    for (const config of Object.values(paymentPageConfigs)) {
      expect(config.primaryNoKey).toBeTruthy()
      expect(Array.isArray(config.filters)).toBe(true)
    }
  })
})

describe('masterPartyPageConfigs', () => {
  it('contains supplier, customer, carrier', () => {
    const keys = Object.keys(masterPartyPageConfigs)
    expect(keys).toContain('supplier')
    expect(keys).toContain('customer')
    expect(keys).toContain('carrier')
  })
})

describe('masterMaterialPageConfigs', () => {
  it('contains material and material-categories', () => {
    const keys = Object.keys(masterMaterialPageConfigs)
    expect(keys).toContain('material')
    expect(keys).toContain('material-categories')
  })
})

describe('masterWarehousePageConfigs', () => {
  it('contains warehouse config', () => {
    const warehouse = masterWarehousePageConfigs.warehouse
    expect(warehouse.key).toBe('warehouse')
    expect(warehouse.primaryNoKey).toBe('warehouseCode')
    expect(Array.isArray(warehouse.filters)).toBe(true)
    expect(warehouse.filters.length).toBeGreaterThanOrEqual(2)
  })
})

describe('contractOperationsPageConfigs', () => {
  it('contains purchase-contract and sales-contract', () => {
    const keys = Object.keys(contractOperationsPageConfigs)
    expect(keys).toContain('purchase-contract')
    expect(keys).toContain('sales-contract')
  })
})

describe('purchaseOperationsPageConfigs', () => {
  it('contains purchase-order and purchase-inbound', () => {
    const keys = Object.keys(purchaseOperationsPageConfigs)
    expect(keys).toContain('purchase-order')
    expect(keys).toContain('purchase-inbound')
  })
})

describe('salesOperationsPageConfigs', () => {
  it('contains sales-order and sales-outbound', () => {
    const keys = Object.keys(salesOperationsPageConfigs)
    expect(keys).toContain('sales-order')
    expect(keys).toContain('sales-outbound')
  })
})

describe('systemOrganizationPageConfigs', () => {
  it('contains department config', () => {
    const dept = systemOrganizationPageConfigs.department
    expect(dept.key).toBe('department')
    expect(dept.primaryNoKey).toBe('departmentCode')
    expect(dept.buildOverview).toBeTypeOf('function')

    const overview = dept.buildOverview([])
    expect(Array.isArray(overview)).toBe(true)
  })
})

describe('systemAccessPageConfigs', () => {
  it('contains permission config', () => {
    const perm = systemAccessPageConfigs.permission
    expect(perm.key).toBe('permission')
  })
})

describe('permissionManagementPageConfig', () => {
  it('has readOnly flag', () => {
    expect(permissionManagementPageConfig.readOnly).toBe(true)
  })

  it('has permission as key', () => {
    expect(permissionManagementPageConfig.key).toBe('permission')
  })
})
