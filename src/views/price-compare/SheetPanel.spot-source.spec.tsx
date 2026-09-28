// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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
 * 契约 §4.6 R2.5「删掉手填覆盖」后的界面契约:
 * 现货价只读展示价格表推导价, 来源必须是可见文字(WCAG 1.4.1),
 * 无价必须给出可读原因, 且不再有任何手填输入/「手填」标记/「恢复为价格表价」入口。
 */
describe('SheetPanel 现货价只读展示', () => {
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

  const spotValue = () =>
    container.querySelector<HTMLElement>('.price-compare-spot')
  const spotSrText = () =>
    container.querySelector('.price-compare-spot .aries-sr-only')
      ?.textContent ?? ''
  const sourceTags = () =>
    [...container.querySelectorAll('.price-compare-spot-source')].map(
      (node) => node.textContent,
    )

  it('现货列是只读文本, 不再渲染任何输入框 / 手填标记 / 恢复按钮', () => {
    render({ '中天:r1': PRICE_LIST_INPUT })

    expect(spotValue()?.textContent).toContain('3320')
    expect(container.querySelector('input.price-compare-spot')).toBeNull()
    expect(container.querySelector('input[data-spot]')).toBeNull()
    expect(sourceTags()).not.toContain('手填')
    expect(container.querySelector('.price-compare-spot-restore')).toBeNull()
  })

  it('价格表来源: 文字标记「价格表」+ 悬浮给出供应商 · 品牌 · 更新时间', () => {
    render({ '中天:r1': PRICE_LIST_INPUT })

    expect(sourceTags()).toEqual(['价格表'])
    const title = spotValue()?.getAttribute('title') ?? ''
    expect(title).toContain('价格表')
    expect(title).toContain('杭州物资')
    expect(title).toContain('中天')
    expect(title).toContain('2026-09-16 09:30')
  })

  it('价格表来源: 供应商列自动带出该供应商(只读, 不渲染人工下拉)', () => {
    render({ '中天:r1': PRICE_LIST_INPUT })

    const supplierCell = container.querySelector('.price-compare-supplier-auto')
    expect(supplierCell?.textContent).toContain('杭州物资')
    expect(container.querySelector('.price-compare-supplier')).toBeNull()
  })

  it('无价: 占位「—」且原因对读屏可读(该品牌无价格表 / 无此条目 / 不报价)', () => {
    const reasons = [
      ['NO_LIST', '该品牌暂无供应商价格表'],
      ['NO_ITEM', '该价格表无此条目'],
      ['NO_PRICE', '该条目不报价'],
    ] as const
    for (const [reason, text] of reasons) {
      render({
        '中天:r1': { spotSource: 'NONE', spotReason: reason },
      })
      expect(spotValue()?.textContent).toContain('—')
      expect(spotValue()?.getAttribute('title')).toContain(text)
      expect(spotSrText()).toContain(text)
      expect(spotValue()?.getAttribute('data-spot-source')).toBe('NONE')
      expect(sourceTags()).toEqual([])
    }
  })

  it('无来源信息(未读到价格格)时同样只展示占位, 不产生可编辑入口', () => {
    render({})

    expect(spotValue()?.textContent).toContain('—')
    expect(spotSrText()).toContain('中天 现货')
    expect(container.querySelector('input[data-spot]')).toBeNull()
  })
})
