import type { ModuleEndpointConfig } from '@/api/module-contract-types'
import type { ModuleParentImportDefinition } from '@/types/module-page'

export type ParentCandidateSource =
  | NonNullable<ModuleParentImportDefinition['candidateQueryType']>
  | NonNullable<ModuleParentImportDefinition['candidateStatementModuleKey']>

export type ParentCandidateFilterContract = Pick<
  ModuleEndpointConfig,
  'nativeFilterKeys' | 'dateRangeMapping'
>

const parentCandidateFilterContracts: Record<
  ParentCandidateSource,
  ParentCandidateFilterContract
> = {
  'purchase-order-import': {
    nativeFilterKeys: [
      'keyword',
      'supplierId',
      'supplierName',
      'settlementCompanyId',
      'startDate',
      'endDate',
      'currentRecordId',
    ],
    dateRangeMapping: {
      orderDate: { startKey: 'startDate', endKey: 'endDate' },
    },
  },
  'sales-order-purchase-source': {
    nativeFilterKeys: [
      'keyword',
      'supplierId',
      'settlementCompanyId',
      'startDate',
      'endDate',
      'currentSalesOrderId',
    ],
    dateRangeMapping: {
      orderDate: { startKey: 'startDate', endKey: 'endDate' },
    },
  },
  'sales-order-outbound-import': {
    nativeFilterKeys: [
      'keyword',
      'customerId',
      'customerName',
      'projectId',
      'projectName',
      'settlementCompanyId',
      'startDate',
      'endDate',
      'currentRecordId',
    ],
    dateRangeMapping: {
      deliveryDate: { startKey: 'startDate', endKey: 'endDate' },
    },
  },
  'freight-sales-order-import': {
    nativeFilterKeys: [
      'keyword',
      'customerId',
      'customerName',
      'projectId',
      'projectName',
      'settlementCompanyId',
      'startDate',
      'endDate',
      'currentRecordId',
    ],
    dateRangeMapping: {
      deliveryDate: { startKey: 'startDate', endKey: 'endDate' },
    },
  },
  'customer-statement': {
    nativeFilterKeys: [
      'keyword',
      'customerId',
      'customerName',
      'projectId',
      'projectName',
      'settlementCompanyId',
      'startDate',
      'endDate',
      'currentRecordId',
    ],
    dateRangeMapping: {
      deliveryDate: { startKey: 'startDate', endKey: 'endDate' },
    },
  },
  'freight-statement': {
    nativeFilterKeys: [
      'keyword',
      'carrierId',
      'carrierCode',
      'carrierName',
      'settlementCompanyId',
      'startDate',
      'endDate',
      'currentRecordId',
    ],
    dateRangeMapping: {
      billTime: { startKey: 'startDate', endKey: 'endDate' },
    },
  },
}

export function getParentCandidateFilterContract(
  source: ParentCandidateSource,
) {
  return parentCandidateFilterContracts[source]
}
