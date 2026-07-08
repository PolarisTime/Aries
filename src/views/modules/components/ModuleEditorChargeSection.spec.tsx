import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ModuleEditorChargeSection } from './ModuleEditorChargeSection'

vi.mock('antd', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Checkbox: ({ checked, onChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange?.(event)}
      {...props}
    />
  ),
  Input: ({ value, onChange, ...props }: any) => (
    <input value={value} onChange={(event) => onChange?.(event)} {...props} />
  ),
  InputNumber: ({ value, onChange, ...props }: any) => (
    <input
      value={value ?? ''}
      onChange={(event) => onChange?.(Number(event.target.value))}
      {...props}
    />
  ),
  Select: ({ value, onChange, options, ...props }: any) => (
    <select
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      {...props}
    >
      {options.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Table: ({ columns, dataSource, rowKey, ...props }: any) => (
    <table data-testid="charge-items-table" {...props}>
      <tbody>
        {dataSource.map((record: Record<string, unknown>, index: number) => (
          <tr key={rowKey(record, index)}>
            {columns.map((column: any) => (
              <td key={column.key || column.dataIndex}>
                {column.render
                  ? column.render(record[column.dataIndex], record, index)
                  : String(record[column.dataIndex] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}))

vi.mock('@ant-design/icons', () => ({
  DeleteOutlined: () => <span>DeleteOutlined</span>,
  PlusOutlined: () => <span>PlusOutlined</span>,
}))

describe('ModuleEditorChargeSection', () => {
  it('renders split product, charge, and payable totals', () => {
    render(
      <ModuleEditorChargeSection
        moduleKey="purchase-order"
        items={[{ id: 'line-1', amount: 100 }]}
        chargeItems={[
          {
            id: 'charge-1',
            chargeName: '卸货费',
            chargeDirection: 'PAYABLE',
            amount: 20,
            billable: true,
          },
          {
            id: 'charge-2',
            chargeName: '内部费用',
            chargeDirection: 'INTERNAL',
            amount: 5,
            billable: true,
          },
        ]}
        canEdit
        onAddChargeItem={vi.fn()}
        onChangeChargeItems={vi.fn()}
      />,
    )

    expect(screen.getByText('其他费用')).toBeTruthy()
    expect(screen.getAllByText('商品金额 100.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('其他费用 20.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('应付合计 120.00').length).toBeGreaterThan(0)
  })

  it('edits charge fields and supports add/delete actions', () => {
    const onAddChargeItem = vi.fn()
    const onChangeChargeItems = vi.fn()

    render(
      <ModuleEditorChargeSection
        moduleKey="sales-order"
        items={[{ id: 'line-1', amount: 100 }]}
        chargeItems={[
          {
            id: 'charge-1',
            chargeName: '运费',
            chargeDirection: 'RECEIVABLE',
            amount: 20,
            billable: true,
          },
        ]}
        canEdit
        onAddChargeItem={onAddChargeItem}
        onChangeChargeItems={onChangeChargeItems}
      />,
    )

    fireEvent.click(screen.getByText('新增费用'))
    expect(onAddChargeItem).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByLabelText('费用名称'), {
      target: { value: '装车费' },
    })
    expect(onChangeChargeItems).toHaveBeenLastCalledWith([
      expect.objectContaining({ chargeName: '装车费' }),
    ])

    fireEvent.change(screen.getByLabelText('费用金额'), {
      target: { value: '35' },
    })
    expect(onChangeChargeItems).toHaveBeenLastCalledWith([
      expect.objectContaining({ amount: 35 }),
    ])

    fireEvent.change(screen.getByLabelText('费用方向'), {
      target: { value: 'PAYABLE' },
    })
    expect(onChangeChargeItems).toHaveBeenLastCalledWith([
      expect.objectContaining({ chargeDirection: 'PAYABLE' }),
    ])

    fireEvent.click(screen.getByLabelText('计入结算'))
    expect(onChangeChargeItems).toHaveBeenLastCalledWith([
      expect.objectContaining({ billable: false }),
    ])

    fireEvent.click(screen.getByLabelText('删除费用'))
    expect(onChangeChargeItems).toHaveBeenLastCalledWith([])
  })
})
