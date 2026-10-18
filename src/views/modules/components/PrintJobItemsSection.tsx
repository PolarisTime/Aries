import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleFilled,
  HolderOutlined,
} from '@ant-design/icons'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TableProps } from 'antd'
import {
  Button,
  Checkbox,
  Input,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd'
import {
  createContext,
  type Dispatch,
  type HTMLAttributes,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import { useTranslation } from 'react-i18next'
import type { PrintRecordItem } from '@/api/system/print-template'
import { RowContextMenuRow } from '@/components/RowContextMenuRow'
import {
  RowContextMenuContext,
  type RowContextMenuMap,
} from '@/components/row-context-menu'
import {
  RowReorderButtons,
  rowDragAriaKeyshortcuts,
} from '@/components/table/row-drag'
import type { ModuleKey } from '@/module-system/core/module-key'
import { isModuleKey } from '@/module-system/core/module-key'
import type { PrintItemFieldSpec } from '@/utils/print-module-config'
import {
  getPrintItemColumnAlign,
  getPrintItemColumnWidth,
} from '@/utils/print-module-config'
import type { PrintItemSplitPart } from '@/views/modules/components/print-item-split'
import { buildPrintItemSplitPreviews } from '@/views/modules/components/print-item-split'
import {
  printItemRowName,
  resolvePrintItemRowNumber,
} from '@/views/modules/components/print-job-item-drag-a11y'
import {
  fieldText,
  printItemCellText,
} from '@/views/modules/components/print-job-modal-format'
import type { PrintJobModalAction } from '@/views/modules/components/print-job-modal-state'
import type { PrintItemMergeMarker } from '@/views/modules/components/print-job-modal-utils'
import {
  buildPrintItemMergeGroups,
  reorderPrintItemIds,
} from '@/views/modules/components/print-job-modal-utils'
import type { CustomerStatementItemGroup } from '@/views/modules/customer-statement-item-groups'
import { groupCustomerStatementItems } from '@/views/modules/customer-statement-item-groups'
import type { FreightStatementItemGroup } from '@/views/modules/freight-statement-item-groups'
import { groupFreightStatementItems } from '@/views/modules/freight-statement-item-groups'
import { CustomerStatementItemGroupHeader } from './CustomerStatementItemGroupHeader'
import {
  FreightStatementItemGroupHeader,
  FreightStatementProjectGroupHeader,
} from './FreightStatementItemGroupHeader'

interface RowDragContextValue {
  activatorNodeRef: (element: HTMLElement | null) => void
  dragAttributes: Record<string, unknown>
  dragListeners: Record<string, unknown> | undefined
}

const RowDragContext = createContext<RowDragContextValue | null>(null)

function DragHandle({ label }: { label: string }) {
  const { token } = theme.useToken()
  const context = useContext(RowDragContext)
  /*
   * 直接把 context 里的 ref setter 交给 JSX 的 ref 属性, 编译器会把整个 context 值
   * 推断成 ref, 于是渲染期读取 dragAttributes/dragListeners 都会报「Cannot access refs
   * during render」; 这里包一层本地回调: 回调引用随 context 变化(它在 SortableRow 里已
   * 被 memo), 行为与直接透传 setActivatorNodeRef 完全一致。
   */
  const attachActivatorNode = useCallback(
    (element: HTMLElement | null) => {
      context?.activatorNodeRef(element)
    },
    [context],
  )
  if (!context) return null
  return (
    <button
      {...context.dragAttributes}
      {...(context.dragListeners ?? {})}
      aria-keyshortcuts={rowDragAriaKeyshortcuts()}
      aria-label={label}
      className="inline-flex cursor-grab items-center border-0 bg-transparent p-0"
      ref={attachActivatorNode}
      style={{ color: token.colorTextTertiary }}
      title={label}
      type="button"
    >
      <HolderOutlined />
    </button>
  )
}

interface SortableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  'data-row-key'?: string
}

function SortableRow({ children, ...props }: SortableRowProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: props['data-row-key'] ?? '' })
  const contextValue = useMemo<RowDragContextValue>(
    () => ({
      activatorNodeRef: setActivatorNodeRef,
      dragAttributes: { ...attributes },
      dragListeners: listeners ? { ...listeners } : undefined,
    }),
    [attributes, listeners, setActivatorNodeRef],
  )
  return (
    <RowDragContext.Provider value={contextValue}>
      {/*
       * 行容器交给 RowContextMenuRow: 右键 / Shift+F10 打开的「上移 / 下移」是
       * WCAG 2.2 SC 2.5.7 要求的单指针非拖动替代(只挂 KeyboardSensor 不算替代),
       * 与提货单明细行共用同一套行菜单口径。
       */}
      <RowContextMenuRow
        {...props}
        ref={setNodeRef}
        style={{
          ...props.style,
          opacity: isDragging ? 0.6 : undefined,
          transform: CSS.Translate.toString(transform),
          transition,
        }}
      >
        {children}
      </RowContextMenuRow>
    </RowDragContext.Provider>
  )
}

