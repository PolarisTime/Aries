import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  SplitCellsOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { MenuProps, TableColumnsType, TableProps } from 'antd'
import { InputNumber, Table, Tag } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { sumColumnWidths } from '@/views/modules/components/business-grid-table-utils'
import type { PickupListRow } from './pickup-list-draft'
import {
  PickupRowMenuContext,
  type PickupRowMenuMap,
  preserveNativeContextMenuOnInputs,
} from './pickup-list-row-menu'

/** 行菜单条目 key。 */
const ROW_MENU_SPLIT = 'split'
const ROW_MENU_MERGE = 'merge'
const ROW_MENU_REMOVE_PART = 'removePart'
const ROW_MENU_MOVE_UP = 'moveUp'
const ROW_MENU_MOVE_DOWN = 'moveDown'

/**
 * 明细行右键菜单条目。
 *
 * 未拆分行只有「拆分」, 不出现「移除第 N 份」; 两类行都带「上移/下移」——
 * 取消可见拖动手柄后, 这是顺序调整的**非拖动替代**(WCAG 2.2 SC 2.5.7)。
 */
function buildRowMenuItems(
  row: PickupListRow,
  labels: {
    split: string
    merge: string
    removePart: string
    moveUp: string
    moveDown: string
  },
  position: { index: number; total: number },
): MenuProps['items'] {
  const moveItems: MenuProps['items'] = [
    {
      key: ROW_MENU_MOVE_UP,
      label: labels.moveUp,
      icon: <ArrowUpOutlined />,
      disabled: position.index <= 0,
    },
    {
      key: ROW_MENU_MOVE_DOWN,
      label: labels.moveDown,
      icon: <ArrowDownOutlined />,
      disabled: position.index >= position.total - 1,
    },
  ]

  if (row.partCount <= 1) {
    return [
      {
        key: ROW_MENU_SPLIT,
        label: labels.split,
        icon: <SplitCellsOutlined />,
        disabled: row.quantity < 2,
      },
      { type: 'divider' },
      ...moveItems,
    ]
  }
  return [
    {
      key: ROW_MENU_MERGE,
      label: labels.merge,
      icon: <UndoOutlined />,
      disabled: row.partCount <= 2,
    },
    {
      key: ROW_MENU_REMOVE_PART,
      label: labels.removePart,
      icon: <DeleteOutlined />,
      danger: true,
    },
    { type: 'divider' },
    ...moveItems,
  ]
}

interface PickupItemsTableProps {
  columns: TableColumnsType<PickupListRow>
  components: TableProps<PickupListRow>['components']
  emptyText: string
  rows: PickupListRow[]
  /** 调整某份件数（差额自动落到同来源相邻份）。 */
  onQuantityChange: (row: PickupListRow, quantity: number) => void
  /** 打开拆分弹窗(指定每份件数)。 */
  onSplit: (row: PickupListRow) => void
  /** 合并该来源明细的全部拆分份。 */
  onMerge: (row: PickupListRow) => void
  /** 移除某一份（件数合并回相邻份）。 */
  onRemovePart: (row: PickupListRow) => void
  /** 上移/下移一行(顺序调整的非拖动替代)。 */
  onMoveRow: (row: PickupListRow, direction: 'up' | 'down') => void
}

/**
 * 提货明细表：行实例带拆分份次，数量可编辑且增/删份保持件数守恒，
 * 汇总与分组合计始终以拆分后的数值为准。
 */
