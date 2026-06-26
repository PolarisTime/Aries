import { render, screen } from '@testing-library/react'
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
    const { container } = render(
      <table>
        <tbody>
          <tr>{renderFn('Test', mockItems[0], 0)}</tr>
        </tbody>
      </table>,
    )
    const input = container.querySelector('input')
    if (input) {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }
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
})
