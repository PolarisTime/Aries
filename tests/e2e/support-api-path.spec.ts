import { expect, test } from '@playwright/test'
import { e2eApiUrl, resolveE2eApiPath } from './support/api-key'
import { businessRoutes } from './support/route-manifest'

const expectedBusinessApiPaths: Record<string, string> = {
  carrier: 'carriers',
  customer: 'customers',
  'customer-statement': 'customer-statements',
  department: 'departments',
  'freight-bill': 'freight-bills',
  'freight-statement': 'freight-statements',
  'inventory-report': 'inventory-report',
  'invoice-issue': 'invoice-issues',
  'invoice-receipt': 'invoice-receipts',
  'io-report': 'io-report',
  'ledger-adjustment': 'ledger-adjustments',
  material: 'materials',
  'material-categories': 'material-categories',
  'operation-log': 'operation-logs',
  payment: 'payments',
  'pending-invoice-receipt-report': 'pending-invoice-receipt-report',
  'purchase-contracts': 'purchase-contracts',
  'purchase-inbound': 'purchase-inbounds',
  'purchase-order': 'purchase-orders',
  receipt: 'receipts',
  'receivable-payable': 'receivable-payables',
  'sales-contracts': 'sales-contracts',
  'sales-order': 'sales-orders',
  'sales-outbound': 'sales-outbounds',
  supplier: 'suppliers',
  'supplier-statement': 'supplier-statements',
  warehouse: 'warehouses',
}

test.describe('e2e api path resolution', () => {
  test('maps module keys to real collection endpoints', () => {
    expect(resolveE2eApiPath('purchase-order')).toBe('purchase-orders')
    expect(resolveE2eApiPath('ledger-adjustment')).toBe('ledger-adjustments')
  })

  test('covers every business route API path with an explicit endpoint expectation', () => {
    const actual = Object.fromEntries(
      businessRoutes.map((route) => [
        route.apiPath,
        resolveE2eApiPath(route.apiPath),
      ]),
    )

    expect(actual).toEqual(expectedBusinessApiPaths)
  })

  test('keeps explicit API paths and nested endpoints stable', () => {
    expect(resolveE2eApiPath('purchase-contracts')).toBe('purchase-contracts')
    expect(resolveE2eApiPath('material-categories/options')).toBe(
      'material-categories/options',
    )
    expect(resolveE2eApiPath('auth/api-keys')).toBe('auth/api-keys')
  })

  test('builds URLs with resolved module endpoints', () => {
    expect(e2eApiUrl('purchase-order', 'search?keyword=PO&limit=5')).toBe(
      'http://127.0.0.1:11211/api/purchase-orders/search?keyword=PO&limit=5',
    )
    expect(e2eApiUrl('ledger-adjustment', '42')).toBe(
      'http://127.0.0.1:11211/api/ledger-adjustments/42',
    )
    expect(e2eApiUrl('auth/api-keys')).toBe(
      'http://127.0.0.1:11211/api/auth/api-keys',
    )
  })
})
