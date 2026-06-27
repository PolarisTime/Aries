import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ApiKeyRecord } from '@/api/api-keys'
import { buildApiKeyListColumns } from '@/views/system/api-key-list-columns'

describe('api-key-list-columns', () => {
  it('renders view and revoke actions for active editable keys', () => {
    const onView = vi.fn()
    const onRevoke = vi.fn()
    const columns = buildApiKeyListColumns({
      canEdit: true,
      actionOptions: [],
      resourceOptions: [],
      onView,
      onRevoke,
    })
    const actionCol = columns.find(
      (col) => 'key' in col && col.key === 'action',
    )
    const record = apiKeyRecord({ status: '有效' })

    render(<div>{actionCol?.render?.(null, record, 0)}</div>)
    fireEvent.click(screen.getByRole('button', { name: /查看/ }))
    fireEvent.click(screen.getByRole('button', { name: /禁用/ }))

    expect(onView).toHaveBeenCalledWith(record)
    expect(onRevoke).toHaveBeenCalledWith(record)
  })

  it('hides revoke action when key is not editable or not active', () => {
    const readonlyColumns = buildApiKeyListColumns({
      canEdit: false,
      actionOptions: [],
      resourceOptions: [],
      onView: vi.fn(),
      onRevoke: vi.fn(),
    })
    const disabledColumns = buildApiKeyListColumns({
      canEdit: true,
      actionOptions: [],
      resourceOptions: [],
      onView: vi.fn(),
      onRevoke: vi.fn(),
    })
    const readonlyAction = readonlyColumns.find(
      (col) => 'key' in col && col.key === 'action',
    )
    const disabledAction = disabledColumns.find(
      (col) => 'key' in col && col.key === 'action',
    )

    const { rerender } = render(
      <div>
        {readonlyAction?.render?.(null, apiKeyRecord({ status: '有效' }), 0)}
      </div>,
    )
    expect(
      screen.queryByRole('button', { name: /禁用/ }),
    ).not.toBeInTheDocument()

    rerender(
      <div>
        {disabledAction?.render?.(null, apiKeyRecord({ status: '已禁用' }), 0)}
      </div>,
    )
    expect(
      screen.queryByRole('button', { name: /禁用/ }),
    ).not.toBeInTheDocument()
  })

  it('renders resource, action, owner, expiry, date and status columns', () => {
    const columns = buildApiKeyListColumns({
      canEdit: true,
      resourceOptions: [{ code: 'receipt', title: '收款单', group: '财务' }],
      actionOptions: [{ code: 'read', title: '读取' }],
      onView: vi.fn(),
      onRevoke: vi.fn(),
    })
    const record = apiKeyRecord({
      allowedResources: ['receipt', 'unknown-resource'],
      allowedActions: ['read', 'unknown-action'],
      expiresAt: null,
      lastUsedAt: '',
      status: '已过期',
    })

    expect(renderColumn(columns, 'expiresAt', null, record)).toBe('永不过期')
    expect(renderColumn(columns, 'lastUsedAt', '', record)).toBe('--')

    render(
      <>
        {renderColumn(
          columns,
          'allowedResources',
          record.allowedResources,
          record,
        )}
        {renderColumn(columns, 'allowedActions', record.allowedActions, record)}
        {renderColumn(columns, 'userName', null, record)}
        {renderColumn(columns, 'status', '已过期', record)}
      </>,
    )
    expect(screen.getByText('2 个资源')).toBeInTheDocument()
    expect(screen.getByText('2 个动作')).toBeInTheDocument()
    expect(screen.getByText('测试员')).toBeInTheDocument()
    expect(screen.getByText('tester')).toBeInTheDocument()
    expect(screen.getByText('已过期')).toBeInTheDocument()
  })
})

function renderColumn(
  columns: ReturnType<typeof buildApiKeyListColumns>,
  dataIndex: string,
  value: unknown,
  record: ApiKeyRecord,
) {
  const column = columns.find(
    (item) => 'dataIndex' in item && item.dataIndex === dataIndex,
  )
  return column?.render?.(value, record, 0)
}

function apiKeyRecord(overrides: Partial<ApiKeyRecord> = {}): ApiKeyRecord {
  return {
    id: '1',
    userId: 'u1',
    loginName: 'tester',
    userName: '测试员',
    keyName: '集成密钥',
    usageScope: '个人',
    allowedResources: [],
    allowedActions: [],
    keyPrefix: 'leo_',
    rawKey: null,
    createdAt: '2026-06-01 10:00:00',
    expiresAt: '2026-07-01 10:00:00',
    lastUsedAt: null,
    status: '有效',
    ...overrides,
  }
}
