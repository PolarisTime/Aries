import { CopyOutlined, DownOutlined, LinkOutlined } from '@ant-design/icons'
import { Button, Divider, Popover, Tag, Tooltip, Typography } from 'antd'
import type { ReactNode } from 'react'
import { useCallback, useMemo } from 'react'
import { useTabOpen } from '@/layouts/tabs/use-tab-open'
import type { ModulePageConfig } from '@/types/module-page'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import {
  buildDocumentReferenceSummary,
  type DocumentReference,
  normalizeDocumentReferences,
  resolveDocumentReferenceModule,
} from './document-reference/document-reference-utils'

interface DocumentReferenceSummary {
  counterpartyName?: string
  amount?: number | string
  status?: string
}

export interface DocumentReferencePopoverProps {
  /** 兼容逗号文本、单号数组及后端完整对象数组。 */
  value?: unknown
  /** 关联字段名，用于推断目标模块。 */
  fieldKey?: string
  /** 目标业务模块；字段存在明确映射时优先使用字段映射。 */
  moduleKey?: string
  /** 当 moduleKey 表示当前页面上下文时，用于 sourceNo 等明细字段推断。 */
  contextModuleKey?: string
  documentLabel?: string
  summary?: DocumentReferenceSummary
  statusMap?: ModulePageConfig['statusMap']
  className?: string
}

const DOCUMENT_LABELS: Readonly<Record<string, string>> = {
  'purchase-order': '采购单',
  'purchase-inbound': '采购入库单',
  'sales-order': '销售单',
  'sales-outbound': '销售出库单',
  'freight-bill': '物流单',
  'customer-statement': '客户对账单',
  'freight-statement': '物流对账单',
  receipt: '收款单',
  payment: '付款单',
}

const FIELD_LABELS: Readonly<Record<string, string>> = {
  orderNo: '订单',
  purchaseOrderNo: '采购单',
  purchaseInboundNo: '采购入库单',
  inboundNo: '入库单',
  salesOrderNo: '销售单',
  outboundNo: '出库单',
  billNo: '物流单',
  statementNo: '对账单',
  receiptNo: '收款单',
  paymentNo: '付款单',
  sourceNo: '来源单据',
  sourceOrderNos: '销售单',
  sourceBillNos: '物流单',
}

function resolveLabel(moduleKey?: string, fallback?: string): string {
  const normalizedFallback = fallback?.replace(/^关联/, '').trim()
  return (
    FIELD_LABELS[normalizedFallback || ''] ||
    normalizedFallback ||
    (moduleKey ? DOCUMENT_LABELS[moduleKey] : '') ||
    '单据'
  )
}

function resolveTargetModule(
  reference: DocumentReference,
  moduleKey: string | undefined,
  fieldKey: string | undefined,
  contextModuleKey?: string,
) {
  return (
    reference.moduleKey ||
    (fieldKey
      ? resolveDocumentReferenceModule(fieldKey, contextModuleKey)
      : undefined) ||
    moduleKey
  )
}

function buildDocumentHref(
  reference: DocumentReference,
  targetModule?: string,
): string | undefined {
  if (!targetModule) return undefined
  const params = new URLSearchParams({
    docNo: reference.no,
    openDetail: '1',
  })
  if (reference.id) {
    params.set('trackId', reference.id)
  }
  return `/${targetModule}?${params.toString()}`
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const input = document.createElement('textarea')
  input.value = text
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  const copied = document.execCommand('copy')
  input.remove()
  if (!copied) {
    throw new Error('clipboard unavailable')
  }
}

function getAmountText(amount: number | string | undefined): string {
  if (amount === undefined || amount === '') return ''
  const numericAmount = Number(amount)
  return Number.isFinite(numericAmount)
    ? numericAmount.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : asString(amount)
}

function renderStatus(
  status: string,
  statusMap?: ModulePageConfig['statusMap'],
): ReactNode {
  if (statusMap) {
    const meta = statusMap[status]
    if (meta) {
      return <Tag color={meta.color}>{meta.text}</Tag>
    }
  }
  return <Tag>{status}</Tag>
}

function getReferenceSummary(
  reference: DocumentReference,
  fallback?: DocumentReferenceSummary,
): DocumentReferenceSummary {
  return {
    counterpartyName: reference.counterpartyName || fallback?.counterpartyName,
    amount: reference.amount ?? fallback?.amount,
    status: reference.status || fallback?.status,
  }
}

