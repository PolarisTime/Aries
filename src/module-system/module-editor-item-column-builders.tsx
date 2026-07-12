import { MenuOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Checkbox, Input, InputNumber, Select } from 'antd'
import type { WarehouseOption } from '@/api/warehouse-options'
import { StatusTag } from '@/components/StatusTag'
import {
  getEditorItemMin,
  getEditorItemPrecision,
  isNumberEditorColumn,
} from '@/module-system/module-adapter-editor'
import { shouldDisplayPieceWeightAsDash } from '@/module-system/module-line-item-display'
import type {
  ModuleColumnDefinition,
  ModuleLineItem,
  ModulePageConfig,
} from '@/types/module-page'
import { createPinyinFilterOption } from '@/utils/pinyin-search'
import { asNumber, asString } from '@/utils/type-narrowing'

interface MaterialOption {
  disabled?: boolean
  label: string
  searchText: string
  value: string
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
  items: ModuleLineItem[]
  selectedItemIds: string[]
  onSelectAll: (checked: boolean) => void
  onSelectItem: (itemId: string, checked: boolean) => void
  onDragStart: (itemId: string, event: React.DragEvent) => void
  onDragOver: (itemId: string, event: React.DragEvent) => void
  onDragEnd: () => void
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
  return formatCellValue(value, type)
}

function shouldRenderEditablePieceWeight(moduleKey: string, columnKey: string) {
  return moduleKey === 'purchase-order' && columnKey === 'pieceWeightTon'
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
      searchText: [materialCode, label].filter(Boolean).join(' ').toLowerCase(),
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

      if (key === 'materialCode') {
        const materialValue = asString(record.materialId).trim()
        return (
          <Select
            value={materialValue || undefined}
            showSearch={{
              filterOption: (input, option) => {
                const keywords = input.trim().toLowerCase().split(/\s+/)
                const searchText = (option?.searchText || '').toLowerCase()
                return keywords.every((kw) => searchText.includes(kw))
              },
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

      if (key === 'weighWeightTon' && config.key === 'purchase-inbound') {
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
            min={0}
            precision={3}
            controls={false}
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
        const min = getEditorItemMin(key)
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
            min={min}
            precision={precision}
            controls={!hideControls}
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
          draggable
          onDragStart={(event) => onDragStart(record.id, event)}
          onDragOver={(event) => onDragOver(record.id, event)}
          onDragEnd={onDragEnd}
          className="cursor-grab"
        >
          <MenuOutlined className="mr-4 opacity-45 text-xs" />
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
    width: column.width,
    align: column.align || 'center',
    ellipsis: true,
    render: renderEditableColumn(column.dataIndex, column.type),
  }))
}
