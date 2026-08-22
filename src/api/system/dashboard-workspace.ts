import { z } from 'zod'
import {
  MOCK_NOTICES,
  MOCK_PENDING_METRICS,
  MOCK_TODO_ITEMS,
} from '@/api/system/dashboard-workspace-fixtures'
import {
  responseDateTimeSchema,
  responseEntityIdSchema,
  responseNonNegativeIntegerSchema,
} from '@/shared/schemas/api'

/**
 * 工作台看板数据契约（前端先行阶段）。
 * schema 即接口契约：mock 实现与后续真实 HTTP 实现（apiGet + ENDPOINTS 登记）
 * 共用同一校验层，UI 层零改动切换。
 */

export const DASHBOARD_TODO_CATEGORIES = [
  'all',
  'purchase-audit',
  'sales-delivery',
  'finance-reconcile',
] as const

export type DashboardTodoCategory = (typeof DASHBOARD_TODO_CATEGORIES)[number]

export const dashboardTodoItemSchema = z.object({
  /** 雪花 ID，跨端一律十进制字符串 */
  id: responseEntityIdSchema,
  docNo: z.string().min(1),
  bizType: z.string().min(1),
  category: z.enum(['purchase-audit', 'sales-delivery', 'finance-reconcile']),
  relatedContractNo: z.string().nullable(),
  relatedCustomerName: z.string().nullable(),
  /** 金额沿仓库约定：number（finite），精度由 DTO 序列化保证 */
  amount: z.number().finite().nullable(),
  createdAt: responseDateTimeSchema,
  urgency: z.enum(['high', 'normal']),
})

export type DashboardTodoItem = z.output<typeof dashboardTodoItemSchema>

export const dashboardPendingMetricSchema = z.object({
  key: z.enum(['purchase-audit', 'outbound-task', 'receivable', 'stock-alert']),
  count: responseNonNegativeIntegerSchema,
  amount: z.number().finite().nullable(),
  severity: z.enum(['danger', 'warning', 'info']),
})

export type DashboardPendingMetric = z.output<
  typeof dashboardPendingMetricSchema
>

export const dashboardNoticeSchema = z.object({
  id: responseEntityIdSchema,
  level: z.enum(['info', 'warn', 'critical']),
  title: z.string().min(1),
  content: z.string(),
  publishedAt: responseDateTimeSchema,
})

export type DashboardNotice = z.output<typeof dashboardNoticeSchema>

/**
 * 待审核采购 / 待出库任务等指标的「待处理」筛选意图：
 * 跳转列表页时携带 status 查询参数（模块筛选白名单校验见 route-sync）。
 */
export const DASHBOARD_METRIC_TARGETS: Record<
  DashboardPendingMetric['key'],
  { pathname: string; search?: string }
> = {
  'purchase-audit': { pathname: '/purchase-order', search: 'status=待审核' },
  'outbound-task': { pathname: '/sales-outbound', search: 'status=部分出库' },
  receivable: { pathname: '/receipt', search: 'status=未审核' },
  'stock-alert': { pathname: '/material' },
}

function parseAll<Item>(
  schema: z.ZodType<Item>,
  items: readonly unknown[],
): Item[] {
  return items.map((item) => schema.parse(item))
}

/** 待办清单。Mock 阶段按类目内存过滤；后端就绪后替换为 apiGet 分页查询。 */
export function fetchDashboardTodoItems(
  category: DashboardTodoCategory,
): Promise<DashboardTodoItem[]> {
  const items = parseAll(dashboardTodoItemSchema, MOCK_TODO_ITEMS)
  if (category === 'all') {
    return Promise.resolve(items)
  }
  const filtered = items.filter((item) => item.category === category)
  return Promise.resolve(filtered)
}

export function fetchDashboardPendingMetrics(): Promise<
  DashboardPendingMetric[]
> {
  return Promise.resolve(
    parseAll(dashboardPendingMetricSchema, MOCK_PENDING_METRICS),
  )
}

export function fetchDashboardNotices(): Promise<DashboardNotice[]> {
  return Promise.resolve(parseAll(dashboardNoticeSchema, MOCK_NOTICES))
}