function ReferenceLink({
  reference,
  targetModule,
  openDocument,
}: {
  reference: DocumentReference
  targetModule?: string
  openDocument: (reference: DocumentReference, targetModule?: string) => void
}) {
  const href = buildDocumentHref(reference, targetModule)
  if (!href) {
    return <Typography.Text>{reference.no}</Typography.Text>
  }
  return (
    <Typography.Link
      href={href}
      className="document-reference-link"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        openDocument(reference, targetModule)
      }}
    >
      {reference.no}
    </Typography.Link>
  )
}

export function DocumentReferencePopover({
  value,
  fieldKey,
  moduleKey,
  contextModuleKey,
  documentLabel,
  summary,
  statusMap,
  className,
}: DocumentReferencePopoverProps) {
  const openTab = useTabOpen()
  const references = useMemo(() => normalizeDocumentReferences(value), [value])
  const label = resolveLabel(moduleKey, documentLabel)
  const summaryText = buildDocumentReferenceSummary(references, {
    documentLabel: label,
  })

  const openDocument = useCallback(
    (reference: DocumentReference, targetModule?: string) => {
      if (!targetModule) return
      const href = buildDocumentHref(reference, targetModule)
      if (!href) return
      const [, search = ''] = href.split('?')
      openTab({
        pathname: `/${targetModule}`,
        search,
        forceSearch: true,
      })
    },
    [openTab],
  )

  const copyReferences = useCallback(
    async (items: readonly DocumentReference[]) => {
      const text = items.map((item) => item.no).join('\n')
      if (!text) return
      try {
        await copyText(text)
        message.success(items.length > 1 ? '已复制全部单号' : '已复制单号')
      } catch {
        message.error('复制失败，请手动选择单号')
      }
    },
    [],
  )

  if (!references.length) {
    return (
      <Typography.Text type="secondary" className={className}>
        -
      </Typography.Text>
    )
  }

  const popoverContent = (
    <div className="document-reference-popover-content">
      <div className="document-reference-popover-toolbar">
        <Typography.Text strong>关联{label}</Typography.Text>
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          title="复制全部单号"
          aria-label="复制全部单号"
          onClick={() => void copyReferences(references)}
        >
          复制全部
        </Button>
      </div>
      <Divider className="document-reference-divider" />
      <div className="document-reference-list">
        {references.map((reference) => {
          const targetModule = resolveTargetModule(
            reference,
            moduleKey,
            fieldKey,
            contextModuleKey,
          )
          const itemSummary = getReferenceSummary(reference, summary)
          return (
            <div
              className="document-reference-item"
              key={`${targetModule || 'document'}:${reference.no}`}
            >
              <div className="document-reference-item-main">
                <ReferenceLink
                  reference={reference}
                  targetModule={targetModule}
                  openDocument={openDocument}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  title={`复制 ${reference.no}`}
                  aria-label={`复制 ${reference.no}`}
                  onClick={() => void copyReferences([reference])}
                />
              </div>
              <div className="document-reference-item-meta">
                {itemSummary.counterpartyName ? (
                  <span>{itemSummary.counterpartyName}</span>
                ) : null}
                {itemSummary.amount !== undefined ? (
                  <span>金额：{getAmountText(itemSummary.amount)}</span>
                ) : null}
                {itemSummary.status
                  ? renderStatus(itemSummary.status, statusMap)
                  : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <Popover
      title={null}
      content={popoverContent}
      trigger={['hover', 'click']}
      placement="bottomLeft"
      overlayClassName="document-reference-popover"
    >
      <span
        className={['document-reference-trigger', className || '']
          .filter(Boolean)
          .join(' ')}
        title={summaryText}
      >
        {references.length === 1 ? (
          <ReferenceLink
            reference={references[0]}
            targetModule={resolveTargetModule(
              references[0],
              moduleKey,
              fieldKey,
              contextModuleKey,
            )}
            openDocument={openDocument}
          />
        ) : (
          <Typography.Text ellipsis={{ tooltip: false }}>
            {summaryText}
          </Typography.Text>
        )}
        {references.length === 1 ? (
          <Tooltip title="复制单号">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              title="复制单号"
              aria-label={`复制 ${references[0].no}`}
              onClick={(event) => {
                event.stopPropagation()
                void copyReferences(references)
              }}
            />
          </Tooltip>
        ) : (
          <DownOutlined
            className="document-reference-expand-icon"
            aria-hidden="true"
          />
        )}
        {references.length === 1 &&
        resolveTargetModule(
          references[0],
          moduleKey,
          fieldKey,
          contextModuleKey,
        ) ? (
          <LinkOutlined
            className="document-reference-link-icon"
            aria-hidden="true"
          />
        ) : null}
      </span>
    </Popover>
  )
}
