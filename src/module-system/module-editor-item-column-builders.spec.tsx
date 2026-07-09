import { fireEvent, render, screen } from '@testing-library/react'
import { isValidElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  buildModuleEditorDataColumns,
  buildModuleEditorManagementColumns,
} from './module-editor-item-column-builders'

vi.mock('./module-adapter-editor', () => ({
  getEditorItemMin: vi.fn(() => 0),
  getEditorItemPrecision: vi.fn(() => 2),
  isNumberEditorColumn: vi.fn((key) =>
    ['quantity', 'unitPrice', 'weightTon', 'amount', 'pieceWeightTon'].includes(
      key,
    ),
  ),
}))

const mockConfig = {
  key: 'test-module',
  statusMap: {
    draft: { text: '草稿', color: 'default' },
    approved: { text: '已审核', color: 'success' },
  },
}

const mockItemColumns = [
  { title: '数量', dataIndex: 'quantity', type: 'number', width: 100 },
  { title: '单价', dataIndex: 'unitPrice', type: 'number', width: 100 },
  { title: '件重', dataIndex: 'pieceWeightTon', type: 'number', width: 100 },
  { title: '名称', dataIndex: 'name', type: 'string', width: 150 },
  { title: '状态', dataIndex: 'status', type: 'status', width: 100 },
]

const mockItems = [
  { id: '1', quantity: 10, unitPrice: 100, name: 'Item 1', status: 'draft' },
  { id: '2', quantity: 20, unitPrice: 200, name: 'Item 2', status: 'approved' },
]

