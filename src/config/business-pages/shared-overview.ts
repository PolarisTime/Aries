import type { ModuleOverviewItem, ModuleRecord } from '@/types/module-page'

export function formatInteger(value: number) {
  return String(value)
}

export function formatAmount(value: number) {
  return value.toFixed(2)
}

export function formatWeight(value: number) {
  return value.toFixed(3)
}

export function sumBy(rows: ModuleRecord[], key: string) {
  return rows.reduce((sum, row) => sum + Number(row[key] || 0), 0)
}

export function buildAmountWeightOverview(
  rows: ModuleRecord[],
  amountKey: string,
  weightKey = 'totalWeight',
): ModuleOverviewItem[] {
  return [
    { label: '记录数', value: formatInteger(rows.length) },
    { label: '总重量合计（吨）', value: formatWeight(sumBy(rows, weightKey)) },
    { label: '金额合计', value: formatAmount(sumBy(rows, amountKey)) },
  ]
}

export function buildWeightOverview(
  rows: ModuleRecord[],
  weightKey = 'totalWeight',
): ModuleOverviewItem[] {
  return [
    { label: '记录数', value: formatInteger(rows.length) },
    { label: '总重量合计（吨）', value: formatWeight(sumBy(rows, weightKey)) },
  ]
}

export function buildStatementOverview(
  rows: ModuleRecord[],
  businessKey: string,
  paidKey: string,
  balanceKey: string,
): ModuleOverviewItem[] {
  return [
    { label: '对账单数', value: formatInteger(rows.length) },
    { label: '本期金额', value: formatAmount(sumBy(rows, businessKey)) },
    { label: '已结金额', value: formatAmount(sumBy(rows, paidKey)) },
    { label: '余额', value: formatAmount(sumBy(rows, balanceKey)) },
  ]
}

export function buildFinanceOverview(
  rows: ModuleRecord[],
  amountKey: string,
): ModuleOverviewItem[] {
  return [
    { label: '单据数', value: formatInteger(rows.length) },
    { label: '金额合计', value: formatAmount(sumBy(rows, amountKey)) },
  ]
}

export function buildMasterOverview(
  rows: ModuleRecord[],
  activeKey = 'status',
  activeValue = '正常',
): ModuleOverviewItem[] {
  return [
    { label: '主数据数', value: formatInteger(rows.length) },
    {
      label: '正常数',
      value: formatInteger(
        rows.filter((row) => row[activeKey] === activeValue).length,
      ),
    },
  ]
}
