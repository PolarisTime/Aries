/**
 * 状态词表：稳定英文 code（对外传输/存储）+ 中文展示映射。
 *
 * <p>2026-11 起后端把 DB 与 API 的状态值统一为英文 code（Flyway V219），
 * 前端因此**只以 code 作为比较、筛选、提交的取值**；中文只用于展示，且只有两个出口：</p>
 * <ul>
 *   <li>{@link STATUS_LABELS} + {@link statusLabel}：没有 i18n `t()` 的纯数据场景
 *       （常量选项、非 React 逻辑、兜底文案）；</li>
 *   <li>`DOCUMENT_STATUS_REGISTRY` 的 `i18nKey`（见 `@/constants/document-status`）：
 *       有 `t()` 的组件统一走 `getStatusText`，与列表 Tag / 筛选下拉共用同一份文案。</li>
 * </ul>
 *
 * <p>新增状态时：常量值必须与后端 `DocumentStatus` 枚举的 `code()` 逐字一致，
 * 并同时补 {@link STATUS_LABELS}；不要在业务代码里再写状态中文字面量。</p>
 */

// 通用状态
export const STATUS = {
  NORMAL: 'NORMAL',
  DISABLED: 'DISABLED',
} as const

// 结算账户类型（不是状态 code：后端仍以中文区分通用/收款/付款）
export const SETTLEMENT_TYPE = {
  GENERAL: '通用',
  RECEIPT: '收款',
  PAYMENT: '付款',
} as const

// 业务单据状态
export const DOCUMENT_STATUS = {
  DRAFT: 'DRAFT',
  UNAUDITED: 'UNAUDITED',
  PENDING_AUDIT: 'PENDING_AUDIT',
  AUDITED: 'AUDITED',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  UNAPPROVED: 'UNAPPROVED',
  DELIVERY_VERIFICATION: 'DELIVERY_VERIFICATION',
  PENDING_CONFIRM: 'PENDING_CONFIRM',
  CONFIRMED: 'CONFIRMED',
  PURCHASE_COMPLETED: 'PURCHASE_COMPLETED',
  SALES_COMPLETED: 'SALES_COMPLETED',
  INBOUND_COMPLETED: 'INBOUND_COMPLETED',
  PARTIAL_INBOUND: 'PARTIAL_INBOUND',
  PARTIAL_OUTBOUND: 'PARTIAL_OUTBOUND',
  COMPLETED: 'COMPLETED',
  SIGNED: 'SIGNED',
  UNSIGNED: 'UNSIGNED',
  EXECUTING: 'EXECUTING',
  RECEIVED: 'RECEIVED',
  PAID: 'PAID',
  PARTIAL_SETTLED: 'PARTIAL_SETTLED',
  ARCHIVED: 'ARCHIVED',
  NORMAL: 'NORMAL',
  DISABLED: 'DISABLED',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  DELETED: 'DELETED',
  /** 销售合同「审核」态：与通用 {@link AUDITED}（已审核）区分。 */
  CONTRACT_REVIEWED: 'CONTRACT_REVIEWED',
  /** 销售合同「签发」态：区别于通用 {@link AUDITED}。 */
  CONTRACT_ISSUED: 'CONTRACT_ISSUED',
  /** 销售合同「作废」终态：只读，不计入有效合同额度。 */
  VOIDED: 'VOIDED',
  /** 报单比价单据状态。 */
  QUOTING: 'QUOTING',
} as const

/**
 * 状态 code → 中文展示文案（中文在代码里的唯一集中处）。
 *
 * <p>与后端 `DocumentStatus.label()` 逐字对齐；`ARCHIVED` 取后端当前的「归档」。
 * i18n 的 `modules.status.*` 可能更口语（如 `disabled: 已禁用`），两者分工不同：
 * 这里只负责"没有翻译函数时也能显示中文"。</p>
 */
export const STATUS_LABELS = {
  NORMAL: '正常',
  DISABLED: '禁用',
  DRAFT: '草稿',
  AUDITED: '已审核',
  CONTRACT_REVIEWED: '审核',
  CONTRACT_ISSUED: '签发',
  COMPLETED: '已完成',
  VOIDED: '作废',
  PURCHASE_COMPLETED: '完成采购',
  SALES_COMPLETED: '完成销售',
  INBOUND_COMPLETED: '完成入库',
  DELIVERY_VERIFICATION: '交付核定',
  SIGNED: '已签署',
  UNSIGNED: '未签署',
  UNAUDITED: '未审核',
  EXECUTING: '执行中',
  ARCHIVED: '归档',
  PENDING_CONFIRM: '待确认',
  CONFIRMED: '已确认',
  PENDING_AUDIT: '待审核',
  QUOTING: '报价',
  SUCCESS: '成功',
  FAILED: '失败',
  PAID: '已付款',
  RECEIVED: '已收款',
  PENDING_APPROVAL: '待核准',
  APPROVED: '已核准',
  UNAPPROVED: '未核准',
  PARTIAL_INBOUND: '部分入库',
  PARTIAL_OUTBOUND: '部分出库',
  PARTIAL_SETTLED: '部分结清',
  DELETED: '已删除',
} as const satisfies Record<string, string>

/** 已知状态 code 的联合类型（含前端仍会遇到的 legacy code）。 */
export type StatusCode = keyof typeof STATUS_LABELS

/**
 * 状态 code → 中文展示文案；未知值原样返回。
 *
 * <p>未知值原样返回而不是空串或兜底「未知」：后端新增状态时宁可让用户看到
 * 一个陌生 code，也不要把它悄悄显示成「正常」而误导判断。</p>
 */
export function statusLabel(value: string | null | undefined): string {
  if (value == null) {
    return ''
  }
  const text = String(value)
  return (STATUS_LABELS as Record<string, string>)[text] ?? text
}
