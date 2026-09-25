import {
  AccountBookOutlined,
  ClearOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import {
  Alert,
  Button,
  Flex,
  InputNumber,
  Space,
  Table,
  Typography,
  theme,
} from 'antd'
import type { Dispatch, Key, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { fmtMoney, type StatementItem } from './receipt-reconcile-model'
import { StatementStatusTag } from './receipt-reconcile-support'

export function ReceiptStatementSection({
  amount,
  allocations,
  customerName,
  onAllocationsChange,
  onClearAllocations,
  onFifoAllocate,
  onOpenStatement,
  onSelectedKeysChange,
  selectedKeys,
  selectedKeySet,
  statements,
  totalAllocated,
}: {
  amount: number
  allocations: Record<string, number>
  customerName: string
  onAllocationsChange: Dispatch<SetStateAction<Record<string, number>>>
  onClearAllocations: () => void
  onFifoAllocate: () => void
  onOpenStatement: (statement: StatementItem) => void
  onSelectedKeysChange: (keys: Key[]) => void
  selectedKeys: Key[]
  selectedKeySet: Set<Key>
  statements: StatementItem[]
  totalAllocated: number
}) {
  const { token } = theme.useToken()
  const { t } = useTranslation()

  const columns: TableColumnsType<StatementItem> = [
    {
      title: t('receiptReconcile.statementNo'),
      dataIndex: 'statementNo',
      width: 170,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          style={{ paddingInline: 0, fontFamily: token.fontFamilyCode }}
          onClick={() => onOpenStatement(record)}
        >
          {record.statementNo}
        </Button>
      ),
    },
    {
      title: t('receiptReconcile.period'),
      width: 130,
      render: (_, record) => (
        <Typography.Text style={{ fontSize: token.fontSizeSM }}>
          {record.periodStart.slice(5)} ~ {record.periodEnd.slice(5)}
        </Typography.Text>
      ),
    },
    {
      title: t('receiptReconcile.status'),
      width: 110,
      render: (_, record) => <StatementStatusTag statement={record} />,
    },
    {
      title: t('receiptReconcile.totalAmount'),
      dataIndex: 'totalAmount',
      align: 'right',
      width: 110,
      render: (v: number) => fmtMoney(v),
    },
    {
      title: t('receiptReconcile.outstanding'),
      dataIndex: 'outstandingAmount',
      align: 'right',
      width: 120,
      render: (v: number) => (
        <Typography.Text strong style={{ color: token.colorWarning }}>
          {fmtMoney(v)}
        </Typography.Text>
      ),
    },
    {
      title: t('receiptReconcile.offsetThisTime'),
      dataIndex: 'allocation',
      align: 'right',
      width: 160,
      render: (_, record) => {
        const value = allocations[record.id]
        const overflow = (value ?? 0) > record.outstandingAmount
        return (
          <Flex vertical align="flex-end" gap={2}>
            <InputNumber
              size="small"
              min={0}
              max={record.outstandingAmount}
              precision={2}
              status={overflow ? 'error' : undefined}
              value={value}
              disabled={!selectedKeySet.has(record.id)}
              placeholder="0.00"
              style={{ width: 140, fontFamily: token.fontFamilyCode }}
              onChange={(v) =>
                onAllocationsChange((prev) => ({
                  ...prev,
                  [record.id]: v ?? 0,
                }))
              }
            />
            {overflow && (
              <Typography.Text
                type="danger"
                style={{ fontSize: token.fontSizeSM }}
              >
                {t('receiptReconcile.overOutstanding', {
                  amount: fmtMoney((value ?? 0) - record.outstandingAmount),
                })}
              </Typography.Text>
            )}
          </Flex>
        )
      },
    },
  ]

  return (
    <div
      className="rounded-lg p-3"
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
    >
      <Flex justify="space-between" align="center" className="mb-2">
        <Flex align="center" gap={8}>
          <AccountBookOutlined />
          <span className="font-semibold">
            {t('receiptReconcile.pendingStatements')}
          </span>
          <Typography.Text
            type="secondary"
            style={{ fontSize: token.fontSizeSM }}
          >
            {t('receiptReconcile.unsettledPeriods', {
              name: customerName,
              count: statements.length,
            })}
          </Typography.Text>
        </Flex>
        <Space size={8}>
          <Button
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={onFifoAllocate}
          >
            {t('receiptReconcile.fifoAllocate')}
          </Button>
          <Button
            size="small"
            icon={<ClearOutlined />}
            onClick={onClearAllocations}
          >
            {t('receiptReconcile.clearAllocations')}
          </Button>
        </Space>
      </Flex>
      <Table<StatementItem>
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={statements}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys) => onSelectedKeysChange(keys),
        }}
        summary={(data) => {
          const total = data.reduce((s, r) => s + r.outstandingAmount, 0)
          return (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}>
                  <Typography.Text strong>
                    {t('receiptReconcile.totalUnsettled')}
                  </Typography.Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Typography.Text strong>{fmtMoney(total)}</Typography.Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Typography.Text
                    strong
                    type={totalAllocated > amount ? 'danger' : undefined}
                  >
                    {fmtMoney(totalAllocated)}
                  </Typography.Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )
        }}
      />
      {totalAllocated > amount && (
        <Alert
          className="mt-2"
          type="warning"
          showIcon
          title={t('receiptReconcile.overAllocatedHint', {
            total: fmtMoney(totalAllocated),
            amount: fmtMoney(amount),
          })}
        />
      )}
    </div>
  )
}
