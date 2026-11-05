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

/** 4 项指标：前两项带 percent、后两项不带（销售订单里两个使用率在无合同时就是这样）。 */
const fourMetrics: ModuleDetailMetric[] = [
  {
    key: 'usageAmount',
    label: '合同金额使用率',
    value: '61.73%',
    percent: 61.73,
  },
  {
    key: 'usageTonnage',
    label: '合同吨位使用率',
    value: '61.72%',
    percent: 61.72,
  },
  {
    key: 'delivered',
    label: '合计送货吨位 / 总重量',
    value: '1000.250 / 0.000 吨',
    hint: '合计送货吨位（项目） − 总重量（销售订单）：1000.250 吨',
  },
  {
    key: 'unreconciled',
    label: '未对账金额 / 未对账吨位',
    value: '¥-250.50',
    hint: '-12.125 吨',
    tone: 'warning',
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
    ).toHaveLength(2)
  })

  it('percent 缺省时不渲染进度条；越界/非法的 percent 收敛到 0~100', () => {
    render(fourMetrics)
    // 前两项有 percent、后两项没有：进度条只有 2 条
    expect(container.querySelectorAll('[role="progressbar"]')).toHaveLength(2)

    render([
      { key: 'no-percent', label: '无进度', value: '1' },
      { key: 'over', label: '超 100', value: '2', percent: 150 },
      { key: 'under', label: '负数', value: '3', percent: -20 },
      { key: 'nan', label: '非数', value: '4', percent: Number.NaN },
    ])
    const bars = container.querySelectorAll('[role="progressbar"]')
    // NaN 被 normalizePercent 丢掉 → 不渲染进度条，避免画出 NaN 宽的轨道
    expect(bars).toHaveLength(2)
    expect(bars[0]?.getAttribute('aria-valuenow')).toBe('100')
    expect(bars[1]?.getAttribute('aria-valuenow')).toBe('0')
  })

  it('warning tone 用警示文字色（不是默认主值色），进度条轨道用警示色', () => {
    render([
      { key: 'normal', label: '普通', value: '普通值' },
      {
        key: 'warn',
        label: '告警',
        value: '告警值',
        percent: 50,
        tone: 'warning',
      },
    ])

    const tokens = tokenSet()
    const values = container.querySelectorAll('.module-detail-metric__value')
    const normalColor = (values[0] as HTMLElement).style.color
    const warnColor = (values[1] as HTMLElement).style.color

    expect(normalColor).toBe(cssColor(tokens.colorText))
    // 18px/600 的主值必须用 warningText（colorWarning 在浅底上对比度约 1.9:1，不达 AA）
    expect(warnColor).toBe(cssColor(tokens.colorWarningText))
    expect(warnColor).not.toBe(normalColor)
    // 进度条轨道仍用原色：非文本对比 3:1 即可，用深色会让细条看起来"已经红了"
    // （antd 6 的轨道类名是 ant-progress-track，颜色写在行内 background 上）
    const track = container.querySelector<HTMLElement>('.ant-progress-track')
    expect(track?.style.background).toBe(cssColor(tokens.colorWarning))
  })

  it('metrics 为空数组时返回 null（不留空容器占位）', () => {
    render([])

    expect(container.innerHTML).toBe('')
  })
})
