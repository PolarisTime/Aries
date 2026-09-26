// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'

const permissions = [
  {
    code: 'sales-orders:read',
    resource: 'sales-orders',
    action: 'read',
    field: null,
    description: null,
  },
  {
    code: 'sales-orders:create',
    resource: 'sales-orders',
    action: 'create',
    field: null,
    description: null,
  },
  {
    code: 'sales-orders:read:amount',
    resource: 'sales-orders',
    action: 'read',
    field: 'amount',
    description: null,
  },
  {
    code: 'materials:read',
    resource: 'materials',
    action: 'read',
    field: null,
    description: null,
  },
]

vi.mock('@/api/system/permissions', () => ({
  listPermissions: vi.fn(() => Promise.resolve(permissions)),
}))

import { RolePermissionPicker } from './RolePermissionPicker'

describe('RolePermissionPicker', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    if (!window.matchMedia) {
      window.matchMedia = (query: string) =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as MediaQueryList
    }
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.clearAllMocks()
  })

  const render = async (
    props: Partial<Parameters<typeof RolePermissionPicker>[0]> = {},
  ) => {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(RolePermissionPicker, {
            initialSelected: [],
            onSelectedChange: vi.fn(),
            ...props,
          }),
        ),
      )
    })
    for (let i = 0; i < 10; i += 1) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })
    }
  }

  it('资源分组标题显示中文名而非英文资源码', async () => {
    await render()
    expect(container.textContent).toContain('销售订单')
    expect(container.textContent).not.toContain('sales-orders')
  })

  it('字段级权限（展开分组后）显示「动作·字段」以区别于普通权限', async () => {
    await render()
    const header = Array.from(
      container.querySelectorAll('.ant-collapse-header'),
    ).find((node) => node.textContent?.includes('销售订单'))
    await act(async () => {
      header?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
    expect(container.textContent).toContain('查看·金额')
  })

  it('关键字过滤按中文资源/动作筛选分组', async () => {
    await render()
    const input = container.querySelector<HTMLInputElement>('input')
    await act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )
      descriptor?.set?.call(input, '商品资料')
      input?.dispatchEvent(new Event('input', { bubbles: true }))
      await Promise.resolve()
    })
    expect(container.textContent).toContain('商品资料')
  })
})
