import type { ModuleRecord } from '@/types/module-page'

export const DEFAULT_TAX_RATE_SETTING_CODE = 'SYS_DEFAULT_TAX_RATE'
export const MAX_CONCURRENT_SESSIONS_CODE = 'SYS_MAX_CONCURRENT_SESSIONS'

export const SYSTEM_SWITCH_HELP_TEXT: Record<string, string> = {
  SYS_DEFAULT_TAX_RATE:
    '用于发票默认税率与税额自动计算，修改后新开票草稿会使用该值。',
  SYS_MAX_CONCURRENT_SESSIONS:
    '限制同一用户同时保持的有效会话数量，超出后最早的会话将被自动清理。设为 0 或留空表示不限制。',
  UI_WEIGHT_ONLY_PURCHASE_INBOUNDS:
    '启用后，采购入库页面切换到重量视图，隐藏金额和单价字段。',
  UI_WEIGHT_ONLY_SALES_OUTBOUNDS:
    '启用后，销售出库页面切换到重量视图，隐藏金额和单价字段。',
  SYS_CUSTOMER_STATEMENT_RECEIPT_ZERO_FROM_SALES_ORDER:
    '启用后，生成客户对账单草稿时默认收款金额为 0，期末余额等于所选销售订单总金额。',
  SYS_SUPPLIER_STATEMENT_FULL_PAYMENT_FROM_PURCHASE:
    '启用后，生成供应商对账单草稿时默认付款金额等于所选采购单据总金额。',
  SYS_OPERATION_LOG_RECORD_ALL_WRITE:
    '启用后，普通写操作会按新增、编辑、删除、审核、导出、打印自动记录。',
  SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS:
    '启用后，会按照下方勾选项自动记录页面层操作。',
  SYS_OPERATION_LOG_RECORD_AUTH_EVENTS:
    '启用后，登录成功、登录失败、2FA 验证失败和退出登录会写入操作日志。',
  SYS_FORCE_USER_TOTP_ON_FIRST_LOGIN:
    '启用后，管理员新增的账号首次使用密码登录时，会先进入专用安全引导页。',
  SYS_BATCH_NO_AUTO_GENERATE:
    '启用后，批号管理商品在明细未填写批号时，系统按单号规则中的批号生成规则自动补齐。',
  UI_HIDE_AUDITED_LIST_RECORDS:
    '启用后，业务列表分页查询默认不显示下方勾选状态的单据。',
  UI_SHOW_SNOWFLAKE_ID:
    '启用后，业务列表显示系统雪花 ID 列，便于排查数据问题。',
  SYS_LOGIN_CAPTCHA: '启用后，登录时需输入图形验证码，增加暴力破解防护。',
}

export const DETAILED_OPERATION_ACTION_OPTIONS = [
  { label: '查询', value: 'QUERY' },
  { label: '查看', value: 'DETAIL' },
  { label: '新增', value: 'CREATE' },
  { label: '编辑', value: 'EDIT' },
  { label: '删除', value: 'DELETE' },
  { label: '审核', value: 'AUDIT' },
  { label: '导出', value: 'EXPORT' },
  { label: '打印', value: 'PRINT' },
]

export const HIDE_AUDITED_STATUS_OPTIONS = [
  { label: '已审核', value: '已审核' },
  { label: '已完成', value: '已完成' },
  { label: '完成采购', value: '完成采购' },
  { label: '完成入库', value: '完成入库' },
  { label: '完成销售', value: '完成销售' },
  { label: '已付款', value: '已付款' },
  { label: '已收款', value: '已收款' },
  { label: '已签署', value: '已签署' },
  { label: '已送达', value: '已送达' },
]

export const GENERAL_SETTING_STATUS_OPTIONS = [
  { label: '已启用', value: '正常' },
  { label: '已关闭', value: '禁用' },
]

export function isDefaultTaxRateSetting(record: ModuleRecord) {
  return (
    String(record.settingCode || '').trim() === DEFAULT_TAX_RATE_SETTING_CODE
  )
}

export function isMaxConcurrentSetting(record: ModuleRecord) {
  return (
    String(record.settingCode || '').trim() === MAX_CONCURRENT_SESSIONS_CODE
  )
}

export function isNumericSetting(record: ModuleRecord) {
  return isDefaultTaxRateSetting(record) || isMaxConcurrentSetting(record)
}

export function isToggleSetting(record: ModuleRecord) {
  const code = String(record.settingCode || '')
  return !isNumericSetting(record) && (code.startsWith('SYS_') || code.startsWith('UI_'))
}

export function matchesGeneralSettingKeyword(
  record: ModuleRecord,
  searchKeyword: string,
) {
  if (!searchKeyword.trim()) return true
  const normalized = searchKeyword.trim().toLowerCase()
  return [
    record.settingCode,
    record.settingName,
    record.billName,
    record.remark,
  ].some((item) =>
    String(item || '')
      .toLowerCase()
      .includes(normalized),
  )
}

export function formatSettingValue(record: ModuleRecord) {
  if (isDefaultTaxRateSetting(record)) {
    const value = Number(record.sampleNo || 0)
    return value ? `${(value * 100).toFixed(0)}%` : '13%'
  }
  if (isMaxConcurrentSetting(record)) {
    return String(record.sampleNo || '0')
  }
  return String(record.sampleNo || '--')
}

export function formatSwitchState(record: ModuleRecord) {
  if (String(record.status || '') !== '正常') return '已关闭'
  return '已启用'
}

export function resolveDefaultTaxRateValue(rows: ModuleRecord[] | undefined) {
  const matched = rows?.find(isDefaultTaxRateSetting)
  const value = Number(matched?.sampleNo || 0)
  return Number.isFinite(value) && value > 0 ? value : 0
}
