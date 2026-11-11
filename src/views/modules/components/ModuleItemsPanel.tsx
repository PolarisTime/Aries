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
  /**
   * 行末槽：单据级动作（取消 / 保存 / 保存并审核）。
   *
   * <p>**贴着标题行右边界**摆放，不跟表格工具按钮排在一起 —— 两者作用域不同：
   * 左侧是"这张明细表怎么编辑"，右侧是"这张单据要不要提交"。此前保存组只是动作序列
   * 的最后一段，1900px 宽的一行里按钮组到一半就结束、右边空出近一半，主按钮悬在中间；
   * 取价结果这类瞬时文本也正好卡在动作组末尾，容易被读成「取消取价」。</p>
   *
   * <p>与 {@link actions} 分开还有一个好处：工具按钮可以折行，保存组永远在行尾，
   * 不会因为按钮变多而被挤到第二行中间。</p>
   */
  footerActions?: React.ReactNode
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
  footerActions,
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
          {footerActions ? (
            <div className="editor-items-footer-actions">{footerActions}</div>
          ) : null}
        </div>
      </div>
      {variant === 'cards' ? summary : null}
      {children}
      {variant === 'strip' ? summary : null}
    </div>
  )
}
