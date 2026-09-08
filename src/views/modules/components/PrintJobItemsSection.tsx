import { CheckCircleFilled, HolderOutlined } from '@ant-design/icons'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TableProps } from 'antd'
import {
  Button,
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
  useContext,
  useMemo,
} from 'react'
import { useTranslation } from 'react-i18next'
import type { PrintRecordItem } from '@/api/system/print-template'
import type { PrintItemFieldSpec } from '@/utils/print-module-config'
import {
  getPrintItemColumnAlign,
  getPrintItemColumnWidth,
} from '@/utils/print-module-config'
import {
  fieldText,
  printItemCellText,
} from '@/views/modules/components/print-job-modal-format'
import type { PrintJobModalAction } from '@/views/modules/components/print-job-modal-state'
import type { PrintItemMergeMarker } from '@/views/modules/components/print-job-modal-utils'
import { groupCustomerStatementItems } from '@/views/modules/customer-statement-item-groups'
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
  if (!context) return null
  return (
    <button
      {...context.dragAttributes}
      {...(context.dragListeners ?? {})}
      aria-label={label}
      className="inline-flex cursor-grab items-center border-0 bg-transparent p-0"
      ref={context.activatorNodeRef}
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
      <tr
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
      </tr>
    </RowDragContext.Provider>
  )
}

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
}

type PrintGroupItem = PrintRecordItem & Record<string, unknown>

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
}: Props) {
  const { t } = useTranslation()
  const { token } = theme.useToken()

  const rowSelection: TableProps<PrintRecordItem>['rowSelection'] = {
    align: 'center',
    columnWidth: 40,
    getCheckboxProps: () => ({ disabled: !itemSelectionEnabled }),
    getTitleCheckboxProps: () => ({ disabled: !itemSelectionEnabled }),
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

  const columns: TableProps<PrintRecordItem>['columns'] = [
    {
      key: 'drag',
      width: 36,
      align: 'center',
      render: (_, item) => (
        <DragHandle
          label={t('modules.print.dragRowAriaLabel', {
            index: orderedPrintItemIds.indexOf(item.id) + 1,
          })}
        />
      ),
    },
    {
      key: 'sequence',
      width: 56,
      align: 'center',
      title: t('modules.print.itemSequence'),
      render: (_, item) => (
        <Space size={4}>
          <span>{orderedPrintItemIds.indexOf(item.id) + 1}</span>
          {outputPrintItemIdSet.has(item.id) ? (
            <Tooltip title={t('modules.print.outputted')}>
              <CheckCircleFilled style={{ color: token.colorSuccess }} />
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
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

  const printItemsTable = (items: PrintRecordItem[]) => (
    <Table<PrintRecordItem>
      columns={columns}
      components={{ body: { row: SortableRow } }}
      dataSource={items}
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

  const customerStatementGroups =
    moduleKey === 'customer-statement'
      ? groupCustomerStatementItems(orderedPrintItems as PrintGroupItem[])
      : []
  const freightStatementGroups =
    moduleKey === 'freight-statement'
      ? groupFreightStatementItems(orderedPrintItems as PrintGroupItem[])
      : []

  return moduleKey === 'customer-statement' &&
    customerStatementGroups.length ? (
    <div className="module-items-groups">
      {customerStatementGroups.map((group) => (
        <div className="module-items-group" key={group.key}>
          <CustomerStatementItemGroupHeader group={group} />
          {printItemsTable(group.items as PrintRecordItem[])}
        </div>
      ))}
    </div>
  ) : moduleKey === 'freight-statement' && freightStatementGroups.length ? (
    <div className="module-items-groups">
      {freightStatementGroups.map((group) => (
        <div className="module-items-group" key={group.key}>
          <FreightStatementItemGroupHeader group={group} />
          {group.projectGroups.map((projectGroup) => (
            <div className="module-items-project-group" key={projectGroup.key}>
              <FreightStatementProjectGroupHeader
                group={projectGroup}
                showSubtotal={false}
              />
              {printItemsTable(projectGroup.items as PrintRecordItem[])}
            </div>
          ))}
        </div>
      ))}
    </div>
  ) : (
    printItemsTable(orderedPrintItems)
  )
}
