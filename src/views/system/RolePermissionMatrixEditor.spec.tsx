// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { Permission } from '@/shared/schemas'
import { RolePermissionMatrixEditor } from './RolePermissionMatrixEditor'

/**
 * 权限目录夹具。刻意覆盖矩阵需要区分处理的每一类：
 * - 4 个常用动作（read/create/update/delete）在同资源上并存 → 常显列；
 * - 非常用动作（audit/export）→ 进「更多」；
 * - 字段级权限（`sales-orders:read:amount`）→ 该资源下的独立子项；
 * - 跨 3 个业务域（销售/库存/系统）→ 左栏导航与只在已选生效。
 */
const permissions: Permission[] = [
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
    code: 'sales-orders:update',
    resource: 'sales-orders',
    action: 'update',
    field: null,
    description: null,
  },
  {
    code: 'sales-orders:delete',
    resource: 'sales-orders',
    action: 'delete',
    field: null,
    description: null,
  },
  {
    code: 'sales-orders:audit',
    resource: 'sales-orders',
    action: 'audit',
    field: null,
    description: null,
  },
  {
    code: 'sales-orders:export',
    resource: 'sales-orders',
    action: 'export',
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
    code: 'sales-contracts:read',
    resource: 'sales-contracts',
    action: 'read',
    field: null,
    description: null,
  },
  {
    code: 'materials:read',
    resource: 'materials',
    action: 'read',
    field: null,
    description: null,
  },
  {
    code: 'materials:create',
    resource: 'materials',
    action: 'create',
    field: null,
    description: null,
  },
  {
    code: 'roles:read',
    resource: 'roles',
    action: 'read',
    field: null,
    description: null,
  },
]

/** 全部权限码（「全选」的期望结果）。 */
const allCodes = permissions.map((permission) => permission.code).sort()

interface HarnessProps {
  initialSelected?: string[]
  onChangeSpy?: (next: string[]) => void
  disabled?: boolean
  wildcard?: boolean
  loading?: boolean
}

/**
 * 受控 harness：真实持有 selected 状态并回写，这样「点一下 → onChange → 重渲染」
 * 的闭环与生产集成一致（若直接断言 onChange 参数，会漏掉「状态没接回去」这类缺陷）。
 */
function Harness({
  initialSelected = [],
  onChangeSpy,
  disabled,
  wildcard,
  loading,
}: HarnessProps) {
  const [selected, setSelected] = useState<string[]>(initialSelected)
  return createElement(RolePermissionMatrixEditor, {
    permissions,
    selected,
    disabled,
    wildcard,
    loading,
    onChange: (next: string[]) => {
      onChangeSpy?.(next)
      setSelected(next)
    },
  })
}

