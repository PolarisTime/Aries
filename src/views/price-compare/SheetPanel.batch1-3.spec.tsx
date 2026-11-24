// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { QuoteSheetCollab } from './collab/useQuoteSheetCollab'
import {
  applyOrderedBrands,
  type SheetCollabBridge,
  SheetPanel,
} from './SheetPanel'
import type { Brand, PriceRow, PriceSheet, Variety } from './types'

const collabMockState = vi.hoisted((): { current: QuoteSheetCollab } => ({
  current: {
    mode: 'rest',
    state: 'disabled',
    writable: false,
    peers: [],
    peersOfRow: () => [],
    patchItem: vi.fn(),
    setCursor: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
  },
}))

vi.mock('@/api/market/supplier-price-lists', () => ({
  fetchLowestBrandQuotes: () => Promise.resolve([]),
}))

vi.mock('./collab/useQuoteSheetCollab', () => ({
  useQuoteSheetCollab: () => collabMockState.current,
}))

const VARIETY: Variety = {
  category: '螺纹钢',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
  label: '螺纹钢 HRB400E 12 9米',
}

const SHEET: PriceSheet = {
  id: 's1',
  serverId: '1001',
  name: '批次 1',
  status: 'QUOTING',
  projectId: 'p-order',
  projectName: '测试项目',
  orderDate: '2026-11-23',
  refDate: '2026-11-23',
  refPeriod: '上午',
  lengthPremium: 30,
  inputs: {},
  rows: [],
}

const ROW: PriceRow = {
  id: 'r1',
  category: '螺纹钢',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
  ton: 10,
  remark: '初始备注',
}

const BRANDS: Brand[] = [
  { name: '中天', freight: 30 },
  { name: '沙钢', freight: 25 },
  { name: '永钢', freight: 20 },
]

describe('applyOrderedBrands（纯函数）', () => {
  it('按保存顺序排列，新品牌按原序追加，已移除旧名忽略', () => {
    expect(
      applyOrderedBrands(BRANDS, ['永钢', '已删除品牌', '中天']).map(
        (b) => b.name,
      ),
    ).toEqual(['永钢', '中天', '沙钢'])
  })
})

