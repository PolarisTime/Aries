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
  /**
   * 是否渲染标题行里的内联合计；缺省 `true`。
   *
   * <p>表格底部已经有 `Table.Summary` 合计行时（详情面 `config.detailSummary`、
   * 编辑器草稿合计）必须传 `false`：否则同一份「行数/件数/重量/金额」会在
   * 表头上方与表尾各出现一次，同一口径两个出口。</p>
   */
  showSummary?: boolean
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
  showSummary = true,
  children,
}: Props) {
  const { t } = useTranslation()
  const resolvedTitle = title ?? t('modules.itemsPanel.defaultTitle')
  // 表尾已有合计行时不再画标题行的内联合计（避免同一口径两个出口）。
  const hasSummary = showSummary && Array.isArray(items)
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
