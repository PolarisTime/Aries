import i18next from 'i18next'
import type { ModulePageConfig } from '@/types/module-page'
import { actionSet, buildMasterOverview } from '../shared/shared'

export const settlementCompanyPageConfig: ModulePageConfig = {
  key: 'company-setting',
  title: i18next.t('modules.pages.systemCore.companyInfo'),
  kicker: 'Master Data',
  description: i18next.t('modules.pages.systemCore.companyInfoDesc'),
  actions: [...actionSet],
  filters: [
    {
      key: 'keyword',
      label: i18next.t('modules.pages.systemCore.keyword'),
      type: 'input',
      placeholder: i18next.t('modules.pages.systemCore.companyPlaceholder'),
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.systemCore.companyName'),
      dataIndex: 'companyName',
      width: 180,
    },
    {
      title: i18next.t('modules.pages.systemCore.taxNo'),
      dataIndex: 'taxNo',
      width: 180,
    },
    {
      title: i18next.t('modules.pages.systemCore.remark'),
      dataIndex: 'remark',
      width: 220,
    },
  ],
  detailFields: [
    {
      label: i18next.t('modules.pages.systemCore.companyName'),
      key: 'companyName',
    },
    { label: i18next.t('modules.pages.systemCore.taxNo'), key: 'taxNo' },
    { label: i18next.t('modules.pages.systemCore.remark'), key: 'remark' },
  ],
  formFields: [
    {
      key: 'companyName',
      label: i18next.t('modules.pages.systemCore.companyName'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'taxNo',
      label: i18next.t('modules.pages.systemCore.taxNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'remark',
      label: i18next.t('modules.pages.systemCore.remark'),
      type: 'textarea',
      row: 2,
      fullRow: true,
    },
  ],
  data: [],
  buildOverview: (rows) => buildMasterOverview(rows),
}

export const masterSettlementCompanyPageConfigs: Record<
  string,
  ModulePageConfig
> = {
  [settlementCompanyPageConfig.key]: settlementCompanyPageConfig,
}
