// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useModuleToolbarActions } from '@/hooks/useModuleToolbarActions'
import type {
  ModuleActionDefinition,
  ModulePageConfig,
} from '@/types/module-page'

vi.mock('react-i18next', () => ({
  // t 返回 key 本身, 便于断言按钮用的是状态机给出的动作类型(audit/reverseAudit)
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

const auditHandler = vi.hoisted(() => vi.fn())
const reverseAuditHandler = vi.hoisted(() => vi.fn())

const AUDIT_KEY = 'bulk_audit'
const REVERSE_AUDIT_KEY = 'bulk_reverse_audit'

function createConfig(): ModulePageConfig {
  return {
    key: 'purchase-order',
    title: '采购订单',
    kicker: '',
    description: '',
    filters: [],
    columns: [],
    detailFields: [],
    data: [],
    actions: [{ key: 'create', label: '新增', type: 'primary' }],
    buildOverview: () => [],
  }
}

/**
 * 批量审核/反审核入口的回归保护。
 *
 * <p>工具栏依据 `canUseBulkAuditAction` / `canUseBulkReverseAuditAction`(由
 * useBusinessGridActions 按选中记录状态算出)渲染入口, 这里直接给定这两个入参,
 * 断言用户可见的结果: 允许审核的记录勾选后入口出现, 终态记录不出现,
 * 采购入库多选时入口保留但置灰并说明"仅支持单选"。</p>
 */
describe('useModuleToolbarActions 批量审核/反审核入口', () => {
  let root: Root
  let container: HTMLDivElement
  let latest: ReturnType<typeof useModuleToolbarActions>
  let moduleKey: 'purchase-order' | 'purchase-inbound'
  let selectedRowCount: number
  let canUseBulkAuditAction: boolean
  let canUseBulkReverseAuditAction: boolean

  function Probe() {
    latest = useModuleToolbarActions({
      moduleKey,
      config: createConfig(),
      formFields: [],
      isMaterialModule: false,
      selectedRowCount,
      canUseBulkAuditAction,
      canUseBulkReverseAuditAction,
      canUseBulkDeleteActions: false,
      listAuditActionKind: canUseBulkAuditAction ? 'audit' : null,
      listReverseAuditActionKind: canUseBulkReverseAuditAction
        ? 'reverseAudit'
        : null,
      handlers: {
        exportMaterialRows: async () => {},
        exportRows: async () => {},
        handleSelectedAuditRecords: auditHandler,
        handleSelectedDeleteRecords: () => {},
        handleSelectedReverseAuditRecords: reverseAuditHandler,
        openCreateEditor: async () => {},
        openFreightSummary: async () => {},
        openCustomerSummary: async () => {},
        openCustomerProjects: () => {},
      },
    })
    return null
  }

  /** 复现一次渲染: canUse* 的口径与 useBusinessGridActions 保持一致。 */
  function renderSelection(
    nextModuleKey: 'purchase-order' | 'purchase-inbound',
    statuses: string[],
  ) {
    moduleKey = nextModuleKey
    selectedRowCount = statuses.length
    canUseBulkAuditAction = statuses.includes('草稿')
    canUseBulkReverseAuditAction = statuses.some(
      (status) => status === '已审核' || status === '完成入库',
    )
    act(() => {
      root.render(createElement(Probe))
    })
  }

  beforeEach(() => {
    auditHandler.mockReset()
    reverseAuditHandler.mockReset()
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    renderSelection('purchase-order', [])
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const find = (key: string): ModuleActionDefinition | undefined =>
    latest.visibleToolbarActions.find((action) => action.key === key)

  it('采购订单: 勾选一条草稿记录出现「审核」', () => {
    renderSelection('purchase-order', ['草稿'])
    const audit = find(AUDIT_KEY)
    expect(audit).toBeDefined()
    expect(audit?.label).toBe('modules.statusActions.audit')
    expect(audit?.disabled).toBeFalsy()
  })

  it('采购订单: 勾选一条已审核记录出现「反审核」', () => {
    renderSelection('purchase-order', ['已审核'])
    const reverse = find(REVERSE_AUDIT_KEY)
    expect(reverse).toBeDefined()
    expect(reverse?.label).toBe('modules.statusActions.reverseAudit')
    expect(reverse?.disabled).toBeFalsy()
  })

  it('采购订单: 终态「完成采购」记录既不出现审核也不出现反审核', () => {
    // 后端明确拒绝 完成采购 -> 已审核(只能由采购入库反审核自动回退)
    renderSelection('purchase-order', ['完成采购'])
    expect(find(AUDIT_KEY)).toBeUndefined()
    expect(find(REVERSE_AUDIT_KEY)).toBeUndefined()
  })

  it('采购入库: 勾选一条「完成入库」记录出现「反审核」', () => {
    renderSelection('purchase-inbound', ['完成入库'])
    expect(find(REVERSE_AUDIT_KEY)).toBeDefined()
    expect(find(REVERSE_AUDIT_KEY)?.disabled).toBeFalsy()
  })

  it('采购入库: 多选时入口保留但置灰, 并给出单选原因的 tooltip', () => {
    renderSelection('purchase-inbound', ['完成入库', '完成入库'])
    const reverse = find(REVERSE_AUDIT_KEY)
    expect(reverse).toBeDefined()
    expect(reverse?.disabled).toBe(true)
    expect(reverse?.tooltip).toBe('hooks.toolbarActions.singleSelectionOnly')
  })

  it('采购订单不受单选限制: 多选时审核入口可用', () => {
    renderSelection('purchase-order', ['草稿', '草稿'])
    expect(find(AUDIT_KEY)?.disabled).toBeFalsy()
    expect(find(AUDIT_KEY)?.tooltip).toBeUndefined()
  })

  it('未勾选任何记录时不出现审核/反审核入口', () => {
    renderSelection('purchase-inbound', [])
    expect(find(AUDIT_KEY)).toBeUndefined()
    expect(find(REVERSE_AUDIT_KEY)).toBeUndefined()
  })

  it('点击审核入口分派到批量审核处理器', async () => {
    renderSelection('purchase-order', ['草稿'])
    await act(async () => {
      await latest.handleAction({
        key: AUDIT_KEY,
        label: '审核',
        type: 'default',
      })
    })
    expect(auditHandler).toHaveBeenCalledTimes(1)
  })

  it('点击反审核入口分派到批量反审核处理器', async () => {
    renderSelection('purchase-inbound', ['完成入库'])
    await act(async () => {
      await latest.handleAction({
        key: REVERSE_AUDIT_KEY,
        label: '反审核',
        type: 'default',
      })
    })
    expect(reverseAuditHandler).toHaveBeenCalledTimes(1)
  })
})
