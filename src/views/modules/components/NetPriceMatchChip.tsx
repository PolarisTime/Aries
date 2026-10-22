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
import {
  type NetPriceDocumentState,
  useNetPriceMatchStore,
} from '../net-price-match-store'

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
 *
 * <p><b>差额为什么要 sr-only 文本</b>: 差额原本只在 {@code Tooltip.title} 里, 而 {@code Tag}
 * 不可聚焦 —— 键盘用户既 hover 不到、也 focus 不到, 差额等于**鼠标专属**信息。
 * 此前靠「网价匹配明细」弹层兜底(弹层里差额是真正文本), 但那个弹层列的是全表清单,
 * 与这一列完全重复, 已移除。因此把差额同时放进标识内的 sr-only 文本:
 * 视觉不变, 读屏与键盘用户能听到/读到「差在哪」。</p>
 */
export function NetPriceMatchChip({ itemId }: { itemId: string }) {
  const { t } = useTranslation()
  const entry = useNetPriceMatchStore((state) => state.entries[itemId])
  /*
   * 没有条目时区分"核查中 / 核查失败 / 还没核查":
   * 只读详情面会自动核查, 若失败仍显示「未核查」而不说原因, 用户只会重复同一个疑问。
   * 单据归属靠 store 登记的行 id 反查(行 id 全局唯一)。
   */
  const documentState = useNetPriceMatchStore((state) =>
    findDocumentStateForItem(state.documents, itemId),
  )
  const state: NetPriceMatchState = entry?.state ?? 'UNCHECKED'
  const meta = STATE_META[state]
  const label = t(meta.labelKey)
  const detail = entry
    ? describeEntry(t, entry, state)
    : describeUnchecked(t, documentState)
  return (
    <Tooltip title={detail}>
      <Tag color={meta.color} icon={meta.icon} style={{ marginInlineEnd: 0 }}>
        {label}
        <span className="aries-sr-only">{detail}</span>
      </Tag>
    </Tooltip>
  )
}

/**
 * 没有条目时的悬浮说明: 优先说失败原因, 其次说明"正在核查", 最后才是通用说明。
 *
 * <p>"还没核查"的文案必须同时成立在编辑器(有「取价」菜单)与只读详情面(没有)——
 * 所以它说明"去哪儿能核查", 而不是"点某个按钮"。</p>
 */
function describeUnchecked(
  t: (key: string) => string,
  documentState: NetPriceDocumentState | undefined,
): string {
  if (documentState?.status === 'error') {
    return (
      documentState.error ??
      t('modules.pages.salesOrder.netPriceMatchCheckFailed')
    )
  }
  if (documentState?.status === 'checking') {
    return t('modules.pages.salesOrder.netPriceMatchCheckingDetail')
  }
  return t('modules.pages.salesOrder.netPriceMatchUncheckedDetail')
}

/** 按行 id 反查所属单据的核查状态(单据数很少, 线性查找即可)。 */
function findDocumentStateForItem(
  documents: Record<string, NetPriceDocumentState>,
  itemId: string,
): NetPriceDocumentState | undefined {
  for (const document of Object.values(documents)) {
    if (document.itemIds.includes(itemId)) return document
  }
  return undefined
}

/** 悬浮说明: 说清"差在哪"(应有单价 vs 当前单价), 而不是只给一个状态词。 */
function describeEntry(
  t: (key: string, options?: Record<string, unknown>) => string,
  entry:
    | {
        expectedPrice?: number
        currentPrice?: number
        substitutedMaterial?: string
      }
    | undefined,
  state: NetPriceMatchState,
): string {
  /*
   * 抗震牌号替代说明: 无论匹配与否都要说清"这一行是按 400E 取的价"。
   * 用户报的是 400, 网价来自 400E —— 不说就是悄悄换了计价口径。
   */
  if (entry?.substitutedMaterial) {
    return t('modules.pages.salesOrder.netPriceMatchSubstitutedDetail', {
      material: entry.substitutedMaterial,
      expected:
        entry.expectedPrice === undefined
          ? t('modules.pages.salesOrder.netPriceMatchCurrentEmpty')
          : formatAmount(entry.expectedPrice),
    })
  }
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
