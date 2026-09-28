// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StatusChangeActionKind } from '@/module-system/adapter/module-adapter-actions'
import type { ModuleRecord } from '@/types/module-page'

const { messageSuccessMock, messageWarningMock, modalConfirmMock } = vi.hoisted(
  () => ({
    messageSuccessMock: vi.fn(),
    messageWarningMock: vi.fn(),
    modalConfirmMock: vi.fn(),
  }),
)

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: messageSuccessMock,
    warning: messageWarningMock,
    info: vi.fn(),
    error: vi.fn(),
  },
  modal: { confirm: modalConfirmMock },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

import { useModuleRecordActions } from '@/hooks/useModuleRecordActions'

describe('useModuleRecordActions 复制单号', () => {
  let root: Root
  let container: HTMLDivElement
  let latest: ReturnType<typeof useModuleRecordActions>
  let writeTextMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    writeTextMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText: writeTextMock } })
    messageSuccessMock.mockReset()
    messageWarningMock.mockReset()

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.unstubAllGlobals()
  })

  const render = (
    record: ModuleRecord,
    props: { primaryNoKey?: string; isReadOnly?: boolean } = {},
  ) => {
    function Probe() {
      latest = useModuleRecordActions({
        moduleKey: 'sales-order',
        primaryNoKey: props.primaryNoKey ?? 'docNo',
        isReadOnly: props.isReadOnly ?? false,
        onAttach: vi.fn(),
        onDetail: vi.fn(),
      })
      return null
    }
    act(() => {
      root.render(createElement(Probe))
    })
    return latest.buildActions(record)
  }

  it('有单号时渲染「复制单号」菜单项', () => {
    const actions = render({ id: '9', docNo: 'XS-2024-001' })

    const copyAction = actions.find((action) => action.key === 'copy-doc-no')
    expect(copyAction).toBeDefined()
    expect(copyAction?.label).toBe('hooks.recordActions.copyDocNo')
  })

  it('点击写入剪贴板并提示成功', async () => {
    const actions = render({ id: '9', docNo: ' XS-2024-001 ' })

    await act(async () => {
      actions.find((action) => action.key === 'copy-doc-no')?.onClick()
      await Promise.resolve()
    })

    expect(writeTextMock).toHaveBeenCalledWith('XS-2024-001')
    expect(messageSuccessMock).toHaveBeenCalledWith(
      'hooks.recordActions.copyDocNoSuccess',
    )
  })

  it('无单号时不渲染该项（也不回落到 id）', () => {
    expect(
      render({ id: '9' }).some((action) => action.key === 'copy-doc-no'),
    ).toBe(false)
    expect(
      render({ id: '9', docNo: '   ' }).some(
        (action) => action.key === 'copy-doc-no',
      ),
    ).toBe(false)
  })

  it('未配置 primaryNoKey 时不渲染该项', () => {
    const actions = render({ id: '9', docNo: 'XS-2024-001' })
    // 上面默认配置了 primaryNoKey，这里单独验证未配置的场景
    function Probe() {
      latest = useModuleRecordActions({
        moduleKey: 'sales-order',
        onAttach: vi.fn(),
      })
      return null
    }
    act(() => {
      root.render(createElement(Probe))
    })

    const actionsWithoutKey = latest.buildActions({
      id: '9',
      docNo: 'XS-2024-001',
    })
    expect(
      actionsWithoutKey.some((action) => action.key === 'copy-doc-no'),
    ).toBe(false)
    expect(actions.some((action) => action.key === 'copy-doc-no')).toBe(true)
  })

  it('只读单据仍可复制单号', () => {
    const actions = render(
      { id: '9', docNo: 'XS-2024-001' },
      { isReadOnly: true },
    )

    expect(actions.some((action) => action.key === 'copy-doc-no')).toBe(true)
    // 只读时不再展示编辑等写操作
    expect(actions.some((action) => action.key === 'attach')).toBe(false)
  })

  it('剪贴板不可用时提示失败', async () => {
    writeTextMock.mockRejectedValue(new Error('denied'))
    const actions = render({ id: '9', docNo: 'XS-2024-001' })

    await act(async () => {
      actions.find((action) => action.key === 'copy-doc-no')?.onClick()
      await Promise.resolve()
    })

    expect(messageWarningMock).toHaveBeenCalledWith(
      'hooks.recordActions.copyDocNoFailed',
    )
  })
})

