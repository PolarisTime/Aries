// @vitest-environment jsdom
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { ProjectConfigModal } from './ProjectConfigModal'
import type { ProjectConfig, Variety } from './types'

/**
 * 初始只选中「螺纹钢 HRB400E 12 9米」一个格。
 *
 * <p>不传 products 时草稿默认「全选」，那样任何「点行头/列头后变了没」的断言都会失明；
 * 这里显式给一个最小选中集，让 toggle 的效果可被观测。</p>
 */
const ONLY_ONE_SELECTED: ProjectConfig = {
  brands: [{ name: '中天', freight: 30 }],
  lengthPremium: 30,
  hrb400eFallback: false,
  products: ['螺纹钢|HRB400E|12|9米'],
}

/**
 * 矩阵夹具: 螺纹钢下 2 个规格 × 2 个材质(其中 12 12米 只有 HRB400E)，
 * 另加一个盘螺类别，用于验证「类别各自一张表」以及「只看已选」会连类别一起收起。
 */
const VARIETIES: Variety[] = [
  {
    category: '螺纹钢',
    material: 'HRB400E',
    spec: 12,
    length: '9米',
    label: 'a',
  },
  {
    category: '螺纹钢',
    material: 'HRB400',
    spec: 12,
    length: '9米',
    label: 'b',
  },
  {
    category: '螺纹钢',
    material: 'HRB400E',
    spec: 12,
    length: '12米',
    label: 'c',
  },
  {
    category: '盘螺',
    material: 'HRB400E',
    spec: 8,
    length: '-',
    label: 'd',
  },
]

async function openProductsTab() {
  const tab = Array.from(document.querySelectorAll('[role="tab"]')).find(
    (node) =>
      (node.textContent ?? '').includes(
        i18n.t('priceCompare.config.tabs.products'),
      ),
  )
  if (!tab) throw new Error('未找到「可选商品」页签')
  await act(async () => {
    ;(tab as HTMLElement).click()
    await Promise.resolve()
  })
}

function checkboxByLabel(labelPart: string): HTMLInputElement {
  const input = Array.from(
    document.querySelectorAll<HTMLInputElement>('.price-compare-matrix input'),
  ).find((node) => (node.getAttribute('aria-label') ?? '').includes(labelPart))
  if (!input) throw new Error(`未找到勾选框: ${labelPart}`)
  return input
}

function rowHeaderTexts(): string[] {
  return Array.from(
    document.querySelectorAll('.price-compare-matrix tbody th'),
  ).map((node) => (node.textContent ?? '').trim())
}

async function clickSwitch() {
  const button = document.querySelector<HTMLButtonElement>(
    `button[aria-label="${i18n.t('priceCompare.config.onlySelected')}"]`,
  )
  if (!button) throw new Error('未找到「只看已选」开关')
  await act(async () => {
    button.click()
    await Promise.resolve()
  })
}

async function typeSearch(value: string) {
  const input = document.querySelector<HTMLInputElement>(
    `input[aria-label="${i18n.t('priceCompare.config.searchSpecOrMaterial')}"]`,
  )
  if (!input) throw new Error('未找到搜索框')
  await act(async () => {
    // antd Input 受控: 必须走原生 value setter 才能让 React 的 value tracker 认为是"用户输入"
    // (直接赋 input.value 在部分运行顺序下会被 tracker 吞掉, 表现为搜索框没变化)
    // eslint-disable-next-line @typescript-eslint/unbound-method -- 提取原生 setter 后立即以正确 this 调用
    const setNativeValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set
    setNativeValue?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await Promise.resolve()
  })
}

