import { enabledStatusOptions } from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { actionSet, formatInteger } from './shared'
import { masterStatusFilter } from './shared-filters'
import i18next from 'i18next'

export const materialCategoriesPageConfig: ModulePageConfig = {
  key: 'material-categories',
  title: i18next.t('modules.pages.materialCategories.materialCategory'),
  kicker: 'Master Data',
  description: i18next.t('modules.pages.materialCategories.categoryDesc'),
  primaryNoKey: 'categoryCode',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: i18next.t('modules.pages.materialCategories.keyword'),
      type: 'input',
      placeholder: i18next.t('modules.pages.materialCategories.categoryPlaceholder'),
    },
    { ...masterStatusFilter },
  ],
  columns: [
    { title: i18next.t('modules.pages.materialCategories.categoryCode'), dataIndex: 'categoryCode', width: 150 },
    { title: i18next.t('modules.pages.materialCategories.categoryName'), dataIndex: 'categoryName', width: 180 },
    { title: i18next.t('modules.pages.materialCategories.sortOrder'), dataIndex: 'sortOrder', width: 80, align: 'right' },
    {
      title: i18next.t('modules.pages.materialCategories.purchaseWeigh'),
      dataIndex: 'purchaseWeighRequired',
      width: 100,
      type: 'boolean',
    },
    { title: i18next.t('modules.pages.materialCategories.status'), dataIndex: 'status', width: 90 },
    { title: i18next.t('modules.pages.materialCategories.remark'), dataIndex: 'remark', width: 200 },
  ],
  detailFields: [
    { label: i18next.t('modules.pages.materialCategories.categoryCode'), key: 'categoryCode' },
    { label: i18next.t('modules.pages.materialCategories.categoryName'), key: 'categoryName' },
    { label: i18next.t('modules.pages.materialCategories.sortOrder'), key: 'sortOrder' },
    { label: i18next.t('modules.pages.materialCategories.purchaseWeigh'), key: 'purchaseWeighRequired' },
    { label: i18next.t('modules.pages.materialCategories.status'), key: 'status' },
    { label: i18next.t('modules.pages.materialCategories.remark'), key: 'remark' },
  ],
  formFields: [
    {
      key: 'categoryCode',
      label: i18next.t('modules.pages.materialCategories.categoryCode'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'categoryName',
      label: i18next.t('modules.pages.materialCategories.categoryName'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'sortOrder',
      label: i18next.t('modules.pages.materialCategories.sortOrder'),
      type: 'number',
      required: true,
      min: 0,
      precision: 0,
      defaultValue: 0,
      row: 1,
    },
    {
      key: 'purchaseWeighRequired',
      label: i18next.t('modules.pages.materialCategories.purchaseWeigh'),
      type: 'select',
      defaultValue: false,
      row: 2,
      colSpan: 4,
      options: [
        { label: i18next.t('modules.pages.materialCategories.required'), value: true },
        { label: i18next.t('modules.pages.materialCategories.notRequired'), value: false },
      ],
    },
    {
      key: 'status',
      label: i18next.t('modules.pages.materialCategories.status'),
      type: 'select',
      required: true,
      defaultValue: '正常',
      options: enabledStatusOptions,
      row: 2,
    },
    { key: 'remark', label: i18next.t('modules.pages.materialCategories.remark'), type: 'textarea', row: 3, fullRow: true },
  ],
  data: [],
  buildOverview: (rows) => [
    { label: i18next.t('modules.pages.materialCategories.categoryCount'), value: formatInteger(rows.length) },
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
  ],
}
