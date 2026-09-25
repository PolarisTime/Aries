import {
  AccountBookOutlined,
  AuditOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { Alert, Divider, Flex, Typography, theme } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  type CustomerData,
  digitToChineseUppercase,
  fmtMoney,
  type ReceiptMode,
} from './receipt-reconcile-model'
import { DashboardStat } from './receipt-reconcile-support'

export function ReceiptModeNotice({
  amount,
  customerName,
  mode,
}: {
  amount: number
  customerName: string
  mode: Exclude<ReceiptMode, 'reconcile'>
}) {
  const { t } = useTranslation()
  return (
    <Alert
      className="mt-4"
      type="info"
      showIcon
      icon={<InfoCircleOutlined />}
      title={
        mode === 'prepaid'
          ? t('receiptReconcile.prepaidDepositOption')
          : t('receiptReconcile.performanceDepositOption')
      }
      description={
        mode === 'prepaid'
          ? t('receiptReconcile.prepaidDepositDesc', {
              amount: fmtMoney(amount),
              name: customerName,
            })
          : t('receiptReconcile.performanceDepositDesc', {
              amount: fmtMoney(amount),
              name: customerName,
            })
      }
    />
  )
}

export function ReceiptCustomerOverviewCard({
  customer,
}: {
  customer: CustomerData
}) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  return (
    <div
      className="rounded-lg p-4"
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
    >
      <Flex align="center" gap={8} className="mb-3">
        <AuditOutlined />
        <span className="font-semibold">
          {t('receiptReconcile.customerOverview')}
        </span>
      </Flex>
      <Flex vertical gap={10}>
        <DashboardStat
          label={t('receiptReconcile.creditTerm')}
          value={customer.creditTerm}
        />
        <DashboardStat
          label={t('receiptReconcile.reconciledUnsettled')}
          value={`¥${fmtMoney(customer.totalOutstanding)}`}
          danger
        />
        <DashboardStat
          label={t('receiptReconcile.overdueAmount')}
          value={`¥${fmtMoney(customer.overdueAmount)}`}
          danger={customer.overdueAmount > 0}
        />
        <DashboardStat
          label={t('receiptReconcile.inTransitUnreconciled')}
          value={`¥${fmtMoney(customer.inTransitAmount)}`}
        />
      </Flex>
    </div>
  )
}

export function ReceiptSettlementPreviewCard({
  amount,
  remainingDebt,
  toPrepaid,
  totalAllocated,
}: {
  amount: number
  remainingDebt: number
  toPrepaid: number
  totalAllocated: number
}) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  return (
    <div
      className="rounded-lg p-4 text-white"
      style={{
        background:
          'linear-gradient(135deg, var(--ant-color-primary, #1677ff) 0%, var(--ant-cyan-7, #08979c) 100%)',
      }}
    >
      <Flex align="center" gap={8} className="mb-3">
        <AccountBookOutlined />
        <span className="font-semibold">
          {t('receiptReconcile.settlementPreview')}
        </span>
      </Flex>
      <Flex vertical gap={10}>
        {[
          {
            label: t('receiptReconcile.receivedAmount'),
            value: fmtMoney(amount),
          },
          {
            label: t('receiptReconcile.offsetStatementTotal'),
            value: fmtMoney(totalAllocated),
          },
          {
            label: t('receiptReconcile.overpaymentToPrepaid'),
            value: fmtMoney(toPrepaid),
          },
          {
            label: t('receiptReconcile.remainingDebt'),
            value: fmtMoney(remainingDebt),
          },
        ].map((item) => (
          <Flex key={item.label} justify="space-between" align="center">
            <span style={{ opacity: 0.85 }}>{item.label}</span>
            <Typography.Text
              strong
              style={{
                color: token.colorTextLightSolid,
                fontSize: token.fontSizeLG,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {item.value}
            </Typography.Text>
          </Flex>
        ))}
      </Flex>
      <Divider
        style={{
          borderColor:
            'color-mix(in srgb, var(--ant-color-text-light-solid, #fff) 30%, transparent)',
          margin: '12px 0 0',
        }}
      />
      <div
        className="mt-2"
        style={{ fontSize: token.fontSizeSM, opacity: 0.85 }}
      >
        {t('receiptReconcile.rmbPrefix')}
        {digitToChineseUppercase(amount ?? 0)}
      </div>
    </div>
  )
}

export function ReceiptAttachmentNotice({
  attachmentCount,
}: {
  attachmentCount: number
}) {
  const { t } = useTranslation()
  return (
    <Alert
      type={attachmentCount > 0 ? 'success' : 'info'}
      showIcon
      title={
        attachmentCount > 0
          ? t('receiptReconcile.uploadedEReceipts', {
              count: attachmentCount,
            })
          : t('receiptReconcile.suggestUploadEReceipt')
      }
    />
  )
}
