import {
  AccountBookOutlined,
  PayCircleOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Button, Flex, Segmented, Space, Tag, Typography, theme } from 'antd'
import type { ReceiptMode } from './receipt-reconcile-model'

export function ReceiptReconcileHeader({
  mode,
  onModeChange,
}: {
  mode: ReceiptMode
  onModeChange: (mode: ReceiptMode) => void
}) {
  const { token } = theme.useToken()
  return (
    <Flex align="center" gap={12}>
      <Tag color="default">草稿</Tag>
      <span className="font-semibold">收款核销工作台</span>
      <Typography.Text
        type="secondary"
        style={{
          fontFamily: token.fontFamilyCode,
          fontSize: token.fontSizeSM,
        }}
      >
        REC-20260909-088
      </Typography.Text>
      <Segmented
        value={mode}
        onChange={(v) => onModeChange(v as ReceiptMode)}
        options={[
          {
            label: '核销客户对账单',
            value: 'reconcile',
            icon: <AccountBookOutlined />,
          },
          {
            label: '直接存为预收定金',
            value: 'prepaid',
            icon: <PayCircleOutlined />,
          },
          {
            label: '履约保证金',
            value: 'deposit',
            icon: <SafetyCertificateOutlined />,
          },
        ]}
      />
    </Flex>
  )
}

export function ReceiptReconcileFooter({
  onSaveDraft,
  onSubmit,
  submitting,
}: {
  onSaveDraft: () => void
  onSubmit: () => void
  submitting: boolean
}) {
  const { token } = theme.useToken()
  return (
    <Flex justify="space-between" align="center">
      <Space size={16}>
        <Typography.Text type="secondary">
          <UserOutlined /> 经办人：财务部 · 陈明
        </Typography.Text>
        <Typography.Text
          type="secondary"
          style={{ fontSize: token.fontSizeSM }}
        >
          快捷键 <kbd>Ctrl</kbd> + <kbd>Enter</kbd> 提交
        </Typography.Text>
      </Space>
      <Space>
        <Button onClick={onSaveDraft} loading={submitting}>
          存为草稿
        </Button>
        <Button type="primary" loading={submitting} onClick={onSubmit}>
          确认收款并核销
        </Button>
      </Space>
    </Flex>
  )
}
