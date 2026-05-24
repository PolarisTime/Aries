// ── API 契约 ────────────────────────────────────────────
export {
  type BusinessNoResult,
  type DocumentStatus,
  type EnabledStatus,
  materialInfoSchema,
  weightPriceSchema,
} from './api'
// ── 认证 ────────────────────────────────────────────────
export {
  type CaptchaData,
  type DataScope,
  type Login2faPayload,
  type LoginPayload,
  type LoginResponseData,
  type LoginStep1Response,
  type LoginUser,
  type ResourcePermission,
  type TotpSetupResponse,
} from './auth'
// ── 物料 / 打印模板 / 初始化 ────────────────────────────
export {
  type MaterialImportFailure,
  type MaterialImportResult,
} from './material'
// ── 字段访问器 ──────────────────────────────────────────
// ── 模块记录 / 行项目 ────────────────────────────────────
export {
  type LineItem,
  type ModuleRecord,
  type PurchaseInboundItem,
  type PurchaseOrderItem,
  type SalesOrderItem,
  type SalesOutboundItem,
} from './module-record'

export {
  type PrintTemplateRecord,
  type SavePrintTemplatePayload,
} from './print-template'

export {
  type InitialSetupAdminPayload,
  type InitialSetupCompanyPayload,
  type InitialSetupStatus,
  type InitialSetupTotpPayload,
  type InitialSetupTotpResult,
} from './setup'
// ── 用户账户 ────────────────────────────────────────────
export {
  type DepartmentOptionRecord,
  type RoleOptionRecord,
  type UserAccountCreateResult,
  type UserAccountFormPayload,
  type UserAccountRecord,
} from './user-account'
