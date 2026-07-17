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
  AUDITED: '已审核',
  PURCHASE_COMPLETED: '完成采购',
  SALES_COMPLETED: '完成销售',
  INBOUND_COMPLETED: '完成入库',
} as const

// 物料类型
export const MATERIAL_TYPE = {
  COIL_REBAR: '盘螺',
  WIRE_ROD: '线材',
} as const
