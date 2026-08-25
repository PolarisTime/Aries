import { MenuOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Checkbox, Input, InputNumber, Select } from 'antd'
import type { WarehouseOption } from '@/api/master/warehouse-options'
import { DocumentReferencePopover } from '@/components/DocumentReferencePopover'
import { isDocumentReferenceField } from '@/components/document-reference/document-reference-utils'
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
import { shouldDisplayPieceWeightAsDash } from '@/module-system/presentation/module-line-item-display'
import type {
  ModuleColumnDefinition,
  ModuleLineItem,
  ModulePageConfig,
} from '@/types/module-page'
import {
  createPinyinFilterOption,
  createStructuredMaterialFilterOption,
} from '@/utils/pinyin-search'
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

interface MaterialOption {
  disabled?: boolean
  label: string
  value: string
  code: string
  brand: string
  material: string
  category: string
  spec: string
  length: string
}

interface EditableRenderOptions {
  config: ModulePageConfig
  materialOptions: MaterialOption[]
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
  draggable?: boolean
  items: ModuleLineItem[]
  selectedItemIds: string[]
  onSelectAll: (checked: boolean) => void
  onSelectItem: (itemId: string, checked: boolean) => void
  onDragStart: (itemId: string, event: React.DragEvent) => void
  onDragOver: (itemId: string, event: React.DragEvent) => void
  onDragEnd: () => void
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
  contextModuleKey?: string,
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
    return (
      <DocumentReferencePopover
        value={value}
        fieldKey={key}
        contextModuleKey={contextModuleKey}
        documentLabel={key}
        summary={{
          counterpartyName:
            asString(record?.customerName) ||
            asString(record?.supplierName) ||
            asString(record?.carrierName),
          amount:
            typeof record?.amount === 'number' ||
            typeof record?.amount === 'string'
              ? record.amount
              : undefined,
          status: asString(record?.status),
        }}
      />
    )
  }
  return formatCellValue(value, type)
}

function shouldRenderEditablePieceWeight(moduleKey: string, columnKey: string) {
  return isPurchaseOrder(moduleKey) && columnKey === 'pieceWeightTon'
}

function buildMaterialSnapshotLabel(record: ModuleLineItem) {
  const materialName =
    typeof record.materialName === 'string' ? record.materialName.trim() : ''
  return [
    asString(record.brand).trim() || materialName,
    asString(record.category).trim(),
    asString(record.material).trim(),
    asString(record.spec).trim(),
    asString(record.length).trim(),
  ]
    .filter(Boolean)
    .join(' | ')
}

function withCurrentMaterialOption(
  materialOptions: MaterialOption[],
  record: ModuleLineItem,
) {
  const materialId = asString(record.materialId).trim()
  if (!materialId) {
    return materialOptions
  }
  if (materialOptions.some((option) => option.value === materialId)) {
    return materialOptions
  }

  const materialCode = asString(record.materialCode).trim()
  const label = buildMaterialSnapshotLabel(record) || materialCode
  if (!label) {
    return materialOptions
  }

  return [
    {
      disabled: true,
      label,
      code: materialCode,
      brand: asString(record.brand).trim(),
      material: asString(record.material).trim(),
      category: asString(record.category).trim(),
      spec: asString(record.spec).trim(),
      length: asString(record.length).trim(),
      value: materialId,
    },
    ...materialOptions,
  ]
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

  return (key: string, type: string | undefined) =>
    (value: unknown, record: ModuleLineItem) => {
      if (!isItemColumnEditable(key, record)) {
        return renderReadOnlyValue(
          value,
          type,
          config.statusMap,
          formatCellValue,
          record,
          key,
          config.key,
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
          config.key,
        )
      }

      if (key === 'materialCode') {
        const materialValue = asString(record.materialId).trim()
        return (
          <Select
            value={materialValue || undefined}
            showSearch={{
              filterOption: createStructuredMaterialFilterOption(),
            }}
            allowClear
            className="w-full"
            placeholder="搜索品牌 / 类别 / 材质 / 规格 / 长度"
            optionLabelProp="label"
            onChange={(selectedValue) =>
              handleMaterialSelect(record.id, String(selectedValue || ''))
            }
            options={withCurrentMaterialOption(materialOptions, record)}
          />
        )
      }

      if (key === 'warehouseName') {
        const warehouseValue = asString(record.warehouseId).trim()
        return (
          <Select
            value={warehouseValue || undefined}
            showSearch={{ filterOption: createPinyinFilterOption() }}
            allowClear
            className="w-full"
            placeholder="选择码头"
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
            config.key,
          )
        }
        return (
          <InputNumber
            value={asNumber(value)}
            className="w-full module-editor-number-input"
            data-module-editor-number-column={key}
            min={0}
            precision={3}
            controls={false}
            onKeyDown={(event) => handleNumberCellTab(event, key)}
            onChange={(nextValue) =>
              handleItemNumberChange(record.id, key, nextValue)
            }
          />
        )
      }

      if (key === 'settlementMode') {
        return (
          <Select
            value={
              typeof record.settlementMode === 'string'
                ? record.settlementMode
                : undefined
            }
            className="w-full"
            placeholder="选择结算方式"
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

      if (isNumberEditorColumn(key)) {
        const precision = getEditorItemPrecision(key)
        const min = getEditorItemMin(key, config.key)
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
            precision={precision}
            controls={!hideControls}
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

export function buildModuleEditorManagementColumns({
  draggable = true,
  items,
  selectedItemIds,
  onSelectAll,
  onSelectItem,
  onDragStart,
  onDragOver,
  onDragEnd,
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
      render: (_: unknown, record: ModuleLineItem, index: number) => (
        <span
          draggable={draggable}
          onDragStart={
            draggable ? (event) => onDragStart(record.id, event) : undefined
          }
          onDragOver={
            draggable ? (event) => onDragOver(record.id, event) : undefined
          }
          onDragEnd={draggable ? onDragEnd : undefined}
          className={draggable ? 'cursor-grab' : undefined}
        >
          {draggable ? (
            <MenuOutlined className="mr-4 opacity-45 text-xs" />
          ) : null}
          {index + 1}
        </span>
      ),
    },
  ]
}

export function buildModuleEditorDataColumns({
  config,
  itemColumns,
  materialOptions,
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
    warehouses,
    formatCellValue,
    isItemColumnEditable,
    handleItemInputChange,
    handleItemNumberChange,
    handleMaterialSelect,
    handleSettlementModeChange,
    handleWarehouseSelect,
  })

  return itemColumns.map((column) => ({
    title: column.title,
    dataIndex: column.dataIndex,
    key: column.dataIndex,
    width: resolveEditorItemColumnWidth(column),
    align: column.align || 'center',
    ellipsis: true,
    render: renderEditableColumn(column.dataIndex, column.type),
  }))
}
