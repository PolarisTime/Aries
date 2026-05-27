import { buildValueOptions } from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { BILL_STATUS_LABEL } from './filter-labels'
import { formatAmount, formatInteger, statusMap, sumBy } from './shared'
import i18next from 'i18next'

export const balancePageConfigs: Record<string, ModulePageConfig> = {
  'receivable-payable': {
    key: 'receivable-payable',
    title: i18next.t('modules.pages.balance.receivablePayable'),
    kicker: 'Finance',
    description:
      i18next.t('modules.pages.balance.balanceDesc'),
    readOnly: true,
    actions: [{ key: 'export_balance', label: i18next.t('modules.pages.balance.exportBalance'), type: 'primary' }],
    filters: [
      {
        key: 'direction',
        label: i18next.t('modules.pages.balance.direction'),
        type: 'select',
        options: [
          { label: i18next.t('modules.pages.balance.receivable'), value: '应收' },
          { label: i18next.t('modules.pages.balance.payable'), value: '应付' },
        ],
      },
      {
        key: 'counterpartyType',
        label: i18next.t('modules.pages.balance.counterpartyType'),
        type: 'select',
        options: [
          { label: i18next.t('modules.pages.balance.customer'), value: '客户' },
          { label: i18next.t('modules.pages.balance.supplier'), value: '供应商' },
          { label: i18next.t('modules.pages.balance.carrier'), value: '物流商' },
        ],
      },
      {
        key: 'status',
        label: BILL_STATUS_LABEL,
        type: 'select',
        options: buildValueOptions('待确认', '已确认', '待审核', '已审核'),
      },
    ],
    columns: [
      { title: i18next.t('modules.pages.balance.direction'), dataIndex: 'direction', width: 100 },
      { title: i18next.t('modules.pages.balance.counterpartyType'), dataIndex: 'counterpartyType', width: 110 },
      { title: i18next.t('modules.pages.balance.counterparty'), dataIndex: 'counterpartyName', width: 160 },
      {
        title: i18next.t('modules.pages.balance.openingBalance'),
        dataIndex: 'openingAmount',
        width: 110,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.balance.currentTransactions'),
        dataIndex: 'currentAmount',
        width: 110,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.balance.currentSettlement'),
        dataIndex: 'settledAmount',
        width: 110,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.balance.closingBalance'),
        dataIndex: 'balanceAmount',
        width: 110,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.balance.status'),
        dataIndex: 'status',
        width: 110,
        type: 'status',
        align: 'center',
      },
    ],
    detailFields: [
      { label: i18next.t('modules.pages.balance.direction'), key: 'direction' },
      { label: i18next.t('modules.pages.balance.counterpartyType'), key: 'counterpartyType' },
      { label: i18next.t('modules.pages.balance.counterparty'), key: 'counterpartyName' },
      { label: i18next.t('modules.pages.balance.openingBalance'), key: 'openingAmount', type: 'amount' },
      { label: i18next.t('modules.pages.balance.currentTransactions'), key: 'currentAmount', type: 'amount' },
      { label: i18next.t('modules.pages.balance.currentSettlement'), key: 'settledAmount', type: 'amount' },
      { label: i18next.t('modules.pages.balance.closingBalance'), key: 'balanceAmount', type: 'amount' },
      { label: i18next.t('modules.pages.balance.status'), key: 'status', type: 'status' },
      { label: i18next.t('modules.pages.balance.remark'), key: 'remark' },
    ],
    data: [],
    buildOverview: (rows) => [
      { label: i18next.t('modules.pages.balance.counterpartyCount'), value: formatInteger(rows.length) },
      {
        label: i18next.t('modules.pages.balance.receivableBalance'),
        value: formatAmount(
          sumBy(
            rows.filter((row) => row.direction === '应收'),
            'balanceAmount',
          ),
        ),
      },
      {
        label: i18next.t('modules.pages.balance.payableBalance'),
        value: formatAmount(
          sumBy(
            rows.filter((row) => row.direction === '应付'),
            'balanceAmount',
          ),
        ),
      },
    ],
    statusMap,
    rowHighlightStatuses: ['待确认', '待审核'],
  },
}
