import i18next from 'i18next'
import type { ModuleOverviewItem, ModuleRecord } from '@/types/module-page'
import { formatAmount, formatInteger, formatWeight } from '@/utils/formatters'

export { formatAmount, formatInteger, formatWeight }

export function sumBy(rows: ModuleRecord[], key: string) {
  return rows.reduce((sum, row) => sum + Number(row[key] || 0), 0)
}

export function buildAmountWeightOverview(
  rows: ModuleRecord[],
  amountKey: string,
  weightKey = 'totalWeight',
): ModuleOverviewItem[] {
  return [
    { label: i18next.t('modules.overview.recordCount'), value: formatInteger(rows.length) },
    { label: i18next.t('modules.overview.totalWeight'), value: formatWeight(sumBy(rows, weightKey)) },
    { label: i18next.t('modules.overview.totalAmount'), value: formatAmount(sumBy(rows, amountKey)) },
  ]
}

export function buildWeightOverview(
  rows: ModuleRecord[],
  weightKey = 'totalWeight',
): ModuleOverviewItem[] {
  return [
    { label: i18next.t('modules.overview.recordCount'), value: formatInteger(rows.length) },
    { label: i18next.t('modules.overview.totalWeight'), value: formatWeight(sumBy(rows, weightKey)) },
  ]
}

export function buildStatementOverview(
  rows: ModuleRecord[],
  businessKey: string,
  paidKey: string,
  balanceKey: string,
): ModuleOverviewItem[] {
  return [
    { label: i18next.t('modules.overview.statementCount'), value: formatInteger(rows.length) },
    { label: i18next.t('modules.overview.currentAmount'), value: formatAmount(sumBy(rows, businessKey)) },
    { label: i18next.t('modules.overview.settledAmount'), value: formatAmount(sumBy(rows, paidKey)) },
    { label: i18next.t('modules.overview.balance'), value: formatAmount(sumBy(rows, balanceKey)) },
  ]
}

export function buildFinanceOverview(
  rows: ModuleRecord[],
  amountKey: string,
): ModuleOverviewItem[] {
  return [
    { label: i18next.t('modules.overview.documentCount'), value: formatInteger(rows.length) },
    { label: i18next.t('modules.overview.totalAmount'), value: formatAmount(sumBy(rows, amountKey)) },
  ]
}

export function buildMasterOverview(
  rows: ModuleRecord[],
  activeKey = 'status',
  activeValue = '正常',
): ModuleOverviewItem[] {
  return [
    { label: i18next.t('modules.overview.masterDataCount'), value: formatInteger(rows.length) },
    {
      label: i18next.t('modules.overview.normalCount'),
      value: formatInteger(
        rows.filter((row) => row[activeKey] === activeValue).length,
      ),
    },
  ]
}
