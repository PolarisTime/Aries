// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectSalesSummary } from '@/api/sales/project-sales-summary'

const fetchProjectSalesSummaryMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/sales/project-sales-summary', () => ({
  fetchProjectSalesSummary: fetchProjectSalesSummaryMock,
}))

import {
  PROJECT_SALES_SUMMARY_DEBOUNCE_MS,
  type ProjectSalesSummaryQuery,
  useProjectSalesSummary,
} from './use-project-sales-summary'

function summaryOf(
  projectId: string,
  overrides: Partial<ProjectSalesSummary> = {},
): ProjectSalesSummary {
  return {
    projectId,
    projectName: `项目 ${projectId}`,
    orderAmount: 1000,
    orderTonnage: 100,
    deliveredAmount: 800,
    deliveredTonnage: 80,
    reconciledAmount: 600,
    reconciledTonnage: 60,
    unreconciledAmount: 200,
    unreconciledTonnage: 20,
    hasContract: true,
    contractAmount: 2000,
    contractTonnage: 200,
    remainingAmount: 1000,
    remainingTonnage: 100,
    exceededAmount: 0,
    exceededTonnage: 0,
    amountUsageRate: 0.5,
    tonnageUsageRate: 0.5,
    message: '',
    ...overrides,
  }
}

type ProbeProps = ProjectSalesSummaryQuery

