import type { TableColumnsType } from 'antd'
import { Checkbox, Input, InputNumber, Select } from 'antd'
import i18next from 'i18next'
import type { WarehouseOption } from '@/api/master/warehouse-options'
import {
  formatDocumentReferenceText,
  isDocumentReferenceField,
} from '@/components/document-reference/document-reference-utils'
import { StatusTag } from '@/components/StatusTag'
import {
  getEditorItemMin,
  getEditorItemPrecision,
  isNumberEditorColumn,
} from '@/module-system/adapter/module-adapter-editor'
import {
  isPurchaseInbound,
  isPurchaseOrder,
} from '@/module-system/core/module-category'
import type { MaterialSelectOption } from '@/module-system/editor/module-editor-material-options'
import { buildMaterialSnapshotLabel } from '@/module-system/editor/module-editor-material-options'
import type { MaterialSearchController } from '@/module-system/editor/module-editor-material-select'
import { ModuleEditorMaterialSelect } from '@/module-system/editor/module-editor-material-select'
import { shouldDisplayPieceWeightAsDash } from '@/module-system/presentation/module-line-item-display'
import type {
  ModuleColumnDefinition,
  ModuleLineItem,
  ModulePageConfig,
} from '@/types/module-page'
import { createPinyinFilterOption } from '@/utils/pinyin-search'
import { asNumber, asString } from '@/utils/type-narrowing'

const EDITOR_ITEM_COLUMN_MIN_WIDTHS: Readonly<Record<string, number>> = {
  materialCode: 330,
  brand: 85,
}

function resolveEditorItemColumnWidth(column: ModuleColumnDefinition) {
  const minWidth = EDITOR_ITEM_COLUMN_MIN_WIDTHS[column.dataIndex]
  return minWidth === undefined
    ? column.width
    : Math.max(column.width ?? 0, minWidth)
}

interface EditableRenderOptions {
  config: ModulePageConfig
  materialOptions: MaterialSelectOption[]
  materialSearch: MaterialSearchController
  warehouses: WarehouseOption[]
  formatCellValue: (value: unknown, columnType?: string) => string
  isItemColumnEditable: (columnKey: string, record?: ModuleLineItem) => boolean
  handleItemNumberChange: (itemId: string, key: string, value: unknown) => void
  handleItemInputChange: (itemId: string, key: string, value: string) => void
  handleMaterialSelect: (itemId: string, materialId: string) => void
  handleWarehouseSelect: (
    itemId: string,
    warehouseId: string,
    warehouse?: WarehouseOption | null,
  ) => void
  handleSettlementModeChange: (itemId: string, settlementMode: string) => void
}

interface ManagementColumnOptions {
  items: ModuleLineItem[]
  selectedItemIds: string[]
  onSelectAll: (checked: boolean) => void
  onSelectItem: (itemId: string, checked: boolean) => void
}

const NUMBER_COLUMN_DATA_ATTRIBUTE = 'data-module-editor-number-column'

