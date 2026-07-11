import i18next from 'i18next'
import {
  getCarrierOptions,
  getCustomerOptions,
  getSettlementCompanyOptions,
  getSupplierOptions,
} from '@/constants/module-options'
import type { ModulePageConfig, ModuleRecordInput } from '@/types/module-page'
import { BILL_STATUS_LABEL } from '../shared/filter-labels'
import { SETTLEMENT_COMPANY_LABEL } from '../shared/settlement-company'
import { buildFinanceOverview, statusMap } from '../shared/shared'

const directionOptions = [
  {
    label: i18next.t('modules.pages.ledgerAdjustment.receivable'),
    value: '应收',
  },
  {
    label: i18next.t('modules.pages.ledgerAdjustment.payable'),
    value: '应付',
  },
]

const counterpartyTypeOptions = [
  {
    label: i18next.t('modules.pages.ledgerAdjustment.customer'),
    value: '客户',
  },
  {
    label: i18next.t('modules.pages.ledgerAdjustment.supplier'),
    value: '供应商',
  },
  {
    label: i18next.t('modules.pages.ledgerAdjustment.carrier'),
    value: '物流商',
  },
]

const adjustmentTypeOptions = [
  {
    label: i18next.t('modules.pages.ledgerAdjustment.badDebt'),
    value: '坏账',
  },
  {
    label: i18next.t('modules.pages.ledgerAdjustment.rounding'),
    value: '抹零',
  },
  {
    label: i18next.t('modules.pages.ledgerAdjustment.discount'),
    value: '折让',
  },
  {
    label: i18next.t('modules.pages.ledgerAdjustment.otherAdjustment'),
    value: '其他调整',
  },
]

const effectOptions = [
  {
    label: i18next.t('modules.pages.ledgerAdjustment.increaseBalance'),
    value: '增加余额',
  },
  {
    label: i18next.t('modules.pages.ledgerAdjustment.decreaseBalance'),
    value: '减少余额',
  },
]

const adjustmentStatusOptions = [
  {
    label: i18next.t('modules.pages.ledgerAdjustment.draft'),
    value: '草稿',
  },
  {
    label: i18next.t('modules.pages.ledgerAdjustment.audited'),
    value: '已审核',
  },
]

function getCounterpartyOptions(form?: ModuleRecordInput) {
  switch (form?.counterpartyType) {
    case '供应商':
      return getSupplierOptions()
    case '物流商':
      return getCarrierOptions()
    default:
      return getCustomerOptions()
  }
}

