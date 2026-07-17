/** @file-dynamic-ref:barrel — 公共 API 入口，对下游消费者暴露类型契约 */
// ── API 契约 ────────────────────────────────────────────
export type {
  DocumentStatus,
  EnabledStatus,
  SettlementCompanyOption,
} from './api'
// ── 认证 ────────────────────────────────────────────────
export type {
  LoginPayload,
  LoginResponseData,
  LoginResult,
  LoginUser,
  ResourcePermission,
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
  PrintTemplateResponse,
  SavePrintTemplatePayload,
} from './print-template'

export type {
  InitialSetupAdminPayload,
  InitialSetupAdminSubmitPayload,
  InitialSetupCompanyPayload,
  InitialSetupResult,
  InitialSetupStatus,
  InitialSetupSubmitResponse,
} from './setup'
// ── 用户账户 ────────────────────────────────────────────
export type {
  DepartmentOptionRecord,
  RoleOptionRecord,
  UserAccountCreateResult,
  UserAccountFormPayload,
  UserAccountLoginNameAvailability,
  UserAccountRecord,
} from './user-account'
