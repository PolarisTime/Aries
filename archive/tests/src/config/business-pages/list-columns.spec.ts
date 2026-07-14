import { describe, expect, it } from 'vitest'
import { customerStatementPageConfig } from './finance/customer-statement-page'
import { freightStatementPageConfig } from './finance/freight-statement-page'
import { invoiceIssuePageConfig } from './finance/invoice-issue-page'
import { invoiceReceiptPageConfig } from './finance/invoice-receipt-page'
import { paymentsPageConfig } from './finance/payment-page'
import { receiptsPageConfig } from './finance/receipt-page'
import { supplierStatementPageConfig } from './finance/supplier-statement-page'
import { freightOperationsPageConfigs } from './operations/freight-operations'
import { purchaseInboundsPageConfig } from './operations/purchase-inbound-page'
import { purchaseOrdersPageConfig } from './operations/purchase-order-page'
import { purchaseRefundsPageConfig } from './operations/purchase-refund-page'
import { salesOrdersPageConfig } from './operations/sales-order-page'
import { salesOutboundsPageConfig } from './operations/sales-outbound-page'

function expectListColumns(
  config: { columns: Array<{ dataIndex: string }> },
  expectedKeys: string[],
): void {
  expect(config.columns.map((column) => column.dataIndex)).toEqual(
    expect.arrayContaining(expectedKeys),
  )
}

describe('business list supplemental columns', () => {
  it('exposes response-backed operation traceability columns', () => {
    expectListColumns(salesOrdersPageConfig, [
      'purchaseOrderNo',
      'settlementCompanyName',
    ])
    expectListColumns(salesOutboundsPageConfig, [
      'warehouseName',
      'settlementCompanyName',
    ])
    expectListColumns(purchaseOrdersPageConfig, ['settlementCompanyName'])
    expectListColumns(purchaseInboundsPageConfig, ['warehouseName'])
    expectListColumns(purchaseRefundsPageConfig, ['operatorName', 'remark'])
    expectListColumns(freightOperationsPageConfigs['freight-bill'], ['remark'])
  })

  it('exposes response-backed finance traceability columns', () => {
    expectListColumns(receiptsPageConfig, [
      'settlementCompanyName',
      'operatorName',
      'remark',
    ])
    expectListColumns(paymentsPageConfig, ['operatorName', 'remark'])
    expectListColumns(invoiceIssuePageConfig, [
      'settlementCompanyName',
      'operatorName',
      'remark',
    ])
    expectListColumns(invoiceReceiptPageConfig, [
      'settlementCompanyName',
      'operatorName',
      'remark',
    ])
    expectListColumns(customerStatementPageConfig, ['remark'])
    expectListColumns(supplierStatementPageConfig, ['remark'])
    expectListColumns(freightStatementPageConfig, ['remark'])
  })
})
