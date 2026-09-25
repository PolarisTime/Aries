import {
  AccountBookOutlined,
  PayCircleOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Button, Flex, Segmented, Space, Tag, Typography, theme } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ReceiptMode } from './receipt-reconcile-model'

export function ReceiptReconcileHeader({
  mode,
  onModeChange,
}: {
  mode: ReceiptMode
  onModeChange: (mode: ReceiptMode) => void
}) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  return (
    <Flex align="center" gap={12}>
      <Tag color="default">{t('receiptReconcile.draft')}</Tag>
      <span className="font-semibold">{t('receiptReconcile.workbench')}</span>
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
            label: t('receiptReconcile.writeOffStatement'),
            value: 'reconcile',
            icon: <AccountBookOutlined />,
          },
          {
            label: t('receiptReconcile.saveAsPrepaid'),
            value: 'prepaid',
            icon: <PayCircleOutlined />,
          },
          {
            label: t('receiptReconcile.performanceDeposit'),
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
  const { t } = useTranslation()
  return (
    <Flex justify="space-between" align="center">
      <Space size={16}>
        <Typography.Text type="secondary">
          <UserOutlined /> {t('receiptReconcile.operator')}：财务部 · 陈明
        </Typography.Text>
        <Typography.Text
          type="secondary"
          style={{ fontSize: token.fontSizeSM }}
        >
          {t('receiptReconcile.shortcutSubmit', {
            keys: 'Ctrl + Enter',
          })}
        </Typography.Text>
      </Space>
      <Space>
        <Button onClick={onSaveDraft} loading={submitting}>
          {t('receiptReconcile.saveDraft')}
        </Button>
        <Button type="primary" loading={submitting} onClick={onSubmit}>
          {t('receiptReconcile.confirmReceipt')}
        </Button>
      </Space>
    </Flex>
  )
}
