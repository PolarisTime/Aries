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
  disabled: boolean
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
  onDuplicate,
}: Options): TableColumnType<ModuleLineItem> {
  return {
    key: EDITOR_ITEM_ACTIONS_COLUMN_KEY,
    title,
    width: 96,
    align: 'center',
    render: (_value, record) => (
      <Button
        type="link"
        size="small"
        className="table-action-btn"
        icon={<CopyOutlined />}
        disabled={disabled}
        title={actionLabel}
        aria-label={ariaLabelOf(record)}
        onClick={() => onDuplicate(record.id)}
      >
        {actionLabel}
      </Button>
    ),
  }
}
