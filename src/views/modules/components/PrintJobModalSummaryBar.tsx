import { Flex, Typography, theme } from 'antd'
import { useTranslation } from 'react-i18next'
import { formattedTotal } from '@/views/modules/components/print-job-modal-format'

interface Props {
  recordDeliveryDate: string
  recordRemark: string
  settlementCompanyName: string
  totalQuantity: number | null
  totalWeight: number | null
}

/** 打印作业弹窗的汇总条：交货日期、备注、结算公司与合计件数/重量。 */
export function PrintJobModalSummaryBar({
  recordDeliveryDate,
  recordRemark,
  settlementCompanyName,
  totalQuantity,
  totalWeight,
}: Props) {
  const { t } = useTranslation()
  const { token } = theme.useToken()

  return (
    <Flex
      justify="space-between"
      align="center"
      gap="small"
      wrap="wrap"
      style={{
        background: token.colorFillQuaternary,
        borderRadius: token.borderRadiusSM,
        paddingBlock: token.paddingXS,
        paddingInline: token.paddingSM,
      }}
    >
      <Flex align="center" gap="middle" wrap="wrap" style={{ minWidth: 0 }}>
        <SummaryInfo
          label={t('modules.print.deliveryDate')}
          value={recordDeliveryDate}
          valueMaxWidth={160}
        />
        <SummaryInfo
          label={t('modules.print.recordRemark')}
          value={recordRemark}
          valueMaxWidth={320}
        />
        <SummaryInfo
          label={t('modules.print.currentSettlementCompany')}
          value={settlementCompanyName}
          valueMaxWidth={280}
        />
      </Flex>
      <Flex align="center" gap="large" wrap="wrap">
        <span className="whitespace-nowrap">
          <Typography.Text type="secondary">
            {t('modules.print.totalQuantity')}：
          </Typography.Text>
          <Typography.Text strong style={{ color: token.colorPrimary }}>
            {formattedTotal(totalQuantity, 0)}
          </Typography.Text>
        </span>
        <span className="whitespace-nowrap">
          <Typography.Text type="secondary">
            {t('modules.print.totalWeight')}：
          </Typography.Text>
          <Typography.Text strong style={{ color: token.colorPrimary }}>
            {formattedTotal(totalWeight)}
          </Typography.Text>
        </span>
      </Flex>
    </Flex>
  )
}

interface SummaryInfoProps {
  label: string
  value: string
  valueMaxWidth: number
}

/** 汇总条内的“标签：值”项，长文本单行截断并悬浮提示。 */
function SummaryInfo({ label, value, valueMaxWidth }: SummaryInfoProps) {
  return (
    <span className="inline-flex items-center whitespace-nowrap">
      <Typography.Text type="secondary">{label}：</Typography.Text>
      <Typography.Text
        ellipsis={{ tooltip: true }}
        style={{ maxWidth: valueMaxWidth }}
      >
        {value}
      </Typography.Text>
    </span>
  )
}
