import { Tooltip } from 'antd'
import i18next from 'i18next'
import React from 'react'
import { normalizeScopeEnforcement } from '@/api/master/project-options'
import {
  DISPLAY_WEIGHT_PRECISION,
  INTERNAL_WEIGHT_PRECISION,
} from '@/constants/precision'
import { findProjectOption } from '@/module-system/core/module-option-resolvers'
import { parseOptionalEntityId } from '@/types/entity-id'
import type {
  ModuleLineItem,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import {
  buildAmountWeightOverview,
  cloneLineItems,
  formatInteger,
} from '../shared/shared'

export function renderDerivedQuantity(value: unknown): React.ReactNode {
  if (value === undefined || value === null || value === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? formatInteger(parsed) : null
}

/**
 * 销售订单「订单编号」列：只渲染单号本身（外层类名供单据流弹层触发使用）。
 *
 * <p>原先在单号后追加下游引用状态图标（已被物流单/销售出库/销售退货引用），按产品要求整体下线：
 * 图标与 tooltip 都不再渲染。行级字段 `referencedByFreightBill` 等仍保留在响应 schema 中
 * （后端仍返回，strictObject 下删声明会让整页解析失败），但前端已无消费方。</p>
 */
export function renderSalesOrderNo(value: unknown): React.ReactNode {
  return React.createElement(
    'span',
    { className: 'document-reference-trigger' },
    React.createElement(
      'span',
      { className: 'document-reference-link' },
      String(value ?? ''),
    ),
  )
}

export function formatWeightDisplay(value: unknown): string {
  const n = Number(value)
  return Number.isFinite(n)
    ? n.toFixed(DISPLAY_WEIGHT_PRECISION).replace(/\.?0+$/, '')
    : '-'
}

export function hasOverwrittenOriginalWeight(
  items: ModuleRecord['items'],
): boolean {
  return (items || []).some(
    (item: Record<string, unknown>) =>
      item.originalWeightTon != null &&
      Number(item.originalWeightTon) !== Number(item.weightTon),
  )
}

export function sumOriginalWeightTon(items: ModuleRecord['items']): number {
  return ((items as Record<string, unknown>[] | undefined) ?? []).reduce(
    (sum, item) => sum + Number(item.originalWeightTon || 0),
    0,
  )
}

export function renderSalesOrderTotalWeight(
  value: unknown,
  record: ModuleRecord,
): React.ReactNode {
  const fmt = formatWeightDisplay
  if (!hasOverwrittenOriginalWeight(record.items)) return fmt(value)
  const original = sumOriginalWeightTon(record.items)
  return React.createElement(
    Tooltip,
    {
      title: i18next.t('modules.pages.salesOrder.originalPlannedWeight', {
        weight: fmt(original),
      }),
    },
    `${fmt(value)} ⚠️`,
  )
}

export function buildSalesOrderOverview(rows: ModuleRecord[]) {
  return buildAmountWeightOverview(rows, 'totalAmount')
}

export function buildSalesOrderParentFilters(
  currentRecord: ModuleRecordInput,
): Record<string, unknown> {
  return {
    currentSalesOrderId: currentRecord.id,
  }
}

export function mapPurchaseInboundToSalesOrderDraft(
  parentRecord: ModuleRecord,
): Partial<ModuleRecord> {
  return {
    purchaseOrderNo: parentRecord.purchaseOrderNo || parentRecord.orderNo || '',
    purchaseInboundNo: [
      ...new Set(
        (Array.isArray(parentRecord.items) ? parentRecord.items : []).flatMap(
          (item) => {
            const value =
              typeof item.inboundNo === 'string' ? item.inboundNo.trim() : ''
            return value ? [value] : []
          },
        ),
      ),
    ].join(', '),
  }
}

export function transformPurchaseInboundItemsToSalesOrderItems(
  parentRecord: ModuleRecord,
) {
  return cloneLineItems(
    Array.isArray(parentRecord.items)
      ? parentRecord.items.map((item) => {
          const rawRemainingQuantity = Number(
            item.remainingQuantity ??
              item.salesRemainingQuantity ??
              item.quantity ??
              0,
          )
          const rawTotalQuantity = Number(item.quantity || 0)
          const rawTotalWeightTon = Number(item.weightTon || 0)
          const rawRemainingWeightTon = Number(
            item.salesRemainingWeightTon ?? 0,
          )
          const rawPieceWeightTon = Number(item.pieceWeightTon || 0)
          const rawUnitPrice = Number(item.unitPrice || 0)
          const remainingQuantity = Number.isFinite(rawRemainingQuantity)
            ? rawRemainingQuantity
            : 0
          const pieceWeightTon = Number.isFinite(rawPieceWeightTon)
            ? rawPieceWeightTon
            : 0
          const unitPrice = Number.isFinite(rawUnitPrice) ? rawUnitPrice : 0
          const remainingWeightTon =
            rawRemainingWeightTon > 0
              ? Number(rawRemainingWeightTon.toFixed(INTERNAL_WEIGHT_PRECISION))
              : rawTotalQuantity > 0 &&
                  rawTotalWeightTon > 0 &&
                  remainingQuantity === rawTotalQuantity
                ? Number(rawTotalWeightTon.toFixed(INTERNAL_WEIGHT_PRECISION))
                : Number(
                    (remainingQuantity * pieceWeightTon).toFixed(
                      INTERNAL_WEIGHT_PRECISION,
                    ),
                  )
          return {
            ...item,
            sourceInboundItemId: item.sourceInboundItemId ?? item.id,
            sourcePurchaseOrderItemId: undefined,
            pieceWeightTon,
            remainingQuantity,
            remainingWeightTon,
            remainingAmount: Number(
              (remainingWeightTon * unitPrice).toFixed(2),
            ),
            _sourceTotalQuantity: item.quantity,
            _sourceTotalWeightTon: item.weightTon,
            _sourcePieceWeightTon: item.pieceWeightTon,
          }
        })
      : [],
    'sales-order-item',
  )
}

/** 项目约定允许范围之外、但出现在本次导入明细中的品牌/材质。 */
export interface AllowedSpecViolations {
  brands: string[]
  materials: string[]
}

/** 预警告警明细最多逐个列出的条数, 其余折叠成「等 N 项」。 */
const ALLOWED_SPEC_DETAIL_LIMIT = 5

function normalizeAllowedValues(values: readonly unknown[] | undefined) {
  const normalized = new Set<string>()
  for (const value of values ?? []) {
    const text = asString(value).trim()
    if (text) {
      normalized.add(text)
    }
  }
  return normalized
}

/**
 * 收集导入明细里越过项目允许品牌/材质的取值。
 * <p>
 * 约定: 允许列表为空表示「不限制」, 明细侧品牌/材质为空表示「未填写」, 两者都不参与判定,
 * 避免未维护主数据的行被误报。返回去重后的取值集合, 便于提示文案按维度聚合。
 */
export function collectAllowedSpecViolations(
  items: readonly ModuleLineItem[],
  allowedBrands: readonly unknown[] | undefined,
  allowedMaterials: readonly unknown[] | undefined,
): AllowedSpecViolations {
  const brandScope = normalizeAllowedValues(allowedBrands)
  const materialScope = normalizeAllowedValues(allowedMaterials)
  const brands: string[] = []
  const materials: string[] = []
  if (!brandScope.size && !materialScope.size) {
    return { brands, materials }
  }
  const seenBrands = new Set<string>()
  const seenMaterials = new Set<string>()
  for (const item of items ?? []) {
    const brand = asString(item?.brand).trim()
    if (
      brandScope.size &&
      brand &&
      !brandScope.has(brand) &&
      !seenBrands.has(brand)
    ) {
      seenBrands.add(brand)
      brands.push(brand)
    }
    const material = asString(item?.material).trim()
    if (
      materialScope.size &&
      material &&
      !materialScope.has(material) &&
      !seenMaterials.has(material)
    ) {
      seenMaterials.add(material)
      materials.push(material)
    }
  }
  return { brands, materials }
}

function formatAllowedValues(values: readonly string[]) {
  if (values.length > ALLOWED_SPEC_DETAIL_LIMIT) {
    return `${values.slice(0, ALLOWED_SPEC_DETAIL_LIMIT).join('、')}${i18next.t(
      'modules.pages.salesOrder.allowedSpecImportMore',
      {
        count: values.length - ALLOWED_SPEC_DETAIL_LIMIT,
      },
    )}`
  }
  return values.join('、')
}

function formatAllowedScope(values: readonly string[]) {
  return values.length
    ? formatAllowedValues(values)
    : i18next.t('modules.pages.salesOrder.allowedSpecImportUnlimited')
}

export interface AllowedSpecWarningArgs {
  projectLabel: string
  violations: AllowedSpecViolations
  allowedBrands: readonly string[]
  allowedMaterials: readonly string[]
}

/**
 * 组装项目允许品牌/材质不匹配的提示文案(纯函数, 便于直接断言)。
 *
 * <p>导入与单行明细共用「越界明细 + 项目允许范围」两段结构, 只有首句措辞不同,
 * 因此把话术收敛到 <code>messageKey</code> 一个入参上, 避免两处各写一套格式。</p>
 */
function buildAllowedSpecWarning(
  args: AllowedSpecWarningArgs & { messageKey: string },
): string | null {
  const { violations } = args
  if (!violations.brands.length && !violations.materials.length) {
    return null
  }
  const scope = i18next.t('modules.pages.salesOrder.allowedSpecImportScope', {
    brands: formatAllowedScope(args.allowedBrands),
    materials: formatAllowedScope(args.allowedMaterials),
  })
  return `${i18next.t(args.messageKey, {
    project: args.projectLabel,
    details: formatViolationDetails(violations),
  })}（${scope}）`
}

/** 组装项目允许品牌/材质不匹配的导入预警文案(纯函数, 便于直接断言)。 */
export function buildAllowedSpecImportWarning(
  args: AllowedSpecWarningArgs,
): string | null {
  return buildAllowedSpecWarning({
    ...args,
    messageKey: 'modules.pages.salesOrder.allowedSpecImportWarning',
  })
}

/** 组装单行明细(手工加行/改品牌材质)的项目允许范围提示文案。 */
export function buildAllowedSpecItemWarning(
  args: AllowedSpecWarningArgs,
): string | null {
  return buildAllowedSpecWarning({
    ...args,
    messageKey: 'modules.pages.salesOrder.allowedSpecItemWarning',
  })
}

/** 导入侧的范围判定结果: 力度决定「拦住还是只提醒」。 */
export interface AllowedSpecImportCheck {
  /** 是否阻断导入（项目把对应维度配成 BLOCK 且确有越界）。 */
  blocked: boolean
  /** 待提示文案；无越界或力度为 OFF 时为 null。 */
  message: string | null
  /** 结构化的越界结果与项目范围，供调用方自行组装文案（阻断文案与提醒文案措辞不同）。 */
  projectLabel: string
  violations: AllowedSpecViolations
  allowedBrands: string[]
  allowedMaterials: string[]
}

/** 无越界/未配置时的空结果，避免调用方到处判 null。 */
function emptyAllowedSpecImportCheck(): AllowedSpecImportCheck {
  return {
    blocked: false,
    message: null,
    projectLabel: '',
    violations: { brands: [], materials: [] },
    allowedBrands: [],
    allowedMaterials: [],
  }
}

/** 从当前单据读取项目范围；项目未选择或查不到项目时返回 null（不判定）。 */
function resolveProjectScope(args: { currentRecord: ModuleRecordInput }) {
  const projectId = parseOptionalEntityId(
    args.currentRecord?.projectId,
    'currentRecord.projectId',
  )
  const customerId = parseOptionalEntityId(
    args.currentRecord?.customerId,
    'currentRecord.customerId',
  )
  if (!projectId || !customerId) {
    return null
  }
  const project = findProjectOption(projectId, customerId)
  if (!project) {
    return null
  }
  return {
    projectLabel: project.projectName || project.label || projectId,
    allowedBrands: project.allowedBrands ?? [],
    allowedMaterials: project.allowedMaterials ?? [],
    // 清单为空 → 不限制; 未下发力度 → 归一到「提醒」（与后端读路径一致）。
    brandEnforcement: project.allowedBrands?.length
      ? normalizeScopeEnforcement(project.allowedBrandSeverity)
      : 'OFF',
    materialEnforcement: project.allowedMaterials?.length
      ? normalizeScopeEnforcement(project.allowedMaterialSeverity)
      : 'OFF',
  } as const
}

/** 项目范围判定的中间结果：项目范围 + 越界取值 + 各维度是否阻断，文案由调用方按场景组装。 */
interface AllowedSpecScopeCheck {
  projectLabel: string
  violations: AllowedSpecViolations
  allowedBrands: string[]
  allowedMaterials: string[]
  blocked: boolean
}

/**
 * 项目范围判定的唯一内核（导入多行与单行明细共用）。
 *
 * <p>返回 null 表示「不提示」：项目未选择/查不到项目、两个维度力度都为 OFF、或明细全部命中。
 * 调用方只决定文案话术，判定语义不允许各写一套。</p>
 */
function resolveAllowedSpecScopeCheck(args: {
  currentRecord: ModuleRecordInput
  items: readonly ModuleLineItem[]
}): AllowedSpecScopeCheck | null {
  const scope = resolveProjectScope({ currentRecord: args.currentRecord })
  if (!scope) {
    return null
  }
  const checksBrands = scope.brandEnforcement !== 'OFF'
  const checksMaterials = scope.materialEnforcement !== 'OFF'
  if (!checksBrands && !checksMaterials) {
    return null
  }
  const violations = collectAllowedSpecViolations(
    args.items,
    checksBrands ? scope.allowedBrands : [],
    checksMaterials ? scope.allowedMaterials : [],
  )
  if (!violations.brands.length && !violations.materials.length) {
    return null
  }
  return {
    projectLabel: scope.projectLabel,
    violations,
    allowedBrands: scope.allowedBrands,
    allowedMaterials: scope.allowedMaterials,
    blocked:
      (violations.brands.length > 0 && scope.brandEnforcement === 'BLOCK') ||
      (violations.materials.length > 0 &&
        scope.materialEnforcement === 'BLOCK'),
  }
}

/**
 * 销售订单导入采购订单明细时的项目范围判定（单一判据，供导入前后两处共用）。
 *
 * <p>力度语义：BLOCK 拦住导入（前端先挡一次，服务端保存时再挡一次，两端不可互相替代）；
 * WARN 只提示；OFF 完全不校验。项目未选择、未配置清单、或明细全部匹配时都不产生提示。
 */
export function resolveSalesOrderPurchaseSourceImportCheck(args: {
  currentRecord: ModuleRecordInput
  importedItems: ModuleLineItem[]
}): AllowedSpecImportCheck {
  const empty = emptyAllowedSpecImportCheck()
  const check = resolveAllowedSpecScopeCheck({
    currentRecord: args.currentRecord,
    items: args.importedItems,
  })
  if (!check) {
    return empty
  }
  const warning = buildAllowedSpecImportWarning({
    projectLabel: check.projectLabel,
    violations: check.violations,
    allowedBrands: check.allowedBrands,
    allowedMaterials: check.allowedMaterials,
  })
  if (!warning) {
    return empty
  }
  return {
    blocked: check.blocked,
    message: warning,
    projectLabel: check.projectLabel,
    violations: check.violations,
    allowedBrands: check.allowedBrands,
    allowedMaterials: check.allowedMaterials,
  }
}

/** 单行明细的范围判定结果：力度决定文案措辞，行级提示一律不阻断编辑。 */
export interface AllowedSpecItemCheck {
  /** 越界维度里存在 BLOCK 力度；只影响文案，不阻断编辑。 */
  blocked: boolean
  /** 待提示文案；不提示（清单为空/力度 OFF/该维度无值/全部命中）时为 null。 */
  message: string | null
  /** 结构化的越界取值，供调用方按「行 + 维度 + 值」去重。 */
  violations: AllowedSpecViolations
  projectLabel: string
  allowedBrands: string[]
  allowedMaterials: string[]
}

/** 无越界/未配置时的空结果，避免调用方到处判 null。 */
function emptyAllowedSpecItemCheck(): AllowedSpecItemCheck {
  return {
    blocked: false,
    message: null,
    projectLabel: '',
    violations: { brands: [], materials: [] },
    allowedBrands: [],
    allowedMaterials: [],
  }
}

/**
 * 单行明细的项目范围判定（手工加行 / 改品牌材质时的即时提示用）。
 *
 * <p>判定内核与导入路径完全共用（{@link resolveAllowedSpecScopeCheck}），因此清单为空、力度 OFF、
 * 该维度无值、全部命中都不提示。与导入路径的差别只有两点：文案不写「导入明细」（改为「该行明细」），
 * 以及 BLOCK 档在提示里补一句「保存时会被拦截」——行级提示不阻断编辑（表格式录入打断成本高），
 * 最终仍由服务端 422 兜底。</p>
 */
export function resolveSalesOrderItemScopeCheck(args: {
  currentRecord: ModuleRecordInput
  item: ModuleLineItem
}): AllowedSpecItemCheck {
  const empty = emptyAllowedSpecItemCheck()
  const check = resolveAllowedSpecScopeCheck({
    currentRecord: args.currentRecord,
    items: [args.item],
  })
  if (!check) {
    return empty
  }
  const warning = buildAllowedSpecItemWarning({
    projectLabel: check.projectLabel,
    violations: check.violations,
    allowedBrands: check.allowedBrands,
    allowedMaterials: check.allowedMaterials,
  })
  if (!warning) {
    return empty
  }
  return {
    blocked: check.blocked,
    message: check.blocked
      ? `${warning}${i18next.t(
          'modules.pages.salesOrder.allowedSpecItemBlockedSuffix',
        )}`
      : warning,
    projectLabel: check.projectLabel,
    violations: check.violations,
    allowedBrands: check.allowedBrands,
    allowedMaterials: check.allowedMaterials,
  }
}

/**
 * 导入后预警（WARN 档）：返回文案即提示人工复核，不阻断导入。
 *
 * <p>BLOCK 档在前置校验里已经拦下，因此这里只为「提醒」档发声，避免同一件事弹两条消息。
 */
export function warnSalesOrderPurchaseSourceImport(args: {
  currentRecord: ModuleRecordInput
  importedItems: ModuleLineItem[]
}): string | null {
  const check = resolveSalesOrderPurchaseSourceImportCheck(args)
  return check.blocked ? null : check.message
}

/**
 * 导入前校验（BLOCK 档）：返回文案即阻止导入。
 *
 * <p>必须在导入前判定：越界行一旦落进草稿，用户看到的是一张已经写脏的单据，
 * 「先导入再报错」既没省事也容易让人忽略提示。</p>
 */
export function validateSalesOrderPurchaseSourceImport(args: {
  currentRecord: ModuleRecordInput
  parentRecord: ModuleRecord
}): string | null {
  const check = resolveSalesOrderPurchaseSourceImportCheck({
    currentRecord: args.currentRecord,
    // 校验发生在导入之前, 必须自己把来源明细按同一变换展开, 否则判的是空集合。
    importedItems: transformPurchaseInboundItemsToSalesOrderItems(
      args.parentRecord,
    ),
  })
  if (!check.blocked || !check.message) {
    return null
  }
  return i18next.t('modules.pages.salesOrder.allowedSpecImportBlocked', {
    project: check.projectLabel,
    details: formatViolationDetails(check.violations),
  })
}

/** 阻断文案里的越界明细：与提示文案同源，避免两处格式各写一套。 */
function formatViolationDetails(violations: AllowedSpecViolations): string {
  const details: string[] = []
  if (violations.brands.length) {
    details.push(
      i18next.t('modules.pages.salesOrder.allowedSpecImportBrands', {
        values: formatAllowedValues(violations.brands),
      }),
    )
  }
  if (violations.materials.length) {
    details.push(
      i18next.t('modules.pages.salesOrder.allowedSpecImportMaterials', {
        values: formatAllowedValues(violations.materials),
      }),
    )
  }
  return details.join('；')
}
