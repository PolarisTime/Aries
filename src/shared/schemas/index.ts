// ── API 契约 ────────────────────────────────────────────
export {
  apiResponseSchema, pagedResultSchema, businessNoResultSchema,
  materialInfoSchema, weightPriceSchema,
  documentStatusSchema, enabledStatusSchema,
  type ApiResponse, type PagedResult, type BusinessNoResult,
  type DocumentStatus, type EnabledStatus,
} from './api'

// ── 模块记录 / 行项目 ────────────────────────────────────
export {
  lineItemSchema, moduleRecordSchema,
  purchaseOrderItemSchema, salesOrderItemSchema,
  purchaseInboundItemSchema, salesOutboundItemSchema,
  parseModuleRecord, parseLineItem,
  type LineItem, type ModuleRecord,
  type PurchaseOrderItem, type SalesOrderItem,
  type PurchaseInboundItem, type SalesOutboundItem,
} from './module-record'

// ── 认证 ────────────────────────────────────────────────
export {
  loginPayloadSchema, captchaDataSchema, login2faPayloadSchema,
  resourcePermissionSchema, dataScopeSchema, loginUserSchema,
  loginResponseDataSchema, loginStep1ResponseSchema, totpSetupResponseSchema,
  type LoginPayload, type CaptchaData, type Login2faPayload,
  type ResourcePermission, type DataScope, type LoginUser,
  type LoginResponseData, type LoginStep1Response, type TotpSetupResponse,
} from './auth'

// ── 用户账户 ────────────────────────────────────────────
export {
  userAccountRecordSchema, userAccountFormPayloadSchema,
  userAccountCreateResultSchema, departmentOptionRecordSchema, roleOptionRecordSchema,
  type UserAccountRecord, type UserAccountFormPayload, type UserAccountCreateResult,
  type DepartmentOptionRecord, type RoleOptionRecord,
} from './user-account'

// ── 物料 / 打印模板 / 初始化 ────────────────────────────
export {
  materialImportResultSchema, materialImportFailureSchema,
  type MaterialImportResult, type MaterialImportFailure,
} from './material'

export {
  printTemplateRecordSchema, savePrintTemplatePayloadSchema,
  type PrintTemplateRecord, type SavePrintTemplatePayload,
} from './print-template'

export {
  initialSetupStatusSchema, initialSetupAdminPayloadSchema,
  initialSetupTotpPayloadSchema, initialSetupTotpResultSchema,
  initialSetupCompanyPayloadSchema,
  type InitialSetupStatus, type InitialSetupAdminPayload,
  type InitialSetupTotpPayload, type InitialSetupTotpResult,
  type InitialSetupCompanyPayload,
} from './setup'

// ── 字段访问器 ──────────────────────────────────────────
export { ModuleFieldAccessor, fieldsOf } from './module-field'
