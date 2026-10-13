// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Form } from 'antd'
import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'

/**
 * 接线回归测试：销售订单表单「选客户 → 拉项目下拉」必须真的发起 `/projects/options`。
 *
 * <p>只 mock 两个主数据接口（客户与项目），表单、选项解析与 useMasterOptions 全跑真实实现。
 * 覆盖过的真实故障：需求判定靠函数引用相等，打包后静默失效 ⇒ 请求根本不发、下拉为空且无报错。</p>
 */

const api = vi.hoisted(() => ({
  fetchProjectOptions: vi.fn<(customerId: string) => Promise<unknown[]>>(),
  fetchCustomerOptions: vi.fn<() => Promise<unknown[]>>(),
}))

vi.mock('@/api/master/project-options', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/master/project-options')>()),
  fetchProjectOptions: api.fetchProjectOptions,
}))
vi.mock('@/api/master/customer-options', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/master/customer-options')>()),
  fetchCustomerOptions: api.fetchCustomerOptions,
}))
vi.mock('@/utils/antd-app', () => ({
  message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  modal: { confirm: vi.fn() },
}))

import type { ProjectOption } from '@/api/master/project-options'
import { salesOrdersPageConfig } from '@/config/business-pages/operations/sales-order-page'
import {
  resolveMasterOptionRequirements,
  useMasterOptions,
} from '@/hooks/useMasterOptions'
import { useAuthStore } from '@/stores/authStore'
import { FormFieldRenderer } from '@/views/modules/components/FormFieldRenderer'
import { resolveEditorCustomerId } from '@/views/modules/components/module-editor-workspace-presentation'

const FIELDS = salesOrdersPageConfig.formFields ?? []
const CUSTOMER_ID = '1001'
const PROJECTS = [
  {
    id: '9001',
    value: '9001',
    label: '项目甲',
    customerId: CUSTOMER_ID,
    projectCode: 'XM001',
    projectName: '项目甲',
  },
  {
    id: '9002',
    value: '9002',
    label: '项目乙',
    customerId: CUSTOMER_ID,
    projectCode: 'XM002',
    projectName: '项目乙',
  },
]

interface FormLike {
  setFieldValue: (key: string, value: unknown) => void
  getFieldValue: (key: string) => unknown
}

interface HarnessState {
  projects: readonly ProjectOption[]
  form: FormLike | null
}

function Harness({ onState }: { onState: (state: HarnessState) => void }) {
  const [form] = Form.useForm()
  const watchedCustomerId = Form.useWatch('customerId', form)
  const { projects } = useMasterOptions(
    resolveMasterOptionRequirements(FIELDS),
    true,
    resolveEditorCustomerId(watchedCustomerId),
  )
  const formLike = form as unknown as FormLike
  // 用 effect 回传状态，避免在渲染期调用父级回调。
  useEffect(() => {
    onState({ projects, form: formLike })
  }, [formLike, onState, projects])

  const renderField = (key: string) => {
    const field = FIELDS.find((candidate) => candidate.key === key)
    return field
      ? createElement(FormFieldRenderer, {
          key,
          field,
          moduleKey: 'sales-order',
          projectOptions: projects,
        })
      : null
  }

  return createElement(
    'div',
    null,
    createElement(
      Form,
      { form },
      renderField('customerId'),
      renderField('projectId'),
    ),
  )
}

describe('销售订单 客户→项目 下拉接线', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient
  let state: HarnessState

  beforeEach(() => {
    const globalWithResizeObserver = globalThis as unknown as {
      ResizeObserver?: unknown
    }
    globalWithResizeObserver.ResizeObserver =
      globalWithResizeObserver.ResizeObserver ??
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    })

    useAuthStore.setState({ token: 'test-token', isAuthenticated: true })
    api.fetchCustomerOptions.mockResolvedValue([
      {
        id: CUSTOMER_ID,
        value: CUSTOMER_ID,
        label: '客户甲',
        customerCode: 'C001',
      },
    ])
    api.fetchProjectOptions.mockResolvedValue(PROJECTS)

    state = { projects: [], form: null }
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('选定客户后发起 /projects/options(customerId) 并填充项目下拉选项', async () => {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Harness, {
            onState: (next) => {
              state = next
            },
          }),
        ),
      )
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
    })
    expect(api.fetchProjectOptions).not.toHaveBeenCalled()

    act(() => {
      state.form?.setFieldValue('customerId', CUSTOMER_ID)
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
    })

    expect(api.fetchProjectOptions).toHaveBeenCalledTimes(1)
    expect(api.fetchProjectOptions).toHaveBeenCalledWith(CUSTOMER_ID)
    // 再等一帧让查询结果回填到组件（项目下拉的 options 来自 hook 返回值）。
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 120))
    })
    expect(state.projects).toHaveLength(2)

    const projectSelect = container.querySelectorAll('.ant-select')[1]
    act(() => {
      projectSelect?.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      )
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30))
    })
    const optionLabels = Array.from(
      document.querySelectorAll('.ant-select-item-option'),
    ).map((node) => node.textContent)
    expect(optionLabels).toEqual(['项目甲', '项目乙'])
  })
})
