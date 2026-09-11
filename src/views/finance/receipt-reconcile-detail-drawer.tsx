import {
  Descriptions,
  Drawer,
  Flex,
  Space,
  Table,
  Typography,
  theme,
} from 'antd'
import {
  fmtMoney,
  type StatementItem,
  type WeighSlipItem,
} from './receipt-reconcile-model'
import { StatementStatusTag } from './receipt-reconcile-support'

export function ReceiptDetailDrawer({
  onClose,
  statement,
}: {
  onClose: () => void
  statement: StatementItem | null
}) {
  const { token } = theme.useToken()
  return (
    <Drawer
      title={
        <Space size={8}>
          <span>对账单明细 · {statement?.statementNo}</span>
          {statement && <StatementStatusTag statement={statement} />}
        </Space>
      }
      size={640}
      open={Boolean(statement)}
      onClose={onClose}
      destroyOnHidden
    >
      {statement && (
        <Flex vertical gap={12}>
          <Descriptions
            size="small"
            column={2}
            items={[
              {
                key: 'period',
                label: '对账周期',
                children: `${statement.periodStart} ~ ${statement.periodEnd}`,
              },
              {
                key: 'due',
                label: '付款到期日',
                children: statement.dueDate,
              },
              {
                key: 'total',
                label: '对账总额',
                children: `¥${fmtMoney(statement.totalAmount)}`,
              },
              {
                key: 'out',
                label: '未结清待付',
                children: `¥${fmtMoney(statement.outstandingAmount)}`,
              },
            ]}
          />
          <Table<WeighSlipItem>
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={statement.details}
            columns={[
              {
                title: '磅单号',
                dataIndex: 'slipNo',
                render: (v: string) => (
                  <Typography.Text
                    style={{
                      fontFamily: token.fontFamilyCode,
                      fontSize: token.fontSizeSM,
                    }}
                  >
                    {v}
                  </Typography.Text>
                ),
              },
              {
                title: '品名规格',
                render: (_, r) => `${r.productName} ${r.spec}`,
              },
              {
                title: '净重(t)',
                dataIndex: 'netWeight',
                align: 'right',
                render: (v: number) => v.toFixed(2),
              },
              {
                title: '单价',
                dataIndex: 'unitPrice',
                align: 'right',
                render: (v: number) => fmtMoney(v),
              },
              {
                title: '小计',
                dataIndex: 'subtotal',
                align: 'right',
                render: (v: number) => fmtMoney(v),
              },
              {
                title: '扣减说明',
                dataIndex: 'deductionNote',
                render: (v?: string) =>
                  v ? (
                    <Typography.Text
                      type="warning"
                      style={{ fontSize: token.fontSizeSM }}
                    >
                      {v}
                    </Typography.Text>
                  ) : (
                    '-'
                  ),
              },
            ]}
            summary={(data) => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}>
                    <Typography.Text strong>合计</Typography.Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Typography.Text strong>
                      {fmtMoney(data.reduce((s, r) => s + r.subtotal, 0))}
                    </Typography.Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} />
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        </Flex>
      )}
    </Drawer>
  )
}
