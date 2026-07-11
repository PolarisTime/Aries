import i18next from 'i18next'
import { enabledStatusOptions } from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { actionSet, buildMasterOverview, statusMap } from '../shared/shared'
import { masterStatusFilter } from '../shared/shared-filters'

export const suppliersPageConfig: ModulePageConfig = {
  key: 'supplier',
  title: i18next.t('modules.pages.supplier.title'),
  kicker: 'Master Data',
  description: i18next.t('modules.pages.supplier.description'),
  primaryNoKey: 'supplierCode',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: i18next.t('modules.filter.keyword'),
      type: 'input',
      placeholder: i18next.t('modules.pages.supplier.placeholderKeyword'),
    },
    { ...masterStatusFilter },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.supplier.colSupplierCode'),
      dataIndex: 'supplierCode',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.supplier.colSupplierName'),
      dataIndex: 'supplierName',
      width: 180,
    },
    {
      title: i18next.t('modules.pages.supplier.colContactName'),
      dataIndex: 'contactName',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.supplier.colContactPhone'),
      dataIndex: 'contactPhone',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.supplier.colCity'),
      dataIndex: 'city',
      width: 120,
    },
    {
      title: i18next.t('modules.columns.status'),
      dataIndex: 'status',
      width: 100,
      type: 'status',
      align: 'center',
    },
    {
      title: i18next.t('modules.columns.remark'),
      dataIndex: 'remark',
      width: 180,
    },
  ],
  defaultHiddenColumnKeys: ['contactPhone', 'city', 'remark'],
  detailFields: [
    {
      label: i18next.t('modules.pages.supplier.colSupplierCode'),
      key: 'supplierCode',
    },
    {
      label: i18next.t('modules.pages.supplier.colSupplierName'),
      key: 'supplierName',
    },
    {
      label: i18next.t('modules.pages.supplier.colContactName'),
      key: 'contactName',
    },
    {
      label: i18next.t('modules.pages.supplier.colContactPhone'),
      key: 'contactPhone',
    },
    { label: i18next.t('modules.pages.supplier.colCity'), key: 'city' },
    {
      label: i18next.t('modules.columns.status'),
      key: 'status',
      type: 'status',
    },
    { label: i18next.t('modules.columns.remark'), key: 'remark' },
  ],
  detailColumnCount: 4,
  formFields: [
    {
      key: 'supplierCode',
      label: i18next.t('modules.pages.supplier.colSupplierCode'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'supplierName',
      label: i18next.t('modules.pages.supplier.colSupplierName'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'contactName',
      label: i18next.t('modules.pages.supplier.colContactName'),
      type: 'input',
      row: 1,
    },
    {
      key: 'contactPhone',
      label: i18next.t('modules.pages.supplier.colContactPhone'),
      type: 'input',
      row: 1,
    },
    {
      key: 'city',
      label: i18next.t('modules.pages.supplier.colCity'),
      type: 'input',
      row: 2,
    },
    {
      key: 'status',
      label: i18next.t('modules.columns.status'),
      type: 'select',
      defaultValue: '正常',
      options: enabledStatusOptions,
      row: 2,
    },
    {
      key: 'remark',
      label: i18next.t('modules.columns.remark'),
      type: 'textarea',
      row: 3,
      fullRow: true,
    },
  ],
  data: [],
  buildOverview: (rows) => buildMasterOverview(rows),
  statusMap,
  rowHighlightStatuses: ['禁用'],
}
