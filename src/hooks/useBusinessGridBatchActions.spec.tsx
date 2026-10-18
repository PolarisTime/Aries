// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ModuleRecord } from '@/types/module-page'
import {
  type AuditTarget,
  useBusinessGridBatchActions,
} from './useBusinessGridBatchActions'

const antdAppMock = vi.hoisted(() => ({
  message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  modal: { confirm: vi.fn() },
}))

const crudMock = vi.hoisted(() => ({
  deleteBusinessModule: vi.fn(),
  updateBusinessModuleStatus: vi.fn(),
}))

vi.mock('@/utils/antd-app', () => ({
  message: antdAppMock.message,
  modal: antdAppMock.modal,
}))

vi.mock('@/api/business/business-crud', () => ({
  deleteBusinessModule: crudMock.deleteBusinessModule,
  updateBusinessModuleStatus: crudMock.updateBusinessModuleStatus,
}))

const MODULE_KEY = 'sales-order'
/** 终态保护状态: 不可删除, 用于构造被跳过的行。 */
const AUDITED = '已审核'
const DRAFT = '草稿'

type BatchActions = ReturnType<typeof useBusinessGridBatchActions>

function record(patch: Partial<ModuleRecord>): ModuleRecord {
  return patch as ModuleRecord
}

/** 确认框被推迟一个宏任务（避免 Enter 的默认动作命中取消按钮），测试需等待它出现。 */
async function flushConfirm() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

/** 取最后一次 modal.confirm 的 content 文本(确认框正文拼接结果)。 */
function lastConfirmContent(): string {
  const options = antdAppMock.modal.confirm.mock.calls.at(-1)?.[0] as {
    content?: unknown
  }
  return String(options?.content ?? '')
}

describe('useBusinessGridBatchActions 批量删除确认文案', () => {
  let container: HTMLDivElement
  let root: Root
  let captured: BatchActions | null

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    antdAppMock.message.warning.mockClear()
    antdAppMock.message.success.mockClear()
    antdAppMock.modal.confirm.mockClear()
    captured = null
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const render = (selectedRows: ModuleRecord[]) => {
    function Harness() {
      captured = useBusinessGridBatchActions({
        moduleKey: MODULE_KEY,
        selectedRowKeys: selectedRows.map((item) => String(item.id)),
        selectedRows,
        listAuditTarget: null,
        listReverseAuditTarget: null,
        listAuditSourceStatuses: undefined,
        listAuditActionKind: null,
        listReverseAuditActionKind: null,
        refreshAndClearSelection: vi.fn(),
      })
      return null
    }
    act(() => {
      root.render(createElement(Harness))
    })
    return captured as unknown as BatchActions
  }

  const confirmDelete = (selectedRows: ModuleRecord[]) => {
    const actions = render(selectedRows)
    act(() => {
      actions.handleSelectedDeleteRecords()
    })
  }

  it('0 条可删: 只提示状态不支持删除, 不弹确认框', () => {
    confirmDelete([
      record({ id: '1', no: 'PO-1', status: AUDITED }),
      record({ id: '2', no: 'PO-2', status: AUDITED }),
    ])

    expect(antdAppMock.modal.confirm).not.toHaveBeenCalled()
    expect(antdAppMock.message.warning).toHaveBeenCalledWith(
      '勾选单据当前状态不支持删除',
    )
  })

  it('1 条可删 + 29 条跳过: 拼接文本在单据号与跳过说明之间有分隔', () => {
    const rows = [
      record({ id: '1', no: 'PO-1', status: DRAFT }),
      ...Array.from({ length: 29 }, (_, index) =>
        record({
          id: String(index + 2),
          no: `PO-${index + 2}`,
          status: AUDITED,
        }),
      ),
    ]
    confirmDelete(rows)

    expect(antdAppMock.modal.confirm).toHaveBeenCalledTimes(1)
    expect(lastConfirmContent()).toBe(
      '确定删除选中的 1 条记录吗？此操作不可恢复。\n将删除：PO-1。\n另有 29 条因状态不支持将跳过。',
    )
  })

  it('可删超过 5 条: 单据号截断为 5 条并给出剩余数量', () => {
    confirmDelete(
      Array.from({ length: 7 }, (_, index) =>
        record({ id: String(index + 1), no: `PO-${index + 1}`, status: DRAFT }),
      ),
    )

    expect(lastConfirmContent()).toBe(
      '确定删除选中的 7 条记录吗？此操作不可恢复。\n将删除：PO-1、PO-2、PO-3、PO-4、PO-5 等 2 条。\n',
    )
  })

  it('单据号回退顺序: no -> orderNo -> code -> id', () => {
    confirmDelete([
      record({ id: '1', orderNo: 'SO-1', status: DRAFT }),
      record({ id: '2', code: 'C-1', status: DRAFT }),
      record({ id: '3', status: DRAFT }),
    ])

    expect(lastConfirmContent()).toBe(
      '确定删除选中的 3 条记录吗？此操作不可恢复。\n将删除：SO-1、C-1、3。\n',
    )
  })

  it('没有可识别单据号时不拼接目标清单(不出现空清单行)', () => {
    const actions = render([])
    act(() => {
      actions.handleSelectedDeleteRecords()
    })

    expect(antdAppMock.modal.confirm).not.toHaveBeenCalled()
    expect(antdAppMock.message.warning).toHaveBeenCalledWith('请先选择记录')
  })
})

