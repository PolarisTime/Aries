// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { MaterialPriceMatch } from '@/api/market/steel-quotes'
import type { ModuleLineItem } from '@/types/module-page'
import { SalesOrderNetPriceFiller } from './SalesOrderNetPriceFiller'

const { fetchMaterialPriceMatchesMock, fetchSteelQuoteCalendarsMock } =
  vi.hoisted(() => ({
    fetchMaterialPriceMatchesMock: vi.fn(),
    fetchSteelQuoteCalendarsMock: vi.fn(),
  }))

vi.mock('@/api/market/steel-quotes', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/api/market/steel-quotes')>()
  return {
    ...actual,
    fetchMaterialPriceMatches: fetchMaterialPriceMatchesMock,
    fetchSteelQuoteCalendars: fetchSteelQuoteCalendarsMock,
  }
})

const match = (overrides: Partial<MaterialPriceMatch>): MaterialPriceMatch => ({
  materialId: null,
  materialCode: null,
  brand: null,
  material: null,
  category: null,
  spec: null,
  length: null,
  status: '匹配',
  basePrice: null,
  price: null,
  quoteDate: '2026-09-22',
  period: '下午',
  ...overrides,
})

function Harness({
  initialItems,
  status,
  floatMode,
  floatValue,
}: {
  initialItems: ModuleLineItem[]
  status: string
  floatMode?: 'ADD' | 'SUBTRACT'
  floatValue?: number
}) {
  const [items, setItems] = useState(initialItems)
  return createElement(SalesOrderNetPriceFiller, {
    currentStatus: status,
    formValues: {
      deliveryDate: '2026-09-22',
      projectId: 'p1',
      projectName: '项目',
    },
    items,
    setItems: (updater) => setItems((prev) => updater(prev)),
    saving: false,
    projectOptions: [
      {
        id: 'p1',
        projectName: '项目',
        ...(floatMode ? { priceFloatMode: floatMode } : {}),
        ...(floatValue !== undefined ? { priceFloatValue: floatValue } : {}),
      },
    ],
  })
}

describe('SalesOrderNetPriceFiller', () => {
  let container: HTMLDivElement
  let root: Root

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
    fetchMaterialPriceMatchesMock.mockReset()
    fetchSteelQuoteCalendarsMock.mockReset()
    fetchSteelQuoteCalendarsMock.mockResolvedValue([
      { quoteDate: '2026-09-22', periods: ['上午', '下午'] },
    ])
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    document.querySelectorAll('.ant-modal-root').forEach((node) => {
      node.remove()
    })
  })

  const row = (overrides: Partial<ModuleLineItem>): ModuleLineItem => ({
    id: 'r1',
    materialId: 'm1',
    brand: '中天',
    category: '螺纹钢',
    material: 'HRB400E',
    spec: '12',
    length: '9米',
    unitPrice: 1,
    ...overrides,
  })

  it('非交付核定状态不渲染取价按钮', async () => {
    await act(async () => {
      root.render(
        createElement(Harness, { initialItems: [row({})], status: '已审核' }),
      )
      await Promise.resolve()
    })
    expect(container.querySelector('button')).toBeNull()
  })

  it('交付核定状态渲染「整单取网价」按钮', async () => {
    await act(async () => {
      root.render(
        createElement(Harness, { initialItems: [row({})], status: '交付核定' }),
      )
      await Promise.resolve()
    })
    expect(container.textContent).toContain('整单取网价')
  })

  it('取价后按项目 ADD 浮动填入单价, 无网价行保持原值', async () => {
    const observed: { items: ModuleLineItem[] } = { items: [] }
    fetchMaterialPriceMatchesMock.mockResolvedValue([
      match({ materialId: 'm1', price: '3400.00' }),
      // m2 无网价
      match({ materialId: 'm2', price: null, status: '无网价' }),
    ])

    function Stateful() {
      const [items, setItems] = useState<ModuleLineItem[]>([
        row({ id: 'r1', materialId: 'm1', unitPrice: 1 }),
        row({ id: 'r2', materialId: 'm2', unitPrice: 999 }),
      ])
      observed.items = items
      return createElement(SalesOrderNetPriceFiller, {
        currentStatus: '交付核定',
        formValues: {
          deliveryDate: '2026-09-22',
          projectId: 'p1',
        },
        items,
        setItems: (updater) => setItems((prev) => updater(prev)),
        saving: false,
        projectOptions: [
          {
            id: 'p1',
            projectName: '项目',
            priceFloatMode: 'ADD',
            priceFloatValue: 30,
          },
        ],
      })
    }

    await act(async () => {
      root.render(createElement(Stateful))
      await Promise.resolve()
    })
    // 打开弹层
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    // 确认取价
    const okBtn = await waitForOkButton()
    await act(async () => {
      okBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const byId = new Map(observed.items.map((i) => [i.id, i]))
    // 3400 + 30 = 3430
    expect(byId.get('r1')?.unitPrice).toBe(3430)
    // 无网价行保持原值
    expect(byId.get('r2')?.unitPrice).toBe(999)
  })

  it('SUBTRACT 浮动减价', async () => {
    const observed: { items: ModuleLineItem[] } = { items: [] }
    fetchMaterialPriceMatchesMock.mockResolvedValue([
      match({ materialId: 'm1', price: 3400 }),
    ])
    function Stateful() {
      const [items, setItems] = useState<ModuleLineItem[]>([
        row({ id: 'r1', materialId: 'm1', unitPrice: 1 }),
      ])
      observed.items = items
      return createElement(SalesOrderNetPriceFiller, {
        currentStatus: '交付核定',
        formValues: {
          deliveryDate: '2026-09-22',
          projectId: 'p1',
        },
        items,
        setItems: (updater) => setItems((prev) => updater(prev)),
        saving: false,
        projectOptions: [
          {
            id: 'p1',
            projectName: '项目',
            priceFloatMode: 'SUBTRACT',
            priceFloatValue: 20,
          },
        ],
      })
    }
    await act(async () => {
      root.render(createElement(Stateful))
      await Promise.resolve()
    })
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const okBtn = await waitForOkButton()
    await act(async () => {
      okBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    // 3400 - 20 = 3380
    expect(observed.items[0]?.unitPrice).toBe(3380)
  })

  async function waitForOkButton() {
    for (let i = 0; i < 30; i += 1) {
      const btn = document.querySelector<HTMLButtonElement>(
        '.ant-modal-footer .ant-btn-primary',
      )
      if (btn) return btn
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
    }
    throw new Error('确认按钮未出现')
  }
})
