// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectSalesSummary } from '@/api/sales/project-sales-summary'
import type {
  ProjectSalesSummaryQuery,
  ProjectSalesSummaryState,
} from '@/views/modules/use-project-sales-summary'

const hookState = vi.hoisted<{
  current: ProjectSalesSummaryState
  lastQuery: ProjectSalesSummaryQuery | null
}>(() => ({
  current: {
    summary: null,
    loading: false,
    error: null,
    retry: () => {},
  },
  lastQuery: null,
}))

vi.mock('@/views/modules/use-project-sales-summary', () => ({
  useProjectSalesSummary: (query: ProjectSalesSummaryQuery) => {
    hookState.lastQuery = query
    return hookState.current
  },
}))

/**
 * 真实中文文案：从 zh-CN locale 直接查表并插值，避免 mock 出 `key.xxx` 这类假文案。
 * 这样断言的是**用户真正看到的字**，而不是「key 出现了」。
 */
vi.mock('react-i18next', async () => {
  const { zhCN } = await import('@/locales/zh-CN')
  const lookup = (key: string): string | null => {
    let node: unknown = zhCN
    for (const part of key.split('.')) {
      if (!node || typeof node !== 'object') return null
      node = (node as Record<string, unknown>)[part]
    }
    return typeof node === 'string' ? node : null
  }
  const translate = (key: string, options?: Record<string, unknown>) => {
    const template = lookup(key)
    if (template === null) return key
    if (!options) return template
    return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
      String(options[name] ?? ''),
    )
  }
  return { useTranslation: () => ({ t: translate }) }
})

import { ProjectSalesSummaryPanel } from './ProjectSalesSummaryPanel'

/** antd 的响应式栅格（`Descriptions column={{…}}`）在 jsdom 下需要 matchMedia。 */
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
}))

function summaryOf(
  overrides: Partial<ProjectSalesSummary> = {},
): ProjectSalesSummary {
  return {
    projectId: '1001',
    projectName: '华东钢铁项目',
    // 每个字段刻意取不同值：一旦某个指标接错了来源，断言能直接看出来。
    orderAmount: 1234567.8,
    orderTonnage: 1234.5,
    deliveredAmount: 900000.5,
    deliveredTonnage: 1000.25,
    reconciledAmount: 650000.25,
    reconciledTonnage: 640.5,
    unreconciledAmount: -250.5,
    unreconciledTonnage: -12.125,
    hasContract: true,
    contractAmount: 2000000,
    contractTonnage: 2000,
    remainingAmount: 765432.2,
    remainingTonnage: 765.5,
    exceededAmount: 0,
    exceededTonnage: 0,
    amountUsageRate: 0.617284,
    tonnageUsageRate: 0.61725,
    message: '',
    ...overrides,
  }
}

const idle: ProjectSalesSummaryState = {
  summary: null,
  loading: false,
  error: null,
  retry: () => {},
}

