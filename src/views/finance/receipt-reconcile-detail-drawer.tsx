import {
  Descriptions,
  Drawer,
  Flex,
  Space,
  Table,
  Typography,
  theme,
} from 'antd'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  return (
    <Drawer
      title={
        <Space size={8}>
          <span>
            {t('receiptReconcile.detailTitle')} · {statement?.statementNo}
          </span>
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
                label: t('receiptReconcile.period'),
                children: `${statement.periodStart} ~ ${statement.periodEnd}`,
              },
              {
                key: 'due',
                label: t('receiptReconcile.dueDate'),
                children: statement.dueDate,
              },
              {
                key: 'total',
                label: t('receiptReconcile.totalAmount'),
                children: `¥${fmtMoney(statement.totalAmount)}`,
              },
              {
                key: 'out',
                label: t('receiptReconcile.outstanding'),
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
                title: t('receiptReconcile.slipNo'),
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
                title: t('receiptReconcile.productSpec'),
                render: (_, r) => `${r.productName} ${r.spec}`,
              },
              {
                title: t('receiptReconcile.netWeightTon'),
                dataIndex: 'netWeight',
                align: 'right',
                render: (v: number) => v.toFixed(2),
              },
              {
                title: t('receiptReconcile.unitPrice'),
                dataIndex: 'unitPrice',
                align: 'right',
                render: (v: number) => fmtMoney(v),
              },
              {
                title: t('receiptReconcile.subtotal'),
                dataIndex: 'subtotal',
                align: 'right',
                render: (v: number) => fmtMoney(v),
              },
              {
                title: t('receiptReconcile.deductionNote'),
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
