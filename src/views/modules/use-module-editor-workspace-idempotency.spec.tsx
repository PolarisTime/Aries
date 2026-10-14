// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Form, type FormInstance } from 'antd'
import {
  Activity,
  act,
  createElement,
  type ReactNode,
  StrictMode,
  useEffect,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ModuleKey } from '@/module-system/core/module-key'
import type { ModulePageConfig } from '@/types/module-page'
import type { PersistedModuleEditorDraftFor } from '@/types/module-record'

/**
 * 编辑器初始化幂等 + Activity 语义守护。
 *
 * <p>官方语义：React 19 的 `Activity` 在 hidden 时用 `display:none` 隐藏 DOM、**销毁子树 effect**，
 * 恢复时重跑 setup；组件 state 与 DOM 保留。所以只要初始化 effect 是「挂载即初始化」
 * （setup 里 `form.resetFields()` + 灌默认值），任何 effect 重入都会覆盖用户已改的值：
 * Activity 显隐、StrictMode 双调用、父级重渲染让 `config`/`record` 换身份都一样。
 * 本用例把三条路径都钉住，并用可观测计数锁住「隐藏/恢复真的重跑了 setup」与
 * 「每轮 setup 的订阅/定时器都配平」这两件事，避免用例变成空跑。</p>
 *
 * <p>协作者只 mock 与本主题无关的部分（保存控制器、父单导入控制器、结算主体默认值、antd 全局提示），
 * 初始化、表单写入、项目范围提示都跑真实实现。</p>
 */

const antdAppMock = vi.hoisted(() => ({
  message: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
  modal: { confirm: vi.fn() },
}))

vi.mock('@/utils/antd-app', () => ({
  message: antdAppMock.message,
  modal: antdAppMock.modal,
}))

vi.mock('@/views/modules/use-editor-submission-controller', () => ({
  useEditorSubmissionController: () => ({
    clearSaveResult: vi.fn(),
    handleSave: vi.fn(),
    reloadAfterConflict: vi.fn(),
    saveResult: null,
    saving: false,
  }),
}))

vi.mock('@/views/modules/use-parent-import-controller', () => ({
  useParentImportController: () => ({
    closeParentSelector: vi.fn(),
    handleImportParentRecord: vi.fn(),
    openParentSelector: vi.fn(),
    parentImporting: false,
    parentSelectorDisplayFieldKey: 'orderNo',
    parentSelectorFilters: {},
    parentSelectorModuleKey: 'purchase-order',
    parentSelectorOpen: false,
  }),
}))

vi.mock('@/api/system/company-settings', () => ({
  getCompanySettingProfile: vi.fn(() => Promise.resolve(null)),
  fetchSettlementCompanyOptions: vi.fn(() => Promise.resolve([])),
}))

import { useModuleEditorWorkspace } from '@/views/modules/use-module-editor-workspace'

const MODULE_KEY = 'supplier' as ModuleKey
const DEFAULT_REMARK = '默认备注'
const RECORD_REMARK = '服务端备注'
const USER_REMARK = 'E2E-KEEP'

function buildConfig(): ModulePageConfig {
  return {
    key: MODULE_KEY,
    title: '',
    kicker: '',
    description: '',
    filters: [],
    columns: [],
    detailFields: [],
    data: [],
    buildOverview: () => [],
    formFields: [
      {
        key: 'remark',
        label: '备注',
        type: 'text',
        defaultValue: DEFAULT_REMARK,
      },
    ],
  } as unknown as ModulePageConfig
}

function buildRecord(remark: string): PersistedModuleEditorDraftFor<ModuleKey> {
  return {
    id: '5001',
    remark,
    items: [],
  } as unknown as PersistedModuleEditorDraftFor<ModuleKey>
}

/** 观测点：Activity 恢复是否真的重跑了 setup，以及每轮 setup 的订阅/定时器是否配平。 */
interface ActivityObservable {
  liveListeners: number
  liveTimers: number
  listenerAdds: number
  listenerRemoves: number
  setUpCount: number
  timerClears: number
  timerStarts: number
}

