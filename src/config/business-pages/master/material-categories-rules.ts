import i18next from 'i18next'
import type { ModuleOverviewItem, ModuleRecord } from '@/types/module-page'
import { formatInteger } from '../shared/shared'

export function buildMaterialCategoryOverview(
  rows: ModuleRecord[],
): ModuleOverviewItem[] {
  return [
    {
      label: i18next.t('modules.pages.materialCategories.categoryCount'),
      value: formatInteger(rows.length),
    },
    {
      label: i18next.t('modules.pages.materialCategories.enabled'),
      value: formatInteger(rows.filter((row) => row.status === '正常').length),
    },
    {
      label: i18next.t('modules.pages.materialCategories.purchaseWeigh'),
      value: formatInteger(
        rows.filter((row) => row.purchaseWeighRequired === true).length,
      ),
    },
  ]
}
