import dayjs from 'dayjs'
import { DOCUMENT_STATUS } from '@/constants/status-constants'
import type { ModuleBehaviorContributor } from '@/module-system/behavior/module-behavior-registry-core'
import type { ModuleKey } from '@/module-system/core/module-key'
import { findProjectOption } from '@/module-system/core/module-option-resolvers'
import { findCarrierOption } from '@/queries/master/carrier-options'
import { findCustomerOption } from '@/queries/master/customer-options'
import { findSupplierOption } from '@/queries/master/supplier-options'
import { getSettlementCompanyOptions } from '@/queries/system/company-settings'
import { asString, isBlankValue } from '@/utils/type-narrowing'

const currentDateTime = () => dayjs()
const currentDate = () => dayjs().startOf('day')

function findSettlementCompanyName(id: unknown, fallback = '') {
  const normalizedId = asString(id).trim()
  if (!normalizedId) {
    return ''
  }
  return (
    getSettlementCompanyOptions().find(
      (option) => asString(option.value).trim() === normalizedId,
    )?.companyName || fallback
  )
}

/**
 * 仅用于物流商/物流单的默认结算主体回填。
 * 客户资料已移除默认结算主体，项目/单据一律走项目快照（见 applyProjectSettlementCompany）。
 */
function applyDefaultSettlementCompany(
  editorForm: Record<string, unknown>,
  option:
    | {
        defaultSettlementCompanyId?: string | number
        defaultSettlementCompanyName?: string
      }
    | undefined,
) {
  editorForm.settlementCompanyId =
    option?.defaultSettlementCompanyId == null
      ? ''
      : asString(option.defaultSettlementCompanyId)
  editorForm.settlementCompanyName = asString(
    option?.defaultSettlementCompanyName,
  )
}

/** 清空结算主体快照；客户资料已不再维护默认结算主体，客户变化不得留下旧主体。 */
function clearSettlementCompany(editorForm: Record<string, unknown>) {
  editorForm.settlementCompanyId = ''
  editorForm.settlementCompanyName = ''
}

/**
 * 单据结算主体的唯一来源是项目资料（物流单沿用物流商默认结算主体）。
 * 项目未维护结算主体时清空，绝不回退客户默认主体。
 */
function applyProjectSettlementCompany(
  editorForm: Record<string, unknown>,
  project:
    | {
        settlementCompanyId?: string | number
        settlementCompanyName?: string
      }
    | undefined,
) {
  const settlementCompanyId = asString(project?.settlementCompanyId).trim()
  if (!settlementCompanyId) {
    clearSettlementCompany(editorForm)
    return
  }
  editorForm.settlementCompanyId = settlementCompanyId
  editorForm.settlementCompanyName = asString(project?.settlementCompanyName)
}

function optionDisplayName(
  option: { id?: unknown; value?: unknown } | undefined,
  explicitName: unknown,
) {
  const name = asString(explicitName).trim()
  if (name) {
    return name
  }
  const value = asString(option?.value).trim()
  return value && value !== asString(option?.id).trim() ? value : ''
}

function resolveCounterpartyIdentity(type: unknown, id: unknown) {
  const counterpartyType = asString(type).trim()
  if (counterpartyType === '客户') {
    const customer = findCustomerOption(id)
    return customer
      ? {
          id: customer.id,
          code: customer.customerCode,
          name: customer.customerName,
        }
      : undefined
  }
  if (counterpartyType === '供应商') {
    const supplier = findSupplierOption(id)
    return supplier
      ? {
          id: supplier.id,
          code: supplier.supplierCode,
          name: optionDisplayName(supplier, supplier.supplierName),
        }
      : undefined
  }
  if (counterpartyType === '物流商') {
    const carrier = findCarrierOption(id)
    return carrier
      ? {
          id: carrier.id,
          code: carrier.carrierCode,
          name: optionDisplayName(carrier, carrier.carrierName),
        }
      : undefined
  }
  return undefined
}

const isBlank = isBlankValue

