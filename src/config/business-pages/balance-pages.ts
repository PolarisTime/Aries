import i18next from 'i18next'
import { buildValueOptions } from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { BILL_STATUS_LABEL } from './filter-labels'
import { formatAmount, formatInteger, statusMap, sumBy } from './shared'

const balanceStatusMap = {
  ...statusMap,
  有效: {
    text: i18next.t('modules.pages.balance.effective'),
    color: 'success' as const,
  },
}

export const balancePageConfigs: Record<string, ModulePageConfig> = {
  'receivable-payable': {
    key: 'receivable-payable',
    title: i18next.t('modules.pages.balance.receivablePayable'),
    primaryNoKey: 'counterpartyName',
    kicker: 'Finance',
    description: i18next.t('modules.pages.balance.balanceDesc'),
    readOnly: true,
    actions: [
      {
        key: 'export_balance',
        label: i18next.t('modules.pages.balance.exportBalance'),
        type: 'primary',
      },
    ],
    filters: [
      {
        key: 'direction',
        label: i18next.t('modules.pages.balance.direction'),
        type: 'select',
        options: [
          {
            label: i18next.t('modules.pages.balance.receivable'),
            value: '应收',
          },
          { label: i18next.t('modules.pages.balance.payable'), value: '应付' },
        ],
      },
      {
        key: 'counterpartyType',
        label: i18next.t('modules.pages.balance.counterpartyType'),
        type: 'select',
        options: [
          { label: i18next.t('modules.pages.balance.customer'), value: '客户' },
          {
            label: i18next.t('modules.pages.balance.supplier'),
            value: '供应商',
          },
          {
            label: i18next.t('modules.pages.balance.carrier'),
            value: '物流商',
          },
        ],
      },
      {
        key: 'status',
        label: BILL_STATUS_LABEL,
        type: 'select',
        options: buildValueOptions('已确认', '已审核'),
      },
    ],
    columns: [
      {
        title: i18next.t('modules.pages.balance.direction'),
        dataIndex: 'direction',
        width: 100,
      },
      {
        title: i18next.t('modules.pages.balance.counterpartyType'),
        dataIndex: 'counterpartyType',
        width: 110,
      },
      {
        title: i18next.t('modules.pages.balance.counterparty'),
        dataIndex: 'counterpartyName',
        width: 160,
      },
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
        title: i18next.t('modules.pages.balance.documentCount'),
        dataIndex: 'documentCount',
        width: 110,
        align: 'right',
        type: 'count',
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
      {
        label: i18next.t('modules.pages.balance.counterpartyType'),
        key: 'counterpartyType',
      },
      {
        label: i18next.t('modules.pages.balance.counterparty'),
        key: 'counterpartyName',
      },
      {
        label: i18next.t('modules.pages.balance.openingBalance'),
        key: 'openingAmount',
        type: 'amount',
      },
      {
        label: i18next.t('modules.pages.balance.currentTransactions'),
        key: 'currentAmount',
        type: 'amount',
      },
      {
        label: i18next.t('modules.pages.balance.currentSettlement'),
        key: 'settledAmount',
        type: 'amount',
      },
      {
        label: i18next.t('modules.pages.balance.closingBalance'),
        key: 'balanceAmount',
        type: 'amount',
      },
      {
        label: i18next.t('modules.pages.balance.documentCount'),
        key: 'documentCount',
        type: 'count',
      },
      {
        label: i18next.t('modules.pages.balance.status'),
        key: 'status',
        type: 'status',
      },
      { label: i18next.t('modules.pages.balance.remark'), key: 'remark' },
    ],
    detailItemColumns: [
      {
        title: i18next.t('modules.pages.balance.sourceNo'),
        dataIndex: 'sourceNo',
        width: 160,
      },
      {
        title: i18next.t('modules.pages.balance.statementNo'),
        dataIndex: 'statementNo',
        width: 170,
      },
      {
        title: i18next.t('modules.pages.balance.project'),
        dataIndex: 'projectName',
        width: 160,
      },
      {
        title: i18next.t('modules.pages.balance.businessDate'),
        dataIndex: 'businessDate',
        width: 120,
        type: 'date',
      },
      {
        title: i18next.t('modules.pages.balance.periodStart'),
        dataIndex: 'periodStart',
        width: 120,
        type: 'date',
      },
      {
        title: i18next.t('modules.pages.balance.periodEnd'),
        dataIndex: 'periodEnd',
        width: 120,
        type: 'date',
      },
      {
        title: i18next.t('modules.pages.balance.currentTransactions'),
        dataIndex: 'currentAmount',
        width: 120,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.balance.statementSettlement'),
        dataIndex: 'statementSettledAmount',
        width: 130,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.balance.statementBalance'),
        dataIndex: 'statementBalanceAmount',
        width: 120,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.balance.status'),
        dataIndex: 'status',
        width: 100,
        type: 'status',
        align: 'center',
      },
      {
        title: i18next.t('modules.pages.balance.remark'),
        dataIndex: 'remark',
        width: 180,
      },
    ],
    data: [],
    buildOverview: (rows) => [
      {
        label: i18next.t('modules.pages.balance.counterpartyCount'),
        value: formatInteger(rows.length),
      },
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
    statusMap: balanceStatusMap,
    rowHighlightStatuses: ['待确认', '待审核'],
  },
}
