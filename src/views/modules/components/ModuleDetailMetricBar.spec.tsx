// @vitest-environment jsdom

import { theme } from 'antd'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModuleDetailMetric } from '@/types/module-page'
import { ModuleDetailMetricBar } from './ModuleDetailMetricBar'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

function tokenSet() {
  return theme.getDesignToken()
}

/** 把 token 里的颜色（可能是 hex / hsl）交给浏览器归一成 `rgb(...)`，才能和 style 比较。 */
function cssColor(value: string): string {
  const probe = document.createElement('span')
  probe.style.color = value
  return probe.style.color
}

/**
 * 4 项指标，形状与销售订单一致：前两项带图标 + 括号次级说明，第 4 项是 warning。
 *
 * <p>这里刻意**不再有 `percent`**：方案 B 的指标条是两行结构（label / 值 + 说明），
 * 4px 进度条会变成第三行把 4 格撑开，`ModuleDetailMetric` 因此不再声明该字段。</p>
 */
const fourMetrics: ModuleDetailMetric[] = [
  {
    key: 'usageAmount',
    label: '合同金额使用率',
    value: '61.73%',
    hint: '（已用金额：¥123.4万 / 合同金额：¥200万）',
    icon: createElement('span', { 'data-testid': 'icon-amount' }),
  },
  {
    key: 'usageTonnage',
    label: '合同吨位使用率',
    value: '61.72%',
    hint: '（已用吨位：1234.500t / 合同吨位：2000.000t）',
    icon: createElement('span', { 'data-testid': 'icon-tonnage' }),
  },
  {
    key: 'delivered',
    label: '合计送货吨位 / 总重量',
    value: '1000.250 / 0.000 吨',
    icon: createElement('span', { 'data-testid': 'icon-delivered' }),
  },
  {
    key: 'unreconciled',
    label: '未对账金额 / 未对账吨位',
    value: '¥-250.50',
    hint: '（-12.125 吨）',
    tone: 'warning',
    icon: createElement('span', { 'data-testid': 'icon-warning' }),
  },
]

describe('ModuleDetailMetricBar', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  function render(metrics: ModuleDetailMetric[]) {
    act(() => {
      root.render(createElement(ModuleDetailMetricBar, { metrics }))
    })
  }

  it('按传入顺序渲染 4 项：label / value / hint 都在', () => {
    render(fourMetrics)

    const cells = container.querySelectorAll('.module-detail-metric')
    expect(cells).toHaveLength(4)
    expect(
      Array.from(cells).map(
        (cell) =>
          cell.querySelector('.module-detail-metric__label')?.textContent,
      ),
    ).toEqual([
      '合同金额使用率',
      '合同吨位使用率',
      '合计送货吨位 / 总重量',
      '未对账金额 / 未对账吨位',
    ])
    expect(
      container.querySelectorAll('.module-detail-metric__value')[0]
        ?.textContent,
    ).toBe('61.73%')
    // hint 只在给了 hint 的指标上出现，缺省不留空 span
    expect(
      container.querySelectorAll('.module-detail-metric__hint'),
    ).toHaveLength(3)
  })

  it('值与括号说明在**同一行**（方案 B 的两行结构），值节点本身仍是纯文本', () => {
    render(fourMetrics)

    const firstCell = container.querySelectorAll('.module-detail-metric')[0]
    const valueRow = firstCell?.querySelector(
      '.module-detail-metric__value-row',
    )
    expect(valueRow).not.toBeNull()
    // 值和 hint 都是这一行的直接子节点：不是「值下方另起一行」
    expect(
      valueRow?.querySelector(':scope > .module-detail-metric__value')
        ?.textContent,
    ).toBe('61.73%')
    expect(
      valueRow?.querySelector(':scope > .module-detail-metric__hint')
        ?.textContent,
    ).toContain('已用金额')
    // 值的 textContent 不能被 hint 污染（有测试按主值做断言）
    expect(
      valueRow?.querySelector('.module-detail-metric__value')?.textContent,
    ).toBe('61.73%')
  })

  it('图标可选：传了渲染圆形图标底，没传不占位', () => {
    render(fourMetrics)
    expect(
      container.querySelectorAll('.module-detail-metric__icon'),
    ).toHaveLength(4)
    // 默认 tone 的圆底取 colorPrimaryBg（浅色底是装饰，允许用原色系）
    const icon = container.querySelector<HTMLElement>(
      '.module-detail-metric__icon',
    )
    expect(icon?.style.background).toBe(cssColor(tokenSet().colorPrimaryBg))
    expect(icon?.getAttribute('aria-hidden')).toBe('true')

    render([{ key: 'plain', label: '没有图标', value: '1' }])
    expect(
      container.querySelectorAll('.module-detail-metric__icon'),
    ).toHaveLength(0)
    // 没有图标时 body 仍独占整格，不留空占位
    expect(
      container.querySelector('.module-detail-metric__label')?.textContent,
    ).toBe('没有图标')
  })

  it('warning tone：整格 amber（底色 + label/值都用 warningText），值走等宽字体', () => {
    render(fourMetrics)

    const tokens = tokenSet()
    const cells = container.querySelectorAll<HTMLElement>(
      '.module-detail-metric',
    )
    const normalCell = cells[0]
    const warningCell = cells[3]

    expect(normalCell?.className).not.toContain('module-detail-metric--warning')
    expect(warningCell?.className).toContain('module-detail-metric--warning')
    // 整格底色：token 的 colorWarningBg（暗色主题跟随，不写死 hex）
    expect(warningCell?.style.background).toBe(cssColor(tokens.colorWarningBg))

    const normalValue = normalCell?.querySelector<HTMLElement>(
      '.module-detail-metric__value',
    )
    const warningValue = warningCell?.querySelector<HTMLElement>(
      '.module-detail-metric__value',
    )
    const warningLabel = warningCell?.querySelector<HTMLElement>(
      '.module-detail-metric__label',
    )
    expect(normalValue?.style.color).toBe(cssColor(tokens.colorText))
    // 12-13px 的主值必须用 warningText（colorWarning 在浅底上对比度约 1.9:1，不达 AA）
    expect(warningValue?.style.color).toBe(cssColor(tokens.colorWarningText))
    expect(warningLabel?.style.color).toBe(cssColor(tokens.colorWarningText))
    // 等宽字体由 CSS 按 `--warning` 类命中（jsdom 不加载样式表，只锁定类名契约）
    expect(warningCell?.className).toContain('module-detail-metric--warning')
  })

  it('metrics 为空数组时返回 null（不留空容器占位）', () => {
    render([])

    expect(container.innerHTML).toBe('')
  })
})