function clearStatementSources(editorForm: Record<string, unknown>) {
  editorForm.sourceFreightStatementId = ''
}

function clearCounterpartyIdentity(editorForm: Record<string, unknown>) {
  editorForm.counterpartyId = ''
  editorForm.counterpartyCode = ''
  editorForm.counterpartyName = ''
}

function snapshotCounterpartyIdentity(editorForm: Record<string, unknown>) {
  // 显式清空时同步清空快照
  if (isBlank(editorForm.counterpartyId)) {
    clearCounterpartyIdentity(editorForm)
    return
  }
  const identity = resolveCounterpartyIdentity(
    editorForm.counterpartyType,
    editorForm.counterpartyId,
  )
  // 选项缓存未命中（主数据已停用或缓存未就绪）时保留现有快照，避免误清
  if (!identity) {
    return
  }
  editorForm.counterpartyId = asString(identity.id)
  editorForm.counterpartyCode = asString(identity.code).trim()
  editorForm.counterpartyName = asString(identity.name).trim()
}

function snapshotSupplierIdentity(editorForm: Record<string, unknown>) {
  // 显式清空时同步清空快照
  if (isBlank(editorForm.supplierId)) {
    editorForm.supplierId = ''
    editorForm.supplierCode = ''
    editorForm.supplierName = ''
    return
  }
  const supplier = findSupplierOption(editorForm.supplierId)
  // 选项缓存未命中（主数据已停用或缓存未就绪）时保留现有快照，避免误清
  if (!supplier) {
    return
  }
  editorForm.supplierId = asString(supplier.id)
  editorForm.supplierCode = asString(supplier.supplierCode).trim()
  editorForm.supplierName = asString(supplier.supplierName).trim()
}

/**
 * 「关联销售出库已审核」锁定下允许调整的销售订单字段白名单。
 * 提示文案由本白名单派生（见 {@link editableLockedFieldsNotice}），不再各写一份。
 */
export const SALES_ORDER_LOCKED_FIELD_KEYS = [
  'deliveryDate',
  'orderDate',
  'remark',
] as const

/** 同上，锁定下允许调整的明细列白名单。 */
export const SALES_ORDER_LOCKED_ITEM_COLUMN_KEYS = ['unitPrice'] as const

/** 白名单字段 → 界面文案；缺映射时回退字段键，由守卫测试立刻发现（不允许界面上出现字段键）。 */
const LOCKED_FIELD_LABELS: Record<string, string> = {
  deliveryDate: '送货日期',
  orderDate: '报单日期',
  remark: '备注',
}

const LOCKED_ITEM_COLUMN_LABELS: Record<string, string> = {
  unitPrice: '单价',
}

/**
 * 由白名单派生「仅允许调整…」提示文案。
 *
 * <p>原先文案是与白名单并排硬编码的字面量：白名单加了 `orderDate`（取价基准 ORDER 的锚点），
 * 文案仍写「仅允许调整送货日期、备注和单价」，用户看到的说明与真实可编辑范围相反。
 * 改成派生后，白名单增删字段时文案自动跟上。</p>
 */
export function editableLockedFieldsNotice(
  fieldKeys: readonly string[],
  itemColumnKeys: readonly string[] = [],
): string {
  const labels = [
    ...fieldKeys.map((key) => LOCKED_FIELD_LABELS[key] ?? key),
    ...itemColumnKeys.map((key) => LOCKED_ITEM_COLUMN_LABELS[key] ?? key),
  ]
  /*
   * 行序可调也要写进提示：锁定态锁的是行内**字段值**，拖动排序只重排数组下标、
   * 不改字段值（服务端按 line_no = 下标 + 1 重编），见 canReorderEditorLineItems。
   * 文案若不提行序，用户会以为整张明细都动不了。
   */
  return `关联销售出库已审核，当前仅允许调整${labels.join('、')}，以及明细行顺序。`
}

