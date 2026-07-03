import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const dndMocks = vi.hoisted(() => ({
  latestOnDragEnd: undefined as ((event: any) => void) | undefined,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@dnd-kit/core', () => ({
  closestCenter: vi.fn(),
  DndContext: ({ children, onDragEnd }: any) => {
    dndMocks.latestOnDragEnd = onDragEnd
    return <div data-testid="dnd-context">{children}</div>
  },
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn().mockReturnValue([]),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: vi.fn().mockReturnValue({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn().mockReturnValue(undefined),
    },
  },
}))

vi.mock('antd', () => ({
  Button: ({ children, icon, ...props }: any) => (
    <button {...props}>
      {icon}
      {children}
    </button>
  ),
  Checkbox: ({ children, checked, onChange, ...props }: any) => (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange ?? (() => undefined)}
        {...props}
      />
      {children}
    </label>
  ),
  Divider: ({ ...props }: any) => <hr {...props} />,
  Popover: ({
    children,
    content,
    open,
    onOpenChange: _onOpenChange,
    placement: _placement,
    styles: _styles,
    trigger: _trigger,
    ...props
  }: any) => (
    <div {...props}>
      {children}
      {open ? <div data-testid="popover">{content}</div> : null}
    </div>
  ),
  Space: ({
    children,
    orientation: _orientation,
    size: _size,
    ...props
  }: any) => <div {...props}>{children}</div>,
  Typography: {
    Text: ({ children, strong, ...props }: any) => (
      <span {...props}>{strong ? <strong>{children}</strong> : children}</span>
    ),
  },
}))

vi.mock('@ant-design/icons', () => ({
  HolderOutlined: () => <span>HolderOutlined</span>,
  SettingOutlined: () => <span>SettingOutlined</span>,
}))

import { KeyboardSensor, useSensor } from '@dnd-kit/core'
import { sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { ColumnSettingsPopover } from '@/views/modules/components/ColumnSettingsPopover'

describe('ColumnSettingsPopover', () => {
  const defaultProps = {
    columns: [
      { title: 'Column A', dataIndex: 'a' },
      { title: 'Column B', dataIndex: 'b' },
    ],
    visibleKeys: ['a', 'b'],
    onToggle: vi.fn(),
    open: false,
    onOpenChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    dndMocks.latestOnDragEnd = undefined
    vi.mocked(useSortable).mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
      isDragging: false,
    })
  })

  it('renders settings button', () => {
    render(<ColumnSettingsPopover {...defaultProps} />)
    expect(screen.getByText('common.columnSettings')).toBeTruthy()
  })

  it('renders popover content when open', () => {
    render(<ColumnSettingsPopover {...defaultProps} open={true} />)
    expect(screen.getByTestId('popover')).toBeTruthy()
  })

  it('renders keyboard-accessible drag handles with column names', () => {
    render(<ColumnSettingsPopover {...defaultProps} open={true} />)

    expect(
      screen.getByRole('button', { name: '拖动列：Column A' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: '拖动列：Column B' }),
    ).toBeTruthy()
  })

  it('configures keyboard sorting coordinates', () => {
    render(<ColumnSettingsPopover {...defaultProps} />)

    expect(useSensor).toHaveBeenCalledWith(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  })

  it('toggles a column from the checkbox row', () => {
    const onToggle = vi.fn()
    render(
      <ColumnSettingsPopover
        {...defaultProps}
        onToggle={onToggle}
        open={true}
      />,
    )

    fireEvent.click(screen.getByLabelText('Column A'))

    expect(onToggle).toHaveBeenCalledWith('a')
  })

  it('reorders columns after a valid drag end event', () => {
    const onOrderChange = vi.fn()
    render(
      <ColumnSettingsPopover
        {...defaultProps}
        columns={[
          { title: 'Column A', dataIndex: 'a' },
          { title: 'Column B', dataIndex: 'b' },
          { title: 'Column C', dataIndex: 'c' },
        ]}
        orderedKeys={['b', 'missing']}
        onOrderChange={onOrderChange}
        open={true}
      />,
    )

    dndMocks.latestOnDragEnd?.({
      active: { id: 'a' },
      over: { id: 'c' },
    })

    expect(onOrderChange).toHaveBeenCalledWith(['b', 'c', 'a'])
  })

  it('ignores drag events that cannot change the order', () => {
    const onOrderChange = vi.fn()
    render(
      <ColumnSettingsPopover
        {...defaultProps}
        onOrderChange={onOrderChange}
        open={true}
      />,
    )

    dndMocks.latestOnDragEnd?.({ active: { id: 'a' }, over: null })
    dndMocks.latestOnDragEnd?.({ active: { id: 'a' }, over: { id: 'a' } })

    expect(onOrderChange).not.toHaveBeenCalled()

    dndMocks.latestOnDragEnd?.({
      active: { id: 'missing' },
      over: { id: 'a' },
    })

    expect(onOrderChange).toHaveBeenCalledWith(['a', 'b'])
  })

  it('does not reorder when no order change handler is supplied', () => {
    render(<ColumnSettingsPopover {...defaultProps} open={true} />)

    expect(() => {
      dndMocks.latestOnDragEnd?.({ active: { id: 'a' }, over: { id: 'b' } })
    }).not.toThrow()
  })

  it('applies dragging opacity while a column row is being dragged', () => {
    vi.mocked(useSortable).mockReturnValueOnce({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: { x: 1, y: 2, scaleX: 1, scaleY: 1 },
      transition: 'transform 200ms ease',
      isDragging: true,
    })

    render(<ColumnSettingsPopover {...defaultProps} open={true} />)

    expect(
      screen.getByRole('button', { name: '拖动列：Column A' }).parentElement,
    ).toHaveStyle({ opacity: '0.4' })
  })

  it('skips rows when an ordered key cannot be resolved to a column', () => {
    render(
      <ColumnSettingsPopover
        {...defaultProps}
        columns={[{ title: 'Unresolvable', dataIndex: Number.NaN as any }]}
        open={true}
        visibleKeys={[]}
      />,
    )

    expect(screen.queryByText('Unresolvable')).toBeNull()
  })
})
