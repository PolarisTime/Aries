// ── API 契约 ────────────────────────────────────────────
export {
  type ApiResponse,
  apiResponseSchema,
  type BusinessNoResult,
  businessNoResultSchema,
  type DocumentStatus,
  documentStatusSchema,
  type EnabledStatus,
  enabledStatusSchema,
  materialInfoSchema,
  type PagedResult,
  pagedResultSchema,
  weightPriceSchema,
} from './api'
// ── 认证 ────────────────────────────────────────────────
export {
  type CaptchaData,
  captchaDataSchema,
  type DataScope,
  dataScopeSchema,
  type Login2faPayload,
  type LoginPayload,
  type LoginResponseData,
  type LoginStep1Response,
  type LoginUser,
  login2faPayloadSchema,
  loginPayloadSchema,
  loginResponseDataSchema,
  loginStep1ResponseSchema,
  loginUserSchema,
  type ResourcePermission,
  resourcePermissionSchema,
  type TotpSetupResponse,
  totpSetupResponseSchema,
} from './auth'
// ── 物料 / 打印模板 / 初始化 ────────────────────────────
export {
  type MaterialImportFailure,
  type MaterialImportResult,
  materialImportFailureSchema,
  materialImportResultSchema,
} from './material'
// ── 字段访问器 ──────────────────────────────────────────
export { fieldsOf, ModuleFieldAccessor } from './module-field'
// ── 模块记录 / 行项目 ────────────────────────────────────
export {
  type LineItem,
  lineItemSchema,
  type ModuleRecord,
  moduleRecordSchema,
  type PurchaseInboundItem,
  type PurchaseOrderItem,
  parseLineItem,
  parseModuleRecord,
  purchaseInboundItemSchema,
  purchaseOrderItemSchema,
  type SalesOrderItem,
  type SalesOutboundItem,
  salesOrderItemSchema,
  salesOutboundItemSchema,
} from './module-record'

export {
  type PrintTemplateRecord,
  printTemplateRecordSchema,
  type SavePrintTemplatePayload,
  savePrintTemplatePayloadSchema,
} from './print-template'

export {
  type InitialSetupAdminPayload,
  type InitialSetupCompanyPayload,
  type InitialSetupStatus,
  type InitialSetupTotpPayload,
  type InitialSetupTotpResult,
  initialSetupAdminPayloadSchema,
  initialSetupCompanyPayloadSchema,
  initialSetupStatusSchema,
  initialSetupTotpPayloadSchema,
  initialSetupTotpResultSchema,
} from './setup'
// ── 用户账户 ────────────────────────────────────────────
export {
  type DepartmentOptionRecord,
  departmentOptionRecordSchema,
  type RoleOptionRecord,
  roleOptionRecordSchema,
  type UserAccountCreateResult,
  type UserAccountFormPayload,
  type UserAccountRecord,
  userAccountCreateResultSchema,
  userAccountFormPayloadSchema,
  userAccountRecordSchema,
} from './user-account'
