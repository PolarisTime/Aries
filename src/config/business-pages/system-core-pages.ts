import i18next from 'i18next'
import { enabledStatusOptions } from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import {
  actionSet,
  buildMasterOverview,
  formatInteger,
  statusMap,
} from './shared'
import { masterStatusFilter } from './shared-filters'

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
        title: i18next.t('modules.pages.systemCore.billName'),
        dataIndex: 'billName',
        width: 140,
      },
      {
        title: i18next.t('modules.pages.systemCore.prefix'),
        dataIndex: 'prefix',
        width: 90,
      },
      {
        title: i18next.t('modules.pages.systemCore.dateRule'),
        dataIndex: 'dateRule',
        width: 120,
      },
      {
        title: i18next.t('modules.pages.systemCore.serialLength'),
        dataIndex: 'serialLength',
        width: 100,
        align: 'right',
        type: 'count',
      },
      {
        title: i18next.t('modules.pages.systemCore.resetRule'),
        dataIndex: 'resetRule',
        width: 110,
      },
      {
        title: i18next.t('modules.pages.systemCore.sampleNoOrValue'),
        dataIndex: 'sampleNo',
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
        label: i18next.t('modules.pages.systemCore.billName'),
        key: 'billName',
      },
      { label: i18next.t('modules.pages.systemCore.prefix'), key: 'prefix' },
      {
        label: i18next.t('modules.pages.systemCore.dateRule'),
        key: 'dateRule',
      },
      {
        label: i18next.t('modules.pages.systemCore.serialLength'),
        key: 'serialLength',
        type: 'count',
      },
      {
        label: i18next.t('modules.pages.systemCore.resetRule'),
        key: 'resetRule',
      },
      {
        label: i18next.t('modules.pages.systemCore.sampleNoOrValue'),
        key: 'sampleNo',
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
        key: 'billName',
        label: i18next.t('modules.pages.systemCore.billName'),
        type: 'input',
        required: true,
        row: 1,
      },
      {
        key: 'prefix',
        label: i18next.t('modules.pages.systemCore.prefix'),
        type: 'input',
        required: true,
        row: 1,
      },
      {
        key: 'dateRule',
        label: i18next.t('modules.pages.systemCore.dateRule'),
        type: 'select',
        required: true,
        row: 2,
        options: [
          { label: 'YYYY', value: 'YYYY' },
          { label: 'YYYYMM', value: 'YYYYMM' },
        ],
      },
      {
        key: 'serialLength',
        label: i18next.t('modules.pages.systemCore.serialLength'),
        type: 'number',
        required: true,
        min: 1,
        precision: 0,
        defaultValue: 6,
        row: 2,
      },
      {
        key: 'resetRule',
        label: i18next.t('modules.pages.systemCore.resetRule'),
        type: 'select',
        required: true,
        row: 2,
        options: [
          {
            label: i18next.t('modules.pages.systemCore.yearly'),
            value: '按年重置',
          },
          {
            label: i18next.t('modules.pages.systemCore.monthly'),
            value: '按月重置',
          },
          {
            label: i18next.t('modules.pages.systemCore.never'),
            value: '永不重置',
          },
        ],
      },
      {
        key: 'sampleNo',
        label: i18next.t('modules.pages.systemCore.sampleNoOrValue'),
        type: 'input',
        required: true,
        placeholder: i18next.t('modules.pages.systemCore.sampleForNumberRules'),
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
        label: i18next.t('modules.pages.systemCore.ruleCount'),
        value: formatInteger(rows.length),
      },
      {
        label: i18next.t('modules.pages.systemCore.enabledRuleCount'),
        value: formatInteger(
          rows.filter((row) => row.status === '正常').length,
        ),
      },
    ],
    statusMap,
    rowHighlightStatuses: ['禁用'],
  },
  'company-setting': {
    key: 'company-setting',
    title: i18next.t('modules.pages.systemCore.companyInfo'),
    kicker: 'System',
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
  },
}