describe('SheetPanel 品牌列排序持久化与协作/编辑锁协同', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('zh-CN')
    collabMockState.current = {
      mode: 'rest',
      state: 'disabled',
      writable: false,
      peers: [],
      peersOfRow: () => [],
      patchItem: vi.fn(),
      setCursor: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      canUndo: false,
      canRedo: false,
    }
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
    act(() => root.unmount())
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    container.remove()
  })

  const renderPanel = (options?: {
    readOnly?: boolean
    onCollabStateChange?: (bridge: SheetCollabBridge | null) => void
    hrb400eFallbackLoading?: boolean
    onToggleHrb400eFallback?: () => void
  }) => {
    function Harness() {
      const [rows, setRows] = useState<PriceRow[]>([{ ...ROW }])
      return createElement(SheetPanel, {
        sheet: SHEET,
        data: null,
        varieties: [VARIETY],
        brands: BRANDS,
        rows,
        density: 'small',
        lengthPremium: 30,
        patchSheet: () => {},
        setRows,
        periods: [],
        onRefresh: () => {},
        chrome: false,
        spotRef: { current: null },
        readOnly: options?.readOnly ?? false,
        onCollabStateChange: options?.onCollabStateChange,
        hrb400eFallbackLoading: options?.hrb400eFallbackLoading,
        onToggleHrb400eFallback: options?.onToggleHrb400eFallback,
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
  }

  it('品牌列顺序从用户列偏好恢复，支持在列设置里「恢复默认顺序」', async () => {
    const storageKey =
      'aries-list-column-settings:anonymous:price-compare-sheet:p-order'
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        orderedKeys: ['永钢', '中天', '沙钢'],
        hiddenKeys: [],
      }),
    )

    renderPanel()

    const headerTextBefore =
      container.querySelector('.ant-table-thead')?.textContent ?? ''
    expect(headerTextBefore.indexOf('永钢')).toBeLessThan(
      headerTextBefore.indexOf('中天'),
    )
    expect(headerTextBefore.indexOf('中天')).toBeLessThan(
      headerTextBefore.indexOf('沙钢'),
    )

    // 打开列显示面板并点击「恢复默认顺序」
    const settingsBtn = container.querySelector<HTMLButtonElement>(
      `button[aria-label="${i18n.t('priceCompare.sheet.columnSettings')}"]`,
    )
    await act(async () => {
      settingsBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 60))
    })
    const resetOrderBtn = Array.from(
      document.body.querySelectorAll('.ant-popover button'),
    ).find((btn) => btn.textContent?.includes('恢复默认顺序'))
    expect(resetOrderBtn).toBeTruthy()
    await act(async () => {
      resetOrderBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 20))
    })

    const headerTextAfter =
      container.querySelector('.ant-table-thead')?.textContent ?? ''
    expect(headerTextAfter.indexOf('中天')).toBeLessThan(
      headerTextAfter.indexOf('沙钢'),
    )
    expect(headerTextAfter.indexOf('沙钢')).toBeLessThan(
      headerTextAfter.indexOf('永钢'),
    )
  })

  it('3 品牌表头右键菜单提供左移/右移一列，且工具栏不渲染撤销/重做按钮，支持 HRB400E loading 与新增行自动聚焦', async () => {
    renderPanel({
      hrb400eFallbackLoading: true,
      onToggleHrb400eFallback: vi.fn(),
    })

    // 工具栏不再渲染撤销/重做图标按钮
    expect(container.querySelector('.anticon-undo')).toBeNull()
    expect(container.querySelector('.anticon-redo')).toBeNull()

    // HRB400E 按钮处于 loading 状态
    const hrbBtn = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent?.includes('HRB400E'),
    )
    expect(hrbBtn?.className).toContain('ant-btn-loading')

    // 3 品牌右键「沙钢」列头：含左移一列/右移一列，点击左移后沙钢排在中天之前
    const shagangHead = Array.from(
      container.querySelectorAll<HTMLElement>('.price-compare-brand-name'),
    ).find((node) => node.textContent?.trim() === '沙钢')
    await act(async () => {
      shagangHead?.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 60))
    })
    const moveLeftItem = Array.from(
      document.body.querySelectorAll<HTMLElement>(
        '.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item',
      ),
    ).find((node) => node.textContent?.trim() === '左移一列')
    expect(moveLeftItem).toBeTruthy()
    await act(async () => {
      moveLeftItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    const headerAfterMove =
      container.querySelector('.ant-table-thead')?.textContent ?? ''
    expect(headerAfterMove.indexOf('沙钢')).toBeLessThan(
      headerAfterMove.indexOf('中天'),
    )

    // 点击「添加一行」自动聚焦到新行的商品选择输入框
    const addRowBtn = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent?.includes('添加一行'),
    )
    await act(async () => {
      addRowBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    const varietyCells = container.querySelectorAll('[data-variety-row]')
    expect(varietyCells.length).toBe(2)
    const lastRowInput = varietyCells[1]?.querySelector('input')
    expect(document.activeElement).toBe(lastRowInput)
  })

  it('他人持编辑锁(readOnly=true)但实时协作可写时，吨位与备注仍可协同编辑，结构操作保持禁用', () => {
    const patchItem = vi.fn()
    collabMockState.current = {
      mode: 'collab',
      state: 'connected',
      writable: true,
      peers: [],
      peersOfRow: () => [],
      patchItem,
      setCursor: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      canUndo: false,
      canRedo: false,
    }
    const bridgeSpy = vi.fn()

    renderPanel({ readOnly: true, onCollabStateChange: bridgeSpy })

    // 上报给 PriceCompareView 的协作桥接表明可协同写 ton/remark
    expect(bridgeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ active: true, writable: true }),
    )

    // 吨位与备注保持可编辑
    const tonInput = container.querySelector<HTMLInputElement>(
      'input[data-ton="r1"]',
    )
    const remarkInput = container.querySelector<HTMLInputElement>(
      'input.price-compare-row-remark',
    )
    expect(tonInput?.disabled).toBe(false)
    expect(remarkInput?.disabled).toBe(false)

    // 结构操作（添加一行）仍然因编辑锁保持禁用
    const addRowBtn = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent?.includes('添加一行'),
    )
    expect(addRowBtn?.disabled).toBe(true)

    // 修改备注走协作 patchItem，不走 REST
    act(() => {
      const setValue = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set?.bind(remarkInput)
      setValue?.('协同备注')
      remarkInput?.dispatchEvent(new Event('input', { bubbles: true }))
      remarkInput?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(patchItem).toHaveBeenCalledWith('r1', { remark: '协同备注' })
  })
})