describe('ProjectSalesSummaryPanel', () => {
  let container: HTMLDivElement
  let root: Root

  const render = (
    state: ProjectSalesSummaryState,
    props: Partial<Parameters<typeof ProjectSalesSummaryPanel>[0]> = {},
  ) => {
    hookState.current = state
    act(() => {
      root.render(
        createElement(ProjectSalesSummaryPanel, {
          projectId: '1001',
          ...props,
        }),
      )
    })
    return container.textContent || ''
  }

  const progressBars = () =>
    Array.from(container.querySelectorAll('[role="progressbar"]'))

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    hookState.current = idle
    hookState.lastQuery = null
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('有合同时渲染两条进度条 + 百分比文本，且指标数值以文本出现', () => {
    const text = render({
      ...idle,
      summary: summaryOf(),
    })

    const bars = progressBars()
    expect(bars).toHaveLength(2)
    expect(bars[0]?.getAttribute('aria-label')).toBe('合同金额使用率进度条')
    expect(bars[1]?.getAttribute('aria-label')).toBe('合同吨位使用率进度条')

    // 数值不能只体现在进度条长度上：百分比与各项指标必须同时是可读文本
    expect(text).toContain('61.73%')
    expect(text).toContain('61.72%')
    expect(text).toContain('1234567.80')
    expect(text).toContain('1234.500')
    expect(text).toContain('1000.250')
    expect(text).toContain('-250.50')
    expect(text).toContain('-12.125')
    // 分组标题
    expect(text).toContain('订单合计')
    expect(text).toContain('送货')
    expect(text).toContain('对账情况')
    expect(text).toContain('合计金额')
    expect(text).toContain('未对账吨位')
  })

  it('三组指标顺序为 订单合计 / 送货 / 对账情况，送货吨位独立成组', () => {
    render({ ...idle, summary: summaryOf() })

    const groups = Array.from(
      container.querySelectorAll('.project-sales-summary__metrics-group'),
    ).map((group) => ({
      title: group.querySelector('.ant-descriptions-title')?.textContent || '',
      text: group.textContent || '',
    }))

    expect(groups.map((group) => group.title)).toEqual([
      '订单合计',
      '送货',
      '对账情况',
    ])
    // 合计金额/吨位属于「订单合计」
    expect(groups[0]?.text).toContain('合计金额')
    expect(groups[0]?.text).toContain('合计吨位')
    // 送货吨位不是订单合计的一部分，必须出现在独立的「送货」组里
    expect(groups[0]?.text).not.toContain('合计送货吨位')
    expect(groups[1]?.text).toContain('合计送货吨位')
    expect(groups[1]?.text).toContain('1000.250')
    // 对账组只有未对账金额/吨位
    expect(groups[2]?.text).toContain('未对账金额')
    expect(groups[2]?.text).toContain('未对账吨位')
  })

  it('无有效合同时不渲染进度条，显示说明但其余指标照常展示', () => {
    const text = render({
      ...idle,
      summary: summaryOf({
        hasContract: false,
        contractAmount: 0,
        contractTonnage: 0,
        remainingAmount: 0,
        remainingTonnage: 0,
        amountUsageRate: null,
        tonnageUsageRate: null,
      }),
    })

    expect(progressBars()).toHaveLength(0)
    expect(text).toContain('该项目未关联有效销售合同')
    expect(text).not.toContain('合同金额使用率')
    // 其余指标照常
    expect(text).toContain('1234567.80')
    expect(text).toContain('-250.50')
  })

  it('无合同提示只出现一次：后端 message 与本地化 Alert 不再重复', () => {
    const text = render({
      ...idle,
      summary: summaryOf({
        hasContract: false,
        amountUsageRate: null,
        tonnageUsageRate: null,
        // 后端同一条中文文案：面板只应显示本地化 Alert 那一份
        message: '该项目未关联有效销售合同',
      }),
    })

    expect(text.split('该项目未关联有效销售合同')).toHaveLength(2)
  })

  it('使用率超过 100% 时进度条进入 danger 态，并给出超限金额/吨位文案', () => {
    const text = render({
      ...idle,
      summary: summaryOf({
        amountUsageRate: 1.25,
        tonnageUsageRate: 1.4,
        exceededAmount: 100.5,
        exceededTonnage: 2.25,
        remainingAmount: 0,
        remainingTonnage: 0,
      }),
    })

    const bars = progressBars()
    expect(bars).toHaveLength(2)
    // antd Progress 的 danger 态：status="exception" 会落到状态类上
    for (const bar of bars) {
      expect(bar.className).toContain('ant-progress-status-exception')
      // 超限时刻度被 clamp 到 100，保证 aria-valuenow 不超过 aria-valuemax
      expect(bar.getAttribute('aria-valuenow')).toBe('100')
    }
    expect(text).toContain('125.00%')
    expect(text).toContain('140.00%')
    expect(text).toContain('已超出合同金额 100.50 元')
    expect(text).toContain('已超出合同吨位 2.250 吨')
  })

  it('加载中显示骨架，不渲染任何数字', () => {
    const text = render({ ...idle, loading: true })

    expect(container.querySelector('.ant-skeleton')).not.toBeNull()
    expect(text).not.toContain('1234567.80')
    expect(progressBars()).toHaveLength(0)
  })

  it('加载失败显示错误与重试按钮，点击后触发 retry', () => {
    const retry = vi.fn()
    const text = render({
      ...idle,
      error: { status: 500, message: '网关超时' },
      retry,
    })

    expect(text).toContain('项目数据加载失败')
    expect(text).toContain('网关超时')
    const button = container.querySelector<HTMLButtonElement>(
      '.project-sales-summary__retry',
    )
    expect(button).not.toBeNull()
    act(() => button?.click())
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('404（项目不存在/已停用）给出业务提示而不是可重试的失败', () => {
    const text = render({
      ...idle,
      error: { status: 404, message: 'Not Found' },
    })

    expect(text).toContain('项目不存在或已停用')
    expect(container.querySelector('.project-sales-summary__retry')).toBeNull()
  })

  it('未选项目时不渲染面板，也不发起查询', () => {
    const text = render(idle, { projectId: '  ' })

    expect(text).toBe('')
    expect(container.querySelector('.project-sales-summary')).toBeNull()
    expect(hookState.lastQuery?.projectId).toBe('  ')
  })

  it('把 excludeOrderId 与 pending 原样交给 hook，并在编辑器中标注「含本单」', () => {
    const text = render(
      { ...idle, summary: summaryOf() },
      {
        projectId: '9007199254740993',
        excludeOrderId: '9007199254740995',
        pendingAmount: 1234.56,
        pendingTonnage: 7.89,
        variant: 'editor',
      },
    )

    expect(hookState.lastQuery).toEqual({
      projectId: '9007199254740993',
      excludeOrderId: '9007199254740995',
      pendingAmount: 1234.56,
      pendingTonnage: 7.89,
    })
    expect(text).toContain('含本单未保存合计：1234.56 元 / 7.890 吨')
  })

  it('详情态不显示「含本单」标注（pending 只在编辑器传入）', () => {
    const text = render(
      { ...idle, summary: summaryOf() },
      { pendingAmount: 1234.56, pendingTonnage: 7.89, variant: 'detail' },
    )

    expect(text).not.toContain('含本单未保存合计')
  })

  it('不渲染后端 message 字段（避免与本地化提示重复、避免中文泄进英文界面）', () => {
    const text = render({
      ...idle,
      summary: summaryOf({ message: '合同额度剩余不足 10%' }),
    })

    expect(text).not.toContain('合同额度剩余不足 10%')
    // 本地化 UI 仍在
    expect(text).toContain('合同金额使用率')
    expect(text).toContain('订单合计')
  })
})
