import Typography from 'antd/es/typography'
import { EditorItemsSummary } from './EditorItemsSummary'

interface Props {
  title?: React.ReactNode
  actions?: React.ReactNode
  items?: Record<string, unknown>[]
  className?: string
  children: React.ReactNode
}

export function ModuleItemsPanel({
  title = '明细列表',
  actions,
  items,
  className,
  children,
}: Props) {
  const hasSummary = Array.isArray(items)

  return (
    <div
      className={['module-items-panel', className || '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="editor-items-head">
        <div className="editor-items-title-block editor-items-title-row">
          <Typography.Title level={5} className="detail-section-title">
            {title}
          </Typography.Title>
          {actions ? <div className="editor-items-actions">{actions}</div> : null}
        </div>
        {hasSummary ? (
          <EditorItemsSummary
            items={items}
            className="editor-items-summary-inline"
          />
        ) : null}
      </div>
      {hasSummary ? (
        <EditorItemsSummary items={items} className="editor-items-summary-mobile" />
      ) : null}
      {children}
    </div>
  )
}
