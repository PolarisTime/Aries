// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { SupplierPriceSpecRow } from '@/api/market/supplier-price-lists'
import type { SupplierBrandSpecItem } from '@/api/master/supplier-brand-specs'
import { SupplierBrandSpecField } from './SupplierBrandSpecField'

const { fetchSpecRowsMock, fetchSupplierBrandSpecsMock } = vi.hoisted(() => ({
  fetchSpecRowsMock: vi.fn(),
  fetchSupplierBrandSpecsMock: vi.fn(),
}))

vi.mock('@/api/market/supplier-price-lists', () => ({
  fetchSpecRows: fetchSpecRowsMock,
}))

vi.mock('@/api/master/supplier-brand-specs', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/api/master/supplier-brand-specs')>()
  return {
    ...actual,
    fetchSupplierBrandSpecs: fetchSupplierBrandSpecsMock,
  }
})

/** 萍钢在商品资料里的 3 个组合（穿梭框左栏数据源）。 */
const SPEC_ROWS: SupplierPriceSpecRow[] = [
  {
    brand: '萍钢',
    category: '直条',
    material: 'HRB400E',
    spec: 12,
    length: '9米',
  },
  {
    brand: '萍钢',
    category: '直条',
    material: 'HRB400E',
    spec: 14,
    length: '9米',
  },
  { brand: '萍钢', category: '盘螺', material: 'HRB400', spec: 8, length: '-' },
  // 其它品牌的组合不该出现在萍钢的穿梭框里
  {
    brand: '中天',
    category: '直条',
    material: 'HRB400E',
    spec: 16,
    length: '9米',
  },
]

const item = (
  overrides: Partial<SupplierBrandSpecItem> = {},
): SupplierBrandSpecItem => ({
  brandName: '萍钢',
  category: '直条',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
  ...overrides,
})

