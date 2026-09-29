// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { SheetPanel } from './SheetPanel'
import type { PriceRow, PriceSheet, Variety } from './types'

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

function makeSheet(): PriceSheet {
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
    rows: [row],
  }
}

/**
 * 表格可访问性契约:
 * 单元格编辑器与选择框必须有可访问名称, 表头被裁切时必须能用 title 看到完整文案,
 * 否则读屏只会播报"编辑框""复选框", 键盘/读屏用户无法判断自己在改哪一列哪一行。
 */
describe('SheetPanel 无障碍契约', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  const PRODUCT = '螺纹钢 HRB400E 12 9米'

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

  function render() {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(SheetPanel, {
            sheet: makeSheet(),
            data: null,
            varieties: [variety],
            brands: [{ name: '中天', freight: 30 }],
            rows: [row],
            density: 'small',
            lengthPremium: 30,
            patchSheet: () => {},
            setRows: () => {},
            onReorderBrands: () => {},
            periods: ['9:30 上午'],
            onRefresh: () => {},
            chrome: false,
            spotRef: { current: null },
          }),
        ),
      )
    })
  }

  const labelOf = (selector: string) =>
    container.querySelector(selector)?.getAttribute('aria-label')
  const headerTitle = (text: string) =>
    [...container.querySelectorAll('th')]
      .find((th) => th.textContent?.includes(text))
      ?.getAttribute('title')

  it('表格本体有可访问名称(含批次名)', () => {
    render()
    const labels = [...container.querySelectorAll('table')].map((table) =>
      table.getAttribute('aria-label'),
    )
    expect(labels.some((label) => label?.includes('报单比价明细表'))).toBe(true)
    expect(labels.some((label) => label?.includes('批次 1'))).toBe(true)
  })

  it('全选与行选择框都有可访问名称', () => {
    render()
    const labels = [...container.querySelectorAll('.ant-checkbox-input')].map(
      (input) => input.getAttribute('aria-label'),
    )
    expect(labels).toContain('全选商品行')
    expect(labels).toContain(`选择${PRODUCT}`)
    // 行内(而非表头)的那个复选框必须带行名
    const rowCheckbox = [
      ...container.querySelectorAll('.ant-table-row .ant-checkbox-input'),
    ][0]
    expect(rowCheckbox?.getAttribute('aria-label')).toBe(`选择${PRODUCT}`)
  })

  it('单元格编辑器按「列名，行名」命名', () => {
    render()
    // 吨位
    expect(labelOf('input.price-compare-ton')).toBe(`报单吨位，${PRODUCT}`)
    // 备注
    expect(labelOf('input.price-compare-row-remark')).toBe(`备注，${PRODUCT}`)
    // 现货价(带品牌, 同列多品牌时可区分)
    expect(labelOf('input.price-compare-spot')).toBe(`中天 现货，${PRODUCT}`)
    // 供应商(antd Select 的名称落在 combobox 上)
    const supplierLabel = [
      ...container.querySelectorAll('.price-compare-supplier input'),
    ][0]?.getAttribute('aria-label')
    expect(supplierLabel).toBe(`中天 简称，${PRODUCT}`)
  })

  it('参照时段下拉也有可访问名称', () => {
    render()
    const periodLabel = [...container.querySelectorAll('.ant-select-input')]
      .map((input) => input.getAttribute('aria-label'))
      .filter(Boolean)
    expect(periodLabel).toContain('参照时段')
  })

  it('被裁切的表头提供 title 完整文案', () => {
    render()
    expect(headerTitle('备注')).toBe('备注')
    expect(headerTitle('类别')).toBe('类别')
    expect(headerTitle('材质 / 规格 / 长度')).toBe('材质 / 规格 / 长度')
    expect(headerTitle('报单吨位')).toContain('报单吨位')
  })
})
