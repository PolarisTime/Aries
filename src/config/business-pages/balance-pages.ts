import { buildValueOptions } from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { BILL_STATUS_LABEL } from './filter-labels'
import { formatAmount, formatInteger, statusMap, sumBy } from './shared'

export const balancePageConfigs: Record<string, ModulePageConfig> = {
  'receivable-payable': {
    key: 'receivable-payable',
    title: '应收应付',
    kicker: 'Finance',
    description:
      '应收应付页面先按客户、供应商、物流商统一展示余额结果，后续再叠加核销和账龄分析。',
    readOnly: true,
    actions: [{ key: 'export_balance', label: '导出余额表', type: 'primary' }],
    filters: [
      {
        key: 'direction',
        label: '方向',
        type: 'select',
        options: [
          { label: '应收', value: '应收' },
          { label: '应付', value: '应付' },
        ],
      },
      {
        key: 'counterpartyType',
        label: '往来类型',
        type: 'select',
        options: [
          { label: '客户', value: '客户' },
          { label: '供应商', value: '供应商' },
          { label: '物流商', value: '物流商' },
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
      { title: '方向', dataIndex: 'direction', width: 100 },
      { title: '往来类型', dataIndex: 'counterpartyType', width: 110 },
      { title: '往来单位', dataIndex: 'counterpartyName', width: 160 },
      {
        title: '期初余额',
        dataIndex: 'openingAmount',
        width: 110,
        align: 'right',
        type: 'amount',
      },
      {
        title: '本期发生',
        dataIndex: 'currentAmount',
        width: 110,
        align: 'right',
        type: 'amount',
      },
      {
        title: '本期结算',
        dataIndex: 'settledAmount',
        width: 110,
        align: 'right',
        type: 'amount',
      },
      {
        title: '期末余额',
        dataIndex: 'balanceAmount',
        width: 110,
        align: 'right',
        type: 'amount',
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 110,
        type: 'status',
        align: 'center',
      },
    ],
    detailFields: [
      { label: '方向', key: 'direction' },
      { label: '往来类型', key: 'counterpartyType' },
      { label: '往来单位', key: 'counterpartyName' },
      { label: '期初余额', key: 'openingAmount', type: 'amount' },
      { label: '本期发生', key: 'currentAmount', type: 'amount' },
      { label: '本期结算', key: 'settledAmount', type: 'amount' },
      { label: '期末余额', key: 'balanceAmount', type: 'amount' },
      { label: '状态', key: 'status', type: 'status' },
      { label: '备注', key: 'remark' },
    ],
    data: [],
    buildOverview: (rows) => [
      { label: '往来单位数', value: formatInteger(rows.length) },
      {
        label: '应收余额',
        value: formatAmount(
          sumBy(
            rows.filter((row) => row.direction === '应收'),
            'balanceAmount',
          ),
        ),
      },
      {
        label: '应付余额',
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
