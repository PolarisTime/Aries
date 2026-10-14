// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { listPermissions } from '@/api/system/permissions'
import { QUERY_KEYS } from '@/constants/query-keys'

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
  listPermissions: vi.fn(),
}))

const listPermissionsMock = vi.mocked(listPermissions)

import { RolePermissionPicker } from './RolePermissionPicker'

describe('RolePermissionPicker', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    listPermissionsMock.mockImplementation(() => Promise.resolve(permissions))
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

  /** 按字段定位搜索框写入关键字（不按下标，避免排版调整后选错控件）。 */
  const setSearchKeyword = async (value: string) => {
    const input = container.querySelector<HTMLInputElement>('input')
    if (!input) {
      throw new Error('权限搜索框未渲染')
    }
    await act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )
      descriptor?.set?.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await Promise.resolve()
    })
  }

  const groupHeader = (label: string) =>
    Array.from(container.querySelectorAll('.ant-collapse-header')).find(
      (node) => node.textContent?.includes(label),
    )

  /** 分组的展开态：antd Collapse 会把 aria-expanded 写在 header 上。 */
  const isGroupExpanded = (label: string) =>
    groupHeader(label)?.getAttribute('aria-expanded') === 'true'

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
    await setSearchKeyword('商品资料')
    expect(container.textContent).toContain('商品资料')
  })

  it('过滤时命中分组自动展开，清空关键字后复位为折叠', async () => {
    await render()

    // 初始全部折叠，避免 40+ 分组撑高弹窗。
    expect(isGroupExpanded('商品资料')).toBe(false)
    expect(isGroupExpanded('销售订单')).toBe(false)

    await setSearchKeyword('商品资料')
    expect(isGroupExpanded('商品资料')).toBe(true)
    expect(groupHeader('销售订单')).toBeUndefined()

    // 清空关键字：回到过滤前的折叠态，而不是把命中分组一直留着展开。
    await setSearchKeyword('')
    expect(isGroupExpanded('商品资料')).toBe(false)
    expect(isGroupExpanded('销售订单')).toBe(false)
  })

  it('权限数据晚于关键字到达时命中分组仍自动展开', async () => {
    // 第一次拉取不带 materials 分组，模拟「关键字先到、数据后到」。
    const permissionsWithoutMaterials = permissions.filter(
      (permission) => permission.resource !== 'materials',
    )
    let callCount = 0
    listPermissionsMock.mockImplementation(() => {
      callCount += 1
      return Promise.resolve(
        callCount === 1 ? permissionsWithoutMaterials : permissions,
      )
    })

    await render()
    expect(container.textContent).not.toContain('商品资料')

    await setSearchKeyword('商品资料')

    // 数据晚到：下一次拉取带回 materials 分组，可见分组集合发生变化。
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: QUERY_KEYS.permissions })
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    expect(callCount).toBeGreaterThan(1)
    expect(container.textContent).toContain('商品资料')
    expect(isGroupExpanded('商品资料')).toBe(true)
  })
})
