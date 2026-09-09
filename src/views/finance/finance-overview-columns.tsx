import type { TableColumnsType } from 'antd'
import { Button, Space } from 'antd'
import type {
  FinanceBalance,
  FinanceDirection,
} from '@/api/finance/finance-overview'

function displayText(value: unknown): string {
  const text = String(value ?? '').trim()
  return text || '--'
}

export function buildBalanceColumns(
  direction: FinanceDirection,
  formatAmount: (value: number | undefined) => string,
  onLedger: (record: FinanceBalance) => void,
  onQuickCreate: (
    record: FinanceBalance,
    moduleKey: 'receipt' | 'payment',
  ) => void,
): TableColumnsType<FinanceBalance> {
  return [
    {
      title: '往来类型',
      dataIndex: 'counterpartyType',
      width: 100,
      fixed: 'left',
    },
    {
      title: '往来方编码',
      dataIndex: 'counterpartyCode',
      width: 175,
      ellipsis: true,
      render: displayText,
    },
    {
      title: '往来方',
      dataIndex: 'counterpartyName',
      width: 220,
      ellipsis: true,
      render: displayText,
    },
    {
      title: direction === 'RECEIVABLE' ? '应收 (元)' : '应付 (元)',
      dataIndex: 'recognizedAmount',
      width: 150,
      align: 'right',
      render: formatAmount,
    },
    {
      title: direction === 'RECEIVABLE' ? '已收 (元)' : '已付 (元)',
      dataIndex: 'settledAmount',
      width: 150,
      align: 'right',
      render: formatAmount,
    },
    {
      title: direction === 'RECEIVABLE' ? '未收 (元)' : '未付 (元)',
      dataIndex: 'outstandingAmount',
      width: 150,
      align: 'right',
      render: (value) => {
        const amount = Number(value ?? 0)
        return (
          <span
            className={
              amount > 0 ? 'finance-overview-outstanding-value' : undefined
            }
          >
            {formatAmount(value)}
          </span>
        )
      },
    },
    {
      title: direction === 'RECEIVABLE' ? '预收 (元)' : '预付 (元)',
      dataIndex: 'advanceAmount',
      width: 150,
      align: 'right',
      render: formatAmount,
    },
    {
      title: '结算主体',
      dataIndex: 'settlementCompanyName',
      width: 180,
      ellipsis: true,
      render: displayText,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 210,
      render: (_value, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => onLedger(record)}>
            对账明细
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() =>
              onQuickCreate(
                record,
                direction === 'RECEIVABLE' ? 'receipt' : 'payment',
              )
            }
          >
            {direction === 'RECEIVABLE' ? '去收款' : '去付款'}
          </Button>
        </Space>
      ),
    },
  ]
}
