// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query'
import { Form } from 'antd'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { salesOrdersPageConfig } from '@/config/business-pages/operations/sales-order-page'
import { QUERY_KEYS } from '@/constants/query-keys'
import { queryClient } from '@/lib/query-client'
import type { ModuleFormFieldDefinition } from '@/types/module-page'
import { FormFieldRenderer } from '@/views/modules/components/FormFieldRenderer'

/**
 * 表单控件绑定回归：Form.Item 必须真的把表单值注入到 antd 控件。
 *
 * <p>覆盖过的真实故障：控件分发层把 antd 控件包在自定义组件里，Form.Item 通过 cloneElement
 * 注入的 `value`/`onChange` 落在中间组件上被 props 解构丢掉 ⇒ 下拉只显示用户点选的标签、
 * 表单里始终没有值 ⇒ 依赖该值的下游查询（按客户拉项目）永不触发、下拉恒为空且无任何报错。</p>
 *
 * <p>断言方式：给表单 `initialValues` 后，文本控件必须回显文本、下拉必须回显选项标签；
 * 控件非受控时只会显示空值/占位符。</p>
 */

const CUSTOMER_ID = '1001'
const REMARK = '绑定回归备注'

function formField(key: string): ModuleFormFieldDefinition {
  const field = (salesOrdersPageConfig.formFields ?? []).find(
    (candidate) => candidate.key === key,
  )
  if (!field) {
    throw new Error(`销售订单表单缺少字段: ${key}`)
  }
  return field
}

describe('表单字段与 antd 控件的受控绑定', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
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

    // 下拉选项来自全局主数据缓存（与运行时读取的是同一个 queryClient）。
    queryClient.setQueryData(QUERY_KEYS.masterOptions.customer, [
      {
        id: CUSTOMER_ID,
        value: CUSTOMER_ID,
        label: '客户甲',
        customerCode: 'C001',
      },
    ])

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    queryClient.clear()
  })

  async function renderForm(
    fields: ModuleFormFieldDefinition[],
    initialValues: Record<string, unknown>,
  ) {
    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(
            Form,
            { initialValues },
            ...fields.map((field) =>
              createElement(FormFieldRenderer, {
                key: field.key,
                field,
                moduleKey: 'sales-order',
              }),
            ),
          ),
        ),
      )
      await Promise.resolve()
    })
  }

  it('文本控件回显表单值（受控绑定生效）', async () => {
    await renderForm([formField('remark')], { remark: REMARK })

    const input = container.querySelector<HTMLInputElement>('input')
    expect(input?.value).toBe(REMARK)
  })

  it('下拉控件回显表单里的已选值（受控绑定生效）', async () => {
    await renderForm([formField('customerId')], { customerId: CUSTOMER_ID })

    const select = container.querySelector('.ant-select')
    expect(select).not.toBeNull()
    expect(select?.textContent).toContain('客户甲')
  })
})
