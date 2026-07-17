import i18next from 'i18next'
import { enabledStatusOptions } from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { actionSet, formatInteger, statusMap } from '../shared/shared'
import { masterStatusFilter } from '../shared/shared-filters'

export const systemCorePageConfigs: Record<string, ModulePageConfig> = {
  'general-setting': {
    key: 'general-setting',
    title: i18next.t('modules.pages.systemCore.generalSettings'),
    kicker: 'System',
    description: i18next.t('modules.pages.systemCore.generalSettingDesc'),
    actions: [...actionSet],
    filters: [
      {
        key: 'keyword',
        label: i18next.t('modules.pages.systemCore.keyword'),
        type: 'input',
        placeholder: i18next.t('modules.pages.systemCore.settingPlaceholder'),
      },
      { ...masterStatusFilter },
    ],
    columns: [
      {
        title: i18next.t('modules.pages.systemCore.settingCode'),
        dataIndex: 'settingCode',
        width: 150,
      },
      {
        title: i18next.t('modules.pages.systemCore.settingName'),
        dataIndex: 'settingName',
        width: 180,
      },
      {
        title: i18next.t('modules.pages.systemCore.settingGroup'),
        dataIndex: 'settingGroup',
        width: 140,
      },
      {
        title: i18next.t('modules.pages.systemCore.settingValue'),
        dataIndex: 'settingValue',
        width: 170,
      },
      {
        title: i18next.t('modules.pages.systemCore.status'),
        dataIndex: 'status',
        width: 100,
        type: 'status',
        align: 'center',
      },
      {
        title: i18next.t('modules.pages.systemCore.remark'),
        dataIndex: 'remark',
        width: 220,
      },
    ],
    detailFields: [
      {
        label: i18next.t('modules.pages.systemCore.settingCode'),
        key: 'settingCode',
      },
      {
        label: i18next.t('modules.pages.systemCore.settingName'),
        key: 'settingName',
      },
      {
        label: i18next.t('modules.pages.systemCore.settingGroup'),
        key: 'settingGroup',
      },
      {
        label: i18next.t('modules.pages.systemCore.settingValue'),
        key: 'settingValue',
      },
      {
        label: i18next.t('modules.pages.systemCore.status'),
        key: 'status',
        type: 'status',
      },
      { label: i18next.t('modules.pages.systemCore.remark'), key: 'remark' },
    ],
    formFields: [
      {
        key: 'settingCode',
        label: i18next.t('modules.pages.systemCore.settingCode'),
        type: 'input',
        required: true,
        row: 1,
      },
      {
        key: 'settingName',
        label: i18next.t('modules.pages.systemCore.settingName'),
        type: 'input',
        required: true,
        row: 1,
      },
      {
        key: 'settingGroup',
        label: i18next.t('modules.pages.systemCore.settingGroup'),
        type: 'input',
        required: true,
        row: 1,
      },
      {
        key: 'settingValue',
        label: i18next.t('modules.pages.systemCore.settingValue'),
        type: 'input',
        required: true,
        row: 2,
      },
      {
        key: 'status',
        label: i18next.t('modules.pages.systemCore.status'),
        type: 'select',
        defaultValue: '正常',
        options: enabledStatusOptions,
        row: 3,
      },
      {
        key: 'remark',
        label: i18next.t('modules.pages.systemCore.remark'),
        type: 'textarea',
        row: 4,
        fullRow: true,
      },
    ],
    data: [],
    buildOverview: (rows) => [
      {
        label: i18next.t('modules.pages.systemCore.settingCount'),
        value: formatInteger(rows.length),
      },
      {
        label: i18next.t('modules.pages.systemCore.enabledSettingCount'),
        value: formatInteger(
          rows.filter((row) => row.status === '正常').length,
        ),
      },
    ],
    statusMap,
    rowHighlightStatuses: ['禁用'],
  },
}
