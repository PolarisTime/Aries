import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'

type PayloadBuilder = (record: ModuleRecord) => Record<string, unknown>

const lineItemPayloadModuleKeys = new Set([
  'purchase-orders',
  'purchase-inbounds',
  'sales-orders',
  'sales-outbounds',
  'freight-bills',
  'purchase-contracts',
  'sales-contracts',
  'supplier-statements',
  'customer-statements',
  'freight-statements',
  'invoice-receipts',
  'invoice-issues',
])

const scalarFieldsByModule: Record<string, readonly string[]> = {
  materials: [
    'materialCode',
    'brand',
    'material',
    'category',
    'spec',
    'length',
    'unit',
    'quantityUnit',
    'pieceWeightTon',
    'piecesPerBundle',
    'unitPrice',
    'batchNoEnabled',
    'remark',
  ],
  suppliers: [
    'supplierCode',
    'supplierName',
    'contactName',
    'contactPhone',
    'city',
    'status',
    'remark',
  ],
  customers: [
    'customerCode',
    'customerName',
    'contactName',
    'contactPhone',
    'city',
    'settlementMode',
    'status',
    'remark',
  ],
  carriers: [
    'carrierCode',
    'carrierName',
    'contactName',
    'contactPhone',
    'vehicleType',
    'priceMode',
    'status',
    'remark',
  ],
  warehouses: [
    'warehouseCode',
    'warehouseName',
    'warehouseType',
    'contactName',
    'contactPhone',
    'address',
    'status',
    'remark',
  ],
  'purchase-orders': [
    'orderNo',
    'supplierName',
    'orderDate',
    'buyerName',
    'status',
    'remark',
  ],
  'purchase-inbounds': [
    'inboundNo',
    'purchaseOrderNo',
    'supplierName',
    'warehouseName',
    'inboundDate',
    'settlementMode',
    'status',
    'remark',
  ],
  'sales-orders': [
    'orderNo',
    'purchaseInboundNo',
    'customerName',
    'projectName',
    'deliveryDate',
    'salesName',
    'status',
    'remark',
  ],
  'sales-outbounds': [
    'outboundNo',
    'salesOrderNo',
    'customerName',
    'projectName',
    'warehouseName',
    'outboundDate',
    'status',
    'remark',
  ],
  'freight-bills': [
    'billNo',
    'outboundNo',
    'carrierName',
    'customerName',
    'projectName',
    'billTime',
    'unitPrice',
    'status',
    'deliveryStatus',
    'remark',
  ],
  'purchase-contracts': [
    'contractNo',
    'supplierName',
    'signDate',
    'effectiveDate',
    'expireDate',
    'buyerName',
    'status',
    'remark',
  ],
  'sales-contracts': [
    'contractNo',
    'customerName',
    'projectName',
    'signDate',
    'effectiveDate',
    'expireDate',
    'salesName',
    'status',
    'remark',
  ],
  'supplier-statements': [
    'statementNo',
    'sourceInboundNos',
    'supplierName',
    'startDate',
    'endDate',
    'purchaseAmount',
    'status',
    'remark',
  ],
  'customer-statements': [
    'statementNo',
    'sourceOrderNos',
    'customerName',
    'projectName',
    'startDate',
    'endDate',
    'salesAmount',
    'status',
    'remark',
  ],
  'freight-statements': [
    'statementNo',
    'sourceBillNos',
    'carrierName',
    'startDate',
    'endDate',
    'totalWeight',
    'totalFreight',
    'status',
    'signStatus',
    'attachment',
    'remark',
  ],
  receipts: [
    'receiptNo',
    'customerName',
    'projectName',
    'sourceStatementId',
    'receiptDate',
    'payType',
    'amount',
    'status',
    'operatorName',
    'remark',
  ],
  payments: [
    'paymentNo',
    'businessType',
    'counterpartyName',
    'sourceStatementId',
    'paymentDate',
    'payType',
    'amount',
    'status',
    'operatorName',
    'remark',
  ],
  'invoice-receipts': [
    'receiveNo',
    'invoiceNo',
    'sourcePurchaseOrderNos',
    'supplierName',
    'invoiceTitle',
    'invoiceDate',
    'invoiceType',
    'amount',
    'taxAmount',
    'status',
    'operatorName',
    'remark',
  ],
  'invoice-issues': [
    'issueNo',
    'invoiceNo',
    'sourceSalesOrderNos',
    'customerName',
    'projectName',
    'invoiceDate',
    'invoiceType',
    'amount',
    'taxAmount',
    'status',
    'operatorName',
    'remark',
  ],
  'general-settings': [
    'settingCode',
    'settingName',
    'billName',
    'prefix',
    'dateRule',
    'serialLength',
    'resetRule',
    'sampleNo',
    'status',
    'remark',
  ],
  'company-settings': [
    'companyName',
    'taxNo',
    'bankName',
    'bankAccount',
    'taxRate',
    'status',
    'remark',
  ],
  'permission-management': [
    'permissionCode',
    'permissionName',
    'moduleName',
    'permissionType',
    'actionName',
    'scopeName',
    'resourceKey',
    'status',
    'remark',
  ],
  departments: [
    'departmentCode',
    'departmentName',
    'parentId',
    'managerName',
    'contactPhone',
    'sortOrder',
    'status',
    'remark',
  ],
  'user-accounts': [
    'loginName',
    'password',
    'userName',
    'mobile',
    'departmentId',
    'roleNames',
    'dataScope',
    'permissionSummary',
    'status',
    'remark',
  ],
  'role-settings': [
    'roleCode',
    'roleName',
    'roleType',
    'dataScope',
    'permissionCodes',
    'permissionSummary',
    'userCount',
    'status',
    'remark',
  ],
}