export const ledgerAdjustmentPageConfig: ModulePageConfig = {
  key: 'ledger-adjustment',
  title: i18next.t('modules.pages.ledgerAdjustment.ledgerAdjustment'),
  kicker: 'Finance',
  description: i18next.t('modules.pages.ledgerAdjustment.ledgerAdjustmentDesc'),
  primaryNoKey: 'adjustmentNo',
  actions: [
    {
      key: 'create_ledger_adjustment',
      label: i18next.t('modules.pages.ledgerAdjustment.createAdjustment'),
      type: 'primary',
    },
  ],
  filters: [
    {
      key: 'direction',
      label: i18next.t('modules.pages.ledgerAdjustment.direction'),
      type: 'select',
      options: directionOptions,
    },
    {
      key: 'counterpartyType',
      label: i18next.t('modules.pages.ledgerAdjustment.counterpartyType'),
      type: 'select',
      options: counterpartyTypeOptions,
    },
    {
      key: 'settlementCompanyId',
      label: SETTLEMENT_COMPANY_LABEL,
      type: 'select',
      options: getSettlementCompanyOptions,
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      options: adjustmentStatusOptions,
    },
    {
      key: 'adjustmentDate',
      label: i18next.t('modules.pages.ledgerAdjustment.adjustmentDate'),
      type: 'dateRange',
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.ledgerAdjustment.adjustmentNo'),
      dataIndex: 'adjustmentNo',
      width: 170,
    },
    {
      title: i18next.t('modules.pages.ledgerAdjustment.direction'),
      dataIndex: 'direction',
      width: 90,
      type: 'status',
      align: 'center',
    },
    {
      title: i18next.t('modules.pages.ledgerAdjustment.counterpartyType'),
      dataIndex: 'counterpartyType',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.ledgerAdjustment.counterpartyCode'),
      dataIndex: 'counterpartyCode',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.ledgerAdjustment.counterparty'),
      dataIndex: 'counterpartyName',
      width: 160,
    },
    {
      title: SETTLEMENT_COMPANY_LABEL,
      dataIndex: 'settlementCompanyName',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.ledgerAdjustment.adjustmentDate'),
      dataIndex: 'adjustmentDate',
      width: 130,
      type: 'date',
    },
    {
      title: i18next.t('modules.pages.ledgerAdjustment.adjustmentType'),
      dataIndex: 'adjustmentType',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.ledgerAdjustment.effect'),
      dataIndex: 'effect',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.ledgerAdjustment.amount'),
      dataIndex: 'amount',
      width: 120,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.ledgerAdjustment.status'),
      dataIndex: 'status',
      width: 100,
      type: 'status',
      align: 'center',
    },
  ],
  defaultHiddenColumnKeys: ['projectName'],
  detailFields: [
    {
      label: i18next.t('modules.pages.ledgerAdjustment.adjustmentNo'),
      key: 'adjustmentNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.ledgerAdjustment.direction'),
      key: 'direction',
      type: 'status',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.ledgerAdjustment.counterpartyType'),
      key: 'counterpartyType',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.ledgerAdjustment.counterpartyCode'),
      key: 'counterpartyCode',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.ledgerAdjustment.counterparty'),
      key: 'counterpartyName',
      row: 2,
    },
    {
      label: SETTLEMENT_COMPANY_LABEL,
      key: 'settlementCompanyName',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.ledgerAdjustment.project'),
      key: 'projectName',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.ledgerAdjustment.adjustmentDate'),
      key: 'adjustmentDate',
      type: 'date',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.ledgerAdjustment.amount'),
      key: 'amount',
      type: 'amount',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.ledgerAdjustment.adjustmentType'),
      key: 'adjustmentType',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.ledgerAdjustment.effect'),
      key: 'effect',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.ledgerAdjustment.status'),
      key: 'status',
      type: 'status',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.ledgerAdjustment.operator'),
      key: 'operatorName',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.ledgerAdjustment.remark'),
      key: 'remark',
      row: 4,
      fullRow: true,
    },
  ],
  formFields: [
    {
      key: 'adjustmentNo',
      label: i18next.t('modules.pages.ledgerAdjustment.adjustmentNo'),
      type: 'input',
      required: true,
      disabled: true,
      placeholder: i18next.t(
        'modules.pages.ledgerAdjustment.autoGeneratedPlaceholder',
      ),
      row: 1,
    },
    {
      key: 'direction',
      label: i18next.t('modules.pages.ledgerAdjustment.direction'),
      type: 'select',
      required: true,
      allowClear: false,
      defaultValue: '应收',
      options: directionOptions,
      row: 1,
    },
    {
      key: 'counterpartyType',
      label: i18next.t('modules.pages.ledgerAdjustment.counterpartyType'),
      type: 'select',
      required: true,
      allowClear: false,
      defaultValue: '客户',
      options: counterpartyTypeOptions,
      row: 1,
    },
    {
      key: 'counterpartyCode',
      label: i18next.t('modules.pages.ledgerAdjustment.counterpartyCode'),
      type: 'input',
      required: true,
      maxLength: 64,
      placeholder: i18next.t(
        'modules.pages.ledgerAdjustment.counterpartyCodePlaceholder',
      ),
      row: 1,
    },
    {
      key: 'counterpartyName',
      label: i18next.t('modules.pages.ledgerAdjustment.counterparty'),
      type: 'select',
      required: true,
      allowClear: false,
      options: getCounterpartyOptions,
      row: 2,
    },
    {
      key: 'settlementCompanyId',
      label: SETTLEMENT_COMPANY_LABEL,
      type: 'select',
      required: true,
      allowClear: false,
      options: getSettlementCompanyOptions,
      row: 2,
    },
    {
      key: 'projectName',
      label: i18next.t('modules.pages.ledgerAdjustment.project'),
      type: 'input',
      maxLength: 128,
      row: 2,
    },
    {
      key: 'adjustmentDate',
      label: i18next.t('modules.pages.ledgerAdjustment.adjustmentDate'),
      type: 'date',
      required: true,
      allowClear: false,
      dateFormat: 'YYYY-MM-DD',
      showTime: false,
      row: 2,
    },
    {
      key: 'amount',
      label: i18next.t('modules.pages.ledgerAdjustment.amount'),
      type: 'number',
      required: true,
      min: 0.01,
      precision: 2,
      step: 0.01,
      controls: false,
      row: 2,
    },
    {
      key: 'adjustmentType',
      label: i18next.t('modules.pages.ledgerAdjustment.adjustmentType'),
      type: 'select',
      required: true,
      allowClear: false,
      defaultValue: '其他调整',
      options: adjustmentTypeOptions,
      row: 3,
    },
    {
      key: 'effect',
      label: i18next.t('modules.pages.ledgerAdjustment.effect'),
      type: 'select',
      required: true,
      allowClear: false,
      defaultValue: '减少余额',
      options: effectOptions,
      row: 3,
    },
    {
      key: 'status',
      label: i18next.t('modules.pages.ledgerAdjustment.status'),
      type: 'select',
      allowClear: false,
      defaultValue: '草稿',
      options: adjustmentStatusOptions,
      row: 3,
    },
    {
      key: 'operatorName',
      label: i18next.t('modules.pages.ledgerAdjustment.operator'),
      type: 'input',
      required: true,
      disabled: true,
      maxLength: 64,
      row: 3,
    },
    {
      key: 'remark',
      label: i18next.t('modules.pages.ledgerAdjustment.remark'),
      type: 'textarea',
      maxLength: 500,
      showCount: true,
      placeholder: i18next.t(
        'modules.pages.ledgerAdjustment.remarkPlaceholder',
      ),
      row: 4,
      fullRow: true,
    },
  ],
  saveFields: {
    scalar: [
      'adjustmentNo',
      'direction',
      'counterpartyType',
      'counterpartyCode',
      'counterpartyName',
      'settlementCompanyId',
      'settlementCompanyName',
      'projectId',
      'projectName',
      'adjustmentDate',
      'amount',
      'adjustmentType',
      'effect',
      'status',
      'operatorName',
      'remark',
    ],
  },
  data: [],
  buildOverview: (rows) => buildFinanceOverview(rows, 'amount'),
  statusMap: {
    ...statusMap,
    应收: {
      text: i18next.t('modules.pages.ledgerAdjustment.receivable'),
      color: 'processing',
    },
    应付: {
      text: i18next.t('modules.pages.ledgerAdjustment.payable'),
      color: 'warning',
    },
  },
  rowHighlightStatuses: ['草稿'],
}
