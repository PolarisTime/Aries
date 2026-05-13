import { MenuOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import Checkbox from 'antd/es/checkbox'
import Input from 'antd/es/input'
import InputNumber from 'antd/es/input-number'
import Select from 'antd/es/select'
import type {
  ModuleColumnDefinition,
  ModuleLineItem,
  ModulePageConfig,
} from '@/types/module-page'
import {
  getEditorItemMin,
  getEditorItemPrecision,
  isNumberEditorColumn,
} from '@/views/modules/module-adapter-editor'

interface MaterialOption {
  label: string
  searchText: string
  value: string
}

interface EditableRenderOptions {
  config: ModulePageConfig
  materialOptions: MaterialOption[]
  warehouses: Array<{ label: string; value: string }>
  formatCellValue: (value: unknown, columnType?: string) => string
  isItemColumnEditable: (columnKey: string) => boolean
  handleItemNumberChange: (itemId: string, key: string, value: unknown) => void
  handleItemInputChange: (itemId: string, key: string, value: string) => void
  handleMaterialSelect: (itemId: string, materialCode: string) => void
  handleWarehouseSelect: (itemId: string, warehouseName: string) => void
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
) {
  if (type === 'status') {
    const statusValue = typeof value === 'string' ? value : ''
    const meta = statusMap?.[statusValue]
    return (
      <span className={`ant-tag ant-tag-${meta?.color || 'default'}`}>
        {meta?.text || statusValue || '--'}
      </span>
    )
  }
  return formatCellValue(value, type)
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
      if (!isItemColumnEditable(key)) {
        return renderReadOnlyValue(
          value,
          type,
          config.statusMap,
          formatCellValue,
        )
      }

      if (key === 'materialCode') {
        return (
          <Select
            value={
              typeof record.materialCode === 'string'
                ? record.materialCode
                : undefined
            }
            showSearch
            allowClear
            className="w-full"
            placeholder="搜索商品编码 / 品牌 / 材质 / 规格 / 长度"
            filterOption={(input, option) =>
              (option?.searchText || '').includes(input.trim().toLowerCase())
            }
            onChange={(selectedValue) =>
              handleMaterialSelect(record.id, String(selectedValue || ''))
            }
            options={materialOptions}
          />
        )
      }

      if (key === 'warehouseName') {
        return (
          <Select
            value={
              typeof record.warehouseName === 'string'
                ? record.warehouseName
                : undefined
            }
            showSearch
            allowClear
            className="w-full"
            placeholder="选择码头"
            filterOption={(input, option) =>
              String(option?.label || '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            onChange={(selectedValue: string) =>
              handleWarehouseSelect(record.id, selectedValue)
            }
            options={warehouses.map((warehouse) => ({
              label: warehouse.label,
              value: warehouse.value,
            }))}
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
        const hideControls = ['quantity', 'unitPrice', 'weightTon'].includes(
          key,
        )

        return (
          <InputNumber
            value={value as number}
            className="w-full"
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
          style={{ cursor: 'grab' }}
        >
          <MenuOutlined
            style={{ marginRight: 4, opacity: 0.45, fontSize: 12 }}
          />
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