function createObservable(): ActivityObservable {
  return {
    liveListeners: 0,
    liveTimers: 0,
    listenerAdds: 0,
    listenerRemoves: 0,
    setUpCount: 0,
    timerClears: 0,
    timerStarts: 0,
  }
}

/**
 * 与编辑器同处一个 Activity 边界的探针：每轮 setup 注册一个 window 订阅与一个定时器，
 * 并在 cleanup 里释放。计数用来区分「Activity 恢复了 effect（用例非空）」与「泄漏成倍增长」。
 */
function EffectProbe({ observable }: { observable: ActivityObservable }) {
  useEffect(() => {
    observable.setUpCount += 1
    observable.listenerAdds += 1
    observable.liveListeners += 1
    observable.timerStarts += 1
    observable.liveTimers += 1
    const onResize = () => undefined
    window.addEventListener('resize', onResize)
    const timer = window.setInterval(() => undefined, 1000)
    return () => {
      observable.listenerRemoves += 1
      observable.liveListeners -= 1
      observable.timerClears += 1
      observable.liveTimers -= 1
      window.removeEventListener('resize', onResize)
      window.clearInterval(timer)
    }
  }, [observable])
  return null
}

interface ProbeApi {
  form: FormInstance
  authoritativePrimaryNo: () => string
  items: () => readonly unknown[]
}

interface ProbeProps {
  open: boolean
  record: PersistedModuleEditorDraftFor<ModuleKey> | null
  config: ModulePageConfig
  apiRef: { current: ProbeApi | null }
}

function Probe({ open, record, config, apiRef }: ProbeProps) {
  const [form] = Form.useForm()
  const workspace = useModuleEditorWorkspace({
    open,
    config,
    record,
    initialParentImportSource: null,
    moduleKey: MODULE_KEY,
    editorAuditActionKind: null,
    editorAuditTarget: null,
    form,
    onClose: () => undefined,
    onDirty: () => undefined,
    onSaved: () => undefined,
    autoInsertBlankItemOnCreate: false,
  })

  useEffect(() => {
    apiRef.current = {
      authoritativePrimaryNo: () => workspace.authoritativePrimaryNo,
      form: form as unknown as FormInstance,
      items: () => workspace.items,
    }
  })

  // 真实 antd 表单字段：承载「用户已改的值」，也是草稿是否被覆盖的观测面。
  return createElement(
    Form,
    { form, name: 'idempotency-probe' },
    createElement(
      Form.Item,
      { name: 'remark', label: '备注' },
      createElement('input', { id: 'probe-remark' }),
    ),
  )
}

interface HarnessProps {
  visible: boolean
  open: boolean
  record: PersistedModuleEditorDraftFor<ModuleKey> | null
  config: ModulePageConfig
  observable: ActivityObservable
  apiRef: { current: ProbeApi | null }
  strict?: boolean
}

function Harness({
  visible,
  open,
  record,
  config,
  observable,
  apiRef,
  strict = false,
}: HarnessProps) {
  const boundary = createElement(Activity, {
    mode: visible ? 'visible' : 'hidden',
    children: [
      createElement(Probe, { key: 'probe', open, record, config, apiRef }),
      createElement(EffectProbe, { key: 'effect-probe', observable }),
    ],
  })
  return strict ? createElement(StrictMode, null, boundary) : boundary
}

