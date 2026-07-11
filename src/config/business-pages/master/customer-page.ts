import i18next from 'i18next'
import {
  enabledStatusOptions,
  getSettlementCompanyOptions,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { actionSet, buildMasterOverview, statusMap } from '../shared/shared'
import { masterStatusFilter } from '../shared/shared-filters'

export const customersPageConfig: ModulePageConfig = {
  key: 'customer',
  title: i18next.t('modules.pages.customer.title'),
  kicker: 'Master Data',
  description: i18next.t('modules.pages.customer.description'),
  primaryNoKey: 'customerCode',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: i18next.t('modules.filter.keyword'),
      type: 'input',
      placeholder: i18next.t('modules.pages.customer.placeholderKeyword'),
    },
    { ...masterStatusFilter },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.customer.colCustomerCode'),
      dataIndex: 'customerCode',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.customer.colCustomerName'),
      dataIndex: 'customerName',
      width: 180,
    },
    {
      title: i18next.t('modules.pages.customer.colProjectName'),
      dataIndex: 'projectName',
      width: 150,
    },
    {
      title: i18next.t('modules.pages.customer.colContactName'),
      dataIndex: 'contactName',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.customer.colContactPhone'),
      dataIndex: 'contactPhone',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.customer.colCity'),
      dataIndex: 'city',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.customer.colSettlementMode'),
      dataIndex: 'settlementMode',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.customer.colDefaultSettlementCompany'),
      dataIndex: 'defaultSettlementCompanyName',
      width: 180,
    },
    {
      title: i18next.t('modules.columns.status'),
      dataIndex: 'status',
      width: 100,
      type: 'status',
      align: 'center',
    },
  ],
  defaultHiddenColumnKeys: ['contactPhone', 'city'],
  detailFields: [
    {
      label: i18next.t('modules.pages.customer.colCustomerCode'),
      key: 'customerCode',
    },
    {
      label: i18next.t('modules.pages.customer.colCustomerName'),
      key: 'customerName',
    },
    {
      label: i18next.t('modules.pages.customer.colProjectName'),
      key: 'projectName',
    },
    {
      label: i18next.t('modules.pages.customer.colProjectNameAbbr'),
      key: 'projectNameAbbr',
    },
    {
      label: i18next.t('modules.pages.customer.colProjectAddress'),
      key: 'projectAddress',
    },
    {
      label: i18next.t('modules.pages.customer.colContactName'),
      key: 'contactName',
    },
    {
      label: i18next.t('modules.pages.customer.colContactPhone'),
      key: 'contactPhone',
    },
    { label: i18next.t('modules.pages.customer.colCity'), key: 'city' },
    {
      label: i18next.t('modules.pages.customer.colSettlementMode'),
      key: 'settlementMode',
    },
    {
      label: i18next.t('modules.pages.customer.colDefaultSettlementCompany'),
      key: 'defaultSettlementCompanyName',
    },
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
      key: 'customerCode',
      label: i18next.t('modules.pages.customer.colCustomerCode'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'customerName',
      label: i18next.t('modules.pages.customer.colCustomerName'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'projectName',
      label: i18next.t('modules.pages.customer.colProjectName'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'projectNameAbbr',
      label: i18next.t('modules.pages.customer.colProjectNameAbbr'),
      type: 'input',
      row: 1,
    },
    {
      key: 'projectAddress',
      label: i18next.t('modules.pages.customer.colProjectAddress'),
      type: 'input',
      row: 2,
      fullRow: true,
    },
    {
      key: 'contactName',
      label: i18next.t('modules.pages.customer.colContactName'),
      type: 'input',
      row: 3,
    },
    {
      key: 'contactPhone',
      label: i18next.t('modules.pages.customer.colContactPhone'),
      type: 'input',
      row: 3,
    },
    {
      key: 'city',
      label: i18next.t('modules.pages.customer.colCity'),
      type: 'input',
      row: 3,
    },
    {
      key: 'settlementMode',
      label: i18next.t('modules.pages.customer.colSettlementMode'),
      type: 'select',
      options: [
        {
          label: i18next.t('modules.pages.customer.settlementCash'),
          value: '现结',
        },
        {
          label: i18next.t('modules.pages.customer.settlementMonthly'),
          value: '月结',
        },
        {
          label: i18next.t('modules.pages.customer.settlementCredit'),
          value: '授信',
        },
      ],
      row: 3,
    },
    {
      key: 'defaultSettlementCompanyId',
      label: i18next.t('modules.pages.customer.colDefaultSettlementCompany'),
      type: 'select',
      required: true,
      options: getSettlementCompanyOptions,
      row: 4,
    },
    {
      key: 'status',
      label: i18next.t('modules.columns.status'),
      type: 'select',
      defaultValue: '正常',
      options: enabledStatusOptions,
      row: 4,
    },
    {
      key: 'remark',
      label: i18next.t('modules.columns.remark'),
      type: 'textarea',
      row: 5,
      fullRow: true,
    },
  ],
  data: [],
  buildOverview: (rows) => buildMasterOverview(rows),
  statusMap,
  rowHighlightStatuses: ['禁用'],
  saveFields: {
    scalar: [
      'customerCode',
      'customerName',
      'projectName',
      'projectNameAbbr',
      'projectAddress',
      'contactName',
      'contactPhone',
      'city',
      'settlementMode',
      'defaultSettlementCompanyId',
      'defaultSettlementCompanyName',
      'status',
      'remark',
    ],
  },
}
