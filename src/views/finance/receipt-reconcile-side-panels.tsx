import {
  AccountBookOutlined,
  AuditOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { Alert, Divider, Flex, Typography, theme } from 'antd'
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
  return (
    <Alert
      className="mt-4"
      type="info"
      showIcon
      icon={<InfoCircleOutlined />}
      title={mode === 'prepaid' ? '款项全额转预收定金' : '款项计入履约保证金'}
      description={
        mode === 'prepaid'
          ? `实收 ${fmtMoney(amount)} 元将全额转入「${customerName}」的预收定金账户，后续可在出货结算时按单冲抵，不参与本期对账单核销。`
          : `实收 ${fmtMoney(amount)} 元将作为「${customerName}」的履约保证金暂存，待合作期满或合同履约完成后统一退还或抵扣。`
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
  return (
    <div
      className="rounded-lg p-4"
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
    >
      <Flex align="center" gap={8} className="mb-3">
        <AuditOutlined />
        <span className="font-semibold">客户对账全景</span>
      </Flex>
      <Flex vertical gap={10}>
        <DashboardStat label="合作账期规则" value={customer.creditTerm} />
        <DashboardStat
          label="已对账未结清总额"
          value={`¥${fmtMoney(customer.totalOutstanding)}`}
          danger
        />
        <DashboardStat
          label="其中逾期金额"
          value={`¥${fmtMoney(customer.overdueAmount)}`}
          danger={customer.overdueAmount > 0}
        />
        <DashboardStat
          label="在途送货未对账"
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
  return (
    <div
      className="rounded-lg p-4 text-white"
      style={{
        background: `linear-gradient(135deg, ${token.colorPrimary} 0%, #08979c 100%)`,
      }}
    >
      <Flex align="center" gap={8} className="mb-3">
        <AccountBookOutlined />
        <span className="font-semibold">动态核销试算</span>
      </Flex>
      <Flex vertical gap={10}>
        {[
          { label: '实收金额', value: fmtMoney(amount) },
          {
            label: '冲抵对账单总计',
            value: fmtMoney(totalAllocated),
          },
          { label: '多收差额（转预收）', value: fmtMoney(toPrepaid) },
          {
            label: '核销后客户剩余欠款',
            value: fmtMoney(remainingDebt),
          },
        ].map((item) => (
          <Flex key={item.label} justify="space-between" align="center">
            <span style={{ opacity: 0.85 }}>{item.label}</span>
            <Typography.Text
              strong
              style={{
                color: '#fff',
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
          borderColor: 'rgba(255,255,255,0.3)',
          margin: '12px 0 0',
        }}
      />
      <div
        className="mt-2"
        style={{ fontSize: token.fontSizeSM, opacity: 0.85 }}
      >
        人民币{digitToChineseUppercase(amount ?? 0)}
      </div>
    </div>
  )
}

export function ReceiptAttachmentNotice({
  attachmentCount,
}: {
  attachmentCount: number
}) {
  return (
    <Alert
      type={attachmentCount > 0 ? 'success' : 'info'}
      showIcon
      title={
        attachmentCount > 0
          ? `已上传电子回单 ${attachmentCount} 份`
          : '建议上传银行电子回单作为核销凭证'
      }
    />
  )
}
