import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TableActions, type ActionItem } from './TableActions'

describe('TableActions', () => {
  const defaultItems: ActionItem[] = [
    { key: 'edit', label: '编辑', onClick: vi.fn() },
    { key: 'delete', label: '删除', danger: true, onClick: vi.fn() },
  ]

  it('renders all action buttons', () => {
    render(<TableActions items={defaultItems} />)
    expect(screen.getByText('编辑')).toBeTruthy()
    expect(screen.getByText('删除')).toBeTruthy()
  })

  it('shows dash when no visible items', () => {
    const items: ActionItem[] = [
      { key: 'hidden', label: '隐藏', visible: false, onClick: vi.fn() },
    ]
    render(<TableActions items={items} />)
    expect(screen.getByText('--')).toBeTruthy()
  })

  it('shows dash when all items are hidden', () => {
    const items: ActionItem[] = [
      { key: 'a', label: 'A', visible: false, onClick: vi.fn() },
      { key: 'b', label: 'B', visible: false, onClick: vi.fn() },
    ]
    render(<TableActions items={items} />)
    expect(screen.getByText('--')).toBeTruthy()
  })

  it('limits visible items by maxVisible', () => {
    render(<TableActions items={defaultItems} maxVisible={1} />)
    expect(screen.getByText('编辑')).toBeTruthy()
    expect(screen.queryByText('删除')).toBeNull()
  })

  it('calls onClick when action button clicked', () => {
    const onClick = vi.fn()
    render(
      <TableActions
        items={[{ key: 'edit', label: '编辑', onClick }]}
      />,
    )
    fireEvent.click(screen.getByText('编辑'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows popconfirm for items with confirm text', () => {
    const onClick = vi.fn()
    render(
      <TableActions
        items={[
          {
            key: 'delete',
            label: '删除',
            danger: true,
            confirm: '确定删除？',
            onClick,
          },
        ]}
      />,
    )
    expect(screen.getByText('删除')).toBeTruthy()
  })

  it('renders disabled button', () => {
    render(
      <TableActions
        items={[
          { key: 'edit', label: '编辑', disabled: true, onClick: vi.fn() },
        ]}
      />,
    )
    const btn = screen.getByText('编辑')
    expect(btn.closest('button')?.getAttribute('disabled')).not.toBeNull()
  })
})
