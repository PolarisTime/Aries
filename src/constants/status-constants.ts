/**
 * 后端状态值常量映射
 * 用于统一管理硬编码的中文状态值
 */

// 通用状态
export const STATUS = {
  NORMAL: '正常',
  DISABLED: '禁用',
} as const

// 结算账户类型
export const SETTLEMENT_TYPE = {
  GENERAL: '通用',
  RECEIPT: '收款',
  PAYMENT: '付款',
} as const

// 业务单据状态
export const DOCUMENT_STATUS = {
  DRAFT: '草稿',
  UNAUDITED: '未审核',
  PENDING_AUDIT: '待审核',
  AUDITED: '已审核',
  PENDING_APPROVAL: '待核准',
  APPROVED: '已核准',
  DELIVERY_VERIFICATION: '交付核定',
  PENDING_CONFIRM: '待确认',
  CONFIRMED: '已确认',
  PURCHASE_COMPLETED: '完成采购',
  SALES_COMPLETED: '完成销售',
  INBOUND_COMPLETED: '完成入库',
  PARTIAL_INBOUND: '部分入库',
  PARTIAL_OUTBOUND: '部分出库',
  COMPLETED: '已完成',
  SIGNED: '已签署',
  UNSIGNED: '未签署',
  EXECUTING: '执行中',
  RECEIVED: '已收款',
  PAID: '已付款',
  PARTIAL_SETTLED: '部分结清',
  ARCHIVED: '已归档',
  NORMAL: '正常',
  DISABLED: '禁用',
  SUCCESS: '成功',
  FAILED: '失败',
  DELETED: '已删除',
} as const