export const contributeEditorBehaviors: ModuleBehaviorContributor = (
  registerModuleBehavior,
) => {
  registerModuleBehavior('carrier', {
    defaultDraftValues: { priceMode: '按吨' },
    syncEditorForm(editorForm, ctx) {
      if (ctx.changedKeys.has('defaultSettlementCompanyId')) {
        editorForm.defaultSettlementCompanyName = findSettlementCompanyName(
          editorForm.defaultSettlementCompanyId,
        )
      }
    },
  })

  registerModuleBehavior('project', {
    syncEditorForm(editorForm, ctx) {
      if (ctx.changedKeys.has('customerId')) {
        if (isBlank(editorForm.customerId)) {
          editorForm.customerId = ''
          editorForm.customerCode = ''
          // 客户清空即项目上下文变更：结算主体不由客户带出，一并清掉
          clearSettlementCompany(editorForm)
        } else {
          const customer = findCustomerOption(editorForm.customerId)
          if (customer) {
            // 只同步客户快照；结算主体只由项目资料选择，不从客户默认值带出
            editorForm.customerId = asString(customer.id)
            editorForm.customerCode = asString(customer.customerCode).trim()
          }
        }
      }
      if (ctx.changedKeys.has('settlementCompanyId')) {
        editorForm.settlementCompanyName = findSettlementCompanyName(
          editorForm.settlementCompanyId,
          asString(editorForm.settlementCompanyName),
        )
      }
      /*
       * 取价基准/时段的联动复位：与专用弹层（ProjectEditorOverlay）保持同一口径，
       * 否则切到通用编辑器后会留下「基准是送货日期却仍带顺延天数」「策略是自动却仍带
       * 固定时段」这种自相矛盾的组合——后端虽有归一兜底，界面却会显示脏值。
       *
       * 只在用户**改动该字段**时复位（changedKeys 判定），避免打开编辑时误清历史值。
       */
      if (
        ctx.changedKeys.has('priceDateBasis') &&
        asString(editorForm.priceDateBasis) !== 'ORDER'
      ) {
        editorForm.priceDateOffsetDays = 0
      }
      if (
        ctx.changedKeys.has('pricePeriodPolicy') &&
        asString(editorForm.pricePeriodPolicy) !== 'FIXED'
      ) {
        editorForm.pricePeriodFixed = null
      }
    },
  })

  registerModuleBehavior('sales-order', {
    // 交付核定状态允许调整的字段：送货日期、报单日期（取价基准 ORDER 的锚点）、备注。
    editableLockedFields: [...SALES_ORDER_LOCKED_FIELD_KEYS],
    editableLockedItemColumns: [...SALES_ORDER_LOCKED_ITEM_COLUMN_KEYS],
    locksLineItemsWhenRecordLocked: true,
    lineItemLockSourceModule: 'sales-outbound',
    lineItemLockSourceField: 'salesOrderNo',
    lineItemLockTargetField: 'orderNo',
    lineItemLockStatuses: [
      DOCUMENT_STATUS.AUDITED,
      DOCUMENT_STATUS.DELIVERY_VERIFICATION,
    ],
    lockedLineItemsNotice: editableLockedFieldsNotice(
      SALES_ORDER_LOCKED_FIELD_KEYS,
      SALES_ORDER_LOCKED_ITEM_COLUMN_KEYS,
    ),
    partiallyEditableStatuses: [DOCUMENT_STATUS.DELIVERY_VERIFICATION],
  })

  registerModuleBehavior('purchase-order', {
    defaultOperatorField: 'buyerName',
  })
  registerModuleBehavior('purchase-order', {
    defaultDraftValues: () => ({ orderDate: currentDateTime() }),
    syncEditorForm(editorForm, ctx) {
      if (ctx.changedKeys.has('supplierId')) {
        snapshotSupplierIdentity(editorForm)
      }
      if (ctx.changedKeys.has('settlementCompanyId')) {
        editorForm.settlementCompanyName = findSettlementCompanyName(
          editorForm.settlementCompanyId,
        )
      }
    },
  })
  const settlementCompanySnapshotModules = [
    'purchase-inbound',
    'sales-order',
    'sales-outbound',
    'sales-return',
    'freight-bill',
    'customer-statement',
    'freight-statement',
  ] as const satisfies readonly ModuleKey[]
  const customerProjectSnapshotModules = new Set<ModuleKey>([
    'sales-order',
    'sales-outbound',
    'sales-return',
    'customer-statement',
  ])

  for (const key of settlementCompanySnapshotModules) {
    registerModuleBehavior(key, {
      syncEditorForm(editorForm, ctx) {
        if (key === 'purchase-inbound' && ctx.changedKeys.has('supplierId')) {
          snapshotSupplierIdentity(editorForm)
        }

        if (
          customerProjectSnapshotModules.has(key) &&
          ctx.changedKeys.has('customerId')
        ) {
          if (isBlank(editorForm.customerId)) {
            // 显式清空客户：同步清空快照、项目与项目带出的结算主体
            editorForm.customerId = ''
            editorForm.customerCode = ''
            editorForm.customerName = ''
            if (!ctx.changedKeys.has('projectId')) {
              editorForm.projectId = ''
              editorForm.projectName = ''
              clearSettlementCompany(editorForm)
            }
          } else {
            const customer = findCustomerOption(editorForm.customerId)
            // 选项缓存未命中时保留现有快照，避免误清
            if (customer) {
              editorForm.customerId = asString(customer.id)
              editorForm.customerCode = asString(customer.customerCode).trim()
              editorForm.customerName = asString(customer.customerName).trim()
              if (!ctx.changedKeys.has('projectId')) {
                editorForm.projectId = ''
                editorForm.projectName = ''
                // 项目上下文失效：结算主体改由用户选项目带出，客户不带出主体
                clearSettlementCompany(editorForm)
              }
            }
          }
        }

        if (
          customerProjectSnapshotModules.has(key) &&
          ctx.changedKeys.has('projectId')
        ) {
          if (isBlank(editorForm.projectId)) {
            editorForm.projectId = ''
            editorForm.projectName = ''
            applyProjectSettlementCompany(editorForm, undefined)
          } else {
            const project = findProjectOption(
              editorForm.projectId,
              editorForm.customerId,
            )
            // 选项缓存未命中时保留现有快照，避免误清
            if (project) {
              editorForm.projectId = asString(project.id)
              editorForm.projectName = asString(project.projectName).trim()
              applyProjectSettlementCompany(editorForm, project)
            }
          }
        }

        if (
          customerProjectSnapshotModules.has(key) &&
          (ctx.changedKeys.has('customerId') ||
            ctx.changedKeys.has('projectId'))
        ) {
          return
        }

        if (
          (key === 'freight-bill' || key === 'freight-statement') &&
          ctx.changedKeys.has('carrierId')
        ) {
          if (!ctx.changedKeys.has('vehiclePlate')) {
            editorForm.vehiclePlate = ''
          }
          if (isBlank(editorForm.carrierId)) {
            // 显式清空承运商：同步清空编码与默认结算公司
            editorForm.carrierId = ''
            editorForm.carrierName = ''
            editorForm.carrierCode = ''
            if (key === 'freight-bill') {
              clearSettlementCompany(editorForm)
              return
            }
          } else {
            const carrier = findCarrierOption(editorForm.carrierId)
            // 选项缓存未命中时保留现有编码与结算公司快照，避免误清
            if (carrier) {
              editorForm.carrierId = asString(carrier.id)
              const carrierName = asString(carrier.carrierName).trim()
              if (carrierName) {
                editorForm.carrierName = carrierName
              }
              editorForm.carrierCode = asString(carrier.carrierCode).trim()
              if (key === 'freight-bill') {
                applyDefaultSettlementCompany(editorForm, carrier)
                return
              }
            } else if (key === 'freight-bill') {
              return
            }
          }
        }

        if (ctx.changedKeys.has('settlementCompanyId')) {
          editorForm.settlementCompanyName = findSettlementCompanyName(
            editorForm.settlementCompanyId,
            asString(editorForm.settlementCompanyName),
          )
        }
      },
    })
  }

  registerModuleBehavior('purchase-inbound', {
    defaultDraftValues: () => ({ inboundDate: currentDateTime() }),
    allowsManualLineItems: false,
    resolveReadonlyEditorFields(record) {
      return asString(record.purchaseOrderNo).trim()
        ? ['supplierId', 'settlementCompanyId']
        : []
    },
    readonlyItemColumns: [
      'warehouseName',
      'weightTon',
      // 重量调整（吨/金额）由「过磅重量 − 理论重量」与「× 单价」派生，保存时后端还会重算，
      // 前端不允许人工改：显示值与落库值必须以过磅口径为准。
      'weightAdjustmentTon',
      'weightAdjustmentAmount',
      'unitPrice',
      'settlementMode',
      'amount',
    ],
  })
  registerModuleBehavior('sales-order', { defaultOperatorField: 'salesName' })
  registerModuleBehavior('sales-order', {
    // 报单日期与交货日期同为业务日期字段：新建时默认当天，编辑既有单据时后端回传值优先。
    defaultDraftValues: () => ({
      orderDate: currentDateTime(),
      deliveryDate: currentDateTime(),
    }),
    // 导入上游采购来源后行项目随上游锁定，允许调整单价（销售定价）与数量（支持部分销售：
    // 如入库 7 件只销售 4 件）；数量上限由 _maxImportQuantity（来源剩余可销 + 本单已分配）
    // 兜底，后端 SalesOrderSourceAllocationService 再校验可关联数量。
    // 已审核锁定沿用 editableLockedItemColumns（仅 unitPrice），数量不可再改。
    parentImportedItemEditableColumns: ['unitPrice', 'quantity'],
  })
  registerModuleBehavior('sales-outbound', {
    defaultDraftValues: () => ({ outboundDate: currentDateTime() }),
    parentImportedEditableFields: ['outboundDate', 'remark'],
    // 销售出库支持部分出库：导入销售订单后仍可编辑数量，
    // 由 _maxImportQuantity（outboundRemainingQuantity + 本单已分配）做上限兜底。
    parentImportedItemEditableColumns: [
      'quantity',
      'actualWeightTon',
      'weighWeightTon',
    ],
  })
  registerModuleBehavior('sales-return', {
    defaultDraftValues: () => ({ returnDate: currentDate() }),
  })
  const operatorNameModules = [
    'receipt',
    'payment',
  ] as const satisfies readonly ModuleKey[]

  for (const key of operatorNameModules) {
    registerModuleBehavior(key, { defaultOperatorField: 'operatorName' })
  }

  registerModuleBehavior('receipt', {
    defaultDraftValues: () => ({
      receiptDate: currentDate(),
      receiptPurpose: 'CUSTOMER_STATEMENT_SETTLEMENT',
      counterpartyType: '客户',
    }),
    syncEditorForm(editorForm, ctx) {
      if (ctx.changedKeys.has('counterpartyType')) {
        editorForm.receiptPurpose =
          editorForm.counterpartyType === '供应商'
            ? 'SUPPLIER_OTHER_RECEIPT'
            : 'CUSTOMER_STATEMENT_SETTLEMENT'
        editorForm.sourceCustomerStatementId = ''
        editorForm.items = []
        clearCounterpartyIdentity(editorForm)
        editorForm.customerId = ''
        editorForm.customerCode = ''
        editorForm.customerName = ''
        editorForm.projectId = ''
        editorForm.projectName = ''
        clearSettlementCompany(editorForm)
        return
      }

      if (ctx.changedKeys.has('counterpartyId')) {
        snapshotCounterpartyIdentity(editorForm)
        editorForm.projectId = ''
        editorForm.projectName = ''
        editorForm.sourceCustomerStatementId = ''
        if (editorForm.counterpartyType === '客户') {
          editorForm.customerId = editorForm.counterpartyId
          editorForm.customerCode = editorForm.counterpartyCode
          editorForm.customerName = editorForm.counterpartyName
          // 客户资料不再维护默认结算主体：手选值保留，只有清空客户时才清掉
          if (isBlank(editorForm.counterpartyId)) {
            clearSettlementCompany(editorForm)
          }
        } else {
          editorForm.customerId = ''
          editorForm.customerCode = ''
          editorForm.customerName = ''
        }
        return
      }

      if (ctx.changedKeys.has('projectId')) {
        if (isBlank(editorForm.projectId)) {
          editorForm.projectId = ''
          editorForm.projectName = ''
          // 项目清空后不回退客户默认主体，直接清空等用户重选项目
          clearSettlementCompany(editorForm)
        } else {
          const project = findProjectOption(
            editorForm.projectId,
            editorForm.customerId,
          )
          if (project) {
            editorForm.projectId = asString(project.id)
            editorForm.projectName = asString(project.projectName).trim()
            applyProjectSettlementCompany(editorForm, project)
          }
        }
        return
      }

      if (ctx.changedKeys.has('settlementCompanyId')) {
        editorForm.settlementCompanyName = findSettlementCompanyName(
          editorForm.settlementCompanyId,
          asString(editorForm.settlementCompanyName),
        )
      }
    },
  })

  registerModuleBehavior('payment', {
    defaultDraftValues: () => ({
      paymentDate: currentDate(),
      paymentPurpose: 'SUPPLIER_PAYMENT',
      counterpartyType: '供应商',
    }),
    syncEditorForm(editorForm, ctx) {
      if (ctx.changedKeys.has('counterpartyType')) {
        editorForm.paymentPurpose = 'SUPPLIER_PAYMENT'
        clearStatementSources(editorForm)
        editorForm.sourcePurchaseOrderId = ''
        editorForm.purchaseOrderNo = ''
        editorForm.supplierCode = ''
        editorForm.supplierName = ''
        editorForm.items = []
        clearCounterpartyIdentity(editorForm)
        clearSettlementCompany(editorForm)
        return
      }

      if (ctx.changedKeys.has('counterpartyId')) {
        snapshotCounterpartyIdentity(editorForm)
        clearStatementSources(editorForm)
        return
      }

      if (ctx.changedKeys.has('settlementCompanyId')) {
        editorForm.settlementCompanyName = findSettlementCompanyName(
          editorForm.settlementCompanyId,
          asString(editorForm.settlementCompanyName),
        )
        return
      }
    },
  })

  registerModuleBehavior('purchase-order', {
    lineItemTrimStrategy: 'purchaseOrderBlank',
  })

  // 物流单/运费对账单行项目的上游快照锁定列。
  // sourceNo/brand/category/material/spec/length/quantityUnit/件重支数重量等
  // 已由 DERIVED_READONLY_ITEM_COLUMN_KEYS 第一层固有只读覆盖，无需重复声明。
  const FREIGHT_READONLY_ITEM_COLUMNS = [
    'materialCode',
    'materialName',
    'customerName',
    'projectName',
    'quantity',
    'batchNo',
    'warehouseName',
  ]

  registerModuleBehavior('freight-bill', {
    defaultDraftValues: () => ({ billTime: currentDate() }),
    allowsManualLineItems: false,
    lockParentImportOnlyWhenPersisted: true,
    readonlyItemColumns: [...FREIGHT_READONLY_ITEM_COLUMNS],
    parentImportedEditableFields: [
      'vehiclePlate',
      'billTime',
      'unitPrice',
      'remark',
    ],
    resolveReadonlyEditorFields(record) {
      if (record.id && !asString(record.sourceOrderNos).trim()) {
        return [
          'carrierId',
          'carrierCode',
          'settlementCompanyId',
          'vehiclePlate',
          'billTime',
          'unitPrice',
          'remark',
        ]
      }
      return []
    },
  })
  registerModuleBehavior('freight-statement', {
    allowsManualLineItems: false,
    readonlyItemColumns: [...FREIGHT_READONLY_ITEM_COLUMNS],
  })
  registerModuleBehavior('customer-statement', {
    allowsManualLineItems: false,
    readonlyLineItems: true,
  })

  registerModuleBehavior('material', { supportsMaterialImport: true })
}
