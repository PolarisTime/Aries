import {
  listAllBusinessModuleRows,
  saveBusinessModule,
  updatePageUploadRule,
} from '@/api/business'
import type { UploadRulePayload } from '@/api/business-types'
import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { isToggleSetting } from '@/module-system/settings-constants'
import type { ApiResponse } from '@/types/api'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

const MODULE_KEY = 'general-setting'

export type OssProvider =
  | 's3-compatible'
  | 'aws-s3'
  | 'tencent-cos'
  | 'aliyun-oss'
  | 'huawei-obs'
  | 'cloudflare-r2'
  | 'google-cloud-storage'
  | 'ibm-cos'
  | 'oracle-oci'
  | 'backblaze-b2'
  | 'wasabi'
  | 'digitalocean-spaces'
  | 'scaleway'
  | 'minio'

export interface OssSetting {
  storageMode: 'server-s3' | 'server-local'
  provider: OssProvider
  endpoint: string
  bucket: string
  region: string
  accessKey: string
  secretKeyConfigured: boolean
  keyPrefix: string
  pathStyleAccess: boolean
  encryptedStorage: boolean
  serverProxyOnly: boolean
}

export interface OssSettingPayload {
  storageMode: string
  provider: string
  endpoint: string
  bucket: string
  region: string
  accessKey: string
  secretKey?: string
  keyPrefix: string
  pathStyleAccess: boolean
  encryptedStorage: boolean
  serverProxyOnly: boolean
}

export interface OssOperationResult {
  success: boolean
  stage: string
  message: string
  objectKey: string | null
  details: string[]
}

export interface OssCorsConfigurePayload {
  setting: OssSettingPayload
  origin: string
  methods: string[]
}

export const DISPLAY_SWITCH_CODES = {
  weightOnlyPurchaseInbounds: 'UI_WEIGHT_ONLY_PURCHASE_INBOUNDS',
  weightOnlySalesOutbounds: 'UI_WEIGHT_ONLY_SALES_OUTBOUNDS',
  showSnowflakeId: 'UI_SHOW_SNOWFLAKE_ID',
  useSnowflakeBusinessNo: 'SYS_USE_SNOWFLAKE_ID_AS_BUSINESS_NO',
} as const

interface DisplaySwitchResponse {
  [key: string]: unknown
}

export interface StatementGeneratorRules {
  customerStatementReceiptAmountZero: boolean
  supplierStatementFullPayment: boolean
}

export function listSystemSettings() {
  return listAllBusinessModuleRows(MODULE_KEY, {})
}

export function saveSystemSetting(record: ModuleRecord) {
  return saveBusinessModule(MODULE_KEY, record)
}

export function updateSystemUploadRule(record: UploadRulePayload) {
  return updatePageUploadRule(MODULE_KEY, record)
}

export async function getOssSetting(): Promise<OssSetting> {
  const response = assertApiSuccess(
    await http.get<ApiResponse<OssSetting>>(ENDPOINTS.OSS_SETTINGS),
    '加载 OSS 设置失败',
  )
  return response.data
}

export async function saveOssSetting(
  payload: OssSettingPayload,
): Promise<OssSetting> {
  const response = assertApiSuccess(
    await http.put<ApiResponse<OssSetting>>(ENDPOINTS.OSS_SETTINGS, payload),
    '保存 OSS 设置失败',
  )
  return response.data
}

export async function testOssStorage(
  payload: OssSettingPayload,
): Promise<OssOperationResult> {
  const response = assertApiSuccess(
    await http.post<ApiResponse<OssOperationResult>>(
      `${ENDPOINTS.OSS_SETTINGS}/storage-test`,
      payload,
    ),
    '测试 OSS 存储失败',
  )
  return response.data
}

export async function configureOssCors(
  payload: OssCorsConfigurePayload,
): Promise<OssOperationResult> {
  const response = assertApiSuccess(
    await http.post<ApiResponse<OssOperationResult>>(
      `${ENDPOINTS.OSS_SETTINGS}/cors`,
      payload,
    ),
    '配置 OSS CORS 失败',
  )
  return response.data
}

export async function listDisplaySwitches() {
  const rows = await listClientSettings()
  return rows.filter(isToggleSetting)
}

export async function listClientSettings(): Promise<ModuleRecord[]> {
  const response = assertApiSuccess(
    await http.get<ApiResponse<DisplaySwitchResponse[]>>(
      ENDPOINTS.GENERAL_SETTING_CLIENT_SETTINGS,
    ),
    '加载客户端设置失败',
  )
  return (response.data || []).map(toModuleRecord)
}

// TODO: implement field mapping/validation instead of bare type assertion
function toModuleRecord(item: Record<string, unknown>): ModuleRecord {
  return item as unknown as ModuleRecord
}

export async function getStatementGeneratorRules(): Promise<StatementGeneratorRules> {
  const response = assertApiSuccess(
    await http.get<ApiResponse<Partial<StatementGeneratorRules>>>(
      ENDPOINTS.STATEMENT_GENERATOR_RULE,
    ),
    '加载对账单生成规则失败',
  )
  return {
    customerStatementReceiptAmountZero: Boolean(
      response.data?.customerStatementReceiptAmountZero,
    ),
    supplierStatementFullPayment: Boolean(
      response.data?.supplierStatementFullPayment,
    ),
  }
}

export function isDisplaySwitchEnabled(
  rows: ModuleRecord[] | undefined,
  settingCode: string,
) {
  const matched = rows?.find(
    (record) => asString(record.settingCode).trim() === settingCode,
  )
  return asString(matched?.status) === '正常'
}

export function getClientSettingNumber(
  rows: ModuleRecord[] | undefined,
  settingCode: string,
  fallbackValue: number,
) {
  const target = (rows || []).find(
    (row) =>
      String(row.settingCode || '') === settingCode &&
      String(row.status || '') === '正常',
  )
  const numericValue = Number(target?.sampleNo)
  return Number.isFinite(numericValue) ? numericValue : fallbackValue
}
