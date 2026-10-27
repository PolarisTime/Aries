import { EyeOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnDef, StockFeatures } from '@tanstack/react-table'
import { Button, Tooltip } from 'antd'
import { type ReactNode, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  formatDocumentReferenceText,
  isListDocumentReferenceField,
} from '@/components/document-reference/document-reference-utils'
import { renderModuleRecordStatus } from '@/components/ModuleRecordStatus'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

/**
 * 「明细按钮列」的列 id 与列宽。
 *
 * <p>业务网格列表已不再使用独立明细列（并入首位身份列，见 `BusinessGridTable` 的
 * IDENTITY_COLUMN_WIDTH）；选单器表格（`parent-selector-columns`）仍按这组常量
 * 渲染它自己的明细列，因此常量保留在这里，作为该列形态的唯一出处。</p>
 */
export const DETAIL_TOGGLE_COLUMN_ID = 'detail-toggle'
export const DETAIL_TOGGLE_COLUMN_WIDTH = 48

/** 明细按钮的形态：加号/减号（可展开）或眼睛（打开独立详情）。 */
export type DetailToggleVariant = 'expand' | 'preview'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TFeatures, TData, TValue> {
    width?: number | string
    align?: string
    /**
     * 固定列方向: `left` 固定左侧、`right` 固定右侧。
     *
     * <p>必须由列定义透传到 antd 列上: 光在 `meta` 里写 `fixed` 不会生效 ——
     * `buildAntdColumns` 只读 `columnDef.meta?.fixed`, 而这里的 meta 原先只写
     * width/align/renderCell, 于是业务网格所有页面的固定列恒为 0, 横向滚动时
     * 首列整列滚出视野(实测 `firstCellLeft = -317`)。</p>
     */
    fixed?: 'left' | 'right'
    renderCell?: (record: ModuleRecord) => ReactNode
  }
}

interface Props {
  config: ModulePageConfig
  onOpenDetail?: (record: ModuleRecord) => void
  /**
   * 内联展开的行 key 集合；提供时明细按钮渲染加号/减号并体现展开态，
   * 缺省时沿用眼睛图标（打开独立详情浮层）。
   */
  expandedRowKeys?: string[]
  variant?: DetailToggleVariant
}

export function useGridColumns({
  config,
  onOpenDetail,
  expandedRowKeys,
  variant,
}: Props) {
  const { formatCellValue } = useModuleDisplaySupport()
  const { t } = useTranslation()

  const columns: ColumnDef<StockFeatures, ModuleRecord>[] = []

  for (const colDef of config.columns) {
    columns.push({
      id: colDef.dataIndex,
      header: colDef.title,
      accessorKey: colDef.dataIndex,
      meta: {
        width: colDef.width ? `${colDef.width}px` : '120px',
        align: 'center',
        renderCell: (record: ModuleRecord) => {
          const value = record[colDef.dataIndex]
          if (colDef.type === 'status') {
            return renderModuleRecordStatus({
              record,
              statusKey: colDef.dataIndex,
              statusMap: config.statusMap,
              renderFallback: (status) => (
                <span>{formatCellValue(status, colDef.type)}</span>
              ),
            })
          }
          if (
            isListDocumentReferenceField(colDef.dataIndex, config.primaryNoKey)
          ) {
            /*
             * 单据引用列只显示单号纯文本：行内「复制单号 / 单据引用跳转」两个图标已整体
             * 下线。列本身是 antd `ellipsis: true`，长单号由单元格省略并把全文写进
             * title；文本口径统一取 `formatDocumentReferenceText`（唯一出口）。
             */
            return formatDocumentReferenceText(value) || '-'
          }
          if (colDef.render) {
            return colDef.render(value, record)
          }
          return <span>{formatCellValue(value, colDef.type)}</span>
        },
      },
    })
  }

  const useExpandVariant =
    variant === 'expand' || (variant === undefined && expandedRowKeys != null)

  /*
   * 明细按钮不再独占一列（旧形态=空表头 + 48px 只有一个图标）。列表页首位改成
   * 「序号 · 勾选 · 明细加号 · 行菜单」合成的一列（宽度见 `BusinessGridTable` 的
   * IDENTITY_COLUMN_WIDTH）。列定义一个单元格只能摆一样东西，因此这里只保留**渲染口径**：
   * 图标形态（加号/减号/眼睛）、aria-label、aria-expanded 与点击副作用只在这一处决定，
   * 摆放位置交给身份列。换出口就再写一遍，正是本仓库禁止的「同一口径两处实现」。
   */
  const renderRowDetailToggle = useCallback(
    (record: ModuleRecord) => {
      if (!onOpenDetail) {
        return null
      }
      const expanded = Boolean(expandedRowKeys?.includes(String(record.id)))
      const label = useExpandVariant
        ? expanded
          ? t('modules.parentSelector.collapseDetail')
          : t('modules.parentSelector.expandDetail')
        : t('hooks.gridColumns.detail')
      return (
        <Tooltip title={label}>
          <Button
            aria-label={label}
            aria-expanded={useExpandVariant ? expanded : undefined}
            className={`table-detail-toggle-btn${expanded ? ' is-active' : ''}`}
            icon={
              useExpandVariant ? (
                expanded ? (
                  <MinusOutlined />
                ) : (
                  <PlusOutlined />
                )
              ) : (
                <EyeOutlined />
              )
            }
            onClick={(event) => {
              event.stopPropagation()
              onOpenDetail(record)
            }}
            size="small"
            type="text"
          />
        </Tooltip>
      )
    },
    [expandedRowKeys, onOpenDetail, t, useExpandVariant],
  )

  /*
   * 行级动作只保留行右键菜单(与触摸长按)一个入口, 不再渲染行尾「更多」操作列:
   * 列宽固定 200px 却只放一个 32px 图标按钮, 既浪费横向空间, 又让「列设置」里
   * 多出一个无法隐藏/移动的伪列。行菜单与键盘/触摸入口见 RowContextMenuRow。
   */

  return { columns, renderRowDetailToggle }
}