function toArray<T>(value: T[] | undefined) {
  return Array.isArray(value) ? value : []
}

function pickDefinedFields(record: ModuleRecord, fields: readonly string[]) {
  const next: Record<string, unknown> = {}
  fields.forEach((field) => {
    if (record[field] !== undefined) {
      next[field] = record[field]
    }
  })
  return next
}

function toPersistedLineItemId(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return String(value)
  }
  if (typeof value !== 'string') {
    return undefined
  }
  const normalized = value.trim()
  return /^\d+$/.test(normalized) ? normalized : undefined
}

function serializeLineItem(item: ModuleLineItem) {
  const persistedId = toPersistedLineItemId(item.id)
  return {
    ...(persistedId ? { id: persistedId } : {}),
    materialCode: item.materialCode,
    brand: item.brand,
    category: item.category,
    material: item.material,
    spec: item.spec,
    length: item.length,
    unit: item.unit,
    batchNo: item.batchNo,
    quantity: Number(item.quantity || 0),
    quantityUnit: item.quantityUnit,
    pieceWeightTon: item.pieceWeightTon,
    piecesPerBundle: Number(item.piecesPerBundle || 0),
    weightTon: item.weightTon,
    unitPrice: item.unitPrice,
    amount: item.amount,
    sourcePurchaseOrderItemId: item.sourcePurchaseOrderItemId,
    sourceSalesOrderItemId: item.sourceSalesOrderItemId,
    sourceInboundItemId: item.sourceInboundItemId,
    sourceNo: item.sourceNo,
    customerName: item.customerName,
    projectName: item.projectName,
    materialName: item.materialName,
    warehouseName: item.warehouseName,
  }
}

const scalarPayloadBuilders: Record<string, PayloadBuilder> =
  Object.fromEntries(
    Object.entries(scalarFieldsByModule).map(([moduleKey, fields]) => [
      moduleKey,
      (record: ModuleRecord) => pickDefinedFields(record, fields),
    ]),
  ) as Record<string, PayloadBuilder>

export function serializeBusinessRecordForSave(
  moduleKey: string,
  record: ModuleRecord,
) {
  const builder = scalarPayloadBuilders[moduleKey]
  if (!builder) {
    throw new Error(`未配置模块保存映射: ${moduleKey}`)
  }

  const payload = builder(record)

  if (
    moduleKey === 'freight-statements' &&
    Array.isArray(record.attachmentIds)
  ) {
    payload.attachmentIds = record.attachmentIds
  }

  if (lineItemPayloadModuleKeys.has(moduleKey)) {
    payload.items = toArray(record.items).map((item) => serializeLineItem(item))
  }

  return payload
}
