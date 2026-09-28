// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { SheetPanel } from './SheetPanel'
import type { PriceRow, PriceSheet, SheetInput, Variety } from './types'

const variety: Variety = {
  category: '螺纹钢',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
  label: '螺纹钢 HRB400E 12 9米',
}

const row: PriceRow = {
  id: 'r1',
  category: '螺纹钢',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
}

const PRICE_LIST_INPUT: SheetInput = {
  spot: 3320,
  derivedSpot: 3320,
  spotSource: 'PRICE_LIST',
  supplierId: '5001',
  supplierName: '杭州物资',
  priceListId: '8801',
  priceListReleasedAt: '2026-09-16T09:30:00',
}

function makeSheet(inputs: Record<string, SheetInput>): PriceSheet {
  return {
    id: 's1',
    name: '批次 1',
    status: '报价',
    projectId: 'p1',
    projectName: '项目',
    orderDate: '2026-09-16',
    refDate: '2026-09-16',
    refPeriod: '9:30 上午',
    lengthPremium: 30,
    inputs,
    rows: [row],
  }
}

/**
 * 批四「现货价自动带出 + 显式手填覆盖」的界面契约:
 * 来源必须是可见文字(WCAG 1.4.1), 无价必须给出可读原因,
 * 手填必须能走覆盖写入路径并能恢复为价格表价。
 */
describe('SheetPanel 现货价来源与手填覆盖', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  const saveSpotOverride = vi.fn().mockResolvedValue(undefined)
  const clearSpotOverride = vi.fn().mockResolvedValue(undefined)

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
    saveSpotOverride.mockClear()
    clearSpotOverride.mockClear()
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
      await new Promise((resolve) => {
        setTimeout(resolve, 25)
      })
    })
    container.remove()
  })

  /** 有状态渲染: patchSheet 回写本地 sheet, 便于断言「输入即置 MANUAL」。 */
  function render(inputs: Record<string, SheetInput>) {
    const observed = { sheet: makeSheet(inputs) }
    function Harness() {
      const [sheet, setSheet] = useState(observed.sheet)
      observed.sheet = sheet
      return createElement(SheetPanel, {
        sheet,
        data: null,
        varieties: [variety],
        brands: [{ name: '中天', freight: 30 }],
        rows: [row],
        density: 'small',
        lengthPremium: 30,
        patchSheet: (_id, patch) => setSheet((prev) => ({ ...prev, ...patch })),
        setRows: () => {},
        onReorderBrands: () => {},
        periods: ['9:30 上午'],
        onRefresh: () => {},
        chrome: false,
        spotRef: { current: null },
        onSaveSpotOverride: saveSpotOverride,
        onClearSpotOverride: clearSpotOverride,
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

  const spotInput = () =>
    container.querySelector<HTMLInputElement>('input.price-compare-spot')
  const sourceTags = () =>
    [...container.querySelectorAll('.price-compare-spot-source')].map(
      (node) => node.textContent,
    )

  it('价格表来源: 文字标记「价格表」+ 悬浮给出供应商 · 品牌 · 发布时间', () => {
    render({ '中天:r1': PRICE_LIST_INPUT })

    expect(sourceTags()).toEqual(['价格表'])
    const title = spotInput()?.getAttribute('title') ?? ''
    expect(title).toContain('价格表')
    expect(title).toContain('杭州物资')
    expect(title).toContain('中天')
    expect(title).toContain('2026-09-16 09:30')
    // 手填标记与恢复入口不出现
    expect(sourceTags()).not.toContain('手填')
    expect(container.querySelector('.price-compare-spot-restore')).toBeNull()
  })

  it('价格表来源: 供应商列自动带出该供应商(只读, 不渲染人工下拉)', () => {
    render({ '中天:r1': PRICE_LIST_INPUT })

    const supplierCell = container.querySelector('.price-compare-supplier-auto')
    expect(supplierCell?.textContent).toContain('杭州物资')
    expect(container.querySelector('.price-compare-supplier')).toBeNull()
  })

  it('手填覆盖: 文字标记「手填」+ 恢复按钮, 点击后请求恢复为价格表价', async () => {
    render({
      '中天:r1': {
        ...PRICE_LIST_INPUT,
        spot: 3450,
        spotSource: 'MANUAL',
        supplierName: '沙钢贸易',
      },
    })

    expect(sourceTags()).toContain('手填')
    const restore = container.querySelector<HTMLElement>(
      '.price-compare-spot-restore',
    )
    const label = restore?.getAttribute('aria-label') ?? ''
    expect(label).toContain('恢复')
    expect(label).toContain('价格表价')

    await act(async () => {
      restore?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(clearSpotOverride).toHaveBeenCalledWith('s1', '中天', 'r1')
  })

  it('无价: 占位符「—」且原因对读屏可读(报价时刻无生效版本 / 无此规格 / 不报价)', () => {
    const reasons = [
      ['NO_LIST_AT_TIME', '报价时刻无生效价格表版本'],
      ['NO_ITEM', '该价格表无此规格'],
      ['NO_PRICE', '该条目不报价'],
    ] as const
    for (const [reason, text] of reasons) {
      render({
        '中天:r1': { spotSource: 'NONE', spotReason: reason },
      })
      expect(spotInput()?.getAttribute('placeholder')).toBe('—')
      expect(spotInput()?.getAttribute('title')).toContain(text)
      expect(sourceTags()).toEqual([])
    }
  })

  it('手填现货价即置 MANUAL 并走单格覆盖写入', async () => {
    const observed = render({ '中天:r1': PRICE_LIST_INPUT })
    const input = spotInput()
    expect(input).not.toBeNull()

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set?.bind(input)
      setValue?.('3450')
      input?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(saveSpotOverride).toHaveBeenCalledWith('s1', '中天', 'r1', 3450)
    expect(observed.sheet.inputs['中天:r1']).toMatchObject({
      spot: 3450,
      spotSource: 'MANUAL',
    })
  })

  it('清空手填价且存在推导值时等价于恢复为价格表价', async () => {
    render({
      '中天:r1': { ...PRICE_LIST_INPUT, spot: 3450, spotSource: 'MANUAL' },
    })
    const input = spotInput()

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set?.bind(input)
      setValue?.('')
      input?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(clearSpotOverride).toHaveBeenCalledWith('s1', '中天', 'r1')
    expect(saveSpotOverride).not.toHaveBeenCalled()
  })
})
