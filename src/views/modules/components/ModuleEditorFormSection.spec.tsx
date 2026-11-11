// @vitest-environment jsdom

import { Form } from 'antd'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { AppAntdProvider } from '@/components/AppAntdProvider'
import type { ModulePageConfig } from '@/types/module-page'
import { ModuleEditorFormSection } from './ModuleEditorFormSection'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub)

/**
 * 多步录入向导的回归锁定。
 *
 * <p>配置驱动：页面声明 `formSteps` 才分步，未声明的模块必须保持单页表单（DOM 与行为不变）。
 * 这两条同时锁，避免"给收付款单加向导"把其它 20+ 个模块的编辑弹层一起改掉。</p>
 */
const WIZARD_CONFIG = {
  key: 'receipt',
  title: '收款单',
  primaryNoKey: 'receiptNo',
  formSteps: [
    { title: '对方与主体' },
    { title: '金额与账户' },
    { title: '凭证与确认' },
  ],
  formFields: [
    {
      key: 'counterpartyName',
      label: '往来方',
      type: 'input',
      formStep: 1,
    },
    { key: 'receiptDate', label: '收款日期', type: 'input', formStep: 2 },
    { key: 'amount', label: '收款金额', type: 'number', formStep: 2 },
    { key: 'remark', label: '备注', type: 'textarea', formStep: 3 },
  ],
  columns: [],
  filters: [],
  detailFields: [],
} as unknown as ModulePageConfig

/** 带必填项的向导：专测「本步校验不通过就不前进」。 */
const REQUIRED_CONFIG = {
  ...WIZARD_CONFIG,
  formFields: WIZARD_CONFIG.formFields?.map((field) =>
    field.key === 'counterpartyName' ? { ...field, required: true } : field,
  ),
} as unknown as ModulePageConfig

/** 未声明 formSteps 的模块：必须一次性渲染全部字段，不出现步骤条。 */
const PLAIN_CONFIG = {
  ...WIZARD_CONFIG,
  formSteps: undefined,
  formFields: WIZARD_CONFIG.formFields?.map((field) => ({
    ...field,
    formStep: undefined,
  })),
} as unknown as ModulePageConfig

describe('ModuleEditorFormSection 多步向导', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
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
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  function renderSection(config: ModulePageConfig) {
    act(() => {
      root.render(
        createElement(
          AppAntdProvider,
          null,
          /* 真实编辑弹层里字段区始终在 antd Form 内：Form.useFormInstance 需要它 */
          createElement(
            Form,
            { className: 'editor-form-shell', layout: 'horizontal' },
            createElement(ModuleEditorFormSection, {
              actions: {
                canAudit: true,
                canSave: true,
                onCancel: () => {},
                onSave: () => {},
                saving: false,
                visible: false,
              },
              config,
              editorState: { isEdit: false, lineItemsLocked: false },
              lockedLineItemsNotice: '',
              moduleKey: config.key,
            }),
          ),
        ),
      )
    })
  }

  const stepItems = () =>
    Array.from(container.querySelectorAll('.ant-steps-item')).map(
      (item) => item.textContent,
    )
  const visibleFieldLabels = () =>
    Array.from(container.querySelectorAll('.ant-form-item-label label')).map(
      (label) => label.textContent,
    )
  const buttonByText = (text: string) =>
    Array.from(container.querySelectorAll('button')).find((button) =>
      (button.textContent ?? '').includes(text),
    )

  it('声明了 formSteps 才渲染步骤条，且初始只渲染第 1 步的字段', () => {
    renderSection(WIZARD_CONFIG)

    expect(stepItems()).toHaveLength(3)
    expect(stepItems()[0]).toContain('对方与主体')
    // 第 1 步只有「往来方」；金额 / 备注 属于后面步骤，此刻不在 DOM 里
    expect(visibleFieldLabels()).toEqual(['往来方'])
  })

  it('未声明 formSteps 的模块保持单页表单：全部字段一次性渲染，无步骤条', () => {
    renderSection(PLAIN_CONFIG)

    expect(stepItems()).toHaveLength(0)
    expect(visibleFieldLabels()).toEqual([
      '往来方',
      '收款日期',
      '收款金额',
      '备注',
    ])
  })

  it('本步校验不通过时停在原步，不提前渲染下一步字段', async () => {
    renderSection(REQUIRED_CONFIG)

    await act(async () => {
      buttonByText('下一步')?.click()
      // validateFields 是异步的：等一拍再断言，否则错误提示还没落地
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    /*
     * 往来方必填未填：**仍停在第 1 步**，第 2 步字段没有被提前渲染。
     *
     * 不在这里断言错误文案：antd 的错误提示由 Form.Item 自己渲染，jsdom 下与
     * `validateFields` 的异步时序耦合太紧（实测同一份代码在浏览器里正常显示）；
     * 「校验通过才前进」这条契约由下一条用例的正向跳转 + 本条的反向停留共同锁定。
     */
    expect(visibleFieldLabels()).toEqual(['往来方'])
  })

  it('点「下一步」进入第 2 步；步骤条可点回已完成步骤；末步不再显示「下一步」', async () => {
    renderSection(WIZARD_CONFIG)

    await act(async () => {
      buttonByText('下一步')?.click()
      await new Promise((resolve) => setTimeout(resolve, 80))
    })
    expect(visibleFieldLabels()).toEqual(['收款日期', '收款金额'])

    // 点回第 1 步：已完成步骤允许回跳
    const firstStep = container.querySelector<HTMLElement>('.ant-steps-item')
    await act(async () => {
      firstStep?.click()
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(visibleFieldLabels()).toEqual(['往来方'])

    // 再前进两次到末步：末步没有「下一步」
    await act(async () => {
      buttonByText('下一步')?.click()
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    await act(async () => {
      buttonByText('下一步')?.click()
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(visibleFieldLabels()).toEqual(['备注'])
    expect(buttonByText('下一步')).toBeUndefined()
  })
})

/**
 * 收付款单的配置契约：三步齐全，且**每个会渲染的字段都归属某一步**。
 *
 * <p>漏标 `formStep` 的字段在向导模式下不会出现在任何一步 —— 界面上直接"消失"，
 * 而且不会报错。这条用例把「字段总数 = 已标注数」钉住。</p>
 */
describe('收付款单的 formSteps 配置', () => {
  it.each([
    ['receipt', 'receiptsPageConfig'],
    ['payment', 'paymentsPageConfig'],
  ])('%s 声明三步且每个可见字段都标注了 formStep', async (key) => {
    const modulePath = `@/config/business-pages/finance/${key}-page`
    const loaded = (await import(/* @vite-ignore */ modulePath)) as Record<
      string,
      ModulePageConfig
    >
    const config = Object.values(loaded).find((value) => value?.key === key)
    expect(config).toBeTruthy()
    expect(config?.formSteps).toHaveLength(3)

    const fields = config?.formFields ?? []
    const hidden = fields.filter(
      (field) => field.visibleWhen && field.visibleWhen({}) === false,
    )
    const tagged = fields.filter((field) => typeof field.formStep === 'number')
    // 隐藏字段（如状态）本就不该出现在任何一步；其余字段必须全部有归属
    expect(tagged).toHaveLength(fields.length - hidden.length)
    const steps = new Set(tagged.map((field) => field.formStep))
    expect([...steps].sort()).toEqual([1, 2, 3])
  })
})
