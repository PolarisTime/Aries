// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import i18n from 'i18next'

const rulesApi = vi.hoisted(() => ({
  fetchProjectPriceRules: vi.fn(),
  saveProjectPriceRules: vi.fn(),
}))

vi.mock('@/api/master/project-price-rules', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/api/master/project-price-rules')>()
  return {
    ...actual,
    fetchProjectPriceRules: rulesApi.fetchProjectPriceRules,
    saveProjectPriceRules: rulesApi.saveProjectPriceRules,
  }
})

const feedback = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}))

vi.mock('@/utils/antd-app', () => ({ message: feedback }))

import { ProjectPriceRulesField } from './project-price-rules-field'

const RULES = [
  {
    id: '900000000000000001',
    name: '含税价',
    mode: 'ADD' as const,
    amount: 30,
    remark: '含税',
    sortOrder: 0,
  },
  {
    id: '900000000000000002',
    name: '量大优惠',
    mode: 'SUBTRACT' as const,
    amount: 15,
    sortOrder: 1,
  },
]

let container: HTMLDivElement | null = null
let root: Root | null = null

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

async function render(props: {
  projectId?: unknown
  disabled?: boolean
}): Promise<void> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  // 「新建态」要显式传 undefined，因此不能用 `??` 兜默认值（会把 undefined 换回默认 ID）
  const projectId =
    'projectId' in props ? props.projectId : '900000000000000009'
  await act(async () => {
    root = createRoot(container as HTMLDivElement)
    root.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(ProjectPriceRulesField, {
          projectId,
          disabled: props.disabled,
          label: i18n.t('priceRule.title'),
        }),
      ),
    )
    await flush()
    await flush()
  })
}

function buttonByText(text: string): HTMLButtonElement | undefined {
  return Array.from(document.body.querySelectorAll('button')).find((button) =>
    (button.textContent || '').includes(text),
  )
}

function nameInputs(): HTMLInputElement[] {
  return Array.from(
    document.body.querySelectorAll<HTMLInputElement>(
      `input[placeholder="${i18n.t('priceRule.namePlaceholder')}"]`,
    ),
  )
}

function amountInputs(): HTMLInputElement[] {
  return Array.from(
    document.body.querySelectorAll<HTMLInputElement>('.ant-input-number-input'),
  )
}

async function typeInto(
  input: HTMLInputElement | undefined,
  value: string,
): Promise<void> {
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set?.call(input, value)
    input?.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()
  })
}

async function click(target: Element | undefined): Promise<void> {
  await act(async () => {
    target?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
  })
}

describe('项目资料 · 价格规定清单编辑', () => {
  beforeEach(() => {
    // antd 表格在 jsdom 里会探测响应式断点，缺 matchMedia 会直接抛错
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
    rulesApi.fetchProjectPriceRules.mockReset()
    rulesApi.saveProjectPriceRules.mockReset()
    rulesApi.fetchProjectPriceRules.mockResolvedValue(RULES)
    rulesApi.saveProjectPriceRules.mockImplementation(
      (_projectId: string, payload: unknown) =>
        (payload as typeof RULES).map((rule, index) => ({
          ...rule,
          id: rule.id ?? `90000000000000010${index}`,
          sortOrder: index,
        })),
    )
    feedback.success.mockReset()
    feedback.error.mockReset()
  })

  afterEach(() => {
    // 卸载是同步的：同步 act 返回 void，不能 await（await-thenable 会拦）
    act(() => {
      root?.unmount()
    })
    container?.remove()
    container = null
    root = null
  })

  it('编辑态按项目 ID 加载既有规则，未改动时保存按钮不可点', async () => {
    await render({})

    expect(rulesApi.fetchProjectPriceRules).toHaveBeenCalledWith(
      '900000000000000009',
    )
    expect(nameInputs().map((input) => input.value)).toEqual([
      '含税价',
      '量大优惠',
    ])
    expect(amountInputs().map((input) => input.value)).toEqual([
      '30.00',
      '15.00',
    ])
    expect(buttonByText(i18n.t('priceRule.save'))?.disabled).toBe(true)
  })

  it('新增一行后保存：既有规则带 id 更新、新增规则不带 id', async () => {
    await render({})

    await click(buttonByText(i18n.t('priceRule.addRow')))
    const names = nameInputs()
    expect(names).toHaveLength(3)
    await typeInto(names[2], '旺季加价')
    await typeInto(amountInputs()[2], '88')

    const saveButton = buttonByText(i18n.t('priceRule.save'))
    expect(saveButton?.disabled).toBe(false)
    await click(saveButton)

    expect(rulesApi.saveProjectPriceRules).toHaveBeenCalledTimes(1)
    const [, payload] = rulesApi.saveProjectPriceRules.mock.calls[0] as [
      string,
      Array<Record<string, unknown>>,
    ]
    expect(payload).toEqual([
      {
        id: '900000000000000001',
        name: '含税价',
        mode: 'ADD',
        amount: 30,
        remark: '含税',
      },
      {
        id: '900000000000000002',
        name: '量大优惠',
        mode: 'SUBTRACT',
        amount: 15,
      },
      { name: '旺季加价', mode: 'ADD', amount: 88 },
    ])
    expect(feedback.success).toHaveBeenCalledTimes(1)
  })

  it('名称为空时不提交，并给出必填提示', async () => {
    await render({})

    await click(buttonByText(i18n.t('priceRule.addRow')))
    await click(buttonByText(i18n.t('priceRule.save')))

    expect(rulesApi.saveProjectPriceRules).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain(
      i18n.t('priceRule.nameRequired'),
    )
  })

  it('规定名称重名时不提交', async () => {
    await render({})

    await typeInto(nameInputs()[1], '含税价')
    await click(buttonByText(i18n.t('priceRule.save')))

    expect(rulesApi.saveProjectPriceRules).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain(
      i18n.t('priceRule.nameDuplicate'),
    )
  })

  it('删除某行后保存：载荷里不再包含它（整体替换语义 = 软删）', async () => {
    await render({})

    const removeButtons = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>(
        `button[aria-label^="${i18n.t('priceRule.remove')}"]`,
      ),
    )
    await click(removeButtons[0])
    await click(buttonByText(i18n.t('priceRule.save')))

    const [, payload] = rulesApi.saveProjectPriceRules.mock.calls[0] as [
      string,
      Array<Record<string, unknown>>,
    ]
    expect(payload).toEqual([
      {
        id: '900000000000000002',
        name: '量大优惠',
        mode: 'SUBTRACT',
        amount: 15,
      },
    ])
  })

  it('新建态（还没有项目 ID）只提示先保存项目，不发请求', async () => {
    await render({ projectId: undefined })

    expect(rulesApi.fetchProjectPriceRules).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain(
      i18n.t('priceRule.saveFirstHint'),
    )
    expect(nameInputs()).toHaveLength(0)
  })

  it('保存失败时给出失败提示，不弹成功', async () => {
    rulesApi.saveProjectPriceRules.mockRejectedValueOnce(new Error('boom'))
    await render({})

    await click(buttonByText(i18n.t('priceRule.addRow')))
    await typeInto(nameInputs()[2], '旺季加价')
    await click(buttonByText(i18n.t('priceRule.save')))

    expect(document.body.textContent).toContain(i18n.t('priceRule.saveFailed'))
    expect(feedback.success).not.toHaveBeenCalled()
  })
})
