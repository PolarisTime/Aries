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

  function renderSection(
    config: ModulePageConfig,
    options: {
      isEdit?: boolean
      wizard?: {
        currentStep: number
        onStepChange: (nextStep: number) => void
        hideInlineNav?: boolean
      }
      wrapOverlayBody?: boolean
    } = {},
  ) {
    const sectionElement = createElement(
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
          editorState: {
            isEdit: options.isEdit ?? false,
            lineItemsLocked: false,
          },
          lockedLineItemsNotice: '',
          moduleKey: config.key,
          wizard: options.wizard,
        }),
      ),
    )
    act(() => {
      root.render(
        options.wrapOverlayBody
          ? createElement(
              'div',
              { className: 'workspace-overlay-body' },
              sectionElement,
            )
          : sectionElement,
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

  it('编辑态点击步骤条任意后续步骤可直接跳转（不锁死单向）', async () => {
    renderSection(REQUIRED_CONFIG, { isEdit: true })

    const steps = Array.from(
      container.querySelectorAll<HTMLElement>('.ant-steps-item'),
    )
    await act(async () => {
      steps[2]?.click()
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    expect(visibleFieldLabels()).toEqual(['备注'])
  })

  it('新建态点步骤条后续步骤时自动校验当前步：失败停留原步，无错可前进并回顶滚动容器', async () => {
    renderSection(REQUIRED_CONFIG, { isEdit: false })
    const requiredSteps = Array.from(
      container.querySelectorAll<HTMLElement>('.ant-steps-item'),
    )
    await act(async () => {
      requiredSteps[1]?.click()
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    // 第 1 步必填项未填，停在第 1 步
    expect(visibleFieldLabels()).toEqual(['往来方'])

    // 无必填缺口时允许点击步骤条直接跳到第 3 步，并将外层滚动容器滚回顶部
    renderSection(WIZARD_CONFIG, { isEdit: false, wrapOverlayBody: true })
    const body = container.querySelector<HTMLElement>('.workspace-overlay-body')
    if (body) {
      body.scrollTop = 320
    }
    const steps = Array.from(
      container.querySelectorAll<HTMLElement>('.ant-steps-item'),
    )
    await act(async () => {
      steps[2]?.click()
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(visibleFieldLabels()).toEqual(['备注'])
    expect(body?.scrollTop).toBe(0)
  })

  it('单区块步骤与步骤条同名时省略重复 Divider；多区块步骤保留各自 Divider', async () => {
    const sectionConfig = {
      ...WIZARD_CONFIG,
      formSteps: [{ title: '基本信息' }, { title: '取价与价格规定' }],
      formFields: [
        {
          key: 'name',
          label: '名称',
          type: 'input',
          formStep: 1,
          section: '基本信息',
        },
        {
          key: 'quoteSource',
          label: '数据源',
          type: 'input',
          formStep: 2,
          section: '取价规则',
        },
        {
          key: 'priceRules',
          label: '价格规定',
          type: 'input',
          formStep: 2,
          section: '价格规定',
        },
      ],
    } as unknown as ModulePageConfig

    renderSection(sectionConfig, { isEdit: true })
    // 第 1 步仅 1 个区块且与步骤条同名 → 不渲染重复 Divider
    expect(container.querySelectorAll('.master-section-divider')).toHaveLength(
      0,
    )

    // 切到第 2 步（2 个区块）→ 保留两条 Divider
    const steps = Array.from(
      container.querySelectorAll<HTMLElement>('.ant-steps-item'),
    )
    await act(async () => {
      steps[1]?.click()
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(
      Array.from(container.querySelectorAll('.master-section-divider')).map(
        (node) => node.textContent?.trim(),
      ),
    ).toEqual(['取价规则', '价格规定'])
  })

  it('外部托管向导且 hideInlineNav=true 时隐藏表单内联导航条，点击步骤条回调 onStepChange', async () => {
    const onStepChange = vi.fn()
    renderSection(WIZARD_CONFIG, {
      wizard: { currentStep: 0, onStepChange, hideInlineNav: true },
    })

    expect(container.querySelector('.editor-form-wizard-nav')).toBeNull()
    const steps = Array.from(
      container.querySelectorAll<HTMLElement>('.ant-steps-item'),
    )
    await act(async () => {
      steps[1]?.click()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(onStepChange).toHaveBeenCalledWith(1)
  })
})

/*
 * Vite 的动态 import 只支持一层变量路径，因此把配置导入写成显式映射：
 * 新增启用向导的页面时，在这里补一行即可。
 */
const CONFIG_LOADERS = {
  receipt: () => import('@/config/business-pages/finance/receipt-page'),
  payment: () => import('@/config/business-pages/finance/payment-page'),
  carrier: () => import('@/config/business-pages/master/carrier-page'),
  project: () => import('@/config/business-pages/master/project-page'),
  material: () => import('@/config/business-pages/master/material-page'),
} as const

type ConfigKey = keyof typeof CONFIG_LOADERS

async function loadConfig(key: ConfigKey): Promise<ModulePageConfig> {
  const loaded = (await CONFIG_LOADERS[key]()) as Record<string, unknown>
  /* 有的页面文件导出单个 config，有的导出 Record<key, config>（如项目资料） */
  const flat = Object.values(loaded).flatMap((value) =>
    value && typeof value === 'object' && 'key' in value
      ? [value as ModulePageConfig]
      : Object.values(value as Record<string, ModulePageConfig>),
  )
  const config = flat.find((value) => value?.key === key)
  expect(config).toBeTruthy()
  return config as ModulePageConfig
}

/**
 * 已启用向导的页面配置契约：步骤数正确，且**每个会渲染的字段都归属某一步**。
 *
 * <p>漏标 `formStep` 的字段在向导模式下不会出现在任何一步 —— 界面上直接"消失"，
 * 而且不报错。这条用例把「字段总数 = 已标注数」钉住，新增字段忘标会立刻红。</p>
 */
describe('启用向导的页面配置契约', () => {
  it.each([
    ['receipt', 3],
    ['payment', 3],
    ['carrier', 2],
    ['project', 3],
  ] as const)(
    '%s 声明 %s 步且每个可见字段都标注了 formStep',
    async (key, steps) => {
      const config = await loadConfig(key)
      expect(config.formSteps).toHaveLength(steps)

      const fields = config.formFields ?? []
      const hidden = fields.filter(
        (field) => field.visibleWhen && field.visibleWhen({}) === false,
      )
      const tagged = fields.filter(
        (field) => typeof field.formStep === 'number',
      )
      expect(tagged).toHaveLength(fields.length - hidden.length)
      const usedSteps = new Set(tagged.map((field) => field.formStep))
      expect([...usedSteps].sort()).toEqual(
        Array.from({ length: steps }, (_, index) => index + 1),
      )
    },
  )
})

/**
 * 字段多的主数据页必须有分区：21 个字段平铺时用户找不到「结算信息」在哪。
 * 只锁已分区的三页（收付款单是单据，不受此约束）。
 */
describe('基础资料分区块', () => {
  it.each(['carrier', 'material', 'project'] as const)(
    '%s 的每个字段都声明了 section',
    async (key) => {
      const config = await loadConfig(key)
      const missing = (config.formFields ?? []).filter(
        (field) => !field.section,
      )
      expect(missing.map((field) => field.key)).toEqual([])
    },
  )
})

/**
 * 字段说明排版契约（2026-11-16 用户反馈「项目资料第二步太乱」后补）：
 * ① 长说明走标签旁 ⓘ，extra 视觉收起但仍在 DOM 里（读屏靠 aria-describedby 读到）；
 * ② 只有 extra、没有 tooltip 的短提示保持可见；
 * ③ 只能选的控件占位是「请选择」，不再是「请输入」。
 */
const HINT_CONFIG = {
  key: 'project',
  title: '项目资料',
  primaryNoKey: 'projectCode',
  formFields: [
    {
      key: 'customerId',
      label: '客户',
      type: 'select',
      tooltip: '选择客户资料中的往来单位',
      extra: '选择客户资料中的往来单位',
    },
    {
      key: 'projectAddress',
      label: '项目地址',
      type: 'input',
      extra: '最多 255 字',
    },
  ],
  columns: [],
  filters: [],
  detailFields: [],
} as unknown as ModulePageConfig

describe('ModuleEditorFormSection 字段说明与占位', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => {
      root.render(
        createElement(
          AppAntdProvider,
          null,
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
              config: HINT_CONFIG,
              editorState: { isEdit: false, lineItemsLocked: false },
              lockedLineItemsNotice: '',
              moduleKey: HINT_CONFIG.key,
            }),
          ),
        ),
      )
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('下拉控件占位是「请选择」而不是「请输入」', () => {
    // antd 6 的 Select 占位节点类名随版本变化，按控件可见文本断言更稳：
    // 占位一旦退回「请输入客户」，这里立刻变红。
    const select = container.querySelector('.ant-select')
    expect(select?.textContent).toContain('请选择客户')
    expect(container.textContent).not.toContain('请输入客户')
  })

  it('同时声明 tooltip 与 extra 时，说明折叠到 ⓘ，extra 保留在 DOM 供读屏', () => {
    const items = Array.from(container.querySelectorAll('.ant-form-item'))
    const customerItem = items.find(
      (item) =>
        (item.querySelector('.ant-form-item-label label')?.textContent ??
          '') === '客户',
    )
    expect(customerItem?.className).toContain(
      'module-form-item--hint-collapsed',
    )
    // 视觉收起靠 CSS，文案本身必须仍可被读屏读到
    expect(
      customerItem?.querySelector('.ant-form-item-extra')?.textContent,
    ).toBe('选择客户资料中的往来单位')
    // ⓘ 存在（说明入口）
    expect(customerItem?.querySelector('.ant-form-item-tooltip')).not.toBeNull()
  })

  it('只有 extra 没有 tooltip 的短提示不被折叠', () => {
    const items = Array.from(container.querySelectorAll('.ant-form-item'))
    const addressItem = items.find(
      (item) =>
        (item.querySelector('.ant-form-item-label label')?.textContent ??
          '') === '项目地址',
    )
    expect(addressItem?.className).not.toContain(
      'module-form-item--hint-collapsed',
    )
  })
})
