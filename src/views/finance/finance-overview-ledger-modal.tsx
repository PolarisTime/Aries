import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Empty, Modal, Space, Table, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { getCashLedger } from '@/api/finance/cash-ledger'
import type { FinanceBalance } from '@/api/finance/finance-overview'
import { DocumentReferencePopover } from '@/components/DocumentReferencePopover'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  buildCounterpartyLedgerQuery,
  COUNTERPARTY_LEDGER_EMPTY_DESCRIPTION,
} from './finance-overview-support'

export function FinanceCounterpartyLedgerModal({
  balance,
  formatAmount,
  onClose,
  open,
}: {
  balance: FinanceBalance | null
  formatAmount: (value: number | undefined) => string
  onClose: () => void
  open: boolean
}) {
  const { t } = useTranslation()
  const queryParams = balance
    ? buildCounterpartyLedgerQuery(balance)
    : undefined
  const query = useQuery({
    queryKey: QUERY_KEYS.counterpartyLedger(String(balance?.key ?? '')),
    queryFn: ({ signal }) => {
      if (!queryParams) {
        throw new Error(t('receiptReconcile.missingCounterparty'))
      }
      return getCashLedger(queryParams, signal)
    },
    enabled: open && Boolean(balance),
  })
  const rows = query.data?.page.content || []
  return (
    <Modal
      centered
      destroyOnHidden
      footer={null}
      open={open}
      onCancel={onClose}
      title={
        <Space size={8}>
          <span>
            {balance
              ? t('receiptReconcile.ledgerTitle', {
                  name: balance.counterpartyName,
                })
              : t('receiptReconcile.ledgerDetail')}
          </span>
          <Tag color="blue">{t('receiptReconcile.flowTitle')}</Tag>
        </Space>
      }
      width={960}
    >
      {query.isError ? (
        <Alert
          type="error"
          showIcon
          title={t('receiptReconcile.loadLedgerFailed')}
          action={
            <Button onClick={() => void query.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : (
        <Table
          size="small"
          rowKey="key"
          loading={query.isFetching}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 760, y: 520 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={COUNTERPARTY_LEDGER_EMPTY_DESCRIPTION}
              />
            ),
          }}
          columns={[
            {
              title: t('receiptReconcile.date'),
              dataIndex: 'businessDate',
              width: 110,
            },
            {
              title: t('receiptReconcile.flowType'),
              dataIndex: 'flowType',
              width: 100,
            },
            {
              title: t('receiptReconcile.documentNo'),
              dataIndex: 'documentNo',
              width: 160,
              render: (value: string, record: { documentId?: string }) => (
                <DocumentReferencePopover
                  value={{ documentNo: value, id: record.documentId }}
                  moduleKey={
                    balance?.counterpartyType === '客户' ? 'receipt' : 'payment'
                  }
                  documentLabel={t('receiptReconcile.document')}
                />
              ),
            },
            {
              title: t('receiptReconcile.income'),
              dataIndex: 'incomeAmount',
              align: 'right' as const,
              width: 120,
              render: formatAmount,
            },
            {
              title: t('receiptReconcile.expense'),
              dataIndex: 'expenseAmount',
              align: 'right' as const,
              width: 120,
              render: formatAmount,
            },
          ]}
        />
      )}
    </Modal>
  )
}
