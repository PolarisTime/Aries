import { describe, expect, it } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import {
  buildCustomerStatementOptions,
  buildFreightStatementOptions,
  buildSupplierStatementOptions,
  findStatementRecordById,
} from '@/views/modules/module-adapter-finance-links'

describe('module-adapter-finance-links', () => {
  it('filters customer statements by customer and project while preserving current selection', () => {
    const rows: ModuleRecord[] = [
      { id: '3', statementNo: 'YS-003', customerName: '客户A', projectName: '项目A', closingAmount: 0, endDate: '2026-04-20' },
      { id: '2', statementNo: 'YS-002', customerName: '客户A', projectName: '项目B', closingAmount: 50, endDate: '2026-04-22' },
      { id: '1', statementNo: 'YS-001', customerName: '客户A', projectName: '项目A', closingAmount: 120, endDate: '2026-04-21' },
    ]

    expect(buildCustomerStatementOptions(rows, {
      currentStatementId: 3,
      customerName: '客户A',
      projectName: '项目A',
    })).toEqual([
      { value: 1, label: 'YS-001 | 客户A / 项目A | 待收 120.00' },
      { value: 3, label: 'YS-003 | 客户A / 项目A | 待收 0.00' },
    ])
  })

  it('filters supplier and freight statements by counterparty and open balance', () => {
    const supplierRows: ModuleRecord[] = [
      { id: '11', statementNo: 'YF-002', supplierName: '供应商A', closingAmount: 0, endDate: '2026-04-21' },
      { id: '10', statementNo: 'YF-001', supplierName: '供应商A', closingAmount: 88, endDate: '2026-04-20' },
      { id: '12', statementNo: 'YF-003', supplierName: '供应商B', closingAmount: 99, endDate: '2026-04-22' },
    ]
    const freightRows: ModuleRecord[] = [
      { id: '21', statementNo: 'WF-002', carrierName: '物流A', unpaidAmount: 0, endDate: '2026-04-20' },
      { id: '20', statementNo: 'WF-001', carrierName: '物流A', unpaidAmount: 66, endDate: '2026-04-19' },
    ]

    expect(buildSupplierStatementOptions(supplierRows, { counterpartyName: '供应商A' })).toEqual([
      { value: 10, label: 'YF-001 | 供应商A | 待付 88.00' },
    ])

    expect(buildFreightStatementOptions(freightRows, { currentStatementId: 21, counterpartyName: '物流A' })).toEqual([
      { value: 21, label: 'WF-002 | 物流A | 待付 0.00' },
      { value: 20, label: 'WF-001 | 物流A | 待付 66.00' },
    ])
  })

  it('finds statement rows by numeric id safely', () => {
    const rows: ModuleRecord[] = [
      { id: '1', statementNo: 'A' },
      { id: '2', statementNo: 'B' },
    ]

    expect(findStatementRecordById(rows, 2)).toMatchObject({ statementNo: 'B' })
    expect(findStatementRecordById(rows, 'x')).toBeNull()
  })
})
