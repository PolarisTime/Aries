// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { bindAntdAppApi } from '@/utils/antd-app'
import type { SupplierSelectOption } from './core'
import { SheetPanel } from './SheetPanel'
import type { Brand, PriceRow, PriceSheet } from './types'

function makeSheet(patch: Partial<PriceSheet> = {}): PriceSheet {
  return {
    id: 's1',
    name: '批次 1',
    status: '报价',
    projectId: 'p1',
    projectName: '项目',
    orderDate: '2026-09-10',
    refDate: '2026-09-10',
    refPeriod: '9:30 上午',
    lengthPremium: 30,
    inputs: {},
    rows: [],
    ...patch,
  }
}

/** 两行商品: 行可访问名分别为「螺纹钢 HRB400E 12 9米」「螺纹钢 HRB400E 14 9米」。 */
function twoRows(): PriceRow[] {
  return [
    {
      id: 'r1',
      category: '螺纹钢',
      material: 'HRB400E',
      spec: 12,
      length: '9米',
    },
    {
      id: 'r2',
      category: '螺纹钢',
      material: 'HRB400E',
      spec: 14,
      length: '9米',
    },
  ]
}

describe('SheetPanel 右键菜单', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  /** modal.confirm 的入参(由 bindAntdAppApi 注入的假 api 捕获, 便于断言与手动确认)。 */
  let confirmOptions: { title?: string; onOk?: () => void } | null = null

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    confirmOptions = null
    bindAntdAppApi({
      modal: {
        confirm: (options: { title?: string; onOk?: () => void }) => {
          confirmOptions = options
          return { destroy: () => {}, update: () => {} }
        },
      },
    } as unknown as Parameters<typeof bindAntdAppApi>[0])
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
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await flush()
    bindAntdAppApi(null)
    act(() => root.unmount())
    container.remove()
    document
      .querySelectorAll(
        '.ant-dropdown, .ant-popover, .ant-tooltip, .ant-select-dropdown, .ant-modal-root',
      )
      .forEach((node) => {
        node.remove()
      })
  })

  /** 等 antd 弹层挂载与关闭动画落地。 */
  const flush = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30))
    })

  function renderPanel(
    options: {
      rows?: PriceRow[]
      sheet?: PriceSheet
      brands?: Brand[]
      readOnly?: boolean
      suppliers?: SupplierSelectOption[]
      onReorderBrands?: (from: number, to: number) => void
    } = {},
  ) {
    const initialRows = options.rows ?? twoRows()
    const brands = options.brands ?? [
      { name: '中天', freight: 30 },
      { name: '沙钢', freight: 20 },
    ]
    const observed = { rows: initialRows }
    function Harness() {
      const [rows, setRows] = useState(initialRows)
      observed.rows = rows
      return createElement(SheetPanel, {
        sheet: options.sheet ?? makeSheet(),
        data: null,
        varieties: [],
        brands,
        rows,
        density: 'small',
        lengthPremium: 30,
        patchSheet: () => {},
        setRows: (updater) => setRows((prev) => updater(prev)),
        onReorderBrands: options.onReorderBrands ?? (() => {}),
        periods: [],
        onRefresh: () => {},
        chrome: false,
        spotRef: { current: null },
        suppliers: options.suppliers,
        readOnly: options.readOnly,
      })
    }
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Harness),
        ),
      )
    })
    return observed
  }

  const rightClick = async (target: Element | null | undefined) => {
    expect(target).toBeTruthy()
    act(() => {
      target?.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      )
    })
    await flush()
  }

  /**
   * 最近打开且未被隐藏的弹层根节点。
   * antd 关闭弹层只是加 `ant-dropdown-hidden`(DOM 仍在), 切换不同行的菜单时必须过滤旧弹层。
   */
  const topDropdown = () => {
    const menus = Array.from(
      document.querySelectorAll<HTMLElement>('.ant-dropdown'),
    ).filter((node) => !node.classList.contains('ant-dropdown-hidden'))
    return menus[menus.length - 1] ?? null
  }

  const topMenuItem = (label: string) => {
    const item = Array.from(
      topDropdown()?.querySelectorAll<HTMLElement>('.ant-dropdown-menu-item') ??
        [],
    ).find((node) => node.textContent?.includes(label))
    expect(item).toBeTruthy()
    return item as HTMLElement
  }

  const clickTopMenuItem = async (label: string) => {
    const item = topMenuItem(label)
    await act(async () => {
      item.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
  }

  const rowActionTrigger = (index: number) =>
    container.querySelectorAll<HTMLButtonElement>('.price-compare-row-actions')[
      index
    ]

  const brandNameNodes = () =>
    Array.from(
      container.querySelectorAll<HTMLElement>('.price-compare-brand-name'),
    )

  it('右键数据行打开行菜单, 且菜单带可访问名', async () => {
    renderPanel()
    await rightClick(rowActionTrigger(0))
    const menu = topDropdown()?.querySelector<HTMLElement>('[role="menu"]')
    expect(menu).not.toBeNull()
    expect(menu?.getAttribute('aria-label')).toBe(
      '「螺纹钢 HRB400E 12 9米」行操作菜单',
    )
  })

  it('行菜单满足 APG 契约: 打开后焦点进首项, Escape 关闭并把焦点还给「更多」按钮', async () => {
    renderPanel()
    const trigger = rowActionTrigger(0)
    act(() => {
      trigger.focus()
    })
    await rightClick(trigger)

    const items = Array.from(
      topDropdown()?.querySelectorAll<HTMLElement>('.ant-dropdown-menu-item') ??
        [],
    )
    expect(items.length).toBeGreaterThan(0)
    expect(document.activeElement).toBe(items[0])

    await act(async () => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 30))
    })
    expect(document.activeElement).toBe(trigger)
  })

  it('首行禁用上移、末行禁用下移(禁用而不隐藏)', async () => {
    renderPanel()

    await rightClick(rowActionTrigger(0))
    expect(topMenuItem('上移').getAttribute('aria-disabled')).toBe('true')
    expect(topMenuItem('下移').getAttribute('aria-disabled')).not.toBe('true')

    await rightClick(rowActionTrigger(1))
    expect(topMenuItem('上移').getAttribute('aria-disabled')).not.toBe('true')
    expect(topMenuItem('下移').getAttribute('aria-disabled')).toBe('true')
  })

  it('点击「上移」后行顺序实际改变', async () => {
    const observed = renderPanel()
    await rightClick(rowActionTrigger(1))
    await clickTopMenuItem('上移')
    expect(observed.rows.map((row) => row.id)).toEqual(['r2', 'r1'])
  })

  it('点击「删除该行…」先二次确认, 确认后才真正删除', async () => {
    const observed = renderPanel()
    await rightClick(rowActionTrigger(0))
    await clickTopMenuItem('删除该行')
    // 只是弹出确认: 此时不得删除
    expect(observed.rows.map((row) => row.id)).toEqual(['r1', 'r2'])
    expect(confirmOptions?.title).toBe('删除该行？')

    await act(async () => {
      confirmOptions?.onOk?.()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
    expect(observed.rows.map((row) => row.id)).toEqual(['r2'])
  })

  it('点击「更多」按钮只展开行菜单, 不弹出二次确认', async () => {
    renderPanel()
    act(() => {
      rowActionTrigger(0)?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
    })
    await flush()
    expect(topDropdown()).not.toBeNull()
    expect(confirmOptions).toBeNull()
  })

  it('点击「在上方插入行」/「在下方插入隔断」按位置插入', async () => {
    const observed = renderPanel()
    await rightClick(rowActionTrigger(1))
    await clickTopMenuItem('在上方插入行')
    expect(observed.rows).toHaveLength(3)
    expect(observed.rows[1]?.id).not.toBe('r1')
    expect(observed.rows[2]?.id).toBe('r2')
    expect(observed.rows[1]?.rowType).not.toBe('SEPARATOR')

    await rightClick(rowActionTrigger(0))
    await clickTopMenuItem('在下方插入隔断')
    expect(observed.rows.map((row) => row.rowType)).toEqual([
      undefined,
      'SEPARATOR',
      'PRODUCT',
      undefined,
    ])
  })

  it('右键输入控件时放行, 不打开行菜单', async () => {
    renderPanel()
    await rightClick(container.querySelector('.price-compare-row-remark'))
    expect(document.querySelector('.ant-dropdown')).toBeNull()
  })

  it('右键品牌列头显示菜单, 点击「隐藏该列」后该品牌列消失', async () => {
    renderPanel()
    expect(brandNameNodes().map((node) => node.textContent)).toEqual([
      '中天',
      '沙钢',
    ])

    await rightClick(brandNameNodes()[0])
    const menu = topDropdown()?.querySelector<HTMLElement>('[role="menu"]')
    expect(menu?.getAttribute('aria-label')).toBe('「中天」品牌列操作菜单')

    await clickTopMenuItem('隐藏该列')
    expect(brandNameNodes().map((node) => node.textContent)).toEqual(['沙钢'])
    // 只统计表头行: antd 的测量行(ant-table-measure-row)会重复渲染一次列标题
    expect(
      container.querySelectorAll('thead .price-compare-supplier-header'),
    ).toHaveLength(1)
  })

  it('右键品牌列头「移到最后」复用 onReorderBrands', async () => {
    const onReorderBrands = vi.fn()
    renderPanel({ onReorderBrands })
    await rightClick(brandNameNodes()[0])
    await clickTopMenuItem('移到最后')
    // 两个品牌时, 第一列移到最后即 (0, 1)
    expect(onReorderBrands).toHaveBeenCalledWith(0, 1)
  })

  it('右键品牌列头「一键填入供应商…」打开原有弹层', async () => {
    renderPanel()
    expect(document.querySelector('.price-compare-supplier-fill')).toBeNull()
    await rightClick(brandNameNodes()[0])
    await clickTopMenuItem('一键填入供应商')
    expect(
      document.querySelector('.price-compare-supplier-fill'),
    ).not.toBeNull()
  })
})
