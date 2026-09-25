import type { TableColumnsType } from 'antd'
import { Button, Space } from 'antd'
import type { TFunction } from 'i18next'
import type {
  FinanceBalance,
  FinanceDirection,
} from '@/api/finance/finance-overview'

function displayText(value: unknown): string {
  const text = String(value ?? '').trim()
  return text || '--'
}

export function buildBalanceColumns(
  t: TFunction,
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
      title: t('financeDetail.counterpartyTypeShort'),
      dataIndex: 'counterpartyType',
      width: 100,
      fixed: 'left',
    },
    {
      title: t('financeDetail.counterpartyCode'),
      dataIndex: 'counterpartyCode',
      width: 175,
      ellipsis: true,
      render: displayText,
    },
    {
      title: t('financeDetail.counterparty'),
      dataIndex: 'counterpartyName',
      width: 220,
      ellipsis: true,
      render: displayText,
    },
    {
      title:
        direction === 'RECEIVABLE'
          ? t('financeDetail.receivableYuan')
          : t('financeDetail.payableYuan'),
      dataIndex: 'recognizedAmount',
      width: 150,
      align: 'right',
      render: formatAmount,
    },
    {
      title:
        direction === 'RECEIVABLE'
          ? t('financeDetail.receivedYuan')
          : t('financeDetail.paidYuan'),
      dataIndex: 'settledAmount',
      width: 150,
      align: 'right',
      render: formatAmount,
    },
    {
      title:
        direction === 'RECEIVABLE'
          ? t('financeDetail.unreceivedYuan')
          : t('financeDetail.unpaidYuan'),
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
      title:
        direction === 'RECEIVABLE'
          ? t('financeDetail.prepaidYuan')
          : t('financeDetail.prepaymentYuan'),
      dataIndex: 'advanceAmount',
      width: 150,
      align: 'right',
      render: formatAmount,
    },
    {
      title: t('financeDetail.settlementCompany'),
      dataIndex: 'settlementCompanyName',
      width: 180,
      ellipsis: true,
      render: displayText,
    },
    {
      title: t('financeDetail.action'),
      key: 'actions',
      fixed: 'right',
      width: 210,
      render: (_value, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => onLedger(record)}>
            {t('financeDetail.ledgerDetail')}
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
            {direction === 'RECEIVABLE'
              ? t('financeDetail.goReceipt')
              : t('financeDetail.goPayment')}
          </Button>
        </Space>
      ),
    },
  ]
}
