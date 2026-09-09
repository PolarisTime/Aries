import { findProjectOption } from '@/module-system/core/module-option-resolvers'
import { parseOptionalEntityId } from '@/types/entity-id'
import type {
  ModuleLineItem,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { buildStatementOverview } from '../shared/shared'

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
