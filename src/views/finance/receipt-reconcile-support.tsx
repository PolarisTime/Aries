import { Flex, Tag, Typography, theme } from 'antd'
import dayjs from 'dayjs'
import type { StatementItem } from './receipt-reconcile-model'

export function StatementStatusTag({
  statement,
}: {
  statement: StatementItem
}) {
  const overdueDays = dayjs().diff(dayjs(statement.dueDate), 'day')
  if (overdueDays > 0) {
    return (
      <Tag color="red" style={{ marginInlineEnd: 0 }}>
        逾期 {overdueDays} 天
      </Tag>
    )
  }
  return statement.signed ? (
    <Tag color="green" style={{ marginInlineEnd: 0 }}>
      双方已签章
    </Tag>
  ) : (
    <Tag color="gold" style={{ marginInlineEnd: 0 }}>
      待客户签章
    </Tag>
  )
}

export function DashboardStat({
  label,
  value,
  danger,
}: {
  label: string
  value: string
  danger?: boolean
}) {
  const { token } = theme.useToken()
  return (
    <Flex justify="space-between" align="center">
      <span
        style={{ color: token.colorTextSecondary, fontSize: token.fontSize }}
      >
        {label}
      </span>
      <Typography.Text
        strong
        type={danger ? 'danger' : undefined}
        style={{
          fontSize: token.fontSizeLG,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography.Text>
    </Flex>
  )
}
