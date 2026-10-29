import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ModuleColumnDefinition, ModuleRecord } from '@/types/module-page'
import {
  EditorItemsSummary,
  type EditorItemsSummaryVariant,
} from './EditorItemsSummary'

interface Props {
  title?: React.ReactNode
  actions?: React.ReactNode
  items?: ModuleRecord[]
  itemColumns?: ModuleColumnDefinition[]
  /** 单据附加费用合计，透传给汇总区独立展示。 */
  expenseTotalAmount?: number | null
  className?: string
  /** 合计展示形态；缺省 `inline`（标题行右侧内联文本）。 */
  summaryVariant?: EditorItemsSummaryVariant
  children: React.ReactNode
}

export function ModuleItemsPanel({
  title,
  actions,
  items,
  itemColumns,
  expenseTotalAmount,
  className,
  summaryVariant,
  children,
}: Props) {
  const { t } = useTranslation()
  const resolvedTitle = title ?? t('modules.itemsPanel.defaultTitle')
  const hasSummary = Array.isArray(items)
  const showAmountSummary =
    !itemColumns || itemColumns.some((column) => column.dataIndex === 'amount')
  const variant = summaryVariant ?? 'inline'

  const summary = hasSummary ? (
    <EditorItemsSummary
      items={items}
      showAmount={showAmountSummary}
      expenseTotalAmount={expenseTotalAmount}
      variant={variant}
      className={
        variant === 'inline' ? 'editor-items-summary-inline' : undefined
      }
    />
  ) : null

  return (
    <div
      className={['module-items-panel', className || '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="editor-items-head">
        <div className="editor-items-title-block editor-items-title-row">
          <Typography.Title level={5} className="detail-section-title">
            {resolvedTitle}
          </Typography.Title>
          {actions ? (
            <div className="editor-items-actions">{actions}</div>
          ) : null}
          {variant === 'inline' ? summary : null}
        </div>
      </div>
      {variant === 'cards' ? summary : null}
      {children}
      {variant === 'strip' ? summary : null}
    </div>
  )
}
