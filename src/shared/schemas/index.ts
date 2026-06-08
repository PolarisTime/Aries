/** @file-dynamic-ref:barrel — 公共 API 入口，对下游消费者暴露类型契约 */
// ── API 契约 ────────────────────────────────────────────
export type {
  BusinessNoResult,
  DocumentStatus,
  EnabledStatus,
} from './api'
// ── 认证 ────────────────────────────────────────────────
export type {
  CaptchaData,
  DataScope,
  Login2faPayload,
  LoginPayload,
  LoginResponseData,
  LoginStep1Response,
  LoginUser,
  ResourcePermission,
  TotpSetupResponse,
} from './auth'
// ── 物料 / 打印模板 / 初始化 ────────────────────────────
export type {
  MaterialImportFailure,
  MaterialImportResult,
} from './material'
// ── 字段访问器 ──────────────────────────────────────────
// ── 模块记录 / 行项目 ────────────────────────────────────
export type {
  LineItem,
  ModuleRecord,
  PurchaseInboundItem,
  PurchaseOrderItem,
  SalesOrderItem,
  SalesOutboundItem,
} from './module-record'

export type {
  PrintActionMode,
  PrintTemplateRecord,
  SavePrintTemplatePayload,
} from './print-template'

export type {
  InitialSetupAdminPayload,
  InitialSetupCompanyPayload,
  InitialSetupStatus,
  InitialSetupTotpPayload,
  InitialSetupTotpResult,
} from './setup'
// ── 用户账户 ────────────────────────────────────────────
export type {
  DepartmentOptionRecord,
  RoleOptionRecord,
  UserAccountCreateResult,
  UserAccountFormPayload,
  UserAccountRecord,
} from './user-account'
