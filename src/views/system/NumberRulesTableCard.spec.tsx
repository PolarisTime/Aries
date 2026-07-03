import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'

const tableCaptures = vi.hoisted(() => [] as Array<Record<string, unknown>>)

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@ant-design/icons', () => ({
  EditOutlined: () => <span data-testid="edit-icon" />,
}))

vi.mock('antd', () => ({
  Card: ({
    children,
    className,
    extra,
    title,
  }: {
    children?: React.ReactNode
    className?: string
    extra?: React.ReactNode
    title?: React.ReactNode
  }) => (
    <section className={`ant-card ${className ?? ''}`}>
      <h2>{title}</h2>
      {extra}
      {children}
    </section>
  ),
  Col: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Row: ({
    children,
    className,
  }: {
    children?: React.ReactNode
    className?: string
  }) => <div className={className}>{children}</div>,
  Select: ({
    options = [],
    placeholder,
    value,
    onChange,
  }: {
    options?: Array<{ label: string; value: string }>
    placeholder?: string
    value?: string
    onChange?: (value?: string) => void
  }) => (
    <select
      aria-label={placeholder}
      value={value ?? ''}
      onChange={(event) => onChange?.(event.currentTarget.value || undefined)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Statistic: ({
    title,
    value,
  }: {
    title?: React.ReactNode
    value?: React.ReactNode
  }) => (
    <div>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  ),
  Table: (props: Record<string, unknown>) => {
    tableCaptures.push(props)
    const columns = props.columns as Array<Record<string, unknown>>
    const dataSource = props.dataSource as ModuleRecord[]

    return (
      <table
        className={props.className as string | undefined}
        data-loading={props.loading ? 'true' : 'false'}
        data-scroll-x={String(
          (props.scroll as { x?: number } | undefined)?.x ?? '',
        )}
        data-size={props.size as string}
        data-testid="table"
      >
        <tbody>
          {dataSource.map((record, rowIndex) => (
            <tr key={record.id}>
              {columns.map((column, columnIndex) => {
                const dataIndex = column.dataIndex as string | undefined
                const value = dataIndex ? record[dataIndex] : undefined
                const renderCell = column.render as
                  | ((
                      value: unknown,
                      record: ModuleRecord,
                      index: number,
                    ) => React.ReactNode)
                  | undefined
                const key =
                  (column.key as string | undefined) ??
                  dataIndex ??
                  String(columnIndex)

                return (
                  <td
                    data-align={column.align as string | undefined}
                    data-title={column.title as string | undefined}
                    data-width={String(column.width ?? '')}
                    key={key}
                  >
                    {renderCell ? renderCell(value, record, rowIndex) : value}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    )
  },
  Typography: {
    Title: ({
      children,
      level,
    }: {
      children?: React.ReactNode
      level?: number
    }) => <div data-level={level}>{children}</div>,
  },
}))

vi.mock('@/components/StatusTag', () => ({
  StatusTag: ({
    fallback,
    status,
    statusMap,
  }: {
    fallback?: string
    status: string
    statusMap: Record<string, { color: string; label: string }>
  }) => {
    const meta = statusMap[status]

    return (
      <span data-color={meta?.color ?? 'none'} data-testid="status-tag">
        {meta?.label ?? fallback}
      </span>
    )
  },
}))

vi.mock('@/components/SystemTableToolbar', () => ({
  SystemTableToolbar: ({
    children,
    keyword,
    keywordPlaceholder,
    keywordWidth,
    onKeywordChange,
    onRefresh,
  }: {
    children?: React.ReactNode
    keyword: string
    keywordPlaceholder: string
    keywordWidth: number
    onKeywordChange: (value: string) => void
    onRefresh: () => void
  }) => (
    <div data-keyword-width={keywordWidth} data-testid="toolbar">
      <input
        aria-label={keywordPlaceholder}
        value={keyword}
        onChange={(event) => onKeywordChange(event.currentTarget.value)}
      />
      <button type="button" onClick={onRefresh}>
        refresh
      </button>
      {children}
    </div>
  ),
}))

vi.mock('@/components/TableActions', () => ({
  TableActions: ({
    items,
  }: {
    items: Array<{
      disabled?: boolean
      icon?: React.ReactNode
      key: string
      label: string
      onClick: () => void
    }>
  }) => (
    <div>
      {items.map((item) => (
        <button
          data-testid={`action-${item.key}`}
          disabled={item.disabled}
          key={item.key}
          onClick={item.onClick}
          type="button"
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (value: unknown) => String(value ?? ''),
}))

import { NumberRulesTableCard } from '@/views/system/NumberRulesTableCard'

describe('NumberRulesTableCard', () => {
  const numberRule: ModuleRecord = {
    id: 'number-1',
    billName: '销售订单',
    dateRule: 'yyyyMM',
    prefix: 'SO',
    resetRule: 'MONTHLY',
    ruleType: 'NUMBER_RULE',
    sampleNo: 'SO2026070001',
    serialLength: 4,
    settingName: '销售订单编号',
    status: '正常',
  }
  const uploadRule: ModuleRecord = {
    id: 'upload-1',
    billName: '附件',
    prefix: '{yyyyMMdd}-{originName}',
    ruleType: 'UPLOAD_RULE',
    sampleNo: '20260703-contract.pdf',
    settingName: '附件命名规则',
    status: '禁用',
  }
  const enabledUploadRule: ModuleRecord = {
    id: 'upload-2',
    billName: '图片',
    ruleType: 'UPLOAD_RULE',
    status: '正常',
  }
  const disabledNumberRule: ModuleRecord = {
    id: 'number-2',
    billName: '采购订单',
    ruleType: 'NUMBER_RULE',
    status: '禁用',
  }

  const defaultProps = {
    keyword: '订单',
    statusFilter: undefined,
    rows: [numberRule, uploadRule, enabledUploadRule, disabledNumberRule],
    numberRuleRows: [numberRule],
    uploadRuleRows: [uploadRule],
    loading: false,
    canEdit: true,
    onKeywordChange: vi.fn(),
    onStatusFilterChange: vi.fn(),
    onRefresh: vi.fn(),
    onEditNumberRule: vi.fn(),
    onEditUploadRule: vi.fn(),
  }

  beforeEach(() => {
    tableCaptures.length = 0
    vi.clearAllMocks()
  })

  it('渲染工具栏、统计与两张规则表，并执行单据规则列 render', () => {
    render(<NumberRulesTableCard {...defaultProps} />)

    expect(screen.getByText('system.numberRules.title')).toBeInTheDocument()
    expect(screen.getByTestId('toolbar')).toHaveAttribute(
      'data-keyword-width',
      '280',
    )
    expect(
      screen.getByLabelText('system.numberRules.searchPlaceholder'),
    ).toHaveValue('订单')
    expect(
      screen.getAllByText('system.numberRules.documentRules'),
    ).toHaveLength(2)
    expect(screen.getAllByText('system.numberRules.uploadRules')).toHaveLength(
      2,
    )
    expect(
      screen.getByText('system.numberRules.disabledUploadRules'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('1')).toHaveLength(3)
    expect(screen.getByText('销售订单')).toBeInTheDocument()
    expect(screen.getByText('销售订单编号')).toBeInTheDocument()
    expect(screen.getByText('SO')).toBeInTheDocument()
    expect(screen.getByText('按年月')).toBeInTheDocument()
    expect(screen.getByText('按月重置')).toBeInTheDocument()
    expect(screen.getByText('SO2026070001')).toBeInTheDocument()
    expect(
      screen
        .getAllByTestId('status-tag')
        .find((element) => element.textContent === '正常'),
    ).toHaveAttribute('data-color', 'green')
    expect(screen.getAllByTestId('table')).toHaveLength(2)
    expect(tableCaptures).toHaveLength(2)
    expect(tableCaptures[0]).toMatchObject({
      className: 'mb-6',
      loading: false,
      pagination: false,
      rowKey: 'id',
      size: 'small',
    })
    expect(tableCaptures[0].scroll).toEqual({ x: 1300 })
    expect(tableCaptures[1].scroll).toEqual({ x: 970 })
  })

  it('执行上传规则列 render，并只统计禁用上传规则', () => {
    render(
      <NumberRulesTableCard
        {...defaultProps}
        uploadRuleRows={[uploadRule, enabledUploadRule]}
      />,
    )

    expect(screen.getByText('附件')).toBeInTheDocument()
    expect(screen.getByText('附件命名规则')).toBeInTheDocument()
    expect(screen.getByText('{yyyyMMdd}-{originName}')).toBeInTheDocument()
    expect(screen.getByText('20260703-contract.pdf')).toBeInTheDocument()
    expect(
      screen
        .getAllByTestId('status-tag')
        .find((element) => element.textContent === '禁用'),
    ).toHaveAttribute('data-color', 'red')
    expect(screen.getAllByText('1')).toHaveLength(2)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('分派工具栏搜索、刷新、状态筛选与两类编辑动作', () => {
    render(
      <NumberRulesTableCard
        {...defaultProps}
        statusFilter="正常"
        uploadRuleRows={[uploadRule]}
      />,
    )

    fireEvent.change(
      screen.getByLabelText('system.numberRules.searchPlaceholder'),
      { target: { value: '附件' } },
    )
    fireEvent.click(screen.getByText('refresh'))
    fireEvent.change(screen.getByLabelText('system.numberRules.allStatus'), {
      target: { value: '禁用' },
    })
    fireEvent.click(screen.getAllByTestId('action-edit')[0])
    fireEvent.click(screen.getAllByTestId('action-edit')[1])

    expect(defaultProps.onKeywordChange).toHaveBeenCalledWith('附件')
    expect(defaultProps.onRefresh).toHaveBeenCalledTimes(1)
    expect(defaultProps.onStatusFilterChange).toHaveBeenCalledWith('禁用')
    expect(defaultProps.onEditNumberRule).toHaveBeenCalledWith(numberRule)
    expect(defaultProps.onEditUploadRule).toHaveBeenCalledWith(uploadRule)
  })

  it('无编辑权限时禁用编辑动作，清空状态筛选传递 undefined', () => {
    render(
      <NumberRulesTableCard
        {...defaultProps}
        canEdit={false}
        statusFilter="禁用"
      />,
    )

    const editButtons = screen.getAllByTestId('action-edit')

    fireEvent.click(editButtons[0])
    fireEvent.click(editButtons[1])
    fireEvent.change(screen.getByLabelText('system.numberRules.allStatus'), {
      target: { value: '' },
    })

    expect(editButtons[0]).toBeDisabled()
    expect(editButtons[1]).toBeDisabled()
    expect(defaultProps.onEditNumberRule).not.toHaveBeenCalled()
    expect(defaultProps.onEditUploadRule).not.toHaveBeenCalled()
    expect(defaultProps.onStatusFilterChange).toHaveBeenCalledWith(undefined)
  })

  it('用空值覆盖状态、日期规则和重置规则的兜底渲染', () => {
    render(
      <NumberRulesTableCard
        {...defaultProps}
        numberRuleRows={[
          {
            id: 'number-empty',
            dateRule: undefined,
            resetRule: undefined,
            status: undefined,
          },
        ]}
        rows={[]}
        uploadRuleRows={[]}
      />,
    )

    expect(screen.getAllByText('undefined')).toHaveLength(2)
    expect(screen.getByText('--')).toBeInTheDocument()
    expect(screen.getByTestId('status-tag')).toHaveAttribute(
      'data-color',
      'default',
    )
  })
})
