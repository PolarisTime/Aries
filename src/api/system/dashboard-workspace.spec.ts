import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchCustomerStatementSummaryMock, fetchModulePageMock } = vi.hoisted(
  () => ({
    fetchCustomerStatementSummaryMock: vi.fn(),
    fetchModulePageMock: vi.fn(),
  }),
)

vi.mock('@/api/business/business-listing-fetch', () => ({
  fetchModulePage: fetchModulePageMock,
}))

vi.mock('@/api/finance/customer-statement-summary', () => ({
  fetchCustomerStatementSummary: fetchCustomerStatementSummaryMock,
}))

import {
  DASHBOARD_METRIC_TARGETS,
  fetchDashboardWorkspace,
} from '@/api/system/dashboard-workspace'

const emptyPage = {
  rows: [],
  totalElements: 0,
  totalPages: 1,
  last: true,
  hasMore: false,
}

describe('工作台真实业务数据聚合', () => {
  beforeEach(() => {
    fetchModulePageMock.mockReset()
    fetchCustomerStatementSummaryMock.mockReset()
  })

  it('并发查询三类真实业务单据并映射为按业务日期倒序的待办', async () => {
    fetchModulePageMock.mockImplementation((moduleKey: string) => {
      if (moduleKey === 'purchase-order') {
        return {
          ...emptyPage,
          rows: [
            {
              id: '9223372036854775807',
              orderNo: 'PO-001',
              supplierName: '钢材供应商',
              orderDate: '2026-08-22',
              totalAmount: 128500.55,
            },
          ],
          totalElements: 12,
        }
      }
      if (moduleKey === 'sales-order') {
        return {
          ...emptyPage,
          rows: [
            {
              id: '1983421000000000001',
              orderNo: 'SO-001',
              purchaseOrderNo: 'PO-REF-001',
              customerName: '销售客户',
              deliveryDate: '2026-08-23',
              totalAmount: 98000,
            },
          ],
          totalElements: 7,
        }
      }
      return {
        ...emptyPage,
        rows: [
          {
            id: '1983421000000000002',
            statementNo: 'CS-001',
            customerName: '对账客户',
            endDate: '2026-08-21',
            closingAmount: 32000,
          },
        ],
        totalElements: 5,
      }
    })
    fetchCustomerStatementSummaryMock.mockResolvedValue({
      documentCount: 5,
      salesAmount: 120000,
      receiptAmount: 30000,
      closingAmount: 90000,
    })

    const workspace = await fetchDashboardWorkspace()

    expect(fetchModulePageMock).toHaveBeenNthCalledWith(
      1,
      'purchase-order',
      { status: '草稿', sortBy: 'orderDate', direction: 'desc' },
      0,
      8,
    )
    expect(fetchModulePageMock).toHaveBeenNthCalledWith(
      2,
      'sales-order',
      { status: '已审核', sortBy: 'deliveryDate', direction: 'desc' },
      0,
      8,
    )
    expect(fetchModulePageMock).toHaveBeenNthCalledWith(
      3,
      'customer-statement',
      { status: '待确认', sortBy: 'endDate', direction: 'desc' },
      0,
      8,
    )
    expect(fetchCustomerStatementSummaryMock).toHaveBeenCalledWith({
      status: '待确认',
    })
    expect(workspace.todoItems).toEqual([
      {
        id: '1983421000000000001',
        docNo: 'SO-001',
        category: 'sales-delivery',
        relatedDocumentNo: 'PO-REF-001',
        counterpartyName: '销售客户',
        amount: 98000,
        businessDate: '2026-08-23',
      },
      {
        id: '9223372036854775807',
        docNo: 'PO-001',
        category: 'purchase-audit',
        relatedDocumentNo: null,
        counterpartyName: '钢材供应商',
        amount: 128500.55,
        businessDate: '2026-08-22',
      },
      {
        id: '1983421000000000002',
        docNo: 'CS-001',
        category: 'finance-reconcile',
        relatedDocumentNo: null,
        counterpartyName: '对账客户',
        amount: 32000,
        businessDate: '2026-08-21',
      },
    ])
    expect(workspace.pendingMetrics).toEqual([
      {
        key: 'purchase-audit',
        count: 12,
        amount: null,
        severity: 'danger',
      },
      {
        key: 'outbound-task',
        count: 7,
        amount: null,
        severity: 'warning',
      },
      {
        key: 'statement-confirm',
        count: 5,
        amount: 90000,
        severity: 'info',
      },
    ])
  })

  it('空业务数据返回零值指标和空待办，不注入占位数据', async () => {
    fetchModulePageMock.mockResolvedValue(emptyPage)
    fetchCustomerStatementSummaryMock.mockResolvedValue({
      documentCount: 0,
      salesAmount: 0,
      receiptAmount: 0,
      closingAmount: 0,
    })

    const workspace = await fetchDashboardWorkspace()

    expect(workspace.todoItems).toEqual([])
    expect(
      workspace.pendingMetrics.map(({ count, amount }) => [count, amount]),
    ).toEqual([
      [0, null],
      [0, null],
      [0, 0],
    ])
  })

  it('指标跳转使用后端实际支持的状态值', () => {
    expect(DASHBOARD_METRIC_TARGETS).toEqual({
      'purchase-audit': {
        pathname: '/purchase-order',
        search: 'status=草稿',
      },
      'outbound-task': {
        pathname: '/sales-order',
        search: 'status=已审核',
      },
      'statement-confirm': {
        pathname: '/customer-statement',
        search: 'status=待确认',
      },
    })
  })
})