/**
 * 行级入口（runAudit / runReverseAudit 传 [record]）的作用域回归：
 * 该行同时属于多选集合时，也只能改这一条。
 */
describe('useBusinessGridBatchActions 审核/反审核作用域', () => {
  const AUDIT_TARGET = { key: 'status', value: '已审核' }
  const REVERSE_TARGET = { key: 'status', value: '草稿' }
  const updateStatusMock = crudMock.updateBusinessModuleStatus

  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    antdAppMock.message.warning.mockClear()
    antdAppMock.message.success.mockClear()
    antdAppMock.modal.confirm.mockClear()
    updateStatusMock.mockReset()
    updateStatusMock.mockResolvedValue(undefined)
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const render = (
    selectedRows: ModuleRecord[],
    overrides: {
      listReverseAuditTarget?: AuditTarget | null
      listAuditSourceStatuses?: string[]
    } = {},
  ) => {
    let captured: BatchActions | null = null
    function Harness() {
      captured = useBusinessGridBatchActions({
        moduleKey: MODULE_KEY,
        selectedRowKeys: selectedRows.map((item) => String(item.id)),
        selectedRows,
        listAuditTarget: AUDIT_TARGET,
        listReverseAuditTarget:
          overrides.listReverseAuditTarget === undefined
            ? REVERSE_TARGET
            : overrides.listReverseAuditTarget,
        listAuditSourceStatuses: overrides.listAuditSourceStatuses,
        listAuditActionKind: 'audit',
        listReverseAuditActionKind: 'reverseAudit',
        refreshAndClearSelection: vi.fn(),
      })
      return null
    }
    act(() => {
      root.render(createElement(Harness))
    })
    return captured as unknown as BatchActions
  }

  const lastConfirm = () =>
    antdAppMock.modal.confirm.mock.calls.at(-1)?.[0] as {
      title?: unknown
      content?: unknown
      onOk?: () => Promise<void>
      autoFocusButton?: string | null
      focusable?: { autoFocusButton?: string | null }
    }

  it('多选集合包含该行时, 行级审核只提交该行', async () => {
    const rows = [
      record({ id: '1', no: 'SO-1', status: '草稿' }),
      record({ id: '2', no: 'SO-2', status: '草稿' }),
      record({ id: '3', no: 'SO-3', status: '草稿' }),
    ]
    const actions = render(rows)

    act(() => {
      actions.runAudit([rows[1]])
    })
    await flushConfirm()

    expect(antdAppMock.modal.confirm).toHaveBeenCalledTimes(1)
    expect(lastConfirm().title).toBe('审核 SO-2')
    // 单条审核文案要说清状态变化（而不是通用的「对 N 条记录执行审核」）
    expect(String(lastConfirm().content)).toContain('草稿')
    expect(String(lastConfirm().content)).toContain('已审核')
    // 默认焦点必须在取消侧
    expect(lastConfirm().autoFocusButton).toBe('cancel')

    await act(async () => {
      await lastConfirm().onOk?.()
    })
    expect(updateStatusMock).toHaveBeenCalledTimes(1)
    expect(updateStatusMock).toHaveBeenCalledWith(MODULE_KEY, '2', '已审核')
  })

  it('无退回路径的模块: 审核文案不承诺"可反审核退回"', async () => {
    // 模拟 receipt/payment（supportsReverseAudit:false）：没有反审核目标
    const rows = [record({ id: '1', no: 'SO-1', status: '草稿' })]
    const actions = render(rows, {
      listReverseAuditTarget: null,
      // 没有反审核目标时，审核放行条件由 auditSourceStatuses 提供（与真实终态模块一致）
      listAuditSourceStatuses: ['草稿'],
    })

    act(() => {
      actions.runAudit([rows[0]])
    })
    await flushConfirm()

    const content = String(lastConfirm().content)
    // 不能承诺"可以退回"（那是误导），必须明确"无法退回"
    expect(content).not.toContain('可用「反审核」撤销')
    expect(content).toContain('没有反审核入口')
    expect(content).toContain('无法退回')
  })

  it('行级反审核逐行解析目标状态, 且只提交该行', async () => {
    const rows = [
      record({ id: '1', no: 'SO-1', status: '已审核' }),
      record({ id: '2', no: 'SO-2', status: '已审核' }),
    ]
    const actions = render(rows)

    act(() => {
      actions.runReverseAudit([rows[1]])
    })
    await flushConfirm()

    expect(lastConfirm().title).toBe('反审核 SO-2')
    expect(lastConfirm().autoFocusButton).toBe('cancel')
    await act(async () => {
      await lastConfirm().onOk?.()
    })
    expect(updateStatusMock).toHaveBeenCalledTimes(1)
    expect(updateStatusMock).toHaveBeenCalledWith(MODULE_KEY, '2', '草稿')
  })

  it('行级审核遇到不允许的状态: 只提示, 不弹确认框', () => {
    const actions = render([record({ id: '1', no: 'SO-1', status: '已审核' })])

    act(() => {
      actions.runAudit([record({ id: '1', no: 'SO-1', status: '已审核' })])
    })

    expect(antdAppMock.modal.confirm).not.toHaveBeenCalled()
    expect(antdAppMock.message.warning).toHaveBeenCalledWith(
      '勾选单据当前状态不支持审核',
    )
    expect(updateStatusMock).not.toHaveBeenCalled()
  })

  it('批量入口仍按选中集提交全部可审核记录', async () => {
    const rows = [
      record({ id: '1', no: 'SO-1', status: '草稿' }),
      record({ id: '2', no: 'SO-2', status: '草稿' }),
      record({ id: '3', no: 'SO-3', status: '已审核' }),
    ]
    const actions = render(rows)

    act(() => {
      actions.handleSelectedAuditRecords()
    })
    await flushConfirm()

    expect(String(lastConfirm().content)).toBe(
      '确定对选中的 2 条记录执行审核吗？另有 1 条因状态不支持将跳过。',
    )
    await act(async () => {
      await lastConfirm().onOk?.()
    })
    expect(updateStatusMock).toHaveBeenCalledTimes(2)
    expect(updateStatusMock).toHaveBeenCalledWith(MODULE_KEY, '1', '已审核')
    expect(updateStatusMock).toHaveBeenCalledWith(MODULE_KEY, '2', '已审核')
  })
})
