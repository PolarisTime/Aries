import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MinusCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { Tag, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import { formatAmount } from '@/utils/formatters'
import type { NetPriceMatchState } from '../net-price-fill'
import { useNetPriceMatchStore } from '../net-price-match-store'

/** 各状态的图标与文案(图标 + 文字双通道, 不以颜色为唯一区分 —— WCAG 1.4.1)。 */
const STATE_META: Record<
  NetPriceMatchState,
  { color: string; icon: React.ReactNode; labelKey: string }
> = {
  MATCHED: {
    color: 'success',
    icon: <CheckCircleOutlined />,
    labelKey: 'modules.pages.salesOrder.netPriceMatchMatched',
  },
  MISMATCH: {
    color: 'warning',
    icon: <ExclamationCircleOutlined />,
    labelKey: 'modules.pages.salesOrder.netPriceMatchMismatch',
  },
  NO_PRICE: {
    color: 'default',
    icon: <MinusCircleOutlined />,
    labelKey: 'modules.pages.salesOrder.netPriceMatchNoPrice',
  },
  UNCHECKED: {
    color: 'default',
    icon: <QuestionCircleOutlined />,
    labelKey: 'modules.pages.salesOrder.netPriceMatchUnchecked',
  },
}

/**
 * 明细行内的「网价匹配」标识。
 *
 * <p>只订阅 {@link useNetPriceMatchStore} 里本行的结果, 因此核查/重查后行内标识会自行刷新,
 * 而**不需要**把状态写进明细行(避免把单据标脏、避免污染保存载荷)。</p>
 */
export function NetPriceMatchChip({ itemId }: { itemId: string }) {
  const { t } = useTranslation()
  const entry = useNetPriceMatchStore((state) => state.entries[itemId])
  const state: NetPriceMatchState = entry?.state ?? 'UNCHECKED'
  const meta = STATE_META[state]
  const label = t(meta.labelKey)
  const detail = describeEntry(t, entry, state)
  return (
    <Tooltip title={detail}>
      <Tag color={meta.color} icon={meta.icon} style={{ marginInlineEnd: 0 }}>
        {label}
      </Tag>
    </Tooltip>
  )
}

/** 悬浮说明: 说清"差在哪"(应有单价 vs 当前单价), 而不是只给一个状态词。 */
function describeEntry(
  t: (key: string, options?: Record<string, unknown>) => string,
  entry: { expectedPrice?: number; currentPrice?: number } | undefined,
  state: NetPriceMatchState,
): string {
  if (state === 'MISMATCH') {
    if (entry?.expectedPrice === undefined) {
      return t('modules.pages.salesOrder.netPriceMatchMismatchDetail')
    }
    return t('modules.pages.salesOrder.netPriceMatchMismatchDetail', {
      expected: formatAmount(entry.expectedPrice),
      current:
        entry.currentPrice === undefined
          ? t('modules.pages.salesOrder.netPriceMatchCurrentEmpty')
          : formatAmount(entry.currentPrice),
    })
  }
  if (state === 'NO_PRICE') {
    return t('modules.pages.salesOrder.netPriceMatchNoPriceDetail')
  }
  if (state === 'MATCHED') {
    return t('modules.pages.salesOrder.netPriceMatchMatchedDetail')
  }
  return t('modules.pages.salesOrder.netPriceMatchUncheckedDetail')
}
