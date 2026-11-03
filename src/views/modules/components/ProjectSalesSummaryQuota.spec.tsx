// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectSalesSummary } from '@/api/sales/project-sales-summary'

/** 真实中文文案：断言用户实际看到的字，而不是 key。 */
vi.mock('react-i18next', async () => {
  const { zhCN } = await import('@/locales/zh-CN')
  const translate = (key: string, options?: Record<string, unknown>) => {
    let node: unknown = zhCN
    for (const part of key.split('.')) {
      if (!node || typeof node !== 'object') return key
      node = (node as Record<string, unknown>)[part]
    }
    if (typeof node !== 'string') return key
    return options
      ? node.replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
          String(options[name] ?? ''),
        )
      : node
  }
  return { useTranslation: () => ({ t: translate }) }
})

import { ProjectSalesSummaryQuota } from './ProjectSalesSummaryQuota'

function summaryOf(
  overrides: Partial<ProjectSalesSummary>,
): ProjectSalesSummary {
  return {
    projectId: '9007199254740993',
    projectName: '华东钢铁项目',
    orderAmount: 0,
    orderTonnage: 0,
    deliveredAmount: 0,
    deliveredTonnage: 0,
    reconciledAmount: 0,
    reconciledTonnage: 0,
    unreconciledAmount: 0,
    unreconciledTonnage: 0,
    hasContract: true,
    contractAmount: 1000000,
    contractTonnage: 1000,
    remainingAmount: 0,
    remainingTonnage: 0,
    exceededAmount: 0,
    exceededTonnage: 0,
    amountUsageRate: 1,
    tonnageUsageRate: 1,
    message: '',
    ...overrides,
  }
}

describe('合同额度区：进度条与超限提示同口径', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const render = (summary: ProjectSalesSummary) => {
    act(() => root.render(createElement(ProjectSalesSummaryQuota, { summary })))
  }

  it('rate 展示为 100.00% 但已超出 0.01 元时，进度条进 exception 且提示出现', () => {
    render(summaryOf({ amountUsageRate: 1, exceededAmount: 0.01 }))

    // 进度条：antd 用 exception 状态类名表达超限（不靠 showInfo 的红色图标）
    expect(
      container.querySelectorAll('.ant-progress-status-exception').length,
    ).toBe(1)
    // 提示：与进度条共用判定，必须同时出现
    expect(container.textContent).toContain('已超出合同金额')
    expect(container.textContent).toContain('100.00%')
  })

  it('没有超出额时进度条保持 normal、且不显示超限提示', () => {
    render(summaryOf({ amountUsageRate: 1, exceededAmount: 0 }))

    expect(
      container.querySelectorAll('.ant-progress-status-exception').length,
    ).toBe(0)
    expect(container.textContent).not.toContain('已超出合同金额')
  })
})
