import type {
  DashboardNotice,
  DashboardPendingMetric,
  DashboardTodoItem,
} from '@/api/system/dashboard-workspace'

/**
 * 工作台看板 mock 数据集（前端先行阶段占位）。
 * 覆盖契约测试所需的极端值：19 位雪花 ID 字符串、超长文本、
 * 空关联、0/超大计数、null 金额等。
 */

/** 边界：最大合法雪花 ID（Long.MAX_VALUE） */
export const MAX_SNOWFLAKE_ID = '9223372036854775807'

export const MOCK_TODO_ITEMS: DashboardTodoItem[] = [
  {
    id: MAX_SNOWFLAKE_ID,
    docNo: 'PO-20260822-0001',
    bizType: '采购审批',
    category: 'purchase-audit',
    relatedContractNo: 'CT-2026-0811',
    relatedCustomerName: null,
    amount: 128_500.55,
    createdAt: '2026-08-22T09:12:00+08:00',
    urgency: 'high',
  },
  {
    id: '1983421000000000001',
    docNo:
      'SO-20260821-EXTREMELY-LONG-DOCUMENT-NUMBER-FOR-OVERFLOW-TEST-000987654321',
    bizType: '销售发货',
    category: 'sales-delivery',
    relatedContractNo: null,
    relatedCustomerName: '杭州云启智联供应链管理有限公司（华东大区分公司）',
    amount: null,
    createdAt: '2026-08-21T17:45:30+08:00',
    urgency: 'high',
  },
  {
    id: '1983421000000000002',
    docNo: 'RC-20260820-0044',
    bizType: '财务对账',
    category: 'finance-reconcile',
    relatedContractNo: 'CT-2026-0733',
    relatedCustomerName: '深圳市恒信达电子科技有限公司',
    amount: 96_800,
    createdAt: '2026-08-20T11:02:18+08:00',
    urgency: 'normal',
  },
  {
    id: '1983421000000000003',
    docNo: 'PO-20260820-0037',
    bizType: '采购审批',
    category: 'purchase-audit',
    relatedContractNo: null,
    relatedCustomerName: null,
    amount: 0.01,
    createdAt: '2026-08-20T08:31:00+08:00',
    urgency: 'normal',
  },
  {
    id: '1983421000000000004',
    docNo: 'SO-20260819-0121',
    bizType: '销售发货',
    category: 'sales-delivery',
    relatedContractNo: 'CT-2026-0618',
    relatedCustomerName: '北京中科创新技术股份有限公司',
    amount: 999_999_999.99,
    createdAt: '2026-08-19T15:20:44+08:00',
    urgency: 'normal',
  },
  {
    id: '1983421000000000005',
    docNo: 'RC-20260818-0012',
    bizType: '财务对账',
    category: 'finance-reconcile',
    relatedContractNo: null,
    relatedCustomerName: '广州穗联贸易有限公司',
    amount: null,
    createdAt: '2026-08-18T10:05:00+08:00',
    urgency: 'high',
  },
]

/** 边界：空待办清单（供空态验证与契约测试使用） */
export const EMPTY_TODO_ITEMS: DashboardTodoItem[] = []

export const MOCK_PENDING_METRICS: DashboardPendingMetric[] = [
  {
    key: 'purchase-audit',
    count: 12,
    amount: 1_286_400.5,
    severity: 'danger',
  },
  {
    key: 'outbound-task',
    count: 7,
    amount: null,
    severity: 'warning',
  },
  {
    key: 'receivable',
    count: 23,
    amount: 5_320_118.88,
    severity: 'info',
  },
  {
    key: 'stock-alert',
    count: 3,
    amount: null,
    severity: 'danger',
  },
]

/** 边界：全部为零的指标（空业务场景） */
export const ZERO_PENDING_METRICS: DashboardPendingMetric[] = [
  { key: 'purchase-audit', count: 0, amount: null, severity: 'info' },
  { key: 'outbound-task', count: 0, amount: null, severity: 'info' },
  { key: 'receivable', count: 0, amount: null, severity: 'info' },
  { key: 'stock-alert', count: 0, amount: null, severity: 'info' },
]

/** 边界：超大计数值 */
export const OVERSIZED_COUNT = 99_999

export const MOCK_NOTICES: DashboardNotice[] = [
  {
    id: MAX_SNOWFLAKE_ID,
    level: 'critical',
    title: '库存预警：仓库 A「螺纹钢 Φ25mm」已低于安全线',
    content:
      '仓库 A 的螺纹钢 Φ25mm 当前库存 120 吨，低于安全库存 300 吨。请尽快安排补货采购，避免影响近期销售订单出库。',
    publishedAt: '2026-08-22T08:00:00+08:00',
  },
  {
    id: '1983421000000000006',
    level: 'warn',
    title: '系统维护通知：本周六 02:00-04:00 计划停机升级',
    content:
      '为提升系统稳定性，平台将于本周六凌晨 02:00 至 04:00 进行计划性停机维护，期间服务不可用。请提前保存单据并合理安排作业时间。',
    publishedAt: '2026-08-21T16:30:00+08:00',
  },
  {
    id: '1983421000000000007',
    level: 'info',
    title: '新版本发布：打印模板支持自定义页眉页脚',
    content:
      '本次更新后，销售出库单与物流对账单的打印模板支持自定义页眉页脚内容，可在「系统管理 → 打印模板」中配置。',
    publishedAt: '2026-08-20T09:00:00+08:00',
  },
]