/** 行级审核/反审核：与批量入口同口径，但按「菜单所属的这一行」判定与执行。 */
describe('useModuleRecordActions 行级审核/反审核', () => {
  let root: Root
  let container: HTMLDivElement
  let latest: ReturnType<typeof useModuleRecordActions>
  let onAuditRecord: (record: ModuleRecord) => void
  let onReverseAuditRecord: (record: ModuleRecord) => void

  const AUDIT_TARGET = { key: 'status', value: '已审核' }
  const REVERSE_TARGET = { key: 'status', value: '草稿' }

  type AuditPropOverrides = Partial<{
    moduleKey: string
    isReadOnly: boolean
    canAuditRecords: boolean
    listAuditTarget: { key: string; value: string } | null
    listReverseAuditTarget: { key: string; value: string } | null
    listAuditSourceStatuses: string[]
    listAuditActionKind: StatusChangeActionKind | null
    onAuditRecord: ((record: ModuleRecord) => void) | undefined
    onReverseAuditRecord: ((record: ModuleRecord) => void) | undefined
  }>

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    onAuditRecord = vi.fn()
    onReverseAuditRecord = vi.fn()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.unstubAllGlobals()
  })

  const renderActions = (
    record: ModuleRecord,
    overrides: AuditPropOverrides = {},
  ) => {
    function Probe() {
      latest = useModuleRecordActions({
        moduleKey: 'purchase-order',
        primaryNoKey: 'no',
        onAttach: vi.fn(),
        canAuditRecords: true,
        listAuditTarget: AUDIT_TARGET,
        listReverseAuditTarget: REVERSE_TARGET,
        listAuditActionKind: 'audit',
        onAuditRecord,
        onReverseAuditRecord,
        ...overrides,
      })
      return null
    }
    act(() => {
      root.render(createElement(Probe))
    })
    return latest.buildActions(record)
  }

  it('状态允许审核: 出现「审核」项, 点击只把该行交给行级处理器', () => {
    const record: ModuleRecord = { id: '7', no: 'PO-7', status: '草稿' }
    const actions = renderActions(record)

    const audit = actions.find((action) => action.key === 'audit')
    expect(audit).toBeDefined()
    expect(audit?.label).toBe('modules.statusActions.audit')
    expect(audit?.disabled).toBeFalsy()

    act(() => {
      audit?.onClick()
    })
    expect(onAuditRecord).toHaveBeenCalledTimes(1)
    expect(onAuditRecord).toHaveBeenCalledWith(record)
    expect(onReverseAuditRecord).not.toHaveBeenCalled()
  })

  it('状态允许审核: 不出现「反审核」(两项互斥)', () => {
    const actions = renderActions({ id: '7', status: '草稿' })
    expect(actions.some((action) => action.key === 'reverse-audit')).toBe(false)
  })

  it('状态允许反审核: 出现「反审核」项, 点击只把该行交给反审核处理器', () => {
    const record: ModuleRecord = { id: '8', status: '已审核' }
    const actions = renderActions(record)

    expect(actions.some((action) => action.key === 'audit')).toBe(false)
    const reverse = actions.find((action) => action.key === 'reverse-audit')
    expect(reverse?.label).toBe('modules.statusActions.reverseAudit')

    act(() => {
      reverse?.onClick()
    })
    expect(onReverseAuditRecord).toHaveBeenCalledWith(record)
    expect(onAuditRecord).not.toHaveBeenCalled()
  })

  it('终态记录既不出现「审核」也不出现「反审核」', () => {
    const actions = renderActions({ id: '9', status: '完成采购' })
    expect(actions.some((action) => action.key === 'audit')).toBe(false)
    expect(actions.some((action) => action.key === 'reverse-audit')).toBe(false)
  })

  it('已删除记录不出现审核/反审核', () => {
    const actions = renderActions({
      id: '10',
      status: '草稿',
      deletedFlag: true,
    })
    expect(actions.some((action) => action.key === 'audit')).toBe(false)
    expect(actions.some((action) => action.key === 'reverse-audit')).toBe(false)
  })

  it('只读模块不出现审核/反审核', () => {
    const actions = renderActions(
      { id: '11', status: '草稿' },
      { isReadOnly: true },
    )
    expect(actions.some((action) => action.key === 'audit')).toBe(false)
    expect(actions.some((action) => action.key === 'reverse-audit')).toBe(false)
  })

  it('无审核权限时不出现审核/反审核', () => {
    const actions = renderActions(
      { id: '12', status: '草稿' },
      { canAuditRecords: false },
    )
    expect(actions.some((action) => action.key === 'audit')).toBe(false)
    expect(actions.some((action) => action.key === 'reverse-audit')).toBe(false)
  })

  it('未注入行级处理器时不出现审核/反审核', () => {
    const actions = renderActions(
      { id: '13', status: '草稿' },
      { onAuditRecord: undefined, onReverseAuditRecord: undefined },
    )
    expect(actions.some((action) => action.key === 'audit')).toBe(false)
    expect(actions.some((action) => action.key === 'reverse-audit')).toBe(false)
  })

  it('反审核文案跟随该行解析出的目标状态(完成销售 -> 重新核定)', () => {
    const actions = renderActions(
      { id: '14', status: '完成销售' },
      { moduleKey: 'sales-order' },
    )
    const reverse = actions.find((action) => action.key === 'reverse-audit')
    expect(reverse?.label).toBe(
      'modules.statusActions.reopenDeliveryVerification',
    )
  })
})
