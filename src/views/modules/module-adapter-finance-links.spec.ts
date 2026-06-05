import { describe, expect, it } from 'vitest'
import {
  buildCustomerStatementOptions,
  buildStatementLinkOptions,
  findStatementRecordById,
} from '@/module-system/module-adapter-finance-links'
import type { ModuleRecord } from '@/types/module-page'

describe('module-adapter-finance-links', () => {
  it('preserves snowflake ids as strings in statement options', () => {
    const records = [
      {
        id: '308251467645452288',
        statementNo: 'ST20260001',
        customerName: '测试客户',
        projectName: '测试项目',
        closingAmount: 100,
      } satisfies ModuleRecord,
    ]

    const options = buildCustomerStatementOptions(records)

    expect(options).toHaveLength(1)
    expect(options[0]?.value).toBe('308251467645452288')
  })

  it('finds the matching statement by full string id without precision loss', () => {
    const target = {
      id: '308251467645452288',
      statementNo: 'ST20260001',
      closingAmount: 0,
    } satisfies ModuleRecord

    const matched = findStatementRecordById([target], '308251467645452288')

    expect(matched).toBe(target)
  })

  it('keeps the current statement selectable even when balance is zero', () => {
    const currentRecord = {
      id: '308251467645452288',
      statementNo: 'ST20260001',
      customerName: '测试客户',
      projectName: '测试项目',
      closingAmount: 0,
    } satisfies ModuleRecord

    const options = buildCustomerStatementOptions([currentRecord], {
      currentStatementId: '308251467645452288',
      customerName: '测试客户',
      projectName: '测试项目',
    })

    expect(options).toHaveLength(1)
    expect(options[0]?.value).toBe('308251467645452288')
  })

  it('builds receipt link options with customer and project filters', () => {
    const options = buildStatementLinkOptions(
      'receipt',
      {
        customerName: '测试客户',
        projectName: '测试项目',
      },
      {
        customerStatements: [
          {
            id: '308251467645452288',
            statementNo: 'ST20260001',
            customerName: '测试客户',
            projectName: '测试项目',
            closingAmount: 100,
          } satisfies ModuleRecord,
          {
            id: '308251467645452289',
            statementNo: 'ST20260002',
            customerName: '其他客户',
            projectName: '测试项目',
            closingAmount: 100,
          } satisfies ModuleRecord,
        ],
        supplierStatements: [],
        freightStatements: [],
      },
    )

    expect(options).toHaveLength(1)
    expect(options[0]?.value).toBe('308251467645452288')
  })

  it('builds supplier payment link options by business type', () => {
    const options = buildStatementLinkOptions(
      'payment',
      {
        businessType: '供应商',
        counterpartyName: '益海供应商',
      },
      {
        customerStatements: [],
        supplierStatements: [
          {
            id: '308251467645452290',
            statementNo: 'GYDZ20260001',
            supplierName: '益海供应商',
            closingAmount: 88,
          } satisfies ModuleRecord,
        ],
        freightStatements: [
          {
            id: '308251467645452291',
            statementNo: 'WDZ20260001',
            carrierName: '升华物流',
            unpaidAmount: 66,
          } satisfies ModuleRecord,
        ],
      },
    )

    expect(options).toHaveLength(1)
    expect(options[0]?.value).toBe('308251467645452290')
  })
})
