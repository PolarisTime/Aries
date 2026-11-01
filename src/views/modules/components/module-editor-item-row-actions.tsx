import { CopyOutlined } from '@ant-design/icons'
import type { TableColumnType } from 'antd'
import { Button } from 'antd'
import type { ModuleLineItem } from '@/types/module-page'

/** 编辑器明细表行操作列 key（固定列，不参与列设置与拖拽排序）。 */
export const EDITOR_ITEM_ACTIONS_COLUMN_KEY = '_rowActions'

interface Options {
  /** 列标题（如「操作」）。 */
  title: string
  /** 按钮文案，同时作为 title 提示。 */
  actionLabel: string
  /** 逐行可访问名：读屏需区分「复制哪一行」。 */
  ariaLabelOf: (record: ModuleLineItem) => string
  /** 整体可用性（只读 / 明细锁定 / 保存中等）。 */
  disabled: boolean
  /**
   * 逐行禁用：如「来源由上游单据决定的导入行」不允许复制。
   *
   * <p>导入行的来源与数量上限都挂在来源明细上，复制出来的副本会和原行引用同一个
   * 来源行（两行各自 ≤ 上限、合计超量），只能在保存时被后端拒绝。</p>
   */
  disabledOf?: (record: ModuleLineItem) => boolean
  /** 逐行禁用原因（悬停提示），缺省沿用按钮文案。 */
  disabledTitleOf?: (record: ModuleLineItem) => string | undefined
  onDuplicate: (itemId: string) => void
}

/**
 * 明细行「复制本行」按钮列。
 *
 * <p>纯表现层：只负责把行 id 交给调用方，复制语义（字段复制、新行 id、插入位置）
 * 由 <code>duplicateEditorLineItem</code> 数据层统一实现，行内按钮与行右键菜单共用。</p>
 */
export function buildModuleEditorItemDuplicateColumn({
  title,
  actionLabel,
  ariaLabelOf,
  disabled,
  disabledOf,
  disabledTitleOf,
  onDuplicate,
}: Options): TableColumnType<ModuleLineItem> {
  return {
    key: EDITOR_ITEM_ACTIONS_COLUMN_KEY,
    title,
    width: 96,
    align: 'center',
    render: (_value, record) => {
      const rowDisabled = disabled || (disabledOf?.(record) ?? false)
      const rowDisabledTitle = disabledOf?.(record)
        ? disabledTitleOf?.(record)
        : undefined
      return (
        <Button
          type="link"
          size="small"
          className="table-action-btn"
          icon={<CopyOutlined />}
          disabled={rowDisabled}
          // 禁用按钮也要能解释原因：原生 title 在悬停时仍可见，读屏由 aria-label 兜底
          title={rowDisabled ? (rowDisabledTitle ?? actionLabel) : actionLabel}
          aria-label={ariaLabelOf(record)}
          onClick={() => onDuplicate(record.id)}
        >
          {actionLabel}
        </Button>
      )
    },
  }
}