describe('RolePermissionMatrixEditor', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class ResizeObserverStub {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver
    }
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
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  const render = async (props: HarnessProps = {}) => {
    act(() => {
      root.render(createElement(Harness, props))
    })
    await flush()
  }

  const flush = async () => {
    for (let i = 0; i < 6; i += 1) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })
    }
  }

  /**
   * 按可访问名定位 checkbox：antd 会把 children 渲染成 `<label class="ant-checkbox-wrapper">`，
   * 因此「label 的可见+sr-only 文本」就是读屏拿到的名字。
   * 断言走这条路径，等于同时验证了「可访问名真的挂在 DOM 上」而不只是「我传了参数」。
   */
  const checkboxWrappers = () =>
    Array.from(
      container.querySelectorAll<HTMLLabelElement>(
        'label.ant-checkbox-wrapper',
      ),
    )

  const wrapperByName = (name: string) =>
    checkboxWrappers().find(
      (wrapper) =>
        (wrapper.textContent ?? '').replace(/\s+/g, ' ').trim() === name,
    )

  const checkboxInput = (name: string) => {
    const wrapper = wrapperByName(name)
    if (!wrapper) {
      throw new Error(
        `未找到可访问名为「${name}」的 checkbox。现有：${checkboxWrappers()
          .map((node) => (node.textContent ?? '').trim())
          .join(' | ')}`,
      )
    }
    const input = wrapper.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )
    if (!input) throw new Error(`「${name}」未渲染 input`)
    return input
  }

  const clickCheckbox = async (name: string) => {
    const input = checkboxInput(name)
    await act(async () => {
      input.click()
      await Promise.resolve()
    })
    await flush()
  }

  const rowHeader = (resourceLabel: string) =>
    Array.from(container.querySelectorAll('th[scope="row"]')).find((node) =>
      (node.textContent ?? '').includes(resourceLabel),
    )

  const rowResources = () =>
    Array.from(container.querySelectorAll('th[scope="row"]')).map((node) =>
      (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
    )

  const columnHeaders = () =>
    Array.from(container.querySelectorAll('thead th')).map((node) =>
      (node.textContent ?? '').trim(),
    )

  const domainButton = (label: string) =>
    Array.from(
      container.querySelectorAll<HTMLButtonElement>('nav button[aria-pressed]'),
    ).find((button) => (button.textContent ?? '').includes(label))

  const clickDomain = async (label: string) => {
    const button = domainButton(label)
    if (!button) throw new Error(`未找到业务域「${label}」`)
    await act(async () => {
      button.click()
      await Promise.resolve()
    })
    await flush()
  }

  const setSearch = async (value: string) => {
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="搜索资源或权限，如「销售订单」「审核」"]',
    )
    if (!input) throw new Error('未找到权限搜索框')
    await act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )
      descriptor?.set?.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await Promise.resolve()
    })
    await flush()
  }

  /** 点开指定行「更多」，返回该行明细区域。 */
  const expandRow = async (resourceLabel: string) => {
    const header = rowHeader(resourceLabel)
    if (!header) throw new Error(`未找到资源行「${resourceLabel}」`)
    const row = header.closest('tr')
    const button = row?.querySelector<HTMLButtonElement>(
      'button[aria-expanded]',
    )
    if (!button) throw new Error(`「${resourceLabel}」没有「更多」按钮`)
    await act(async () => {
      button.click()
      await Promise.resolve()
    })
    await flush()
    const detailId = button.getAttribute('aria-controls')
    return detailId
      ? container.querySelector<HTMLElement>(`#${detailId}`)
      : null
  }

  /**
   * antd 会在两个 CJK 字符之间自动插一个空格（「全选」渲染成「全 选」），
   * 因此按「去掉所有空白后相等」匹配按钮文本。
   */
  const buttonByText = (text: string) => {
    const normalized = text.replace(/\s+/g, '')
    return Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find(
      (node) => (node.textContent ?? '').replace(/\s+/g, '') === normalized,
    )
  }

  /** 点开 Popconfirm 并确认（全选/清空的二次确认）。 */
  const confirmPopconfirm = async (buttonText: string) => {
    const trigger = buttonByText(buttonText)
    if (!trigger) throw new Error(`未找到按钮「${buttonText}」`)
    await act(async () => {
      trigger.click()
      await Promise.resolve()
    })
    await flush()
    const confirm = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-popconfirm button'),
    ).find((node) => (node.textContent ?? '').replace(/\s+/g, '') === '确认')
    if (!confirm) throw new Error('Popconfirm 未渲染确认按钮')
    await act(async () => {
      confirm.click()
      await Promise.resolve()
    })
    await flush()
  }

  // ─────────────────────────── 结构与三栏 ───────────────────────────

  it('渲染三栏：业务域导航 / 资源×动作矩阵 / 已选汇总', async () => {
    await render()

    expect(container.querySelector('nav')).toBeTruthy()
    expect(container.querySelector('table')).toBeTruthy()
    expect(container.querySelector('aside')).toBeTruthy()
    // 8 个业务域全部出现在左栏（即使当前域没有资源）
    const navButtons = container.querySelectorAll('nav button[aria-pressed]')
    expect(navButtons).toHaveLength(8)
    expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe(
      '业务域导航',
    )
  })

  it('矩阵列 = 资源 + 4 个常用动作 + 更多（不把 18 种动作全铺成列）', async () => {
    await render()
    expect(columnHeaders()).toEqual([
      '资源',
      '查看',
      '新增',
      '编辑',
      '删除',
      '更多',
    ])
  })

  it('默认只展示首个业务域，且按资源中文名而不是英文码排序展示', async () => {
    await render()
    // 销售域：销售订单 / 销售合同
    expect(rowResources().join(' ')).toContain('销售订单')
    expect(rowResources().join(' ')).toContain('销售合同')
    // 库存域与系统域的资源不应出现
    expect(rowResources().join(' ')).not.toContain('商品资料')
    expect(rowResources().join(' ')).not.toContain('角色管理')
  })

  // ─────────────────────────── 可访问名 ───────────────────────────

  it('矩阵内每个 checkbox 都有「资源 + 动作」的可访问名', async () => {
    await render()
    const wrappers = checkboxWrappers()
    expect(wrappers.length).toBeGreaterThan(0)
    for (const wrapper of wrappers) {
      const name = (wrapper.textContent ?? '').replace(/\s+/g, ' ').trim()
      expect(name, '每个 checkbox 都必须有可访问名').not.toBe('')
    }
    // 抽样断言命名口径：资源中文名 + 动作中文名
    expect(wrapperByName('销售订单 新增')).toBeTruthy()
    expect(wrapperByName('销售订单 删除')).toBeTruthy()
    expect(wrapperByName('销售订单 全部权限')).toBeTruthy()
  })

  it('业务域导航是可聚焦按钮（aria-pressed），不是裸 div', async () => {
    await render()
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('nav button[aria-pressed]'),
    )
    expect(buttons.length).toBe(8)
    const sales = buttons.find((button) => button.textContent?.includes('销售'))
    expect(sales?.getAttribute('aria-pressed')).toBe('true')
    const inventory = buttons.find((button) =>
      button.textContent?.includes('库存'),
    )
    expect(inventory?.getAttribute('aria-pressed')).toBe('false')
    // 原生 button 天然可 Tab 聚焦
    expect(sales?.tagName).toBe('BUTTON')
  })

  // ─────────────────────────── 勾选联动 ───────────────────────────

  it('勾选单个权限把权限码加入集合，再次点击移除', async () => {
    const onChangeSpy = vi.fn()
    await render({ onChangeSpy })

    await clickCheckbox('销售订单 新增')
    expect(onChangeSpy).toHaveBeenLastCalledWith(
      expect.arrayContaining(['sales-orders:create']),
    )

    await clickCheckbox('销售订单 新增')
    expect(onChangeSpy).toHaveBeenLastCalledWith(
      expect.not.arrayContaining(['sales-orders:create']),
    )
  })

  it('资源级全选勾上该资源全部动作（含非常用动作与字段级），再点取消', async () => {
    const onChangeSpy = vi.fn()
    await render({ onChangeSpy })

    await clickCheckbox('销售订单 全部权限')
    const afterSelect = onChangeSpy.mock.lastCall?.[0] as string[]
    expect(afterSelect).toEqual(
      expect.arrayContaining([
        'sales-orders:read',
        'sales-orders:create',
        'sales-orders:update',
        'sales-orders:delete',
        'sales-orders:audit',
        'sales-orders:export',
        'sales-orders:read:amount',
      ]),
    )
    // 只应影响该资源，不波及同域其它资源
    expect(afterSelect).not.toContain('sales-contracts:read')

    await clickCheckbox('销售订单 全部权限')
    const afterClear = onChangeSpy.mock.lastCall?.[0] as string[]
    expect(afterClear).not.toEqual(
      expect.arrayContaining(['sales-orders:read']),
    )
  })

  it('全选（带确认）授予目录内全部权限', async () => {
    const onChangeSpy = vi.fn()
    await render({ onChangeSpy })

    await confirmPopconfirm('全选')
    const result = onChangeSpy.mock.lastCall?.[0] as string[]
    expect([...result].sort()).toEqual(allCodes)
  })

  it('清空（带确认）把已选清空', async () => {
    const onChangeSpy = vi.fn()
    await render({
      initialSelected: ['sales-orders:read', 'materials:read'],
      onChangeSpy,
    })

    await confirmPopconfirm('清空')
    expect(onChangeSpy.mock.lastCall?.[0]).toEqual([])
  })

  it('清空需要二次确认：只点按钮不确认时已选不变', async () => {
    const onChangeSpy = vi.fn()
    await render({ initialSelected: ['sales-orders:read'], onChangeSpy })

    const clearButton = buttonByText('清空')
    await act(async () => {
      clearButton?.click()
      await Promise.resolve()
    })
    await flush()
    expect(onChangeSpy).not.toHaveBeenCalled()
  })

  // ─────────────────────────── 筛选：域 / 搜索 / 只看已选 ───────────────────────────

  it('切换业务域只显示该域资源', async () => {
    await render()
    // 商品资料归属「主数据」（见 permission-domains.ts 的归类原则：按用户心理模型而非后端包名）
    await clickDomain('主数据')
    expect(rowResources().join(' ')).toContain('商品资料')
    expect(rowResources().join(' ')).not.toContain('销售订单')
  })

  it('搜索跨业务域命中（不局限当前域），并支持按权限码搜索', async () => {
    await render()
    // 当前域是「销售」，搜索库存域的资源也必须能命中，否则用户会以为资源不存在
    await setSearch('商品')
    expect(rowResources().join(' ')).toContain('商品资料')
    expect(rowResources().join(' ')).not.toContain('销售订单')

    await setSearch('roles')
    expect(rowResources().join(' ')).toContain('角色管理')
  })

  it('搜索无结果时显示空状态而不是空白表格', async () => {
    await render()
    await setSearch('不存在的资源xyz')
    expect(container.querySelector('table')).toBeNull()
  })

  it('「只看已选」只保留有勾选的资源行', async () => {
    await render({ initialSelected: ['sales-contracts:read'] })
    const toggle = wrapperByName('只看已选')
    expect(toggle).toBeTruthy()
    const input = toggle?.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )
    await act(async () => {
      input?.click()
      await Promise.resolve()
    })
    await flush()

    expect(rowResources().join(' ')).toContain('销售合同')
    expect(rowResources().join(' ')).not.toContain('销售订单')
  })

  // ─────────────────────────── 更多 / 字段级 ───────────────────────────

  it('非常用动作与字段级权限收在「更多」里，展开后可见且可勾选', async () => {
    const onChangeSpy = vi.fn()
    await render({ onChangeSpy })
    // 折叠时默认列里看不到「审核」「导出」
    expect(wrapperByName('销售订单 审核')).toBeFalsy()

    const detail = await expandRow('销售订单')
    expect(detail).toBeTruthy()
    expect(detail?.textContent).toContain('审核')
    expect(detail?.textContent).toContain('导出')
    // 字段级权限作为独立子项：查看·金额
    expect(detail?.textContent).toContain('查看·金额')

    const fieldCheckbox = Array.from(
      detail?.querySelectorAll<HTMLLabelElement>(
        'label.ant-checkbox-wrapper',
      ) ?? [],
    ).find((node) => (node.textContent ?? '').includes('查看·金额'))
    const input = fieldCheckbox?.querySelector<HTMLInputElement>('input')
    expect(input).toBeTruthy()

    await act(async () => {
      input?.click()
      await Promise.resolve()
    })
    await flush()
    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.arrayContaining(['sales-orders:read:amount']),
    )
  })

  it('「更多」按钮带 aria-expanded / aria-controls，展开后指向明细区域', async () => {
    await render()
    const header = rowHeader('销售订单')
    const button = header
      ?.closest('tr')
      ?.querySelector<HTMLButtonElement>('button[aria-expanded]')
    expect(button).toBeTruthy()
    expect(button?.getAttribute('aria-expanded')).toBe('false')

    await expandRow('销售订单')
    expect(button?.getAttribute('aria-expanded')).toBe('true')
    const controls = button?.getAttribute('aria-controls')
    expect(controls).toBeTruthy()
    expect(container.querySelector(`#${controls}`)).toBeTruthy()
  })

  // ─────────────────────────── 右栏汇总 ───────────────────────────

  it('右栏按业务域汇总已选权限，并可逐项移除', async () => {
    const onChangeSpy = vi.fn()
    await render({
      initialSelected: ['sales-orders:read', 'materials:read'],
      onChangeSpy,
    })

    const aside = container.querySelector('aside')
    expect(aside?.textContent).toContain('销售')
    expect(aside?.textContent).toContain('主数据')
    expect(aside?.textContent).toContain('销售订单')
    expect(aside?.textContent).toContain('商品资料')

    const removeButton = Array.from(
      aside?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    ).find((node) =>
      (node.getAttribute('aria-label') ?? '').includes('移除 销售订单 查看'),
    )
    expect(removeButton, '移除按钮必须有可访问名').toBeTruthy()
    await act(async () => {
      removeButton?.click()
      await Promise.resolve()
    })
    await flush()
    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(['materials:read'])
  })

  // ─────────────────────────── 边界态 ───────────────────────────

  it('只读时所有 checkbox 禁用，仍可读', async () => {
    await render({ disabled: true, initialSelected: ['sales-orders:read'] })
    // 只断言「矩阵内」的 checkbox：工具栏的「只看已选」只是视图开关，只读角色也应能筛。
    const inputs = Array.from(
      container.querySelectorAll<HTMLInputElement>(
        'table input[type="checkbox"]',
      ),
    )
    expect(inputs.length).toBeGreaterThan(0)
    expect(inputs.every((input) => input.disabled)).toBe(true)
    // 只读不影响已有勾选状态的展示
    expect(rowResources().join(' ')).toContain('销售订单')
  })

  it('全局通配角色显示提示且不可勾选', async () => {
    await render({ wildcard: true })
    expect(container.textContent).toContain('超级管理员')
    const inputs = Array.from(
      container.querySelectorAll<HTMLInputElement>(
        'table input[type="checkbox"]',
      ),
    )
    expect(inputs.every((input) => input.disabled)).toBe(true)
  })

  it('加载中渲染骨架屏而不是空表格', async () => {
    await render({ loading: true })
    expect(container.querySelector('.ant-skeleton')).toBeTruthy()
    expect(container.querySelector('table')).toBeNull()
  })

  it('权限目录为空时显示空状态而不是崩溃', async () => {
    act(() => {
      root.render(
        createElement(RolePermissionMatrixEditor, {
          permissions: [],
          selected: [],
          onChange: () => {},
        }),
      )
    })
    await flush()
    expect(container.querySelector('table')).toBeNull()
    expect(container.textContent).toContain('暂无数据')
  })
})
