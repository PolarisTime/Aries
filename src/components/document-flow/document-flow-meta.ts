import type { DocumentFlowNode } from '@/shared/schemas/document-flow'
import { formatAmount, formatWeight } from '@/utils/formatters'
import type { FlowLayoutEdge } from './flow-layout'

/**
 * 单据流向的展示元数据与文案出口。
 *
 * <p>抽成独立模块的理由：图视图（列头 / 节点卡 / 连线层）与列表视图（F-D）要用**同一套**
 * 类型名、颜色、金额格式化与边数量文案。三处各写一份就会出现「图上写金额、列表写 Amount」
 * 这类漂移。</p>
 */

/** 与项目其它父单选择器一致的最小翻译签名。 */
export type DocumentFlowTranslator = (
  key: string,
  options?: Record<string, unknown>,
) => string

export interface DocumentFlowTypeMeta {
  /** i18n key 后缀（`documentFlow.types.<key>`）。 */
  key: string
  /** 卡片顶部描边色（CSS 变量，跟随主题）。 */
  color: string
}

export const DOCUMENT_FLOW_TYPE_META: Readonly<
  Record<string, DocumentFlowTypeMeta>
> = {
  'purchase-order': {
    key: 'purchaseOrder',
    color: 'var(--ant-color-primary, #1677ff)',
  },
  'purchase-inbound': {
    key: 'purchaseInbound',
    color: 'var(--ant-cyan-6, #13c2c2)',
  },
  'sales-order': {
    key: 'salesOrder',
    color: 'var(--ant-color-success, #52c41a)',
  },
  'sales-outbound': {
    key: 'salesOutbound',
    color: 'var(--ant-color-warning, #faad14)',
  },
  'sales-return': {
    key: 'salesReturn',
    color: 'var(--ant-color-error, #ff4d4f)',
  },
  'freight-bill': {
    key: 'freightBill',
    color: 'var(--ant-purple-6, #722ed1)',
  },
}

/**
 * 单据流里的金额 / 重量 / 件数文本。
 *
 * <p>三者共用「空值 → 空串、非数值 → 原样返回」这套兜底，但**数值口径必须各自走全站唯一出口**：
 * 金额 {@link formatAmount}（2 位）、重量 {@link formatWeight}（3 位），且一律**不加千分位**
 * （产品决定：数字要能直接复制进 Excel/搜索框，见 formatters 里的说明）。</p>
 *
 * <p>此前这里用 `toLocaleString('zh-CN', { useGrouping: true, maximumFractionDigits: 2 })`，
 * 结果是：金额带千分位与全站约定相反，重量只剩 2 位小数（比表格列少一位），
 * 同一张单据在流程图与列表里显示不同数值。</p>
 */
function numericOrNull(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function formatDocumentFlowAmount(
  value: number | string | null | undefined,
): string {
  const numeric = numericOrNull(value)
  return numeric === null ? (value ? String(value) : '') : formatAmount(numeric)
}

export function formatDocumentFlowWeight(
  value: number | string | null | undefined,
): string {
  const numeric = numericOrNull(value)
  return numeric === null ? (value ? String(value) : '') : formatWeight(numeric)
}

export function formatDocumentFlowQuantity(
  value: number | string | null | undefined,
): string {
  const numeric = numericOrNull(value)
  if (numeric === null) return value ? String(value) : ''
  return numeric.toLocaleString('zh-CN', {
    useGrouping: false,
    maximumFractionDigits: 0,
  })
}

/** 节点类型文案（未知类型回落为原始 type）。 */
export function documentFlowTypeLabel(
  t: DocumentFlowTranslator,
  type: string,
): string {
  const meta = DOCUMENT_FLOW_TYPE_META[type]
  if (!meta) {
    return type || t('documentFlow.title')
  }
  return t(`documentFlow.types.${meta.key}`)
}

/**
 * 关系类型文案（入库/销售/出库/退货/物流）。
 *
 * <p>类型文字已从连线上移除（同一汇聚干线上「销售」会重复出现），只保留在
 * `<title>` 与列表视图里。这里用静态 key 而不是模板串：逐条静态 key 能被 i18n
 * 门禁逐个校验，模板串动态 key 反而要额外登记白名单。</p>
 */
export function documentFlowLinkTypeLabel(
  t: DocumentFlowTranslator,
  linkType: string | undefined,
): string {
  switch (linkType) {
    case '入库':
      return t('documentFlow.linkTypes.inbound')
    case '销售':
      return t('documentFlow.linkTypes.sales')
    case '出库':
      return t('documentFlow.linkTypes.outbound')
    case '退货':
      return t('documentFlow.linkTypes.returns')
    case '物流':
      return t('documentFlow.linkTypes.freight')
    default:
      return linkType ?? ''
  }
}

/**
 * 关系边上的数量文案（件 / 吨）。
 *
 * <p>后端字段可空：任一缺失都不拼进结果，两个都缺失时返回空串，调用方据此
 * 完全不渲染文本节点——不在图上留空壳、也不显示「undefined」。</p>
 */
export function documentFlowEdgeMetricLabel(
  t: DocumentFlowTranslator,
  edge: Pick<FlowLayoutEdge, 'quantity' | 'weight'>,
): string {
  const parts: string[] = []
  if (edge.quantity !== null) {
    parts.push(
      t('documentFlow.edgeQuantity', {
        value: formatDocumentFlowQuantity(edge.quantity),
      }),
    )
  }
  if (edge.weight !== null) {
    parts.push(
      t('documentFlow.edgeWeight', {
        value: formatDocumentFlowWeight(edge.weight),
      }),
    )
  }
  return parts.join(' · ')
}

/** 节点悬浮提示：类型 + 单号 + 金额/重量（有才写）+ 可点击提示。 */
export function documentFlowNodeTooltip(
  t: DocumentFlowTranslator,
  node: DocumentFlowNode,
  canOpenNode: boolean,
): string {
  return [
    `${documentFlowTypeLabel(t, node.type)} ${node.no ?? node.id}`,
    node.amount != null
      ? `${t('documentFlow.amount')}: ${formatDocumentFlowAmount(node.amount)}`
      : '',
    node.weight != null
      ? `${t('documentFlow.weight')}: ${formatDocumentFlowWeight(node.weight)}`
      : '',
    canOpenNode ? t('documentFlow.nodeHint') : '',
  ]
    .filter(Boolean)
    .join('\n')
}
