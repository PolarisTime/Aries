import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Empty, Modal, Space, Table, Tag } from 'antd'
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
  const queryParams = balance
    ? buildCounterpartyLedgerQuery(balance)
    : undefined
  const query = useQuery({
    queryKey: QUERY_KEYS.counterpartyLedger(String(balance?.key ?? '')),
    queryFn: ({ signal }) => {
      if (!queryParams) {
        throw new Error('缺少往来方信息')
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
            {balance ? `${balance.counterpartyName} · 对账明细` : '对账明细'}
          </span>
          <Tag color="blue">资金流水</Tag>
        </Space>
      }
      width={960}
    >
      {query.isError ? (
        <Alert
          type="error"
          showIcon
          title="加载对账明细失败"
          action={<Button onClick={() => void query.refetch()}>重试</Button>}
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
            { title: '日期', dataIndex: 'businessDate', width: 110 },
            { title: '流水类型', dataIndex: 'flowType', width: 100 },
            {
              title: '单号',
              dataIndex: 'documentNo',
              width: 160,
              render: (value: string, record: { documentId?: string }) => (
                <DocumentReferencePopover
                  value={{ documentNo: value, id: record.documentId }}
                  moduleKey={
                    balance?.counterpartyType === '客户' ? 'receipt' : 'payment'
                  }
                  documentLabel="单据"
                />
              ),
            },
            {
              title: '收入',
              dataIndex: 'incomeAmount',
              align: 'right' as const,
              width: 120,
              render: formatAmount,
            },
            {
              title: '支出',
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
