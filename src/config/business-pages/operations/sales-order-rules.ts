import { Tooltip } from 'antd'
import i18next from 'i18next'
import React from 'react'
import { DocumentReferenceStatusIcons } from '@/components/DocumentReferenceStatusIcons'
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

export function renderSalesOrderNo(
  value: unknown,
  record: ModuleRecord,
): React.ReactNode {
  return React.createElement(
    'span',
    { className: 'document-reference-trigger' },
    React.createElement(
      'span',
      { className: 'document-reference-link' },
      String(value ?? ''),
    ),
    React.createElement(DocumentReferenceStatusIcons, {
      statuses: [
        {
          key: 'freight-bill',
          label: i18next.t('modules.pages.salesOrder.referencedByFreightBill'),
          referenced: Boolean(record.referencedByFreightBill),
        },
        {
          key: 'sales-outbound',
          label: i18next.t(
            'modules.pages.salesOrder.referencedBySalesOutbound',
          ),
          referenced: Boolean(record.referencedBySalesOutbound),
        },
        {
          key: 'sales-return',
          label: i18next.t('modules.pages.salesOrder.referencedBySalesReturn'),
          referenced: Boolean(record.referencedBySalesReturn),
        },
      ],
    }),
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

/** 组装项目允许品牌/材质不匹配的预警文案(纯函数, 便于直接断言)。 */
export function buildAllowedSpecImportWarning(args: {
  projectLabel: string
  violations: AllowedSpecViolations
  allowedBrands: readonly string[]
  allowedMaterials: readonly string[]
}): string | null {
  const { violations } = args
  if (!violations.brands.length && !violations.materials.length) {
    return null
  }
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
  const scope = i18next.t('modules.pages.salesOrder.allowedSpecImportScope', {
    brands: formatAllowedScope(args.allowedBrands),
    materials: formatAllowedScope(args.allowedMaterials),
  })
  return `${i18next.t('modules.pages.salesOrder.allowedSpecImportWarning', {
    project: args.projectLabel,
    details: details.join('；'),
  })}（${scope}）`
}

/**
 * 销售订单导入采购订单明细后的匹配预警: 明细的品牌/材质若超出所选项目约定的允许范围,
 * 返回预警文案(不阻断导入); 项目未配置、未选择项目或全部匹配时返回 null。
 */
export function warnSalesOrderPurchaseSourceImport(args: {
  currentRecord: ModuleRecordInput
  importedItems: ModuleLineItem[]
}): string | null {
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
  const allowedBrands = project.allowedBrands ?? []
  const allowedMaterials = project.allowedMaterials ?? []
  const violations = collectAllowedSpecViolations(
    args.importedItems,
    allowedBrands,
    allowedMaterials,
  )
  return buildAllowedSpecImportWarning({
    projectLabel: project.projectName || project.label || projectId,
    violations,
    allowedBrands,
    allowedMaterials,
  })
}