function handleNumberCellTab(
  event: React.KeyboardEvent<HTMLInputElement>,
  columnKey: string,
) {
  if (event.key !== 'Tab' || event.shiftKey || event.nativeEvent.isComposing) {
    return
  }

  const currentRow = event.currentTarget.closest('tr')
  const tableBody = currentRow?.parentElement
  if (!currentRow || !tableBody) {
    return
  }

  const rows = Array.from(tableBody.children)
  const currentRowIndex = rows.indexOf(currentRow)
  const columnSelector = `.module-editor-number-input input[${NUMBER_COLUMN_DATA_ATTRIBUTE}="${columnKey}"]:not(:disabled)`

  for (const row of rows.slice(currentRowIndex + 1)) {
    const nextInput = row.querySelector<HTMLInputElement>(columnSelector)
    if (!nextInput) {
      continue
    }

    event.preventDefault()
    requestAnimationFrame(() => {
      if (!nextInput.isConnected || nextInput.disabled) {
        return
      }
      nextInput.focus({ preventScroll: true })
      nextInput.select()
      nextInput.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
    return
  }
}

function renderReadOnlyValue(
  value: unknown,
  type: string | undefined,
  statusMap: ModulePageConfig['statusMap'],
  formatCellValue: (value: unknown, columnType?: string) => string,
  record?: ModuleLineItem,
  key?: string,
) {
  if (key === 'pieceWeightTon' && shouldDisplayPieceWeightAsDash(record)) {
    return '-'
  }
  // 商品编码只读态与编辑态一致显示中文物料快照，避免回显成数字编码
  if (key === 'materialCode' && record) {
    const label = buildMaterialSnapshotLabel(record)
    if (label) {
      return label
    }
  }
  if (type === 'status') {
    const statusValue = typeof value === 'string' ? value : ''
    return (
      <StatusTag
        status={statusValue}
        statusMap={statusMap ?? {}}
        fallback={statusValue || '--'}
      />
    )
  }
  if (key && isDocumentReferenceField(key)) {
    // 编辑器只读列只展示单号纯文本（文本口径见 formatDocumentReferenceText）
    return formatDocumentReferenceText(value) || '-'
  }
  return formatCellValue(value, type)
}

function shouldRenderEditablePieceWeight(moduleKey: string, columnKey: string) {
  return isPurchaseOrder(moduleKey) && columnKey === 'pieceWeightTon'
}

function withCurrentWarehouseOption(
  warehouses: WarehouseOption[],
  record: ModuleLineItem,
): Array<WarehouseOption & { disabled?: boolean }> {
  const warehouseId = asString(record.warehouseId).trim()
  if (
    !warehouseId ||
    warehouses.some((option) => option.value === warehouseId)
  ) {
    return warehouses
  }
  const warehouseName = asString(record.warehouseName).trim()
  if (!warehouseName) {
    return warehouses
  }
  return [
    {
      disabled: true,
      id: warehouseId,
      value: warehouseId,
      label: warehouseName,
      warehouseCode: '',
      warehouseName,
    },
    ...warehouses,
  ]
}

function buildEditableColumnRender({
  config,
  materialOptions,
  materialSearch,
  warehouses,
  formatCellValue,
  isItemColumnEditable,
  handleItemInputChange,
  handleItemNumberChange,
  handleMaterialSelect,
  handleSettlementModeChange,
  handleWarehouseSelect,
}: EditableRenderOptions) {
  const settlementModeOptions = ['理算', '过磅']

  return (column: ModuleColumnDefinition) =>
    (value: unknown, record: ModuleLineItem) => {
      const key = column.dataIndex
      const type = column.type
      const editor = column.editor
      if (!isItemColumnEditable(key, record)) {
        return renderReadOnlyValue(
          value,
          type,
          config.statusMap,
          formatCellValue,
          record,
          key,
        )
      }

      if (
        key === 'pieceWeightTon' &&
        shouldDisplayPieceWeightAsDash(record) &&
        !shouldRenderEditablePieceWeight(config.key, key)
      ) {
        return renderReadOnlyValue(
          value,
          type,
          config.statusMap,
          formatCellValue,
          record,
          key,
        )
      }

      if (editor?.control === 'material' || key === 'materialCode') {
        return (
          <ModuleEditorMaterialSelect
            record={record}
            options={materialOptions}
            search={materialSearch}
            onChange={(materialId) =>
              handleMaterialSelect(record.id, materialId)
            }
          />
        )
      }

      if (editor?.control === 'warehouse' || key === 'warehouseName') {
        const warehouseValue = asString(record.warehouseId).trim()
        return (
          <Select
            value={warehouseValue || undefined}
            showSearch={{ filterOption: createPinyinFilterOption() }}
            allowClear
            className="w-full"
            placeholder={i18next.t('modules.itemColumns.warehousePlaceholder')}
            onChange={(selectedValue) => {
              const warehouseId = String(selectedValue || '')
              const warehouse = warehouses.find(
                (option) => option.value === warehouseId,
              )
              handleWarehouseSelect(record.id, warehouseId, warehouse || null)
            }}
            options={withCurrentWarehouseOption(warehouses, record)}
          />
        )
      }

      if (key === 'weighWeightTon' && isPurchaseInbound(config.key)) {
        const isWeigh = asString(record.settlementMode) === '过磅'
        const displayValue = isWeigh
          ? asNumber(value)
          : asNumber(record.weightTon)
        if (!isWeigh) {
          return renderReadOnlyValue(
            displayValue,
            type,
            config.statusMap,
            formatCellValue,
            record,
            key,
          )
        }
        return (
          <InputNumber
            value={asNumber(value)}
            className="w-full module-editor-number-input"
            data-module-editor-number-column={key}
            min={editor?.min ?? 0}
            precision={editor?.precision ?? 3}
            controls={editor?.controls ?? false}
            onKeyDown={(event) => handleNumberCellTab(event, key)}
            onChange={(nextValue) =>
              handleItemNumberChange(record.id, key, nextValue)
            }
          />
        )
      }

      if (editor?.control === 'settlementMode' || key === 'settlementMode') {
        return (
          <Select
            value={
              typeof record.settlementMode === 'string'
                ? record.settlementMode
                : undefined
            }
            className="w-full"
            placeholder={i18next.t(
              'modules.itemColumns.settlementModePlaceholder',
            )}
            onChange={(selectedValue: string) =>
              handleSettlementModeChange(record.id, selectedValue)
            }
            options={settlementModeOptions.map((mode) => ({
              label: mode,
              value: mode,
            }))}
          />
        )
      }

      if (editor?.control === 'number' || isNumberEditorColumn(key)) {
        const precision = getEditorItemPrecision(key)
        const moduleMin = getEditorItemMin(key, config.key)
        // 采购数量至少为 1，这是模块业务规则，优先于公共字段默认下限。
        const min = key === 'quantity' ? moduleMin : (editor?.min ?? moduleMin)
        const hideControls = [
          'quantity',
          'pieceWeightTon',
          'unitPrice',
          'weightTon',
        ].includes(key)

        return (
          <InputNumber
            value={asNumber(value)}
            className="w-full module-editor-number-input"
            data-module-editor-number-column={key}
            min={min}
            precision={editor?.precision ?? precision}
            controls={editor?.controls ?? !hideControls}
            onKeyDown={(event) => handleNumberCellTab(event, key)}
            onChange={(nextValue) =>
              handleItemNumberChange(record.id, key, nextValue)
            }
          />
        )
      }

      return (
        <Input
          value={typeof value === 'string' ? value : ''}
          onChange={(event) =>
            handleItemInputChange(record.id, key, event.target.value)
          }
        />
      )
    }
}

/**
 * 管理列: 行选择框 + 序号。
 *
 * <p>序号列**不再兼作拖动手柄**: 行列顺序改由整行长按拖动(共享能力
 * `@/components/table/row-drag`)承担, 因此这里只保留序号本身, 不再挂
 * `draggable` / drag 事件, 也不再多占一列用于拖动。</p>
 */
export function buildModuleEditorManagementColumns({
  items,
  selectedItemIds,
  onSelectAll,
  onSelectItem,
}: ManagementColumnOptions): TableColumnsType<ModuleLineItem> {
  return [
    {
      title: (
        <Checkbox
          checked={selectedItemIds.length === items.length && items.length > 0}
          indeterminate={
            selectedItemIds.length > 0 && selectedItemIds.length < items.length
          }
          onChange={(event) => onSelectAll(event.target.checked)}
        />
      ),
      dataIndex: 'id',
      key: 'selection',
      width: 48,
      fixed: 'left',
      align: 'center',
      render: (_: unknown, record: ModuleLineItem) => (
        <Checkbox
          checked={selectedItemIds.includes(record.id)}
          onChange={(event) => onSelectItem(record.id, event.target.checked)}
        />
      ),
    },
    {
      title: '#',
      key: '_index',
      width: 56,
      fixed: 'left',
      align: 'center',
      render: (_: unknown, _record: ModuleLineItem, index: number) => (
        <span>{index + 1}</span>
      ),
    },
  ]
}

export function buildModuleEditorDataColumns({
  config,
  itemColumns,
  materialOptions,
  materialSearch,
  warehouses,
  formatCellValue,
  isItemColumnEditable,
  handleItemInputChange,
  handleItemNumberChange,
  handleMaterialSelect,
  handleSettlementModeChange,
  handleWarehouseSelect,
}: EditableRenderOptions & {
  itemColumns: ModuleColumnDefinition[]
}): TableColumnsType<ModuleLineItem> {
  const renderEditableColumn = buildEditableColumnRender({
    config,
    materialOptions,
    materialSearch,
    warehouses,
    formatCellValue,
    isItemColumnEditable,
    handleItemInputChange,
    handleItemNumberChange,
    handleMaterialSelect,
    handleSettlementModeChange,
    handleWarehouseSelect,
  })

  return itemColumns.map((column) => {
    /*
     * 列显式声明 `renderInEditor` 时, 编辑器明细表的**只读**单元格交给列自己的 render。
     *
     * <p>默认仍然走统一只读格式化: 派生数量这类列的行值本来就在行上, 输出保持不变;
     * 而"值不在明细行上"的列(如销售订单「网价匹配」状态快照, 按行 id 订阅页面级 store)
     * 只能靠列渲染, 不声明就只会显示一个 '-'。声明了 editor 或该行可编辑的列一律不受影响,
     * 编辑控件不会被自定义渲染抢走。</p>
     */
    const customRender: ModuleColumnDefinition['render'] = column.renderInEditor
      ? column.render
      : undefined
    return {
      title: column.title,
      dataIndex: column.dataIndex,
      key: column.dataIndex,
      width: resolveEditorItemColumnWidth(column),
      align: column.align || 'center',
      ellipsis: true,
      render: (value: unknown, record: ModuleLineItem) =>
        customRender && !isItemColumnEditable(column.dataIndex, record)
          ? customRender(value, record)
          : renderEditableColumn(column)(value, record),
    }
  })
}
