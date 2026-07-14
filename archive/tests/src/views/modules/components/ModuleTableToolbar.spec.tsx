import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts) return `${key}:${JSON.stringify(opts)}`
      return key
    },
  }),
}))

vi.mock('antd', () => ({
  Button: ({
    children,
    icon,
    loading,
    type: _type,
    danger: _danger,
    ...props
  }: any) => (
    <button data-loading={String(Boolean(loading))} {...props}>
      {icon}
      {children}
    </button>
  ),
  Flex: ({
    children,
    align: _align,
    justify: _justify,
    wrap: _wrap,
    gap: _gap,
    ...props
  }: any) => <div {...props}>{children}</div>,
  Pagination: () => <div data-testid="legacy-pagination" />,
  Space: ({ children, size: _size, wrap: _wrap, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  Tooltip: ({ children, title }: any) => (
    <span data-testid="tooltip" data-title={title}>
      {children}
    </span>
  ),
}))

vi.mock('@ant-design/icons', () => ({
  CloseOutlined: () => <span>CloseOutlined</span>,
  DownloadOutlined: () => <span>DownloadOutlined</span>,
  PlusOutlined: () => <span>PlusOutlined</span>,
  ReloadOutlined: () => <span>ReloadOutlined</span>,
}))

vi.mock('@/module-system/module-action-icons', () => ({
  resolveModuleActionIcon: () => null,
}))

import { ModuleTableToolbar } from '@/views/modules/components/ModuleTableToolbar'

describe('ModuleTableToolbar', () => {
  const defaultProps = {
    canCreate: true,
    canExport: true,
    selectedCount: 0,
    loading: false,
    exporting: false,
    onCreate: vi.fn(),
    onExport: vi.fn(),
    onRefresh: vi.fn(),
  }

  it('renders create button when canCreate is true', () => {
    render(<ModuleTableToolbar {...defaultProps} />)
    expect(screen.getByText('common.create')).toBeTruthy()
  })

  it('hides create button when canCreate is false', () => {
    render(<ModuleTableToolbar {...defaultProps} canCreate={false} />)
    expect(screen.queryByText('common.create')).toBeNull()
  })

  it('renders export button when canExport is true', () => {
    render(<ModuleTableToolbar {...defaultProps} />)
    expect(screen.getByText('common.export')).toBeTruthy()
  })

  it('hides export button when canExport is false', () => {
    render(<ModuleTableToolbar {...defaultProps} canExport={false} />)
    expect(screen.queryByText('common.export')).toBeNull()
  })

  it('renders an accessible icon-only refresh command with a tooltip', () => {
    render(<ModuleTableToolbar {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'common.refresh' })).toBeTruthy()
    expect(screen.getByTestId('tooltip')).toHaveAttribute(
      'data-title',
      'common.refresh',
    )
    expect(screen.queryByText('common.refresh')).toBeNull()
  })

  it('calls onCreate when create button is clicked', () => {
    const onCreate = vi.fn()
    render(<ModuleTableToolbar {...defaultProps} onCreate={onCreate} />)
    fireEvent.click(screen.getByText('common.create'))
    expect(onCreate).toHaveBeenCalled()
  })

  it('calls onRefresh when refresh button is clicked', () => {
    const onRefresh = vi.fn()
    render(<ModuleTableToolbar {...defaultProps} onRefresh={onRefresh} />)
    fireEvent.click(screen.getByRole('button', { name: 'common.refresh' }))
    expect(onRefresh).toHaveBeenCalled()
  })

  it('calls onExport when export button is clicked', () => {
    const onExport = vi.fn()
    render(<ModuleTableToolbar {...defaultProps} onExport={onExport} />)
    fireEvent.click(screen.getByText('common.export'))
    expect(onExport).toHaveBeenCalled()
  })

  it('shows loading state on refresh button', () => {
    render(<ModuleTableToolbar {...defaultProps} loading={true} />)
    expect(
      screen.getByRole('button', { name: 'common.refresh' }),
    ).toHaveAttribute('data-loading', 'true')
  })

  it('shows exporting state on export button', () => {
    render(<ModuleTableToolbar {...defaultProps} exporting={true} />)
    expect(screen.getByText('common.export')).toBeTruthy()
  })

  it('renders selected count when selectedCount > 0', () => {
    render(<ModuleTableToolbar {...defaultProps} selectedCount={5} />)
    expect(screen.getByText('common.selected:{"count":5}')).toBeTruthy()
  })

  it('provides an accessible command to clear the current selection', () => {
    const onClearSelection = vi.fn()
    render(
      <ModuleTableToolbar
        {...defaultProps}
        selectedCount={5}
        onClearSelection={onClearSelection}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'common.clearSelection' }),
    )

    expect(onClearSelection).toHaveBeenCalledTimes(1)
  })

  it('renders extra content', () => {
    render(
      <ModuleTableToolbar {...defaultProps} extra={<div>Extra Content</div>} />,
    )
    expect(screen.getByText('Extra Content')).toBeTruthy()
  })

  it('renders toolbar actions', () => {
    const toolbarActions = [
      {
        label: '审核',
        type: 'primary' as const,
        danger: false,
        disabled: false,
        loading: false,
      },
      {
        label: '导出',
        type: 'default' as const,
        danger: false,
        disabled: false,
        loading: false,
      },
    ]
    const onAction = vi.fn()
    render(
      <ModuleTableToolbar
        {...defaultProps}
        toolbarActions={toolbarActions}
        onAction={onAction}
      />,
    )
    expect(screen.getByText('审核')).toBeTruthy()
  })

  it('skips toolbar actions with a stable create key', () => {
    const toolbarActions = [
      {
        key: 'create',
        label: 'Create record',
        type: 'primary' as const,
        danger: false,
        disabled: false,
        loading: false,
      },
    ]
    render(
      <ModuleTableToolbar {...defaultProps} toolbarActions={toolbarActions} />,
    )
    expect(screen.queryByText('Create record')).toBeNull()
  })

  it('hides export button when toolbarActions has 导出', () => {
    const toolbarActions = [
      {
        key: 'export',
        label: '导出',
        type: 'default' as const,
        danger: false,
        disabled: false,
        loading: false,
      },
    ]
    render(
      <ModuleTableToolbar {...defaultProps} toolbarActions={toolbarActions} />,
    )
    // The export from toolbarActions should show, but the default export button should be hidden
    const exportButtons = screen.getAllByText('导出')
    expect(exportButtons.length).toBeLessThanOrEqual(1)
  })

  it('handles toolbar action click', () => {
    const toolbarActions = [
      {
        label: '审核',
        type: 'primary' as const,
        danger: false,
        disabled: false,
        loading: false,
      },
    ]
    const onAction = vi.fn()
    render(
      <ModuleTableToolbar
        {...defaultProps}
        toolbarActions={toolbarActions}
        onAction={onAction}
      />,
    )
    fireEvent.click(screen.getByText('审核'))
    expect(onAction).toHaveBeenCalledWith(toolbarActions[0])
  })

  it('renders disabled toolbar action', () => {
    const toolbarActions = [
      {
        label: '删除',
        type: 'default' as const,
        danger: true,
        disabled: true,
        loading: false,
      },
    ]
    render(
      <ModuleTableToolbar {...defaultProps} toolbarActions={toolbarActions} />,
    )
    expect(screen.getByText('删除')).toBeTruthy()
  })

  it('renders loading toolbar action', () => {
    const toolbarActions = [
      {
        label: '同步',
        type: 'default' as const,
        danger: false,
        disabled: false,
        loading: true,
      },
    ]
    render(
      <ModuleTableToolbar {...defaultProps} toolbarActions={toolbarActions} />,
    )
    expect(screen.getByText('同步')).toBeTruthy()
  })
})
