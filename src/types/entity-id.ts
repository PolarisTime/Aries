import { logger } from '@/utils/logger'

/** 系统内持久化业务实体的十进制雪花 ID。 */
export type EntityId = string

const MAX_SIGNED_BIGINT_ID = 9_223_372_036_854_775_807n
const ENTITY_ID_PATTERN = /^[1-9]\d*$/

/** API 返回或保存载荷包含非法实体 ID 时抛出的契约错误。 */
export class EntityIdContractError extends Error {
  readonly field: string

  constructor(field: string) {
    super(`实体 ID 契约无效：${field}`)
    this.name = 'EntityIdContractError'
    this.field = field
  }
}

/**
 * 将 API 边界值解析为 EntityId。
 *
 * 兼容期仅接受安全正整数 number；大整数 number 已可能丢失精度，必须失败关闭。
 */
export function parseEntityId(value: unknown, field = 'entityId'): EntityId {
  if (typeof value === 'string') {
    if (
      !ENTITY_ID_PATTERN.test(value) ||
      BigInt(value) > MAX_SIGNED_BIGINT_ID
    ) {
      throw new EntityIdContractError(field)
    }
    return value
  }

  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    logger.warn('API 返回了旧版数值实体 ID，已兼容转换为字符串', {
      field,
      value,
    })
    return String(value)
  }

  throw new EntityIdContractError(field)
}

/** 可选实体 ID；只有真正未提供的值可以省略。 */
export function parseOptionalEntityId(
  value: unknown,
  field = 'entityId',
): EntityId | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return parseEntityId(value, field)
}

/**
 * 明确声明的实体 ID 字段。不得用 `endsWith('Id')` 推断，避免误处理 traceId 等协议标识。
 */
export const ENTITY_ID_FIELDS = new Set([
  'id',
  'attachmentId',
  'carrierId',
  'counterpartyId',
  'customerId',
  'defaultSettlementCompanyId',
  'departmentId',
  'materialCategoryId',
  'materialId',
  'operatorId',
  'parentId',
  'projectId',
  'purchaseInboundItemId',
  'purchaseOrderId',
  'purchaseOrderItemId',
  'recordId',
  'roleId',
  'salesOrderId',
  'salesOrderItemId',
  'settlementCompanyId',
  'sourceCustomerStatementId',
  'sourceDocumentId',
  'sourceFreightBillId',
  'sourceFreightBillItemId',
  'sourceFreightStatementId',
  'sourceInboundItemId',
  'sourcePurchaseOrderId',
  'sourcePurchaseOrderItemId',
  'sourceSalesOrderId',
  'sourceSalesOrderItemId',
  'sourceSalesOutboundId',
  'sourceSalesOutboundItemId',
  'sourceStatementId',
  'sourceSupplierStatementId',
  'supplierId',
  'userId',
  'vehicleId',
  'warehouseId',
])

/** 明确声明的实体 ID 数组字段。 */
export const ENTITY_ID_ARRAY_FIELDS = new Set([
  'attachmentIds',
  'sourceDocumentIds',
  'sourceItemIds',
  'sourcePurchaseOrderIds',
  'sourceSalesOrderIds',
])

function childPath(parent: string, key: string): string {
  return parent ? `${parent}.${key}` : key
}

function normalizeValue(value: unknown, path: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) => normalizeValue(item, `${path}[${index}]`))
  }
  if (value === null || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => {
      const pathForKey = childPath(path, key)
      if (ENTITY_ID_FIELDS.has(key)) {
        return [key, parseOptionalEntityId(nestedValue, pathForKey)]
      }
      if (ENTITY_ID_ARRAY_FIELDS.has(key)) {
        if (nestedValue === undefined || nestedValue === null) {
          return [key, nestedValue]
        }
        if (!Array.isArray(nestedValue)) {
          throw new EntityIdContractError(pathForKey)
        }
        return [
          key,
          nestedValue.map((item, index) =>
            parseEntityId(item, `${pathForKey}[${index}]`),
          ),
        ]
      }
      return [key, normalizeValue(nestedValue, pathForKey)]
    }),
  )
}

/** 递归规范化业务 API 记录中的全部已声明实体 ID 字段。 */
export function normalizeEntityIds<T>(value: T): T {
  return normalizeValue(value, '') as T
}