describe('useModuleEditorWorkspace 初始化幂等与 Activity 语义', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient
  let apiRef: { current: ProbeApi | null }
  let observable: ActivityObservable

  const value = (): unknown => apiRef.current?.form.getFieldValue('remark')

  const render = (
    props: Partial<Omit<HarnessProps, 'apiRef' | 'observable'>> = {},
  ): void => {
    const tree: ReactNode = createElement(Harness, {
      config: buildConfig(),
      observable,
      open: true,
      record: null,
      visible: true,
      ...props,
      apiRef,
    })
    act(() => {
      root.render(
        createElement(QueryClientProvider, { client: queryClient }, tree),
      )
    })
  }

  /** 一轮「切走再切回」：隐藏销毁子树 effect，恢复重跑 setup。 */
  const switchAwayAndBack = (
    props: Partial<Omit<HarnessProps, 'apiRef' | 'observable'>> = {},
  ): void => {
    render({ ...props, visible: false })
    render({ ...props, visible: true })
  }

  beforeEach(() => {
    antdAppMock.message.error.mockClear()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    if (!window.matchMedia) {
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    apiRef = { current: null }
    observable = createObservable()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    queryClient.clear()
  })

  it('Activity 隐藏→恢复 3 轮后用户已改的草稿仍在', () => {
    render()
    expect(value(), '前置条件：新会话必须已按默认值初始化').toBe(DEFAULT_REMARK)

    act(() => {
      apiRef.current?.form.setFieldValue('remark', USER_REMARK)
    })
    expect(value()).toBe(USER_REMARK)

    for (let round = 0; round < 3; round += 1) {
      switchAwayAndBack()
    }

    expect(
      value(),
      '切回后草稿必须仍在（Activity 恢复重跑 setup 不得把用户输入重置）',
    ).toBe(USER_REMARK)
    expect(
      observable.setUpCount,
      '前置条件：Activity 隐藏销毁 effect、恢复重跑 setup，共 4 次（否则本用例是空跑）',
    ).toBe(4)
  })

  it('父级重渲染（config 换身份）不得覆盖用户已改的值', () => {
    render()
    act(() => {
      apiRef.current?.form.setFieldValue('remark', USER_REMARK)
    })

    // 同一个会话 key，仅 config 对象换了身份：effect 重入也必须 no-op
    render({ config: buildConfig() })

    expect(value()).toBe(USER_REMARK)
  })

  it('提交成功结束会话后再打开同一条单据：表单必须被清并重新按实体初始化', () => {
    render({ record: buildRecord(RECORD_REMARK) })
    expect(value(), '前置条件：编辑态必须已灌入实体值').toBe(RECORD_REMARK)

    act(() => {
      apiRef.current?.form.setFieldValue('remark', USER_REMARK)
    })

    // 提交成功：父级收回 open，会话结束
    render({ open: false, record: buildRecord(RECORD_REMARK) })
    expect(
      value(),
      '提交成功后表单必须被清（否则上一会话的输入会残留到下一次打开）',
    ).toBeUndefined()

    // 再打开同一条单据（会话 key 与上一轮完全相同，账本必须已被清）
    render({ record: buildRecord(RECORD_REMARK) })
    expect(value(), '重开必须重新按实体值初始化').toBe(RECORD_REMARK)
    expect(apiRef.current?.authoritativePrimaryNo()).toBe('')
  })

  it('循环隐藏/显示 3 轮后订阅与定时器计数不泄漏', () => {
    render()
    expect(observable.liveListeners).toBe(1)
    expect(observable.liveTimers).toBe(1)

    for (let round = 0; round < 3; round += 1) {
      switchAwayAndBack()
    }

    expect(observable.setUpCount, '4 轮 setup（首次 + 3 次恢复）').toBe(4)
    expect(observable.listenerAdds, '每轮 setup 都注册了订阅').toBe(4)
    expect(observable.listenerRemoves, '前 3 轮隐藏都释放了订阅').toBe(3)
    expect(observable.timerStarts, '每轮 setup 都起了定时器').toBe(4)
    expect(observable.timerClears, '前 3 轮隐藏都清了定时器').toBe(3)
    expect(
      observable.liveListeners,
      '存活的订阅数必须恒为 1，不能随显隐轮次增长',
    ).toBe(1)
    expect(
      observable.liveTimers,
      '存活的定时器数必须恒为 1，不能随显隐轮次增长',
    ).toBe(1)
  })

  it('StrictMode 下初始化与草稿保留行为一致', () => {
    render({ strict: true })
    expect(value(), 'StrictMode 双调用后默认值仍在').toBe(DEFAULT_REMARK)

    act(() => {
      apiRef.current?.form.setFieldValue('remark', USER_REMARK)
    })
    switchAwayAndBack({ strict: true })
    switchAwayAndBack({ strict: true })

    expect(value(), 'StrictMode 下切回草稿同样必须仍在').toBe(USER_REMARK)
    expect(observable.liveListeners, 'StrictMode 下订阅数仍必须配平为 1').toBe(
      1,
    )
    expect(observable.liveTimers).toBe(1)
  })
})
