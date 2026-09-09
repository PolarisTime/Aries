import i18next from 'i18next'
import type {
  ModuleOverviewItem,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'
import { formatInteger } from '../shared/shared'

export function isPhysicalMaterialFieldVisible(
  form?: ModuleRecordInput,
): boolean {
  return form?.materialType !== '附加费用'
}

export function buildMaterialOverview(
  rows: ModuleRecord[],
): ModuleOverviewItem[] {
  return [
    {
      label: i18next.t('modules.pages.material.materialCount'),
      value: formatInteger(rows.length),
    },
    {
      label: i18next.t('modules.pages.material.calculated'),
      value: formatInteger(
        rows.filter((row) => row.category === '螺纹钢').length,
      ),
    },
    {
      label: i18next.t('modules.pages.material.weighed'),
      value: formatInteger(
        rows.filter((row) => row.category !== '螺纹钢').length,
      ),
    },
  ]
}
