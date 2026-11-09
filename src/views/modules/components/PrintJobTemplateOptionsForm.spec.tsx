// @vitest-environment jsdom

import type { FormInstance } from 'antd'
import { Form } from 'antd'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import {
  DEFAULT_PRINT_JOB_LAYOUT,
  getPrintJobLayout,
  type PrintJobOptionsSpec,
} from '@/utils/print-job-layout'
import { PrintJobTemplateOptionsForm } from './PrintJobTemplateOptionsForm'
import type { PrintJobFormValues } from './print-job-modal-state'

/**
 * 「同款合并」归位后的契约：它现在是打印选项区里的一个复选框，只在布局声明
 * `options.merge` 的模块（当前为销售订单）出现；勾选＝合并成一行，不勾选＝逐行打印。
 *
 * <p>此前它是一对「合并同款 / 拆分明细」按钮，放在明细区计数行右侧，看起来像打印模式
 * 总开关，实际只控制同款合并，容易与「拆分打印（每份件数）」「选择打印明细」混淆。</p>
 */
describe('打印选项区的「同款合并」开关', () => {
  let container: HTMLDivElement
  let root: Root
  let formRef: FormInstance<PrintJobFormValues> | undefined

  function Harness({ options }: { options: PrintJobOptionsSpec }) {
    const [form] = Form.useForm<PrintJobFormValues>()
    formRef = form
    return createElement(PrintJobTemplateOptionsForm, {
      form,
      options,
      templates: [],
      templateOptions: [],
    })
  }

  const render = (options: PrintJobOptionsSpec) => {
    act(() => {
      root.render(createElement(Harness, { options }))
    })
  }

  const mergeLabel = () =>
    Array.from(container.querySelectorAll('label')).find((label) =>
      (label.textContent ?? '').includes('同款合并'),
    )

  const mergeCheckbox = () =>
    mergeLabel()?.querySelector<HTMLInputElement>('input[type="checkbox"]')

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
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
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    formRef = undefined
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })

  it('销售订单布局：复选框默认勾选（保持「合并」为默认输出）', () => {
    render(getPrintJobLayout('sales-order').options)

    expect(mergeLabel()).toBeTruthy()
    expect(mergeCheckbox()?.checked).toBe(true)
    expect(formRef?.getFieldValue('mergeEquivalentItems')).toBe(true)
  })

  it('未声明 options.merge 的模块不出现该开关', () => {
    expect(DEFAULT_PRINT_JOB_LAYOUT.options.merge).toBe(false)

    render(DEFAULT_PRINT_JOB_LAYOUT.options)

    expect(mergeLabel()).toBeUndefined()
  })

  it('取消勾选后表单值为 false（打印按明细逐行输出）', () => {
    render(getPrintJobLayout('sales-order').options)

    act(() => {
      mergeCheckbox()?.click()
    })

    expect(mergeCheckbox()?.checked).toBe(false)
    expect(formRef?.getFieldValue('mergeEquivalentItems')).toBe(false)
  })
})
