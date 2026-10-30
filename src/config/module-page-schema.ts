import { SALES_ORDER_PRICING_SNAPSHOT_FIELDS } from '@/config/business-pages/operations/sales-order-price-snapshot'

interface ModuleSaveFieldSchema {
  scalar?: string[]
  lineItem?: string[]
  chargeItem?: string[]
  computed?: string[]
}

/**
 * 页面 schema：**只描述保存载荷字段**。
 *
 * <p>注意：这里**不放列表筛选器**。列表筛选的真实来源是
 * `business-pages/**` 页面配置的 `filters`（消费方 `ModuleFilterToolbar`）。
 * 本文件曾经也有一份 `filters`，但全仓库无人读取 —— 加筛选器时改到这里
 * 会出现「配置里有、界面不渲染」的静默失效（真实发生过一次）。
 * 现已删除，避免同一事实在两处声明。</p>
 */
interface ModulePageSchema {
  saveFields?: ModuleSaveFieldSchema
}

const modulePageSchemaMap: Record<string, ModulePageSchema> = {
  'purchase-order': {
    saveFields: {
      scalar: [
        'orderNo',
        'supplierId',
        'supplierCode',
        'supplierName',
        'settlementCompanyId',
        'orderDate',
        'buyerName',
        'status',
        'remark',
      ],
      chargeItem: [
        'id',
        'chargeName',
        'materialId',
        'amount',
        'unit',
        'remark',
      ],
      lineItem: [
        'materialId',
        'materialCode',
        'brand',
        'category',
        'material',
        'spec',
        'length',
        'unit',
        'warehouseId',
        'warehouseName',
        'batchNo',
        'quantity',
        'quantityUnit',
        'pieceWeightTon',
        'piecesPerBundle',
        'weightTon',
        'unitPrice',
        'amount',
      ],
    },
  },
  'purchase-inbound': {
    saveFields: {
      scalar: [
        'inboundNo',
        'purchaseOrderNo',
        'supplierId',
        'supplierCode',
        'supplierName',
        'inboundDate',
        'status',
        'remark',
      ],
      lineItem: [
        'sourcePurchaseOrderItemId',
        'materialId',
        'materialCode',
        'brand',
        'category',
        'material',
        'spec',
        'length',
        'unit',
        'warehouseId',
        'warehouseName',
        'settlementMode',
        'batchNo',
        'quantity',
        'quantityUnit',
        'pieceWeightTon',
        'piecesPerBundle',
        'weightTon',
        'weighWeightTon',
        'weightAdjustmentTon',
        'weightAdjustmentAmount',
        'unitPrice',
        'amount',
      ],
    },
  },
  'sales-order': {
    saveFields: {
      scalar: [
        'orderNo',
        'purchaseInboundNo',
        'purchaseOrderNo',
        'customerId',
        'customerCode',
        'customerName',
        'projectId',
        'projectName',
        'settlementCompanyId',
        'settlementCompanyName',
        'orderDate',
        'deliveryDate',
        'salesName',
        'status',
        'remark',
        'priceRuleId',
        // 交付核定取价快照: 字段清单与单据侧写入共用同一常量, 避免两处各写一份。
        ...SALES_ORDER_PRICING_SNAPSHOT_FIELDS,
      ],
      chargeItem: [
        'id',
        'chargeName',
        'materialId',
        'amount',
        'unit',
        'remark',
      ],
      lineItem: [
        'sourceInboundItemId',
        'sourcePurchaseOrderItemId',
        'materialId',
        'materialCode',
        'brand',
        'category',
        'material',
        'spec',
        'length',
        'unit',
        'warehouseId',
        'warehouseName',
        'batchNo',
        'quantity',
        'quantityUnit',
        'pieceWeightTon',
        'piecesPerBundle',
        'weightTon',
        'unitPrice',
        'amount',
      ],
    },
  },
  'sales-outbound': {
    saveFields: {
      scalar: [
        'outboundNo',
        'salesOrderNo',
        'customerId',
        'customerName',
        'projectId',
        'projectName',
        'warehouseName',
        'outboundDate',
        'status',
        'remark',
      ],
      lineItem: [
        'id',
        'sourceSalesOrderItemId',
        'quantity',
        'quantityUnit',
        'pieceWeightTon',
        'piecesPerBundle',
        'unitPrice',
        'warehouseId',
        'warehouseName',
      ],
    },
  },
  'sales-return': {
    saveFields: {
      scalar: [
        'returnNo',
        'salesOrderNo',
        'customerId',
        'customerName',
        'projectId',
        'projectName',
        'warehouseId',
        'warehouseName',
        'settlementCompanyId',
        'settlementCompanyName',
        'returnDate',
        'status',
        'remark',
      ],
      lineItem: [
        'id',
        'sourceSalesOutboundItemId',
        'sourceSalesOrderItemId',
        'sourceFreightBillId',
        'materialId',
        'materialCode',
        'brand',
        'category',
        'material',
        'spec',
        'length',
        'unit',
        'warehouseId',
        'warehouseName',
        'batchNo',
        'quantity',
        'quantityUnit',
        'pieceWeightTon',
        'piecesPerBundle',
        'weightTon',
        'unitPrice',
        'amount',
      ],
    },
  },
  'freight-bill': {
    saveFields: {
      scalar: [
        'billNo',
        'carrierId',
        'carrierCode',
        'carrierName',
        'settlementCompanyId',
        'settlementCompanyName',
        'vehiclePlate',
        'billTime',
        'unitPrice',
        'settlementMode',
        'fixedFreightAmount',
        'status',
        'remark',
      ],
      chargeItem: [
        'id',
        'chargeName',
        'materialId',
        'amount',
        'unit',
        'remark',
      ],
      lineItem: ['id', 'sourceSalesOrderItemId', 'quantity'],
    },
  },
  receipt: {
    saveFields: {
      scalar: [
        'receiptNo',
        'counterpartyType',
        'counterpartyId',
        'counterpartyCode',
        'counterpartyName',
        'receiptPurpose',
        'customerId',
        'customerCode',
        'customerName',
        'projectId',
        'projectName',
        'settlementCompanyId',
        'settlementCompanyName',
        'receiptDate',
        'payType',
        'amount',
        'accountId',
        'status',
        'operatorName',
        'remark',
      ],
    },
  },
  payment: {
    saveFields: {
      scalar: [
        'paymentNo',
        'counterpartyType',
        'counterpartyId',
        'paymentPurpose',
        'counterpartyCode',
        'counterpartyName',
        'settlementCompanyId',
        'settlementCompanyName',
        'paymentDate',
        'payType',
        'amount',
        'accountId',
        'status',
        'operatorName',
        'remark',
      ],
    },
  },
  'customer-statement': {
    saveFields: {
      scalar: [
        'statementNo',
        'sourceOrderNos',
        'customerId',
        'customerCode',
        'customerName',
        'projectId',
        'projectName',
        'settlementCompanyId',
        'settlementCompanyName',
        'startDate',
        'endDate',
        'salesAmount',
        'receiptAmount',
        'closingAmount',
        'direction',
        'status',
        'remark',
      ],
      lineItem: ['id', 'sourceSalesOrderItemId'],
    },
  },
  'freight-statement': {
    saveFields: {
      scalar: [
        'statementNo',
        'carrierId',
        'carrierCode',
        'carrierName',
        'settlementCompanyId',
        'settlementCompanyName',
        'startDate',
        'endDate',
        'totalWeight',
        'totalFreight',
        'paidAmount',
        'unpaidAmount',
        'status',
        'attachment',
        'remark',
      ],
      lineItem: ['id', 'sourceFreightBillId', 'sourceFreightBillItemId'],
    },
  },

  /*
   * ── 基础资料（主数据）───────────────────────────────────────────────
   *
   * 这些模块的列表页正从专用视图（MasterDataListPage + 各自 spec）迁移到通用列表页
   * （business-grid），保存链路改走本文件的 saveFields 白名单。字段逐个对照各页
   * spec 的 `buildRecord` 抄录——**没有用 formFields 推导**，因为两者并不总是一致：
   * `supplier` 的 buildRecord 会写 `brands`，而配置侧 formFields 曾缺这个字段，
   * 按 formFields 抄就会在保存时把供应商品牌清空。
   *
   * 主数据没有明细行，因此只声明 `scalar`。`project`（项目资料）暂不在此列：
   * 它的保存载荷有 24 个字段（取价基准/休市策略/允许品牌材质/校验强度等），
   * 远超配置侧 formFields 的 9 个，未补齐前不能切通用编辑器。
   */
  material: {
    saveFields: {
      scalar: [
        'materialType',
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
        'status',
        'remark',
      ],
    },
  },
  'material-categories': {
    saveFields: {
      scalar: [
        'categoryCode',
        'categoryName',
        'sortOrder',
        'purchaseWeighRequired',
        'status',
        'remark',
      ],
    },
  },
  warehouse: {
    saveFields: {
      scalar: [
        'warehouseCode',
        'warehouseName',
        'warehouseType',
        'contactName',
        'contactPhone',
        'address',
        'status',
        'remark',
      ],
    },
  },
  customer: {
    saveFields: {
      scalar: [
        'customerCode',
        'customerName',
        'contactName',
        'contactPhone',
        'city',
        'settlementMode',
        'status',
        'remark',
      ],
    },
  },
  supplier: {
    saveFields: {
      scalar: [
        'supplierCode',
        'supplierName',
        'shortName',
        'brands',
        'contactName',
        'contactPhone',
        'city',
        'status',
        'remark',
      ],
    },
  },
  /*
   * carrier 不在此列：后端 CarrierRequest 的车辆信息是 `vehicles: List<VehicleItem>` 嵌套数组，
   * 另有 `vehicleType`、`priceMode`；而前端表单是 16 个扁平车辆字段。专用编辑器内部做扁平→嵌套
   * 组装，通用列表页没有这一步。不要把扁平字段写进 saveFields —— 后端会收不到 vehicles，
   * 车辆信息整体丢失。它的保存契约沿用 business-pages/master/carrier-page.ts 里的旧口径
   * （vehicles / priceMode / defaultSettlementCompanyName）。
   */
}

export function getModulePageSchema(moduleKey: string) {
  return modulePageSchemaMap[moduleKey]
}