/** 明细行菜单的「上移 / 下移」键: 与拖动共用同一份顺序写回口径。 */
const PRINT_ITEM_MOVE_UP = 'moveUp'
const PRINT_ITEM_MOVE_DOWN = 'moveDown'

interface Props {
  moduleKey: string
  printItems: PrintRecordItem[]
  orderedPrintItems: PrintRecordItem[]
  orderedPrintItemIds: string[]
  selectedPrintItems: PrintRecordItem[]
  outputPrintItemIdSet: Set<string>
  mergeMarkersByItemId: Record<string, PrintItemMergeMarker>
  showMergeGroup: boolean
  brandOverrideEnabled: boolean
  brandOverridesByItemId: Record<string, string>
  dispatch: Dispatch<PrintJobModalAction>
  isStatementPrintModule: boolean
  itemSelectionEnabled: boolean
  printItemFields: PrintItemFieldSpec[]
  printItemsError: boolean
  onRetryPrintItems: () => void
  splitColumnEnabled: boolean
  splitPieceCount?: number
  splitItemIds: string[]
  onToggleSplitItem: (itemId: string) => void
}

type PrintGroupItem = PrintRecordItem & Record<string, unknown>

type StatementPrintGroup =
  | CustomerStatementItemGroup<PrintGroupItem>
  | FreightStatementItemGroup<PrintGroupItem>

/** 打印明细按对账单模块注册的分组策略；未注册模块返回空数组，走平铺表格。 */
const STATEMENT_PRINT_ITEM_GROUPINGS = {
  'customer-statement': {
    groupItems: (items: PrintGroupItem[]) => groupCustomerStatementItems(items),
  },
  'freight-statement': {
    groupItems: (items: PrintGroupItem[]) => groupFreightStatementItems(items),
  },
} satisfies Partial<
  Record<
    ModuleKey,
    { groupItems: (items: PrintGroupItem[]) => StatementPrintGroup[] }
  >
>

function getStatementPrintItemGroups(
  moduleKey: string,
  items: PrintGroupItem[],
): StatementPrintGroup[] {
  if (!isModuleKey(moduleKey)) return []
  return (
    (
      STATEMENT_PRINT_ITEM_GROUPINGS as Partial<
        Record<
          ModuleKey,
          { groupItems: (items: PrintGroupItem[]) => StatementPrintGroup[] }
        >
      >
    )[moduleKey]?.groupItems(items) ?? []
  )
}

/**
 * 合并/拆分预览表: 挂在代表行下方, 按实际存在的字段动态补出重量/金额列。
 * 抽成独立组件(而不是留在明细区里的渲染函数), 主组件才不会被撑成巨型组件。
 */
function PrintJobSplitPartsTable({
  itemId,
  parts,
}: {
  itemId: string
  parts: PrintItemSplitPart[]
}) {
  const { t } = useTranslation()
  if (!parts.length) {
    return (
      <Typography.Text type="secondary">
        {t('modules.print.splitNotNeeded')}
      </Typography.Text>
    )
  }
  const hasWeight = parts.some((part) => part.weightTon !== undefined)
  const hasAmount = parts.some((part) => part.amount !== undefined)
  return (
    <Table<PrintItemSplitPart>
      columns={[
        {
          key: 'part',
          width: 96,
          align: 'center',
          title: t('modules.print.splitPartIndex'),
          render: (_, part) => `${part.index} / ${part.total}`,
        },
        {
          key: 'quantity',
          width: 96,
          align: 'right',
          title: t('modules.print.itemQuantity'),
          render: (_, part) => part.quantity,
        },
        ...(hasWeight
          ? [
              {
                key: 'weightTon',
                width: 120,
                align: 'right' as const,
                title: t('modules.print.itemWeight'),
                render: (_: unknown, part: PrintItemSplitPart) =>
                  part.weightTon ?? '-',
              },
            ]
          : []),
        ...(hasAmount
          ? [
              {
                key: 'amount',
                width: 120,
                align: 'right' as const,
                title: t('modules.print.itemAmount'),
                render: (_: unknown, part: PrintItemSplitPart) =>
                  part.amount ?? '-',
              },
            ]
          : []),
      ]}
      dataSource={parts}
      pagination={false}
      rowKey={(part) => `${itemId}-${part.index}`}
      size="small"
    />
  )
}

