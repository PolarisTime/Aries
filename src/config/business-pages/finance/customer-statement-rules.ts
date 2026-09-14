import { Tag } from 'antd'
import i18next from 'i18next'
import React from 'react'
import { findProjectOption } from '@/module-system/core/module-option-resolvers'
import { normalizeStatementDirection } from '@/shared/schemas/customer-statement'
import { parseOptionalEntityId } from '@/types/entity-id'
import type {
  ModuleLineItem,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'
import { formatAmount, formatWeight } from '@/utils/formatters'
import { asString } from '@/utils/type-narrowing'
import { buildStatementOverview } from '../shared/shared'

function renderNegativeAwareValue(
  value: unknown,
  format: (numericValue: number) => string,
): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return String(value)
  }
  const formatted = format(numericValue)
  return numericValue < 0
    ? React.createElement(
        'span',
        { className: 'statement-amount-negative', style: { color: '#cf1322' } },
        formatted,
      )
    : formatted
}

/** 红字对账单以负值呈现，用红色强化；蓝字保持默认金额格式。 */
export function renderStatementAmount(value: unknown): React.ReactNode {
  return renderNegativeAwareValue(value, formatAmount)
}

/** 重量列保留 3 位小数展示，负数同样以红色强化。 */
export function renderStatementWeight(value: unknown): React.ReactNode {
  return renderNegativeAwareValue(value, formatWeight)
}

/** 方向列渲染：红字红色标签，蓝字蓝色标签，历史缺省值按蓝字处理。 */
export function renderStatementDirection(value: unknown): React.ReactNode {
  const direction = normalizeStatementDirection(value)
  const isRed = direction === '红字'
  return React.createElement(
    Tag,
    { color: isRed ? 'red' : 'blue' },
    i18next.t(
      isRed
        ? 'modules.pages.customerStatement.redDirection'
        : 'modules.pages.customerStatement.blueDirection',
    ),
  )
}

function entityIdOf(value: unknown, field: string) {
  return parseOptionalEntityId(value, field)
}

export function buildCustomerStatementOverview(rows: ModuleRecord[]) {
  return buildStatementOverview(
    rows,
    'salesAmount',
    'receiptAmount',
    'closingAmount',
  )
}

export function buildCustomerStatementParentFilters(
  currentRecord: ModuleRecordInput,
): Record<string, unknown> {
  return {
    customerId: entityIdOf(currentRecord.customerId, 'customerId'),
    projectId: entityIdOf(currentRecord.projectId, 'projectId'),
    currentRecordId: entityIdOf(currentRecord.id, 'currentRecordId'),
  }
}

export function validateCustomerStatementBeforeOpen(
  currentRecord: ModuleRecordInput,
): string | null {
  return entityIdOf(currentRecord.customerId, 'customerId')
    ? null
    : '请先选择客户，再选择销售订单'
}

export function mapSalesOrderToCustomerStatementDraft(
  parentRecord: ModuleRecord,
): Partial<ModuleRecord> {
  const parentCustomerId = entityIdOf(
    parentRecord.customerId,
    'parentRecord.customerId',
  )
  const parentProjectId = entityIdOf(
    parentRecord.projectId,
    'parentRecord.projectId',
  )
  const project = findProjectOption(parentProjectId, parentCustomerId)
  return {
    customerId: parentCustomerId,
    customerCode: asString(parentRecord.customerCode).trim(),
    customerName: parentRecord.customerName || '',
    projectId: parentProjectId,
    projectName: parentRecord.projectName || '',
    settlementCompanyId: project?.settlementCompanyId,
    settlementCompanyName: project?.settlementCompanyName || '',
    startDate: parentRecord.deliveryDate || '',
    endDate: parentRecord.deliveryDate || '',
    receiptAmount: 0,
    status: '待确认',
  }
}

export function validateCustomerStatementParentImport({
  currentRecord,
  currentItems,
  parentRecord,
}: {
  currentRecord: ModuleRecordInput
  currentItems: ModuleLineItem[]
  currentParentNos: string[]
  parentRecord: ModuleRecord
}): string | null {
  const currentCustomerId = entityIdOf(
    currentRecord.customerId,
    'currentRecord.customerId',
  )
  const parentCustomerId = entityIdOf(
    parentRecord.customerId,
    'parentRecord.customerId',
  )
  if (!currentCustomerId || currentCustomerId !== parentCustomerId) {
    return '只能选择同一客户的销售订单生成客户对账单'
  }
  const existingProjectIds = Array.from(
    new Set(
      [
        currentRecord.projectId,
        ...currentItems.map((item) => item.projectId),
      ].flatMap((value) => {
        const projectId = entityIdOf(value, 'projectId')
        return projectId ? [projectId] : []
      }),
    ),
  )
  const nextProjectId = entityIdOf(
    parentRecord.projectId,
    'parentRecord.projectId',
  )
  if (
    existingProjectIds.length &&
    (!nextProjectId || !existingProjectIds.includes(nextProjectId))
  ) {
    return '只能选择同一项目的销售订单生成客户对账单'
  }
  return null
}

export function transformSalesOrderItemsToCustomerStatementItems(
  parentRecord: ModuleRecord,
): ModuleLineItem[] {
  const sourceNo = asString(parentRecord.orderNo).trim()
  const parentCustomerId = entityIdOf(
    parentRecord.customerId,
    'parentRecord.customerId',
  )
  const parentProjectId = entityIdOf(
    parentRecord.projectId,
    'parentRecord.projectId',
  )
  return (Array.isArray(parentRecord.items) ? parentRecord.items : []).map(
    (item, index) => ({
      ...item,
      id: `${sourceNo || 'sales-order'}-${String(item.id || index)}`,
      sourceNo,
      sourceSalesOrderItemId: item.id,
      customerId:
        entityIdOf(item.customerId, 'items[].customerId') || parentCustomerId,
      projectId:
        entityIdOf(item.projectId, 'items[].projectId') || parentProjectId,
      warehouseId: entityIdOf(item.warehouseId, 'items[].warehouseId'),
      _parentBillTime: parentRecord.deliveryDate || '',
    }),
  )
}
