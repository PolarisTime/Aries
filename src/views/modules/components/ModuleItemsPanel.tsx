import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ModuleColumnDefinition, ModuleRecord } from '@/types/module-page'
import { EditorItemsSummary } from './EditorItemsSummary'

interface Props {
  title?: React.ReactNode
  actions?: React.ReactNode
  items?: ModuleRecord[]
  itemColumns?: ModuleColumnDefinition[]
  /** 单据附加费用合计，透传给汇总区独立展示。 */
  expenseTotalAmount?: number | null
  className?: string
  children: React.ReactNode
}

export function ModuleItemsPanel({
  title,
  actions,
  items,
  itemColumns,
  expenseTotalAmount,
  className,
  children,
}: Props) {
  const { t } = useTranslation()
  const resolvedTitle = title ?? t('modules.itemsPanel.defaultTitle')
  const hasSummary = Array.isArray(items)
  const showAmountSummary =
    !itemColumns || itemColumns.some((column) => column.dataIndex === 'amount')

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
          {hasSummary ? (
            <EditorItemsSummary
              items={items}
              showAmount={showAmountSummary}
              expenseTotalAmount={expenseTotalAmount}
              className="editor-items-summary-inline"
            />
          ) : null}
        </div>
      </div>
      {children}
    </div>
  )
}
