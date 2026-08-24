import { z } from 'zod'
import { fetchModulePage } from '@/api/business/business-listing-fetch'
import { fetchCustomerStatementSummary } from '@/api/finance/customer-statement-summary'
import {
  responseDateTimeSchema,
  responseEntityIdSchema,
  responseNonNegativeIntegerSchema,
} from '@/shared/schemas/api'

const DASHBOARD_PAGE_SIZE = 8

export const DASHBOARD_TODO_CATEGORIES = [
  'all',
  'purchase-audit',
  'sales-delivery',
  'finance-reconcile',
] as const

export type DashboardTodoCategory = (typeof DASHBOARD_TODO_CATEGORIES)[number]

const dashboardTodoItemSchema = z.strictObject({
  id: responseEntityIdSchema,
  docNo: z.string().min(1),
  category: z.enum(['purchase-audit', 'sales-delivery', 'finance-reconcile']),
  relatedDocumentNo: z.string().min(1).nullable(),
  counterpartyName: z.string().min(1),
  amount: z.number().finite().nullable(),
  businessDate: responseDateTimeSchema,
})

export type DashboardTodoItem = z.output<typeof dashboardTodoItemSchema>

const dashboardPendingMetricSchema = z.strictObject({
  key: z.enum(['purchase-audit', 'outbound-task', 'statement-confirm']),
  count: responseNonNegativeIntegerSchema,
  amount: z.number().finite().nullable(),
  severity: z.enum(['danger', 'warning', 'info']),
})

export type DashboardPendingMetric = z.output<
  typeof dashboardPendingMetricSchema
>

const dashboardWorkspaceSchema = z.strictObject({
  todoItems: z.array(dashboardTodoItemSchema),
  pendingMetrics: z.array(dashboardPendingMetricSchema),
})

export type DashboardWorkspace = z.output<typeof dashboardWorkspaceSchema>

const customerStatementTodoSourceSchema = z.object({
  id: responseEntityIdSchema,
  statementNo: z.string().min(1),
  customerName: z.string().min(1),
  endDate: responseDateTimeSchema,
  closingAmount: z.number().finite(),
})

export const DASHBOARD_METRIC_TARGETS: Record<
  DashboardPendingMetric['key'],
  { pathname: string; search: string }
> = {
  'purchase-audit': { pathname: '/purchase-order', search: 'status=草稿' },
  'outbound-task': { pathname: '/sales-order', search: 'status=已审核' },
  'statement-confirm': {
    pathname: '/customer-statement',
    search: 'status=待确认',
  },
}

export async function fetchDashboardWorkspace(): Promise<DashboardWorkspace> {
  const [purchaseOrders, salesOrders, customerStatements, statementSummary] =
    await Promise.all([
      fetchModulePage(
        'purchase-order',
        { status: '草稿', sortBy: 'orderDate', direction: 'desc' },
        0,
        DASHBOARD_PAGE_SIZE,
      ),
      fetchModulePage(
        'sales-order',
        { status: '已审核', sortBy: 'deliveryDate', direction: 'desc' },
        0,
        DASHBOARD_PAGE_SIZE,
      ),
      fetchModulePage(
        'customer-statement',
        { status: '待确认', sortBy: 'endDate', direction: 'desc' },
        0,
        DASHBOARD_PAGE_SIZE,
      ),
      fetchCustomerStatementSummary({ status: '待确认' }),
    ])

  const todoItems = [
    ...purchaseOrders.rows.map((order) => ({
      id: order.id,
      docNo: order.orderNo,
      category: 'purchase-audit' as const,
      relatedDocumentNo: null,
      counterpartyName: order.supplierName,
      amount: order.totalAmount,
      businessDate: order.orderDate,
    })),
    ...salesOrders.rows.map((order) => ({
      id: order.id,
      docNo: order.orderNo,
      category: 'sales-delivery' as const,
      relatedDocumentNo: order.purchaseOrderNo,
      counterpartyName: order.customerName,
      amount: order.totalAmount,
      businessDate: order.deliveryDate,
    })),
    ...customerStatements.rows.map((rawStatement) => {
      const statement = customerStatementTodoSourceSchema.parse(rawStatement)
      return {
        id: statement.id,
        docNo: statement.statementNo,
        category: 'finance-reconcile' as const,
        relatedDocumentNo: null,
        counterpartyName: statement.customerName,
        amount: statement.closingAmount,
        businessDate: statement.endDate,
      }
    }),
  ].sort(
    (left, right) =>
      right.businessDate.localeCompare(left.businessDate) ||
      right.id.localeCompare(left.id),
  )

  return dashboardWorkspaceSchema.parse({
    todoItems,
    pendingMetrics: [
      {
        key: 'purchase-audit',
        count: purchaseOrders.totalElements,
        amount: null,
        severity: purchaseOrders.totalElements > 0 ? 'danger' : 'info',
      },
      {
        key: 'outbound-task',
        count: salesOrders.totalElements,
        amount: null,
        severity: salesOrders.totalElements > 0 ? 'warning' : 'info',
      },
      {
        key: 'statement-confirm',
        count: statementSummary.documentCount,
        amount: statementSummary.closingAmount,
        severity: 'info',
      },
    ],
  })
}
