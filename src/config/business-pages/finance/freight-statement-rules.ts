import { parseOptionalEntityId } from '@/types/entity-id'
import type {
  ModuleLineItem,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { validateSameSettlementCompany } from '../shared/settlement-company'
import { buildStatementOverview } from '../shared/shared'

function entityIdOf(value: unknown, field: string) {
  return parseOptionalEntityId(value, field)
}

export function buildFreightStatementOverview(rows: ModuleRecord[]) {
  return buildStatementOverview(
    rows,
    'totalFreight',
    'paidAmount',
    'unpaidAmount',
  )
}

export function buildFreightStatementParentFilters(
  currentRecord: ModuleRecordInput,
): Record<string, unknown> {
  return {
    carrierId: entityIdOf(currentRecord.carrierId, 'carrierId'),
    currentRecordId: entityIdOf(currentRecord.id, 'currentRecordId'),
    settlementCompanyId: currentRecord.settlementCompanyId,
  }
}

export function mapFreightBillToFreightStatementDraft(
  parentRecord: ModuleRecord,
): Partial<ModuleRecord> {
  return {
    carrierId: entityIdOf(parentRecord.carrierId, 'carrierId'),
    carrierCode: asString(parentRecord.carrierCode).trim(),
    carrierName: parentRecord.carrierName || '',
    settlementCompanyId: parentRecord.settlementCompanyId,
    settlementCompanyName: parentRecord.settlementCompanyName || '',
    startDate: parentRecord.billTime || '',
    endDate: parentRecord.billTime || '',
    paidAmount: 0,
    status: '草稿',
  }
}

export function validateFreightStatementParentImport({
  currentRecord,
  parentRecord,
}: {
  currentRecord: ModuleRecordInput
  currentItems: ModuleLineItem[]
  currentParentNos: string[]
  parentRecord: ModuleRecord
}): string | null {
  const currentCarrierId = entityIdOf(
    currentRecord.carrierId,
    'currentRecord.carrierId',
  )
  const parentCarrierId = entityIdOf(
    parentRecord.carrierId,
    'parentRecord.carrierId',
  )
  if (currentCarrierId && currentCarrierId !== parentCarrierId) {
    return '只能选择同一物流商的物流单生成物流对账单'
  }
  return currentRecord.settlementCompanyId
    ? validateSameSettlementCompany(
        currentRecord,
        parentRecord,
        '只能选择同一结算主体的物流单生成物流对账单',
      )
    : null
}

export function transformFreightBillItemsToFreightStatementItems(
  parentRecord: ModuleRecord,
): ModuleLineItem[] {
  const sourceNo = asString(parentRecord.billNo).trim()
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
      id: `${sourceNo || 'freight-bill'}-${String(item.id || index)}`,
      sourceNo,
      sourceFreightBillId: parentRecord.id,
      sourceFreightBillItemId: item.id,
      customerId:
        entityIdOf(item.customerId, 'items[].customerId') || parentCustomerId,
      projectId:
        entityIdOf(item.projectId, 'items[].projectId') || parentProjectId,
      _parentBillTime: parentRecord.billTime || '',
      _parentTotalFreight: Number(parentRecord.totalFreight || 0),
    }),
  )
}