describe('供应商品牌规格配置控件', () => {
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
    fetchSpecRowsMock.mockReset()
    fetchSpecRowsMock.mockResolvedValue(SPEC_ROWS)
    fetchSupplierBrandSpecsMock.mockReset()
    fetchSupplierBrandSpecsMock.mockResolvedValue([])
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    queryClient.clear()
    container.remove()
    document.body.innerHTML = ''
  })

  const flush = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  /** 把控件挂在一个受控外壳里，并露出当前表单值。 */
  function harness(props: {
    initialValue?: SupplierBrandSpecItem[] | undefined
    recordId?: string
    brands?: string[]
  }) {
    return function Harness() {
      const [value, setValue] = useState<SupplierBrandSpecItem[] | undefined>(
        props.initialValue,
      )
      useEffect(() => {
        // 让测试能拿到组件回写的值
        ;(
          window as unknown as { __brandSpecsValue?: unknown }
        ).__brandSpecsValue = value
      }, [value])
      return createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(SupplierBrandSpecField, {
          brands: props.brands ?? ['萍钢'],
          label: '品牌规格配置',
          onChange: setValue,
          recordId: props.recordId,
          value,
        }),
      )
    }
  }

  const currentValue = (): SupplierBrandSpecItem[] | undefined =>
    (window as unknown as { __brandSpecsValue?: SupplierBrandSpecItem[] })
      .__brandSpecsValue

  async function render(props: Parameters<typeof harness>[0] = {}) {
    await act(async () => {
      root.render(createElement(harness(props)))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
  }

  const clickButton = async (label: string, scope: ParentNode = document) => {
    const button = [...scope.querySelectorAll('button')].find(
      (item) => (item.textContent ?? '').replace(/\s/g, '') === label,
    )
    expect(button, `未找到按钮 ${label}`).toBeTruthy()
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
  }

  const normalize = (text: string) => text.replace(/[\s·]/g, '')

  /** 某一栏的数据行数（antd 在 scroll.y 下会多渲染一行测量行，必须排除）。 */
  const rowCount = (sectionIndex: number): number => {
    const section = document.querySelectorAll<HTMLElement>(
      '.ant-transfer-section',
    )[sectionIndex]
    return (
      section?.querySelectorAll('tbody tr:not(.ant-table-measure-row)')
        .length ?? 0
    )
  }

  const clickRow = async (text: string, sectionIndex: number) => {
    const section = document.querySelectorAll('.ant-transfer-section')[
      sectionIndex
    ]
    const row = [
      ...(section?.querySelectorAll('tbody tr:not(.ant-table-measure-row)') ??
        []),
    ].find((item) =>
      normalize(item.textContent ?? '').includes(normalize(text)),
    )
    expect(row, `未找到行 ${text}`).toBeTruthy()
    await act(async () => {
      row?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
  }

  const moveSelected = async (direction: 'right' | 'left') => {
    const actions = document.querySelectorAll('.ant-transfer-actions button')
    const button = actions[direction === 'right' ? 0 : 1]
    expect(button).toBeTruthy()
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
  }

  const clickFooter = async (label: string) => {
    const footer = document.querySelector('.ant-modal-footer')
    expect(footer).not.toBeNull()
    await clickButton(label, footer as ParentNode)
  }

  it('按经营品牌逐行展示，未配置时显示「默认全量」', async () => {
    await render()

    expect(container.textContent).toContain('萍钢')
    expect(container.textContent).toContain('默认全量')
    expect(container.textContent).toContain('配置规格')
  })

  it('没有经营品牌时提示先选品牌', async () => {
    await render({ brands: [] })

    expect(container.textContent).toContain('请先选择经营品牌')
  })

  it('弹窗里默认全选：直接确认等价于「不写配置」', async () => {
    await render()
    await clickButton('配置规格')

    expect(document.querySelector('.ant-modal')).not.toBeNull()
    // 3 个可选组合都在右侧已选栏
    expect(rowCount(1)).toBe(3)
    // 其它品牌的组合不参与
    expect(document.body.textContent).not.toContain('中天')

    await clickFooter('确认')

    // 全选 = 默认全量 → 归一成空数组，避免往库里灌一份会过期的快照
    expect(currentValue()).toEqual([])
  })

  it('取消勾选一项后确认 → 保存显式配置（真子集）', async () => {
    await render()
    await clickButton('配置规格')

    // 右栏（已选）里把 14 移回左栏
    await clickRow('直条·HRB400E·14·9米', 1)
    await moveSelected('left')
    await clickFooter('确认')

    const value = currentValue() ?? []
    expect(value).toHaveLength(2)
    expect(value.map((entry) => entry.spec).sort((a, b) => a - b)).toEqual([
      8, 12,
    ])
    expect(value.every((entry) => entry.brandName === '萍钢')).toBe(true)
  })

  it('全部取消勾选时不能确认（后端没有「一个都不报」这个状态）', async () => {
    await render()
    await clickButton('配置规格')

    // 逐个把 3 项移回左栏
    for (const label of [
      '直条·HRB400E·12·9米',
      '直条·HRB400E·14·9米',
      '盘螺·HRB400·8·-',
    ]) {
      await clickRow(label, 1)
      await moveSelected('left')
    }

    expect(normalize(document.body.textContent ?? '')).toContain(
      normalize('至少保留 1 项'),
    )
    const okButton = [
      ...(document
        .querySelector('.ant-modal-footer')
        ?.querySelectorAll('button') ?? []),
    ].at(-1) as HTMLButtonElement
    expect(okButton.disabled).toBe(true)
  })

  it('已有配置回填：显示已配置项数，弹窗按配置预选', async () => {
    fetchSupplierBrandSpecsMock.mockResolvedValue([item({ spec: 12 })])
    await render({ recordId: '9001' })

    expect(fetchSupplierBrandSpecsMock).toHaveBeenCalledTimes(1)
    expect(container.textContent).toContain('已配置 1 项')
    expect(currentValue()).toEqual([item({ spec: 12 })])

    await clickButton('配置规格')
    // 只有 1 项在右侧已选栏，另外 2 项在左侧可选
    expect(rowCount(1)).toBe(1)
    expect(rowCount(0)).toBe(2)
  })

  it('配置加载失败时给出错误与重试，并且不允许配置（否则会覆盖服务端配置）', async () => {
    fetchSupplierBrandSpecsMock.mockRejectedValue(new Error('500'))
    await render({ recordId: '9001' })

    expect(container.textContent).toContain('品牌规格配置加载失败')
    expect(normalize(container.textContent ?? '')).toContain('重试')
    const configure = [...container.querySelectorAll('button')].find(
      (button) => (button.textContent ?? '').replace(/\s/g, '') === '配置规格',
    ) as HTMLButtonElement
    expect(configure.disabled).toBe(true)
    // 没读到配置时表单值保持「未知」，保存流程会跳过 PUT
    expect(currentValue()).toBeUndefined()
  })
})