describe('useProjectSalesSummary', () => {
  let container: HTMLDivElement
  let root: Root
  let latest: ReturnType<typeof useProjectSalesSummary>

  function Probe(props: ProbeProps) {
    latest = useProjectSalesSummary(props)
    return null
  }

  const render = (props: ProbeProps) =>
    act(() => {
      root.render(createElement(Probe, props))
    })

  /** 推进防抖定时器并把 fetch 的 then/catch 也刷完。 */
  const advance = async (ms = PROJECT_SALES_SUMMARY_DEBOUNCE_MS) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  }

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    vi.useFakeTimers()
    fetchProjectSalesSummaryMock.mockReset()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.useRealTimers()
  })

  it('空 projectId 不发请求，保持空态', async () => {
    render({ projectId: '' })
    await advance()

    expect(fetchProjectSalesSummaryMock).not.toHaveBeenCalled()
    expect(latest.summary).toBeNull()
    expect(latest.loading).toBe(false)
    expect(latest.error).toBeNull()
  })

  it('项目切换后发起新请求，并把上一轮请求 abort 掉', async () => {
    fetchProjectSalesSummaryMock.mockReturnValue(new Promise(() => {}))
    render({ projectId: '1001' })
    await advance()

    expect(fetchProjectSalesSummaryMock).toHaveBeenCalledTimes(1)
    const firstParams = fetchProjectSalesSummaryMock.mock.calls[0][0]
    const firstSignal = fetchProjectSalesSummaryMock.mock.calls[0][1]
    expect(firstParams).toMatchObject({ projectId: '1001' })
    expect(firstSignal.aborted).toBe(false)

    render({ projectId: '1002' })
    // 依赖变化的那一轮 effect 清理必须立即 abort 旧请求。
    expect(firstSignal.aborted).toBe(true)

    await advance()
    expect(fetchProjectSalesSummaryMock).toHaveBeenCalledTimes(2)
    expect(fetchProjectSalesSummaryMock.mock.calls[1][0]).toMatchObject({
      projectId: '1002',
    })
  })

  it('300ms 内连续变化的 pending 只发一次请求，且用最后一次的值', async () => {
    fetchProjectSalesSummaryMock.mockResolvedValue(summaryOf('1001'))
    render({ projectId: '1001', pendingAmount: 10, pendingTonnage: 1 })
    render({ projectId: '1001', pendingAmount: 20, pendingTonnage: 2 })
    render({ projectId: '1001', pendingAmount: 30, pendingTonnage: 3 })
    await advance(PROJECT_SALES_SUMMARY_DEBOUNCE_MS - 1)

    expect(fetchProjectSalesSummaryMock).not.toHaveBeenCalled()

    await advance(1)
    expect(fetchProjectSalesSummaryMock).toHaveBeenCalledTimes(1)
    expect(fetchProjectSalesSummaryMock.mock.calls[0][0]).toMatchObject({
      projectId: '1001',
      pendingAmount: 30,
      pendingTonnage: 3,
    })
  })

  it('excludeOrderId 为空串时不传给后端（新建态）', async () => {
    fetchProjectSalesSummaryMock.mockResolvedValue(summaryOf('1001'))
    render({ projectId: '1001', excludeOrderId: '' })
    await advance()

    const params = fetchProjectSalesSummaryMock.mock.calls[0][0]
    expect(params).not.toHaveProperty('excludeOrderId')
  })

  it('编辑态把 excludeOrderId 与 pending 原样传给后端，雪花 ID 保持字符串', async () => {
    fetchProjectSalesSummaryMock.mockResolvedValue(
      summaryOf('9007199254740993'),
    )
    render({
      projectId: '9007199254740993',
      excludeOrderId: '9007199254740995',
      pendingAmount: 1234.56,
      pendingTonnage: 7.89,
    })
    await advance()

    expect(fetchProjectSalesSummaryMock.mock.calls[0][0]).toMatchObject({
      projectId: '9007199254740993',
      excludeOrderId: '9007199254740995',
      pendingAmount: 1234.56,
      pendingTonnage: 7.89,
    })
  })

  it('加载失败进入错误态并保留 HTTP 状态码', async () => {
    fetchProjectSalesSummaryMock.mockRejectedValue(
      Object.assign(new Error('项目数据不可用'), { status: 500 }),
    )
    render({ projectId: '1001' })
    await advance()

    expect(latest.summary).toBeNull()
    expect(latest.loading).toBe(false)
    expect(latest.error).toEqual({ status: 500, message: '项目数据不可用' })
  })

  it('404 保留 status，供展示层区分「项目不存在/已停用」', async () => {
    fetchProjectSalesSummaryMock.mockRejectedValue(
      Object.assign(new Error('Not Found'), { status: 404 }),
    )
    render({ projectId: '1001' })
    await advance()

    expect(latest.error?.status).toBe(404)
  })

  it('retry 重新发起请求并清除错误态', async () => {
    fetchProjectSalesSummaryMock.mockRejectedValueOnce(
      Object.assign(new Error('boom'), { status: 503 }),
    )
    render({ projectId: '1001' })
    await advance()
    expect(latest.error).not.toBeNull()

    fetchProjectSalesSummaryMock.mockResolvedValueOnce(summaryOf('1001'))
    act(() => latest.retry())
    await advance()

    expect(fetchProjectSalesSummaryMock).toHaveBeenCalledTimes(2)
    expect(latest.error).toBeNull()
    expect(latest.summary?.projectId).toBe('1001')
  })

  it('换项目时清空旧数字，同项目 pending 变化时保留旧数字', async () => {
    fetchProjectSalesSummaryMock.mockResolvedValueOnce(summaryOf('1001'))
    render({ projectId: '1001' })
    await advance()
    expect(latest.summary?.projectId).toBe('1001')

    // 同项目：pending 变化 -> 保留旧数字，避免每次键入都闪骨架
    fetchProjectSalesSummaryMock.mockReturnValueOnce(new Promise(() => {}))
    render({ projectId: '1001', pendingAmount: 5 })
    expect(latest.summary?.projectId).toBe('1001')
    expect(latest.loading).toBe(true)

    // 换项目：旧项目数字必须立刻清空，不能把上一个项目的合计挂在新项目名下
    render({ projectId: '1002', pendingAmount: 5 })
    expect(latest.summary).toBeNull()
    expect(latest.loading).toBe(true)
  })

  it('被取消的旧请求不会把结果或错误写进新状态', async () => {
    let rejectFirst: ((error: unknown) => void) | undefined
    fetchProjectSalesSummaryMock.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectFirst = reject
      }),
    )
    render({ projectId: '1001' })
    await advance()

    fetchProjectSalesSummaryMock.mockResolvedValueOnce(summaryOf('1002'))
    render({ projectId: '1002' })
    await advance()
    expect(latest.summary?.projectId).toBe('1002')

    // 旧请求在被 abort 之后才 reject：必须被忽略，不能把错误态盖到新项目上。
    await act(async () => {
      rejectFirst?.(
        Object.assign(new Error('请求已取消'), { code: 'ERR_CANCELED' }),
      )
      await Promise.resolve()
    })

    expect(latest.error).toBeNull()
    expect(latest.summary?.projectId).toBe('1002')
  })
})
