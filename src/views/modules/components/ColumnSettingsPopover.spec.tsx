import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@dnd-kit/core', () => ({
  closestCenter: vi.fn(),
  DndContext: ({ children }: any) => <div>{children}</div>,
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn().mockReturnValue([]),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
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

vi.mock('antd/es/button', () => ({
  default: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('antd/es/checkbox', () => ({
  default: ({ children, checked, onChange, ...props }: any) => (
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
}))

vi.mock('antd/es/divider', () => ({
  default: ({ ...props }: any) => <hr {...props} />,
}))

vi.mock('antd/es/popover', () => ({
  default: ({ children, content, open, ...props }: any) =>
    open ? (
      <div data-testid="popover" {...props}>
        {content}
      </div>
    ) : (
      <div {...props}>{children}</div>
    ),
}))

vi.mock('antd/es/space', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/typography', () => ({
  default: {
    Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}))

vi.mock('@ant-design/icons', () => ({
  HolderOutlined: () => <span>HolderOutlined</span>,
  SettingOutlined: () => <span>SettingOutlined</span>,
}))

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

  it('renders settings button', () => {
    render(<ColumnSettingsPopover {...defaultProps} />)
    expect(screen.getByText('common.columnSettings')).toBeTruthy()
  })

  it('renders popover content when open', () => {
    render(<ColumnSettingsPopover {...defaultProps} open={true} />)
    expect(screen.getByTestId('popover')).toBeTruthy()
  })
})
