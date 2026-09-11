import { getCustomerOptions } from '@/module-system/core/module-option-resolvers'
import { getCarrierEntityOptions } from '@/queries/master/carrier-options'
import { getSupplierEntityOptions } from '@/queries/master/supplier-options'
import type { ModuleRecord, ModuleRecordInput } from '@/types/module-page'
import { buildFinanceOverview } from '../shared/shared'

export function getPaymentCounterpartyOptions(form?: ModuleRecordInput) {
  return form?.counterpartyType === '物流商'
    ? getCarrierEntityOptions()
    : getSupplierEntityOptions()
}

export function getReceiptCounterpartyOptions(form?: ModuleRecordInput) {
  return form?.counterpartyType === '供应商'
    ? getSupplierEntityOptions()
    : getCustomerOptions()
}

export function buildPaymentOverview(rows: ModuleRecord[]) {
  return buildFinanceOverview(rows, 'amount')
}

export function buildReceiptOverview(rows: ModuleRecord[]) {
  return buildFinanceOverview(rows, 'amount')
}
