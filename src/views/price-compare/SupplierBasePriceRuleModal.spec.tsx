// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import i18n from 'i18next'

const rulesApi = vi.hoisted(() => ({
  fetchSupplierBasePriceRules: vi.fn(),
  saveSupplierBasePriceRules: vi.fn(),
}))

vi.mock('@/api/market/supplier-base-price-rules', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/api/market/supplier-base-price-rules')
    >()
  return {
    ...actual,
    fetchSupplierBasePriceRules: rulesApi.fetchSupplierBasePriceRules,
    saveSupplierBasePriceRules: rulesApi.saveSupplierBasePriceRules,
  }
})

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  modal: { confirm: vi.fn() },
}))

import { SupplierBasePriceRuleModal } from './SupplierBasePriceRuleModal'
import type { SpecRow } from './supplier-quote-grid'

const ROWS: SpecRow[] = [
  {
    category: '螺纹钢',
    material: 'HRB400E',
    spec: 10,
    lengths: ['9米', '12米'],
  },
  { category: '螺纹钢', material: 'HRB400E', spec: 12, lengths: ['9米'] },
]

const RULES = {
  supplierId: 's1',
  brandName: '中天',
  base: { material: 'HRB400E', spec: 10, length: '9米' },
  items: [
    { material: 'HRB400E', spec: 10, length: '9米', delta: 0 },
    { material: 'HRB400E', spec: 12, length: '9米', delta: 50 },
  ],
  version: '3',
}

describe('基价加价规则弹窗', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

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
    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    }
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true

    rulesApi.fetchSupplierBasePriceRules.mockReset().mockResolvedValue(RULES)
    rulesApi.saveSupplierBasePriceRules.mockReset().mockResolvedValue(RULES)

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
    document.body.innerHTML = ''
  })

  const flush = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  async function render() {
    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(SupplierBasePriceRuleModal, {
            brandName: '中天',
            onClose: () => undefined,
            onSaved: () => undefined,
            open: true,
            rows: ROWS,
            supplierId: 's1',
          }) as ReactNode,
        ),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
  }

  const radioFor = (spec: number, length: string) =>
    document.body.querySelector<HTMLInputElement>(
      `input[aria-label="${i18n.t('priceCompare.supplierPrice.basePriceA11y', {
        material: 'HRB400E',
        spec,
        length,
      })}"]`,
    )

  const deltaFor = (spec: number, length: string) =>
    document.body.querySelector<HTMLInputElement>(
      `input[aria-label="${i18n.t('priceCompare.supplierPrice.deltaA11y', {
        material: 'HRB400E',
        spec,
        length,
      })}"]`,
    )

  it('回显已有基价与加价，基价行的加价不可编辑', async () => {
    await render()

    expect(radioFor(10, '9米')?.checked).toBe(true)
    expect(deltaFor(10, '9米')?.disabled).toBe(true)
    expect(deltaFor(12, '9米')?.value).toBe('50.00')
  })

  it('改基价并填加价后保存：提交完整规则并带版本前置条件', async () => {
    await render()

    const radio12 = radioFor(12, '9米')
    await act(async () => {
      radio12?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const delta10 = deltaFor(10, '12米')
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set?.call(delta10, '80')
      delta10?.dispatchEvent(new Event('input', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const save = Array.from(document.body.querySelectorAll('button')).find(
      (button) =>
        (button.textContent ?? '').includes(
          i18n.t('priceCompare.supplierPrice.basePriceRuleSave'),
        ),
    )
    await act(async () => {
      save?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()

    expect(rulesApi.saveSupplierBasePriceRules).toHaveBeenCalledTimes(1)
    const [payload, version] = rulesApi.saveSupplierBasePriceRules.mock
      .calls[0] as [Record<string, unknown>, string]
    expect(version).toBe('3')
    expect(payload.base).toEqual({
      material: 'HRB400E',
      spec: 12,
      length: '9米',
    })
    expect(payload.items).toEqual(
      expect.arrayContaining([
        { material: 'HRB400E', spec: 12, length: '9米', delta: 0 },
        { material: 'HRB400E', spec: 10, length: '12米', delta: 80 },
      ]),
    )
  })

  it('清空规则：提交 base=null、items=[]', async () => {
    await render()

    const clear = Array.from(document.body.querySelectorAll('button')).find(
      (button) =>
        (button.textContent ?? '').includes(
          i18n.t('priceCompare.supplierPrice.clearRules'),
        ),
    )
    await act(async () => {
      clear?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()

    expect(rulesApi.saveSupplierBasePriceRules).toHaveBeenCalledWith(
      { supplierId: 's1', brandName: '中天', base: null, items: [] },
      '3',
    )
  })
})
