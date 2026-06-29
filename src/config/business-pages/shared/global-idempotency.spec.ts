import { describe, expect, it, vi } from 'vitest'
import type { ModulePageConfig } from '@/types/module-page'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  buildValueOptions: (...args: string[]) =>
    args.map((value) => ({ label: value, value })),
  customerOptions: [],
  enabledStatusOptions: [],
  getCarrierOptions: [],
  getCarrierVehiclePlateOptions: [],
  getCustomerOptions: [],
  getCustomerProjectOptions: [],
  getMaterialCategoryOptions: [],
  getSettlementCompanyOptions: [],
  getSupplierOptions: [],
  getWarehouseOptions: [],
  materialCategoryOptions: [],
  materialGradeOptions: [],
  statementStatusOptions: [],
  userAccountDataScopeOptions: [],
}))

import { balancePageConfigs } from '../finance/balance-pages'
import { financeReportPageConfigs } from '../finance/finance-report-pages'
import { invoicePageConfigs } from '../finance/invoice-pages'
import { paymentPageConfigs } from '../finance/payment-pages'
import { statementPageConfigs } from '../finance/statement-pages'
import { masterMaterialPageConfigs } from '../master/master-material-pages'
import { masterPartyPageConfigs } from '../master/master-party-pages'
import { masterWarehousePageConfigs } from '../master/master-warehouse-pages'
import { contractOperationsPageConfigs } from '../operations/contract-operations'
import { freightOperationsPageConfigs } from '../operations/freight-operations'
import { purchaseOperationsPageConfigs } from '../operations/purchase-operations'
import { salesOperationsPageConfigs } from '../operations/sales-operations'
import { systemAccessPageConfigs } from '../system/system-access-pages'
import { systemAuditPageConfigs } from '../system/system-audit-pages'
import { systemCorePageConfigs } from '../system/system-core-pages'
import { systemOrganizationPageConfigs } from '../system/system-organization-pages'

const pageConfigs: ModulePageConfig[] = Object.values({
  ...balancePageConfigs,
  ...contractOperationsPageConfigs,
  ...financeReportPageConfigs,
  ...freightOperationsPageConfigs,
  ...invoicePageConfigs,
  ...masterMaterialPageConfigs,
  ...masterPartyPageConfigs,
  ...masterWarehousePageConfigs,
  ...paymentPageConfigs,
  ...purchaseOperationsPageConfigs,
  ...salesOperationsPageConfigs,
  ...statementPageConfigs,
  ...systemAccessPageConfigs,
  ...systemAuditPageConfigs,
  ...systemCorePageConfigs,
  ...systemOrganizationPageConfigs,
})

const writeActionKeyParts = ['create', 'delete', 'update', 'audit']

function expectUnique(configKey: string, name: string, values: string[]) {
  const duplicated = values.filter(
    (value, index) => values.indexOf(value) !== index,
  )

  expect(duplicated, `${configKey} ${name} has duplicated keys`).toEqual([])
}

describe('business page global idempotency contracts', () => {
  it('keeps all page config keys unique', () => {
    expectUnique(
      'business-pages',
      'configs',
      pageConfigs.map((config) => config.key),
    )
  })

  it.each(pageConfigs)('$key keeps interactive keys unique', (config) => {
    expectUnique(
      config.key,
      'actions',
      config.actions?.map((action) => action.key).filter(Boolean) ?? [],
    )
    expectUnique(
      config.key,
      'quickFilters',
      config.quickFilters?.map((filter) => filter.key) ?? [],
    )
    expectUnique(
      config.key,
      'filters',
      config.filters.map((filter) => filter.key),
    )
    expectUnique(
      config.key,
      'columns',
      config.columns.map((column) => String(column.dataIndex)),
    )
    expectUnique(
      config.key,
      'detailFields',
      config.detailFields.map((field) => field.key),
    )
    expectUnique(
      config.key,
      'detailItemColumns',
      config.detailItemColumns?.map((column) => String(column.dataIndex)) ?? [],
    )
    expectUnique(
      config.key,
      'itemColumns',
      config.itemColumns?.map((column) => String(column.dataIndex)) ?? [],
    )
    expectUnique(
      config.key,
      'formFields',
      config.formFields?.map((field) => field.key) ?? [],
    )
  })

  it.each(
    pageConfigs.filter((config) => config.readOnly),
  )('$key does not expose write actions when readOnly', (config) => {
    const actionKeys = config.actions?.map((action) => action.key ?? '') ?? []

    expect(
      actionKeys.filter((key) =>
        writeActionKeyParts.some((part) => key.includes(part)),
      ),
    ).toEqual([])
  })
})
