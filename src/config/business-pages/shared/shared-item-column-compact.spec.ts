import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

import {
  compactBatchCustomerStatementItemColumns,
  compactBatchSupplierStatementItemColumns,
  compactInvoiceIssueItemColumns,
  compactInvoiceReceiptItemColumns,
  compactOrderItemColumns,
  compactPurchaseInboundItemColumns,
  compactPurchaseItemColumns,
} from './shared-item-column-compact'

describe('shared-item-column-compact', () => {
  it('compactOrderItemColumns is a non-empty array', () => {
    expect(Array.isArray(compactOrderItemColumns)).toBe(true)
    expect(compactOrderItemColumns.length).toBeGreaterThan(0)
  })

  it('compactPurchaseItemColumns is a non-empty array', () => {
    expect(Array.isArray(compactPurchaseItemColumns)).toBe(true)
    expect(compactPurchaseItemColumns.length).toBeGreaterThan(0)
  })

  it('compactPurchaseInboundItemColumns is a non-empty array', () => {
    expect(Array.isArray(compactPurchaseInboundItemColumns)).toBe(true)
    expect(compactPurchaseInboundItemColumns.length).toBeGreaterThan(0)
  })

  it('compactBatchCustomerStatementItemColumns is a non-empty array', () => {
    expect(Array.isArray(compactBatchCustomerStatementItemColumns)).toBe(true)
    expect(compactBatchCustomerStatementItemColumns.length).toBeGreaterThan(0)
  })

  it('compactBatchSupplierStatementItemColumns is a non-empty array', () => {
    expect(Array.isArray(compactBatchSupplierStatementItemColumns)).toBe(true)
    expect(compactBatchSupplierStatementItemColumns.length).toBeGreaterThan(0)
  })

  it('compactInvoiceReceiptItemColumns is a non-empty array', () => {
    expect(Array.isArray(compactInvoiceReceiptItemColumns)).toBe(true)
    expect(compactInvoiceReceiptItemColumns.length).toBeGreaterThan(0)
  })

  it('compactInvoiceIssueItemColumns is a non-empty array', () => {
    expect(Array.isArray(compactInvoiceIssueItemColumns)).toBe(true)
    expect(compactInvoiceIssueItemColumns.length).toBeGreaterThan(0)
  })

  it('each column in compactOrderItemColumns has title and dataIndex', () => {
    for (const col of compactOrderItemColumns) {
      expect(col.title).toBeDefined()
      expect(col.dataIndex).toBeDefined()
    }
  })

  it('uses widened material code and warehouse columns for compact purchase items', () => {
    const materialCodeColumn = compactPurchaseItemColumns.find(
      (column) => column.dataIndex === 'materialCode',
    )
    const warehouseNameColumn = compactPurchaseItemColumns.find(
      (column) => column.dataIndex === 'warehouseName',
    )

    expect(materialCodeColumn?.width).toBe(280)
    expect(warehouseNameColumn?.width).toBe(160)
  })
})
