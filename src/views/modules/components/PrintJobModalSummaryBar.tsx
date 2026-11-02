import { Flex, Typography, theme } from 'antd'

export interface PrintJobSummaryInfoItem {
  label: string
  value: string
  maxWidth?: number
}

export interface PrintJobSummaryTotalItem {
  label: string
  value: string
}

interface Props {
  /** 单据信息行（日期/备注/结算主体等），由模块布局决定有哪些。 */
  infoItems: PrintJobSummaryInfoItem[]
  /** 合计项（件数/重量/金额等），由模块布局决定有哪些。 */
  totals: PrintJobSummaryTotalItem[]
}

/**
 * 打印作业弹窗的汇总条。
 *
 * <p>字段清单全部由 `utils/print-job-layout` 的模块布局提供，组件只负责排版：
 * 不同单据类型的汇总条内容不同（商品单据看件数/重量、收付款看金额、物流看总运费），
 * 不再在组件里按 moduleKey 判断。</p>
 */
export function PrintJobModalSummaryBar({ infoItems, totals }: Props) {
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
        {infoItems.map((item) => (
          <SummaryInfo
            key={item.label}
            label={item.label}
            value={item.value}
            valueMaxWidth={item.maxWidth ?? 240}
          />
        ))}
      </Flex>
      <Flex align="center" gap="large" wrap="wrap">
        {totals.map((total) => (
          <span key={total.label} className="whitespace-nowrap">
            <Typography.Text type="secondary">{total.label}：</Typography.Text>
            <Typography.Text strong style={{ color: token.colorPrimary }}>
              {total.value}
            </Typography.Text>
          </span>
        ))}
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