describe('ProjectConfigModal 可选商品矩阵', () => {
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
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
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

  async function renderOpen() {
    await act(async () => {
      root.render(
        createElement(ProjectConfigModal, {
          open: true,
          brandOptions: ['中天'],
          projectAllowedBrands: [],
          varieties: VARIETIES,
          config: ONLY_ONE_SELECTED,
          onClose: () => {},
          onSave: () => {},
        }),
      )
      await Promise.resolve()
    })
    await openProductsTab()
  }

  it('渲染出两张类别表, 行头是规格含定尺, 列头是材质', async () => {
    await renderOpen()

    const tables = document.querySelectorAll('.price-compare-matrix')
    expect(tables).toHaveLength(2)
    // 螺纹钢: 两个规格行(12 9米 / 12 12米)
    expect(rowHeaderTexts().slice(0, 2)).toEqual(['12 9米', '12 12米'])
    // 列头: 两个材质
    const columnHeaders = Array.from(
      document.querySelectorAll('.price-compare-matrix thead th'),
    ).map((node) => (node.textContent ?? '').trim())
    expect(columnHeaders).toContain('HRB400E')
    expect(columnHeaders).toContain('HRB400')
    // 数据里没有的组合渲染占位而不是空白格
    expect(
      document.querySelectorAll('.price-compare-matrix-empty').length,
    ).toBe(1)
  })

  it('点行头全选该规格的所有材质格', async () => {
    await renderOpen()
    // 初始只选中 HRB400E 一格; 同规格的 HRB400 格未选中
    expect(checkboxByLabel('HRB400 12 9米').checked).toBe(false)

    await act(async () => {
      checkboxByLabel(
        `${i18n.t('priceCompare.config.selectRow')} 12 9米`,
      ).click()
      await Promise.resolve()
    })

    expect(checkboxByLabel('HRB400E 12 9米').checked).toBe(true)
    expect(checkboxByLabel('HRB400 12 9米').checked).toBe(true)
    // 其他规格不受影响
    expect(checkboxByLabel('HRB400E 12 12米').checked).toBe(false)
  })

  it('点列头全选该材质的所有规格行', async () => {
    await renderOpen()

    await act(async () => {
      checkboxByLabel(
        `${i18n.t('priceCompare.config.selectColumn')} HRB400E`,
      ).click()
      await Promise.resolve()
    })

    expect(checkboxByLabel('HRB400E 12 9米').checked).toBe(true)
    expect(checkboxByLabel('HRB400E 12 12米').checked).toBe(true)
    // 另一材质的格子不受影响
    expect(checkboxByLabel('HRB400 12 9米').checked).toBe(false)
  })

  it('「只看已选」只保留有已选格的规格行与材质列, 无选中的类别整表收起', async () => {
    await renderOpen()
    // 再选上螺纹钢 12 9米 的 HRB400 格: 此时已选集合 = 同规格的两个材质
    await act(async () => {
      checkboxByLabel('HRB400 12 9米').click()
      await Promise.resolve()
    })
    expect(document.querySelectorAll('.price-compare-matrix')).toHaveLength(2)

    await clickSwitch()

    // 只剩螺纹钢一张表(盘螺无已选, 整表收起); 只剩 12 9米 一行; 只剩两个已选材质列
    expect(document.querySelectorAll('.price-compare-matrix')).toHaveLength(1)
    expect(rowHeaderTexts()).toEqual(['12 9米'])
    const columnHeaders = Array.from(
      document.querySelectorAll('.price-compare-matrix thead th'),
    ).map((node) => (node.textContent ?? '').trim())
    expect(columnHeaders).toContain('HRB400E')
    expect(columnHeaders).toContain('HRB400')
  })

  it('搜索可按材质单独命中(不只是规格)', async () => {
    await renderOpen()
    await typeSearch('400E')

    // 只剩 HRB400E 一列(HRB400 被排除), 行则是所有含该材质的规格
    const columnHeaders = Array.from(
      document.querySelectorAll('.price-compare-matrix thead th'),
    ).map((node) => (node.textContent ?? '').trim())
    expect(columnHeaders).toContain('HRB400E')
    expect(columnHeaders).not.toContain('HRB400')
    expect(rowHeaderTexts()).toEqual(['12 9米', '12 12米', '8'])
  })
})