export function PickupItemsTable({
  columns,
  components,
  emptyText,
  rows,
  onQuantityChange,
  onSplit,
  onMerge,
  onRemovePart,
  onMoveRow,
}: PickupItemsTableProps) {
  const { t } = useTranslation()

  /**
   * 按行实例(含拆分份)生成右键菜单: 文案与禁用口径直接复用行内按钮的
   * 现有 locale key 与同一判断条件, 不另立规则。
   */
  const rowMenus = useMemo<PickupRowMenuMap>(() => {
    const menus: PickupRowMenuMap = new Map()
    rows.forEach((row, index) => {
      const itemLabel = [row.item.category, row.item.material]
        .filter(Boolean)
        .join(' ')
      const partLabel =
        row.partCount > 1
          ? ` ${t('modules.purchasePickupList.splitPartLabel', {
              index: row.partIndex + 1,
              total: row.partCount,
            })}`
          : ''
      menus.set(row.rowId, {
        // 可访问名带上品名与份次, 读屏用户能区分是「哪一行」的菜单。
        ariaLabel: t('modules.purchasePickupList.rowContextMenuLabel', {
          name: `${itemLabel}${partLabel}`,
        }),
        items: buildRowMenuItems(
          row,
          {
            split: t('modules.purchasePickupList.splitItemMenuLabel'),
            merge: t('modules.purchasePickupList.mergeItem'),
            removePart: t('modules.purchasePickupList.removeSplitPart', {
              index: row.partIndex + 1,
            }),
            moveUp: t('modules.purchasePickupList.moveItemUp'),
            moveDown: t('modules.purchasePickupList.moveItemDown'),
          },
          { index, total: rows.length },
        ),
        onClick: ({ key }) => {
          if (key === ROW_MENU_SPLIT) {
            onSplit(row)
            return
          }
          if (key === ROW_MENU_MERGE) {
            onMerge(row)
            return
          }
          if (key === ROW_MENU_REMOVE_PART) {
            onRemovePart(row)
            return
          }
          if (key === ROW_MENU_MOVE_UP) {
            onMoveRow(row, 'up')
            return
          }
          if (key === ROW_MENU_MOVE_DOWN) {
            onMoveRow(row, 'down')
          }
        },
      })
    })
    return menus
  }, [onMerge, onMoveRow, onRemovePart, onSplit, rows, t])

  const mergedColumns: TableColumnsType<PickupListRow> = columns.map(
    (column) => {
      if (!('dataIndex' in column) || column.dataIndex !== 'quantity') {
        return column
      }
      return {
        ...column,
        render: (_value, row) => {
          // 未拆分: 保持与其它列一致的纯文本展示(默认外观)。
          if (row.partCount <= 1) {
            return (
              <span className="purchase-pickup-list-quantity">
                {row.quantity}
              </span>
            )
          }
          // 拆分行: 展示份次标签与可编辑数量。
          return (
            <div className="purchase-pickup-list-quantity-cell">
              <Tag className="purchase-pickup-list-part-tag">
                {t('modules.purchasePickupList.splitPartLabel', {
                  index: row.partIndex + 1,
                  total: row.partCount,
                })}
              </Tag>
              <InputNumber
                aria-label={t('modules.purchasePickupList.pickupQuantity')}
                className="purchase-pickup-list-quantity-input"
                controls={false}
                min={1}
                precision={0}
                size="small"
                value={row.quantity}
                onChange={(value) => {
                  if (typeof value === 'number') {
                    onQuantityChange(row, value)
                  }
                }}
              />
            </div>
          )
        },
      }
    },
  )

  const scrollX = sumColumnWidths(mergedColumns.map((column) => column.width))

  return (
    <SortableContext
      items={rows.map((row) => row.rowId)}
      strategy={verticalListSortingStrategy}
    >
      <PickupRowMenuContext.Provider value={rowMenus}>
        {/* 包裹层: 捕获阶段放行输入控件, 明细行右键菜单挂在行容器 <tr> 上 */}
        <div
          className="purchase-pickup-list-items"
          onContextMenuCapture={preserveNativeContextMenuOnInputs}
        >
          <Table<PickupListRow>
            columns={mergedColumns}
            components={components}
            dataSource={rows}
            locale={{ emptyText }}
            pagination={false}
            rowKey="rowId"
            scroll={{ x: scrollX }}
            size="small"
          />
        </div>
      </PickupRowMenuContext.Provider>
    </SortableContext>
  )
}

/** 拆分提示：说明本次拆分不会写回采购订单。 */