/** 打印作业弹窗的明细区：可拖拽行、品牌覆盖列、分组渲染与选择控制。 */
export function PrintJobItemsSection({
  moduleKey,
  printItems,
  orderedPrintItems,
  orderedPrintItemIds,
  selectedPrintItems,
  outputPrintItemIdSet,
  mergeMarkersByItemId,
  showMergeGroup,
  brandOverrideEnabled,
  brandOverridesByItemId,
  dispatch,
  isStatementPrintModule,
  itemSelectionEnabled,
  printItemFields,
  printItemsError,
  onRetryPrintItems,
  splitColumnEnabled,
  splitPieceCount,
  splitItemIds,
  onToggleSplitItem,
}: Props) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const splitItemIdSet = useMemo(() => new Set(splitItemIds), [splitItemIds])
  // 合并模式下后端先合并再拆分：预览按合并组汇总件数/重量/金额，拆分份挂在组内代表行（首行）。
  const splitPartsByItemId = useMemo(() => {
    if (!splitColumnEnabled || !splitPieceCount) return {}
    return buildPrintItemSplitPreviews(
      selectedPrintItems,
      splitItemIds,
      splitPieceCount,
      showMergeGroup
        ? buildPrintItemMergeGroups(selectedPrintItems, brandOverridesByItemId)
        : [],
    )
  }, [
    brandOverridesByItemId,
    selectedPrintItems,
    showMergeGroup,
    splitColumnEnabled,
    splitItemIds,
    splitPieceCount,
  ])

  const rowSelection: TableProps<PrintRecordItem>['rowSelection'] = {
    align: 'center',
    columnWidth: 40,
    /*
     * 明细行复选框必须带可访问名：否则读屏在每一行都只念「复选框」，
     * 用户无法判断勾的是哪一条物料（WCAG 4.1.2）。名称带行内物料标识。
     */
    getCheckboxProps: (record) => ({
      disabled: !itemSelectionEnabled,
      'aria-label': t('modules.print.selectItemRow', {
        // PrintRecordItem 没有 materialName/Code：用 品牌+材质+规格 拼出可辨认的行标识
        label: [record.brand, record.material, record.spec]
          .filter(Boolean)
          .join(' / '),
      }),
    }),
    getTitleCheckboxProps: () => ({
      disabled: !itemSelectionEnabled,
      'aria-label': t('modules.print.selectAllItemRows'),
    }),
    preserveSelectedRowKeys: true,
    selectedRowKeys: selectedPrintItems.map((item) => item.id),
    onChange: (keys) => {
      const selectedKeySet = new Set(keys.map(String))
      // 单次遍历收集未选中的明细，避免 filter+map 两次扫描。
      const excludedItemIds: string[] = []
      for (const item of printItems) {
        if (!selectedKeySet.has(item.id)) excludedItemIds.push(item.id)
      }
      dispatch({ type: 'setExcludedPrintItemIds', itemIds: excludedItemIds })
    },
  }

  /**
   * 行号: 有序集合 → 明细原始位次 → 表格行号逐级兜底。
   *
   * <p>`orderedPrintItemIds.indexOf(id)` 在明细不在有序集合里时返回 -1, 直接 +1 会
   * 让序号列显示「0」并让拖动按钮读成「拖动第 0 行」, 因此统一走
   * {@link resolvePrintItemRowNumber}。</p>
   */
  const printItemRowNumber = useCallback(
    (itemId: string, tableRowIndex: number) =>
      resolvePrintItemRowNumber(
        orderedPrintItemIds,
        printItems,
        itemId,
        tableRowIndex,
      ),
    [orderedPrintItemIds, printItems],
  )

  /**
   * 行菜单里的「上移 / 下移」: 与拖动落位共用 {@link reorderPrintItemIds},
   * 因此不会出现「菜单能移、拖动不能移」的口径漂移。
   */
  const movePrintItem = useCallback(
    (itemId: string, delta: -1 | 1) => {
      const fromIndex = orderedPrintItemIds.indexOf(itemId)
      if (fromIndex < 0) return
      const targetId = orderedPrintItemIds[fromIndex + delta]
      if (!targetId) return
      dispatch({
        type: 'setOrderedPrintItemIds',
        itemIds: reorderPrintItemIds(orderedPrintItemIds, itemId, targetId),
      })
    },
    [dispatch, orderedPrintItemIds],
  )

  /**
   * 明细行右键菜单(与提货单明细行同一套口径): 顺序调整的**非拖动替代**。
   *
   * <p>WCAG 2.2 SC 2.5.7 要求拖动功能能用单指针在不拖动的情况下完成 —— 右键点开菜单
   * 选「上移 / 下移」即满足; 边界项按位次禁用, 元素上的键位说明由
   * `RowContextMenuRow` 补 Shift+F10。</p>
   */
  const rowMenus = useMemo<RowContextMenuMap>(() => {
    const menus: RowContextMenuMap = new Map()
    orderedPrintItems.forEach((item, index) => {
      menus.set(item.id, {
        // 可访问名带行名, 读屏用户能区分是「哪一行」的菜单
        ariaLabel: t('modules.print.rowContextMenuLabel', {
          name: printItemRowName(item, t),
        }),
        items: [
          {
            key: PRINT_ITEM_MOVE_UP,
            label: t('modules.print.moveItemUp'),
            icon: <ArrowUpOutlined />,
            disabled: index <= 0,
          },
          {
            key: PRINT_ITEM_MOVE_DOWN,
            label: t('modules.print.moveItemDown'),
            icon: <ArrowDownOutlined />,
            disabled: index >= orderedPrintItems.length - 1,
          },
        ],
        onClick: ({ key }) => {
          if (key === PRINT_ITEM_MOVE_UP) movePrintItem(item.id, -1)
          if (key === PRINT_ITEM_MOVE_DOWN) movePrintItem(item.id, 1)
        },
      })
    })
    return menus
  }, [movePrintItem, orderedPrintItems, t])

  const columns: TableProps<PrintRecordItem>['columns'] = [
    {
      key: 'drag',
      width: 36,
      align: 'center',
      render: (_, item, index) => (
        <DragHandle
          label={t('modules.print.dragRowAriaLabel', {
            index: printItemRowNumber(item.id, index),
          })}
        />
      ),
    },
    {
      /*
       * 顺序列: 可点击的上移/下移 —— WCAG 2.2 SC 2.5.7 要求的"单指针、非拖动"替代。
       * 右键行菜单里也有同一组动作, 但菜单要求按次要键, 不能单独作为替代。
       */
      key: 'rowReorder',
      width: 76,
      align: 'center',
      title: t('common.rowDragSort.moveColumnTitle'),
      render: (_, item, index) => {
        const itemIndex = orderedPrintItems.findIndex(
          (entry) => entry.id === item.id,
        )
        // 不在有序集合里(上游刚换数据)时不渲染按钮, 而不是给两个永远禁用的按钮
        if (itemIndex < 0) return null
        return (
          <RowReorderButtons
            canMoveDown={itemIndex < orderedPrintItems.length - 1}
            canMoveUp={itemIndex > 0}
            label={t('common.rowDragSort.rowWithName', {
              index: printItemRowNumber(item.id, index),
              name: printItemRowName(item, t),
            })}
            onMove={(delta) => movePrintItem(item.id, delta)}
          />
        )
      },
    },
    {
      key: 'sequence',
      width: 56,
      align: 'center',
      title: t('modules.print.itemSequence'),
      render: (_, item, index) => (
        <Space size={4}>
          <span>{printItemRowNumber(item.id, index)}</span>
          {outputPrintItemIdSet.has(item.id) ? (
            <Tooltip title={t('modules.print.outputted')}>
              <CheckCircleFilled style={{ color: token.colorSuccess }} />
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
    ...(splitColumnEnabled
      ? [
          {
            key: 'split',
            width: 64,
            align: 'center' as const,
            title: t('modules.print.itemSplit'),
            render: (_: unknown, item: PrintRecordItem) => (
              <Tooltip
                title={
                  splitPieceCount
                    ? undefined
                    : t('modules.print.splitPieceCountRequired')
                }
              >
                <Checkbox
                  checked={splitItemIdSet.has(item.id)}
                  disabled={!splitPieceCount}
                  onChange={() => onToggleSplitItem(item.id)}
                />
              </Tooltip>
            ),
          },
        ]
      : []),
    ...printItemFields.flatMap((field: PrintItemFieldSpec) => {
      const itemColumn = {
        key: field.key,
        width:
          field.key === 'brand' && showMergeGroup
            ? 136
            : getPrintItemColumnWidth(field),
        align: getPrintItemColumnAlign(field, moduleKey),
        ellipsis: true,
        title: t(field.labelKey),
        render: (_: unknown, item: PrintRecordItem) => {
          if (field.key !== 'brand') {
            return printItemCellText(field.key, item[field.key])
          }
          const mergeMarker = showMergeGroup
            ? mergeMarkersByItemId[item.id]
            : undefined
          return (
            <span className="flex min-w-0 items-center gap-1">
              {mergeMarker ? (
                <Tag
                  className="m-0"
                  color="processing"
                  title={`${mergeMarker.itemCount} ${t('modules.print.mergeRows')}`}
                >
                  {mergeMarker.groupIndex}
                </Tag>
              ) : null}
              <Typography.Text
                ellipsis={{ tooltip: true }}
                style={{ minWidth: 0, flex: 1 }}
              >
                {fieldText(item.brand)}
              </Typography.Text>
            </span>
          )
        },
      }
      if (field.key !== 'brand' || !brandOverrideEnabled) {
        return [itemColumn]
      }
      return [
        itemColumn,
        {
          key: 'brandOverrideTo',
          width: 132,
          align: 'left' as const,
          title: t('modules.print.brandOverrideTo'),
          render: (_: unknown, item: PrintRecordItem) => (
            <Input
              maxLength={64}
              onChange={(event) =>
                dispatch({
                  type: 'setBrandOverride',
                  itemId: item.id,
                  value: event.target.value,
                })
              }
              placeholder={t('modules.print.brandOverridePlaceholder')}
              size="small"
              value={brandOverridesByItemId[item.id] || ''}
              variant="filled"
            />
          ),
        },
      ]
    }),
  ]

  const tableEmptyText = printItemsError ? (
    <div className="flex flex-col items-center gap-2 py-4">
      <Typography.Text type="secondary">
        {t('modules.print.printItemsLoadFailed')}
      </Typography.Text>
      <Button size="small" onClick={onRetryPrintItems}>
        {t('common.retry')}
      </Button>
    </div>
  ) : (
    t('modules.print.noPrintItems')
  )

  const expandedSplitRowKeys = Object.keys(splitPartsByItemId)
  const splitExpandable: TableProps<PrintRecordItem>['expandable'] =
    splitColumnEnabled
      ? {
          expandedRowKeys: expandedSplitRowKeys,
          expandedRowRender: (item) => (
            <PrintJobSplitPartsTable
              itemId={item.id}
              parts={splitPartsByItemId[item.id] ?? []}
            />
          ),
          rowExpandable: (item) => item.id in splitPartsByItemId,
          showExpandColumn: false,
        }
      : undefined

  const printItemsTable = (items: PrintRecordItem[]) => (
    <Table<PrintRecordItem>
      columns={columns}
      components={{ body: { row: SortableRow } }}
      dataSource={items}
      expandable={splitExpandable}
      locale={{ emptyText: tableEmptyText }}
      pagination={false}
      rowKey={(item) => item.id}
      rowSelection={rowSelection}
      scroll={
        isStatementPrintModule
          ? undefined
          : { y: brandOverrideEnabled ? 376 : 320 }
      }
      size="small"
    />
  )

  const statementGroups = getStatementPrintItemGroups(
    moduleKey,
    orderedPrintItems as PrintGroupItem[],
  )

  const table =
    statementGroups.length > 0 ? (
      <div className="module-items-groups">
        {statementGroups.map((group) => (
          <div className="module-items-group" key={group.key}>
            {'projectGroups' in group ? (
              <>
                <FreightStatementItemGroupHeader group={group} />
                {group.projectGroups.map((projectGroup) => (
                  <div
                    className="module-items-project-group"
                    key={projectGroup.key}
                  >
                    <FreightStatementProjectGroupHeader
                      group={projectGroup}
                      showSubtotal={false}
                    />
                    {printItemsTable(projectGroup.items as PrintRecordItem[])}
                  </div>
                ))}
              </>
            ) : (
              <>
                <CustomerStatementItemGroupHeader group={group} />
                {printItemsTable(group.items as PrintRecordItem[])}
              </>
            )}
          </div>
        ))}
      </div>
    ) : (
      printItemsTable(orderedPrintItems)
    )

  // 行菜单挂在行容器上(components.body.row), 由行按 data-row-key 取用, 故按行 key 注入。
  return (
    <RowContextMenuContext.Provider value={rowMenus}>
      {table}
    </RowContextMenuContext.Provider>
  )
}
