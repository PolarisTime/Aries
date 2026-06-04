import i18next from 'i18next'
import { buildValueOptions } from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { formatAmount, formatInteger, statusMap, sumBy } from './shared'

const balanceStatusMap = {
  ...statusMap,
  应收: {
    text: i18next.t('modules.pages.balance.receivable'),
    color: 'processing' as const,
  },
  应付: {
    text: i18next.t('modules.pages.balance.payable'),
    color: 'warning' as const,
  },
  未结清: {
    text: i18next.t('modules.pages.balance.open'),
    color: 'warning' as const,
  },
  已结清: {
    text: i18next.t('modules.pages.balance.closed'),
    color: 'success' as const,
  },
  RECOGNITION: {
    text: i18next.t('modules.pages.balance.recognitionEntry'),
    color: 'processing' as const,
  },
  SETTLEMENT: {
    text: i18next.t('modules.pages.balance.settlementEntry'),
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
    quickFilters: [
      {
        key: 'all',
        label: i18next.t('modules.pages.balance.allBalances'),
        values: {},
      },
      {
        key: 'receivable',
        label: i18next.t('modules.pages.balance.receivable'),
        values: { direction: '应收' },
      },
      {
        key: 'payable',
        label: i18next.t('modules.pages.balance.payable'),
        values: { direction: '应付' },
      },
      {
        key: 'open',
        label: i18next.t('modules.pages.balance.open'),
        values: { status: '未结清' },
      },
      {
        key: 'closed',
        label: i18next.t('modules.pages.balance.closed'),
        values: { status: '已结清' },
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
        label: i18next.t('modules.pages.balance.settlementStatus'),
        type: 'select',
        options: buildValueOptions('未结清', '已结清'),
      },
    ],
    columns: [
      {
        title: i18next.t('modules.pages.balance.direction'),
        dataIndex: 'direction',
        width: 100,
        align: 'center',
        type: 'status',
      },
      {
        title: i18next.t('modules.pages.balance.counterpartyType'),
        dataIndex: 'counterpartyType',
        width: 110,
      },
      {
        title: i18next.t('modules.pages.balance.counterpartyCode'),
        dataIndex: 'counterpartyCode',
        width: 130,
      },
      {
        title: i18next.t('modules.pages.balance.counterparty'),
        dataIndex: 'counterpartyName',
        width: 160,
      },
      {
        title: i18next.t('modules.pages.balance.recognizedAmount'),
        dataIndex: 'recognizedAmount',
        width: 120,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.balance.settledAmount'),
        dataIndex: 'settledAmount',
        width: 120,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.balance.balanceAmount'),
        dataIndex: 'balanceAmount',
        width: 120,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.balance.days0To30Amount'),
        dataIndex: 'days0To30Amount',
        width: 120,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.balance.days31To60Amount'),
        dataIndex: 'days31To60Amount',
        width: 120,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.balance.days61To90Amount'),
        dataIndex: 'days61To90Amount',
        width: 120,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.balance.daysOver90Amount'),
        dataIndex: 'daysOver90Amount',
        width: 120,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.balance.entryCount'),
        dataIndex: 'entryCount',
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
        label: i18next.t('modules.pages.balance.counterpartyCode'),
        key: 'counterpartyCode',
      },
      {
        label: i18next.t('modules.pages.balance.counterparty'),
        key: 'counterpartyName',
      },
      {
        label: i18next.t('modules.pages.balance.recognizedAmount'),
        key: 'recognizedAmount',
        type: 'amount',
      },
      {
        label: i18next.t('modules.pages.balance.settledAmount'),
        key: 'settledAmount',
        type: 'amount',
      },
      {
        label: i18next.t('modules.pages.balance.balanceAmount'),
        key: 'balanceAmount',
        type: 'amount',
      },
      {
        label: i18next.t('modules.pages.balance.days0To30Amount'),
        key: 'days0To30Amount',
        type: 'amount',
      },
      {
        label: i18next.t('modules.pages.balance.days31To60Amount'),
        key: 'days31To60Amount',
        type: 'amount',
      },
      {
        label: i18next.t('modules.pages.balance.days61To90Amount'),
        key: 'days61To90Amount',
        type: 'amount',
      },
      {
        label: i18next.t('modules.pages.balance.daysOver90Amount'),
        key: 'daysOver90Amount',
        type: 'amount',
      },
      {
        label: i18next.t('modules.pages.balance.entryCount'),
        key: 'entryCount',
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
        title: i18next.t('modules.pages.balance.entryRole'),
        dataIndex: 'entryRole',
        width: 120,
        align: 'center',
        type: 'status',
      },
      {
        title: i18next.t('modules.pages.balance.sourceType'),
        dataIndex: 'sourceType',
        width: 110,
      },
      {
        title: i18next.t('modules.pages.balance.documentNo'),
        dataIndex: 'documentNo',
        width: 170,
      },
      {
        title: i18next.t('modules.pages.balance.sourceNo'),
        dataIndex: 'sourceNo',
        width: 160,
      },
      {
        title: i18next.t('modules.pages.balance.project'),
        dataIndex: 'projectName',
        width: 160,
      },
      {
        title: i18next.t('modules.pages.balance.accountingDate'),
        dataIndex: 'accountingDate',
        width: 120,
        type: 'date',
      },
      {
        title: i18next.t('modules.pages.balance.dueDate'),
        dataIndex: 'dueDate',
        width: 120,
        type: 'date',
      },
      {
        title: i18next.t('modules.pages.balance.debitAmount'),
        dataIndex: 'debitAmount',
        width: 120,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.balance.creditAmount'),
        dataIndex: 'creditAmount',
        width: 120,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.balance.entryBalanceAmount'),
        dataIndex: 'balanceAmount',
        width: 120,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.balance.ageDays'),
        dataIndex: 'ageDays',
        width: 100,
        align: 'right',
        type: 'count',
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
    rowHighlightStatuses: ['未结清'],
  },
}