describe('buildModuleEditorManagementColumns', () => {
  const defaultProps = {
    items: mockItems,
    selectedItemIds: [],
    onSelectAll: vi.fn(),
    onSelectItem: vi.fn(),
    onDragStart: vi.fn(),
    onDragOver: vi.fn(),
    onDragEnd: vi.fn(),
  }

  it('returns 2 columns (selection and index)', () => {
    const columns = buildModuleEditorManagementColumns(defaultProps)
    expect(columns).toHaveLength(2)
  })

  it('first column is selection column', () => {
    const columns = buildModuleEditorManagementColumns(defaultProps)
    expect(columns[0].key).toBe('selection')
    expect(columns[0].dataIndex).toBe('id')
    expect(columns[0].fixed).toBe('left')
  })

  it('second column is index column', () => {
    const columns = buildModuleEditorManagementColumns(defaultProps)
    expect(columns[1].key).toBe('_index')
    expect(columns[1].fixed).toBe('left')
  })

  it('selection column renders checkbox header', { timeout: 15000 }, () => {
    const columns = buildModuleEditorManagementColumns(defaultProps)
    const SelectionHeader = columns[0].title as React.ReactElement
    render(
      <table>
        <thead>
          <tr>
            <th>{SelectionHeader}</th>
          </tr>
        </thead>
      </table>,
    )
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('selection column renders item checkbox', () => {
    const columns = buildModuleEditorManagementColumns(defaultProps)
    const SelectionRender = columns[0].render as Function
    render(
      <table>
        <tbody>
          <tr>{SelectionRender(null, mockItems[0], 0)}</tr>
        </tbody>
      </table>,
    )
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('index column renders drag handle and index', () => {
    const columns = buildModuleEditorManagementColumns(defaultProps)
    const IndexRender = columns[1].render as Function
    render(
      <table>
        <tbody>
          <tr>{IndexRender(null, mockItems[0], 0)}</tr>
        </tbody>
      </table>,
    )
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('selection header is indeterminate when some selected', () => {
    const props = { ...defaultProps, selectedItemIds: ['1'] }
    const columns = buildModuleEditorManagementColumns(props)
    const SelectionHeader = columns[0].title as React.ReactElement
    render(
      <table>
        <thead>
          <tr>
            <th>{SelectionHeader}</th>
          </tr>
        </thead>
      </table>,
    )
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkbox.indeterminate).toBe(true)
  })

  it('selection header is checked when all selected', () => {
    const props = { ...defaultProps, selectedItemIds: ['1', '2'] }
    const columns = buildModuleEditorManagementColumns(props)
    const SelectionHeader = columns[0].title as React.ReactElement
    render(
      <table>
        <thead>
          <tr>
            <th>{SelectionHeader}</th>
          </tr>
        </thead>
      </table>,
    )
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  })

  it('selection callbacks receive checkbox state', () => {
    const onSelectAll = vi.fn()
    const onSelectItem = vi.fn()
    const columns = buildModuleEditorManagementColumns({
      ...defaultProps,
      onSelectAll,
      onSelectItem,
    })

    render(
      <table>
        <thead>
          <tr>
            <th>{columns[0].title as React.ReactElement}</th>
          </tr>
        </thead>
        <tbody>
          <tr>{(columns[0].render as Function)(null, mockItems[0], 0)}</tr>
        </tbody>
      </table>,
    )

    const [headerCheckbox, itemCheckbox] = screen.getAllByRole('checkbox')
    fireEvent.click(headerCheckbox)
    fireEvent.click(itemCheckbox)

    expect(onSelectAll).toHaveBeenCalledWith(true)
    expect(onSelectItem).toHaveBeenCalledWith('1', true)
  })

  it('drag handle callbacks receive item id and event', () => {
    const onDragStart = vi.fn()
    const onDragOver = vi.fn()
    const onDragEnd = vi.fn()
    const columns = buildModuleEditorManagementColumns({
      ...defaultProps,
      onDragStart,
      onDragOver,
      onDragEnd,
    })

    render(
      <table>
        <tbody>
          <tr>{(columns[1].render as Function)(null, mockItems[0], 0)}</tr>
        </tbody>
      </table>,
    )

    const handle = screen.getByText('1')
    fireEvent.dragStart(handle)
    fireEvent.dragOver(handle)
    fireEvent.dragEnd(handle)

    expect(onDragStart).toHaveBeenCalledWith('1', expect.any(Object))
    expect(onDragOver).toHaveBeenCalledWith('1', expect.any(Object))
    expect(onDragEnd).toHaveBeenCalled()
  })
})

describe('buildModuleEditorDataColumns', () => {
  const defaultProps = {
    config: mockConfig,
    itemColumns: mockItemColumns,
    materialOptions: [],
    warehouses: [],
    formatCellValue: vi.fn((value) => String(value ?? '')),
    isItemColumnEditable: vi.fn(() => false),
    handleItemInputChange: vi.fn(),
    handleItemNumberChange: vi.fn(),
    handleMaterialSelect: vi.fn(),
    handleWarehouseSelect: vi.fn(),
    handleSettlementModeChange: vi.fn(),
  }

  it('returns columns matching itemColumns length', () => {
    const columns = buildModuleEditorDataColumns(defaultProps)
    expect(columns).toHaveLength(mockItemColumns.length)
  })

  it('maps column properties correctly', () => {
    const columns = buildModuleEditorDataColumns(defaultProps)
    columns.forEach((column, index) => {
      expect(column.title).toBe(mockItemColumns[index].title)
      expect(column.dataIndex).toBe(mockItemColumns[index].dataIndex)
      expect(column.key).toBe(mockItemColumns[index].dataIndex)
      expect(column.width).toBe(mockItemColumns[index].width)
    })
  })

  it('sets ellipsis to true', () => {
    const columns = buildModuleEditorDataColumns(defaultProps)
    columns.forEach((column) => {
      expect(column.ellipsis).toBe(true)
    })
  })

  it('sets default align to center', () => {
    const columns = buildModuleEditorDataColumns(defaultProps)
    columns.forEach((column) => {
      expect(column.align).toBe('center')
    })
  })

  it('renders read-only value for non-editable columns', () => {
    const columns = buildModuleEditorDataColumns(defaultProps)
    const nameColumn = columns.find((c) => c.dataIndex === 'name')
    const renderFn = nameColumn?.render as Function
    const { container } = render(
      <table>
        <tbody>
          <tr>{renderFn('Test Name', mockItems[0], 0)}</tr>
        </tbody>
      </table>,
    )
    expect(container.textContent).toContain('Test Name')
  })

  it('renders status tag for status columns', () => {
    const columns = buildModuleEditorDataColumns(defaultProps)
    const statusColumn = columns.find((c) => c.dataIndex === 'status')
    const renderFn = statusColumn?.render as Function
    render(
      <table>
        <tbody>
          <tr>{renderFn('draft', mockItems[0], 0)}</tr>
        </tbody>
      </table>,
    )
    expect(screen.getByText('草稿')).toBeInTheDocument()
  })

  it('renders input for editable string columns', () => {
    const editableProps = {
      ...defaultProps,
      isItemColumnEditable: vi.fn(() => true),
    }
    const columns = buildModuleEditorDataColumns(editableProps)
    const nameColumn = columns.find((c) => c.dataIndex === 'name')
    const renderFn = nameColumn?.render as Function
    const { container } = render(
      <table>
        <tbody>
          <tr>{renderFn('Test', mockItems[0], 0)}</tr>
        </tbody>
      </table>,
    )
    expect(container.querySelector('input')).toBeInTheDocument()
  })

  it('renders number input for editable number columns', () => {
    const editableProps = {
      ...defaultProps,
      isItemColumnEditable: vi.fn(() => true),
    }
    const columns = buildModuleEditorDataColumns(editableProps)
    const quantityColumn = columns.find((c) => c.dataIndex === 'quantity')
    const renderFn = quantityColumn?.render as Function
    const { container } = render(
      <table>
        <tbody>
          <tr>{renderFn(10, mockItems[0], 0)}</tr>
        </tbody>
      </table>,
    )
    expect(container.querySelector('input')).toBeInTheDocument()
  })

  it('returns material select props and filters by search text', () => {
    const handleMaterialSelect = vi.fn()
    const columns = buildModuleEditorDataColumns({
      ...defaultProps,
      isItemColumnEditable: vi.fn(() => true),
      materialOptions: [
        {
          label: '益海',
          searchText: '益海 yihai yh',
          value: 'MAT-1',
        },
      ],
      handleMaterialSelect,
      itemColumns: [
        {
          title: '物料编码',
          dataIndex: 'materialCode',
          type: 'string',
          width: 120,
        },
      ],
    })
    const materialColumn = columns.find((c) => c.dataIndex === 'materialCode')
    const element = (materialColumn?.render as Function)(
      'MAT-1',
      { ...mockItems[0], materialCode: 'MAT-1' },
      0,
    )

    expect(isValidElement(element)).toBe(true)
    if (!isValidElement(element)) return
    expect(element.props.value).toBe('MAT-1')
    expect(
      element.props.showSearch.filterOption('yi yh', {
        searchText: '益海 yihai yh',
      }),
    ).toBe(true)
    expect(
      element.props.showSearch.filterOption('missing', {
        searchText: '益海 yihai yh',
      }),
    ).toBe(false)

    element.props.onChange(undefined)
    expect(handleMaterialSelect).toHaveBeenCalledWith('1', '')
  })

  it('uses undefined material value and empty search text fallback', () => {
    const columns = buildModuleEditorDataColumns({
      ...defaultProps,
      isItemColumnEditable: vi.fn(() => true),
      itemColumns: [
        {
          title: '物料编码',
          dataIndex: 'materialCode',
          type: 'string',
          width: 120,
        },
      ],
    })
    const element = (columns[0].render as Function)(
      undefined,
      { ...mockItems[0], materialCode: 123 },
      0,
    )

    expect(isValidElement(element)).toBe(true)
    if (!isValidElement(element)) return
    expect(element.props.value).toBeUndefined()
    expect(element.props.showSearch.filterOption('', {})).toBe(true)
  })

  it('adds current material snapshot when material option list does not contain the selected value', () => {
    const columns = buildModuleEditorDataColumns({
      ...defaultProps,
      isItemColumnEditable: vi.fn(() => true),
      materialOptions: [],
      itemColumns: [
        {
          title: '物料编码',
          dataIndex: 'materialCode',
          type: 'string',
          width: 120,
        },
      ],
    })
    const element = (columns[0].render as Function)(
      '330050675528433664',
      {
        ...mockItems[0],
        materialCode: '330050675528433664',
        brand: '中天',
        category: '螺纹钢',
        material: 'HRB400',
        spec: '18',
        length: '9m',
      },
      0,
    )

    expect(isValidElement(element)).toBe(true)
    if (!isValidElement(element)) return
    expect(element.props.value).toBe('330050675528433664')
    expect(element.props.optionLabelProp).toBe('label')
    expect(element.props.options).toEqual([
      expect.objectContaining({
        label: '中天 | 螺纹钢 | HRB400 | 18 | 9m',
        value: '330050675528433664',
      }),
    ])
  })

  it('returns warehouse select props and maps warehouse options', () => {
    const handleWarehouseSelect = vi.fn()
    const columns = buildModuleEditorDataColumns({
      ...defaultProps,
      isItemColumnEditable: vi.fn(() => true),
      warehouses: [{ label: '一号码头', value: 'WH-1' }],
      handleWarehouseSelect,
      itemColumns: [
        {
          title: '仓库',
          dataIndex: 'warehouseName',
          type: 'string',
          width: 120,
        },
      ],
    })
    const warehouseColumn = columns.find((c) => c.dataIndex === 'warehouseName')
    const element = (warehouseColumn?.render as Function)(
      'WH-1',
      { ...mockItems[0], warehouseName: 'WH-1' },
      0,
    )

    expect(isValidElement(element)).toBe(true)
    if (!isValidElement(element)) return
    expect(element.props.value).toBe('WH-1')
    expect(element.props.options).toEqual([
      { label: '一号码头', value: 'WH-1' },
    ])

    element.props.onChange('WH-1')
    expect(handleWarehouseSelect).toHaveBeenCalledWith('1', 'WH-1')
  })

  it('uses undefined warehouse and settlement mode values for non-string records', () => {
    const columns = buildModuleEditorDataColumns({
      ...defaultProps,
      isItemColumnEditable: vi.fn(() => true),
      itemColumns: [
        {
          title: '仓库',
          dataIndex: 'warehouseName',
          type: 'string',
          width: 120,
        },
        {
          title: '结算方式',
          dataIndex: 'settlementMode',
          type: 'string',
          width: 100,
        },
      ],
    })
    const warehouseElement = (columns[0].render as Function)(
      undefined,
      { ...mockItems[0], warehouseName: 123 },
      0,
    )
    const settlementElement = (columns[1].render as Function)(
      undefined,
      { ...mockItems[0], settlementMode: 123 },
      0,
    )

    expect(isValidElement(warehouseElement)).toBe(true)
    expect(isValidElement(settlementElement)).toBe(true)
    if (
      !isValidElement(warehouseElement) ||
      !isValidElement(settlementElement)
    ) {
      return
    }
    expect(warehouseElement.props.value).toBeUndefined()
    expect(settlementElement.props.value).toBeUndefined()
  })

  it('uses weightTon read-only value for non-weigh purchase inbound rows', () => {
    const formatCellValue = vi.fn((value) => `formatted:${value}`)
    const columns = buildModuleEditorDataColumns({
      ...defaultProps,
      config: { ...mockConfig, key: 'purchase-inbound' },
      formatCellValue,
      isItemColumnEditable: vi.fn(() => true),
      itemColumns: [
        {
          title: '过磅重量',
          dataIndex: 'weighWeightTon',
          type: 'number',
          width: 100,
        },
      ],
    })
    const renderFn = columns[0].render as Function

    expect(
      renderFn(
        12,
        { ...mockItems[0], settlementMode: '理算', weightTon: 3.5 },
        0,
      ),
    ).toBe('formatted:3.5')
  })

  it('returns weigh weight input for purchase inbound weigh rows', () => {
    const handleItemNumberChange = vi.fn()
    const columns = buildModuleEditorDataColumns({
      ...defaultProps,
      config: { ...mockConfig, key: 'purchase-inbound' },
      isItemColumnEditable: vi.fn(() => true),
      handleItemNumberChange,
      itemColumns: [
        {
          title: '过磅重量',
          dataIndex: 'weighWeightTon',
          type: 'number',
          width: 100,
        },
      ],
    })
    const element = (columns[0].render as Function)(
      6.25,
      { ...mockItems[0], settlementMode: '过磅' },
      0,
    )

    expect(isValidElement(element)).toBe(true)
    if (!isValidElement(element)) return
    expect(element.props.value).toBe(6.25)
    expect(element.props.precision).toBe(3)

    element.props.onChange(7)
    expect(handleItemNumberChange).toHaveBeenCalledWith(
      '1',
      'weighWeightTon',
      7,
    )
  })

  it('returns settlement mode select props and callback', () => {
    const handleSettlementModeChange = vi.fn()
    const columns = buildModuleEditorDataColumns({
      ...defaultProps,
      isItemColumnEditable: vi.fn(() => true),
      handleSettlementModeChange,
      itemColumns: [
        {
          title: '结算方式',
          dataIndex: 'settlementMode',
          type: 'string',
          width: 100,
        },
      ],
    })
    const element = (columns[0].render as Function)(
      '过磅',
      { ...mockItems[0], settlementMode: '过磅' },
      0,
    )

    expect(isValidElement(element)).toBe(true)
    if (!isValidElement(element)) return
    expect(element.props.value).toBe('过磅')
    expect(element.props.options).toEqual([
      { label: '理算', value: '理算' },
      { label: '过磅', value: '过磅' },
    ])

    element.props.onChange('理算')
    expect(handleSettlementModeChange).toHaveBeenCalledWith('1', '理算')
  })

  it('passes number editor constraints and change callback', () => {
    const handleItemNumberChange = vi.fn()
    const columns = buildModuleEditorDataColumns({
      ...defaultProps,
      isItemColumnEditable: vi.fn(() => true),
      handleItemNumberChange,
    })
    const amountColumn = columns.find((c) => c.dataIndex === 'amount')
    const fallbackColumn = amountColumn ?? {
      render: buildModuleEditorDataColumns({
        ...defaultProps,
        isItemColumnEditable: vi.fn(() => true),
        handleItemNumberChange,
        itemColumns: [
          { title: '金额', dataIndex: 'amount', type: 'number', width: 100 },
        ],
      })[0].render,
    }
    const element = (fallbackColumn.render as Function)(100, mockItems[0], 0)

    expect(isValidElement(element)).toBe(true)
    if (!isValidElement(element)) return
    expect(element.props.min).toBe(0)
    expect(element.props.precision).toBe(2)
    expect(element.props.controls).toBe(true)
    expect(element.props.className).toContain('module-editor-number-input')

    element.props.onChange(101)
    expect(handleItemNumberChange).toHaveBeenCalledWith('1', 'amount', 101)
  })

  it('hides controls for quantity-like number columns', () => {
    const columns = buildModuleEditorDataColumns({
      ...defaultProps,
      isItemColumnEditable: vi.fn(() => true),
    })
    const quantityColumn = columns.find((c) => c.dataIndex === 'quantity')
    const element = (quantityColumn?.render as Function)(10, mockItems[0], 0)

    expect(isValidElement(element)).toBe(true)
    if (!isValidElement(element)) return
    expect(element.props.controls).toBe(false)
  })

  it('renders dash instead of number input for editable weigh piece weight', () => {
    const editableProps = {
      ...defaultProps,
      isItemColumnEditable: vi.fn(() => true),
    }
    const columns = buildModuleEditorDataColumns(editableProps)
    const pieceWeightColumn = columns.find(
      (c) => c.dataIndex === 'pieceWeightTon',
    )
    const renderFn = pieceWeightColumn?.render as Function
    const { container } = render(
      <table>
        <tbody>
          <tr>
            {renderFn(
              0.5,
              { ...mockItems[0], pieceWeightTon: 0.5, settlementMode: '过磅' },
              0,
            )}
          </tr>
        </tbody>
      </table>,
    )
    expect(container.textContent).toContain('-')
    expect(container.querySelector('input')).not.toBeInTheDocument()
  })

  it('renders piece weight input for editable purchase order weigh rows', () => {
    const handleItemNumberChange = vi.fn()
    const columns = buildModuleEditorDataColumns({
      ...defaultProps,
      config: { ...mockConfig, key: 'purchase-order' },
      isItemColumnEditable: vi.fn(() => true),
      handleItemNumberChange,
    })
    const pieceWeightColumn = columns.find(
      (c) => c.dataIndex === 'pieceWeightTon',
    )
    const element = (pieceWeightColumn?.render as Function)(
      2.05,
      {
        ...mockItems[0],
        category: '盘螺',
        pieceWeightTon: 2.05,
        settlementMode: '过磅',
      },
      0,
    )

    expect(isValidElement(element)).toBe(true)
    if (!isValidElement(element)) return
    expect(element.props.value).toBe(2.05)
    expect(element.props.controls).toBe(false)

    element.props.onChange(2.2)
    expect(handleItemNumberChange).toHaveBeenCalledWith(
      '1',
      'pieceWeightTon',
      2.2,
    )
  })

  it('calls handleItemInputChange on input change', () => {
    const handleItemInputChange = vi.fn()
    const editableProps = {
      ...defaultProps,
      isItemColumnEditable: vi.fn(() => true),
      handleItemInputChange,
    }
    const columns = buildModuleEditorDataColumns(editableProps)
    const nameColumn = columns.find((c) => c.dataIndex === 'name')
    const renderFn = nameColumn?.render as Function
    const element = renderFn('Test', mockItems[0], 0)

    expect(isValidElement(element)).toBe(true)
    if (!isValidElement(element)) return
    element.props.onChange({ target: { value: 'Updated' } })
    expect(handleItemInputChange).toHaveBeenCalledWith('1', 'name', 'Updated')
  })

  it('uses empty input value for non-string editable text values', () => {
    const columns = buildModuleEditorDataColumns({
      ...defaultProps,
      isItemColumnEditable: vi.fn(() => true),
    })
    const nameColumn = columns.find((c) => c.dataIndex === 'name')
    const element = (nameColumn?.render as Function)(123, mockItems[0], 0)

    expect(isValidElement(element)).toBe(true)
    if (!isValidElement(element)) return
    expect(element.props.value).toBe('')
  })

  it('handles status column with unknown status', () => {
    const columns = buildModuleEditorDataColumns(defaultProps)
    const statusColumn = columns.find((c) => c.dataIndex === 'status')
    const renderFn = statusColumn?.render as Function
    render(
      <table>
        <tbody>
          <tr>{renderFn('unknown_status', mockItems[0], 0)}</tr>
        </tbody>
      </table>,
    )
    expect(screen.getByText('unknown_status')).toBeInTheDocument()
  })

  it('handles status column with non-string value', () => {
    const columns = buildModuleEditorDataColumns(defaultProps)
    const statusColumn = columns.find((c) => c.dataIndex === 'status')
    const renderFn = statusColumn?.render as Function
    render(
      <table>
        <tbody>
          <tr>{renderFn(123, mockItems[0], 0)}</tr>
        </tbody>
      </table>,
    )
    expect(screen.getByText('--')).toBeInTheDocument()
  })

  it('uses an empty status map when config does not provide one', () => {
    const columns = buildModuleEditorDataColumns({
      ...defaultProps,
      config: { ...mockConfig, statusMap: undefined },
    })
    const statusColumn = columns.find((c) => c.dataIndex === 'status')
    const renderFn = statusColumn?.render as Function

    render(
      <table>
        <tbody>
          <tr>{renderFn('draft', mockItems[0], 0)}</tr>
        </tbody>
      </table>,
    )

    expect(screen.getByText('draft')).toBeInTheDocument()
  })
})
