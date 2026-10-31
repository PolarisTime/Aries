// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { saveBusinessModuleMock, saveAndAuditBusinessModuleMock, messageMock } =
  vi.hoisted(() => ({
    saveBusinessModuleMock: vi.fn(),
    saveAndAuditBusinessModuleMock: vi.fn(),
    messageMock: {
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  }))

vi.mock('@/api/business/business-crud', () => ({
  saveBusinessModule: saveBusinessModuleMock,
  saveAndAuditBusinessModule: saveAndAuditBusinessModuleMock,
}))

vi.mock('@/utils/antd-app', () => ({
  message: messageMock,
  modal: { confirm: vi.fn() },
}))

vi.mock('@/hooks/useModuleQueryRefresh', () => ({
  useModuleQueryRefresh: () => vi.fn(() => Promise.resolve()),
}))

import type { ModuleKey } from '@/module-system/core/module-key'
import type { ModulePageConfig } from '@/types/module-page'
import type { PersistedModuleEditorDraftFor } from '@/types/module-record'
import type {
  SubmissionRef,
  WorkspaceFormApi,
} from '@/views/modules/module-editor-workspace-support'
import { useEditorSubmissionController } from '@/views/modules/use-editor-submission-controller'

/**
 * 编辑器 update 链路的版本前置条件接线守护。
 *
 * <p>付款单/收款单的更新必须把记录上的 `version` 作为 `expectedVersion` 传给
 * `saveBusinessModule`（适配层据此加 `X-Resource-Version`），缺版本时传 undefined
 * （不发空头）。本用例直接驱动真实的 submission controller，锁住
 * 「编辑器记录 → expectedVersion」这一段；请求头与 412/428 恢复路径由
 * `src/api/finance/finance-document-save.spec.ts` 覆盖。</p>
 */
function createConfig(moduleKey: ModuleKey): ModulePageConfig {
  return {
    key: moduleKey,
    title: '',
    kicker: '',
    description: '',
    filters: [],
    columns: [],
    detailFields: [],
    data: [],
    buildOverview: () => [],
  }
}

function createForm(): WorkspaceFormApi {
  return {
    validateFields: () => Promise.resolve({}),
    getFieldsValue: () => ({}),
    setFieldsValue: () => undefined,
    resetFields: () => undefined,
    focusField: () => undefined,
  }
}

/** `handleSave` 的第 4 个实参：`expectedVersion`。 */
function expectedVersionOf(call: unknown[] | undefined): unknown {
  return call?.[3]
}

describe('编辑器 update 的 expectedVersion 接线（付款单/收款单）', () => {
  let root: Root
  let container: HTMLDivElement
  let latest: ReturnType<typeof useEditorSubmissionController>
  let moduleKey: ModuleKey
  let record: PersistedModuleEditorDraftFor<ModuleKey> | null
  let form: WorkspaceFormApi
  let submissionRef: SubmissionRef

  function Probe() {
    latest = useEditorSubmissionController({
      session: {
        moduleKey,
        config: createConfig(moduleKey),
        record,
        isEdit: Boolean(record),
        editorAuditActionKind: null,
        editorAuditTarget: null,
      },
      form,
      workspace: {
        items: [],
        expenseItems: [],
        authoritativePrimaryNo: '',
        submissionRef,
      },
      callbacks: { onClose: vi.fn(), onSaved: vi.fn() },
    })
    return null
  }

  function renderProbe() {
    act(() => {
      root.render(createElement(Probe))
    })
  }

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    saveBusinessModuleMock.mockReset().mockResolvedValue({ id: '9001' })
    saveAndAuditBusinessModuleMock.mockReset().mockResolvedValue({ id: '9001' })
    messageMock.error.mockReset()
    messageMock.warning.mockReset()
    moduleKey = 'payment'
    record = { id: '9001', paymentNo: 'PAY-1', version: 7 }
    form = createForm()
    submissionRef = {
      current: {
        action: null,
        idempotencyKey: null,
        inFlight: false,
        sessionKey: null,
      },
    }
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    renderProbe()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.clearAllMocks()
  })

  it('付款单编辑保存把记录 version 作为 expectedVersion 传给 saveBusinessModule', async () => {
    await act(async () => {
      await latest.handleSave()
    })

    expect(saveBusinessModuleMock).toHaveBeenCalledTimes(1)
    const call = saveBusinessModuleMock.mock.calls[0]
    expect(call[0]).toBe('payment')
    expect(expectedVersionOf(call)).toBe('7')
    expect(latest.saveResult?.status).toBe('success')
  })

  it('收款单同样携带；旧后端没有 version 时传 undefined（适配层不发空头）', async () => {
    moduleKey = 'receipt'
    record = { id: '9002', receiptNo: 'REC-1', version: '12' }
    renderProbe()
    await act(async () => {
      await latest.handleSave()
    })
    expect(expectedVersionOf(saveBusinessModuleMock.mock.calls[0])).toBe('12')

    saveBusinessModuleMock.mockClear()
    record = { id: '9002', receiptNo: 'REC-1' }
    renderProbe()
    await act(async () => {
      await latest.handleSave()
    })
    expect(saveBusinessModuleMock).toHaveBeenCalledTimes(1)
    expect(expectedVersionOf(saveBusinessModuleMock.mock.calls[0])).toBe(
      undefined,
    )
  })

  it('财务单据的非法版本按「无版本」处理（不把脏值当版本前置条件传下去）', async () => {
    record = { id: '9001', paymentNo: 'PAY-1', version: 'abc' }
    renderProbe()
    await act(async () => {
      await latest.handleSave()
    })

    expect(saveBusinessModuleMock).toHaveBeenCalledTimes(1)
    expect(expectedVersionOf(saveBusinessModuleMock.mock.calls[0])).toBe(
      undefined,
    )
  })

  it('非财务模块保持既有取值口径（版本原样透传，不做财务归一）', async () => {
    moduleKey = 'material'
    record = { id: '5', materialName: '垫片', version: ' 8 ' }
    renderProbe()
    await act(async () => {
      await latest.handleSave()
    })

    // 既有口径为 asString 后 trim：' 8 ' → '8'
    expect(expectedVersionOf(saveBusinessModuleMock.mock.calls[0])).toBe('8')
  })
})
