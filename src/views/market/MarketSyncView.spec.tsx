// @vitest-environment jsdom

import {
  notifyManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import dayjs from 'dayjs'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/authStore'
import { MarketSyncView } from '@/views/market/MarketSyncView'

const api = vi.hoisted(() => ({
  fetchSteelQuoteCalendars: vi.fn(),
  fetchSteelQuotes: vi.fn(),
  fetchBackfillStatus: vi.fn(),
  syncSteelQuotes: vi.fn(),
  backfillSteelQuotes: vi.fn(),
}))

vi.mock('@/api/market/steel-quotes', () => api)

vi.mock('@/api/system/runtime-config', () => ({
  getRuntimeConfig: vi.fn(() =>
    Promise.resolve({
      ui: { defaultPageSize: 10, showSnowflakeId: false },
      business: {
        statement: { customerReceiptAmountZero: true },
        quoteRegions: ['杭州', '南京'],
      },
      features: {
        weightOnlyPurchaseInbound: false,
        weightOnlySalesOutbound: false,
      },
    }),
  ),
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    destroy: vi.fn(),
  },
}))

notifyManager.setScheduler((callback) => {
  callback()
})

const idleBackfillStatus = {
  running: false,
  from: '2026-08-01',
  to: '2026-09-11',
  finishedAt: '2026-09-11T00:00:00',
  syncedDays: 0,
  skippedDays: 0,
  failedDays: 0,
  totalRows: 0,
}

describe('MarketSyncView（迁移到 TanStack Query）', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(() => {
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
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true

    api.fetchSteelQuoteCalendars.mockReset()
    api.fetchSteelQuotes.mockReset()
    api.fetchBackfillStatus.mockReset()
    api.syncSteelQuotes.mockReset()
    api.backfillSteelQuotes.mockReset()

    useAuthStore.setState({ isAuthenticated: true })

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { gcTime: 0 },
      },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    queryClient.clear()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  const renderView = () => {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(MarketSyncView),
        ),
      )
    })
  }

  /** 矩阵单元格: 按「日期 + 时段」定位, 不依赖行列下标。 */
  const matrixCell = (
    scope: HTMLElement,
    date: string,
    period: string,
  ): HTMLElement => {
    const found = Array.from(
      scope.querySelectorAll<HTMLElement>('.market-sync-cell'),
    ).find(
      (el) =>
        el.getAttribute('aria-label')?.includes(`${date} ${period}`) ?? false,
    )
    if (!found) throw new Error(`未找到矩阵单元格 ${date} ${period}`)
    return found
  }

  /**
   * 矩阵窗口内最近的工作日。
   * 用例里不能写死日期: 矩阵只渲染「今天往前 30 天」, 写死的日期会随时间滑出窗口。
   */
  const recentWeekday = (offsetDays = 1) => {
    let cursor = dayjs().subtract(offsetDays, 'day')
    while (cursor.day() === 0 || cursor.day() === 6) {
      cursor = cursor.subtract(1, 'day')
    }
    return cursor.format('YYYY-MM-DD')
  }

  it('认证后加载日历并自动选中最新时段，再按选中条件查询明细', async () => {
    const targetDate = recentWeekday()
    api.fetchSteelQuoteCalendars.mockResolvedValue([
      {
        quoteDate: recentWeekday(2),
        periods: ['上午'],
        periodRows: { 上午: 2 },
      },
      {
        quoteDate: targetDate,
        periods: ['上午', '下午'],
        periodRows: { 上午: 5, 下午: 4 },
      },
    ])
    api.fetchSteelQuotes.mockResolvedValue({
      rows: [
        {
          id: '1',
          quoteDate: targetDate,
          period: '上午',
          factory: '沙钢',
          breed: '螺纹钢',
          price: 4200,
        },
      ],
      total: 1,
    })
    api.fetchBackfillStatus.mockResolvedValue(idleBackfillStatus)

    renderView()
    await act(async () => {
      await Promise.resolve()
    })

    expect(api.fetchSteelQuoteCalendars).toHaveBeenCalledTimes(1)
    expect(api.fetchSteelQuotes).toHaveBeenCalledTimes(1)
    const [quotesParams] = api.fetchSteelQuotes.mock.calls[0] as [
      { quoteDate: string; period: string; page: number; size: number },
    ]
    expect(quotesParams).toMatchObject({
      quoteDate: targetDate,
      period: '上午',
      page: 0,
      size: 20,
    })
    // 明细改为右侧抽屉: 矩阵点选后才打开, 因此断言落在 document.body(portal)
    const cell = matrixCell(container, targetDate, '上午')
    await act(async () => {
      cell.click()
      await Promise.resolve()
    })
    expect(document.body.textContent).toContain('沙钢')
    expect(document.body.textContent).toContain('共 1 条')
  })

  it('未认证时不发起任何请求', async () => {
    useAuthStore.setState({ isAuthenticated: false })

    renderView()
    await act(async () => {
      await Promise.resolve()
    })

    expect(api.fetchSteelQuoteCalendars).not.toHaveBeenCalled()
    expect(api.fetchSteelQuotes).not.toHaveBeenCalled()
    expect(api.fetchBackfillStatus).not.toHaveBeenCalled()
  })

  it('补数进行中按 3 秒轮询，任务结束后停止', async () => {
    vi.useFakeTimers()
    api.fetchSteelQuoteCalendars.mockResolvedValue([])
    api.fetchSteelQuotes.mockResolvedValue({ rows: [], total: 0 })
    api.fetchBackfillStatus
      .mockResolvedValueOnce({
        ...idleBackfillStatus,
        running: true,
        finishedAt: undefined,
      })
      .mockResolvedValue({
        ...idleBackfillStatus,
        running: false,
        syncedDays: 1,
        totalRows: 3,
      })

    renderView()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(api.fetchBackfillStatus).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(api.fetchBackfillStatus).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000)
    })
    expect(api.fetchBackfillStatus).toHaveBeenCalledTimes(2)
  })

  it('补数结束后展示跳过天数与跳过日期（该日无行情不算失败）', async () => {
    api.fetchSteelQuoteCalendars.mockResolvedValue([])
    api.fetchSteelQuotes.mockResolvedValue({ rows: [], total: 0 })
    api.fetchBackfillStatus.mockResolvedValue({
      ...idleBackfillStatus,
      syncedDays: 22,
      skippedDays: 6,
      failedDays: 0,
      totalRows: 900,
      skippedDates: [
        '2026-09-25',
        '2026-10-01',
        '2026-10-02',
        '2026-10-05',
        '2026-10-06',
        '2026-10-07',
      ],
      failures: [],
    })

    renderView()
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const text = document.body.textContent ?? ''
    // 汇总标签带上跳过天数
    expect(text).toContain('跳过6天')
    // 跳过日期明细可见，且不再计入失败
    expect(text).toContain('跳过 6 天')
    expect(text).toContain('2026-09-25')
    expect(text).toContain('2026-10-07')
    expect(text).not.toContain('补数失败')
  })

  it('切换到西本后按 source=STEELX 查询日历并可同步', async () => {
    api.fetchSteelQuoteCalendars.mockResolvedValue([])
    api.fetchSteelQuotes.mockResolvedValue({ rows: [], total: 0 })
    api.fetchBackfillStatus.mockResolvedValue(idleBackfillStatus)
    api.syncSteelQuotes.mockResolvedValue({
      articleDate: '2026-09-22',
      period: '上午',
      periods: ['上午'],
      rowCount: 64,
      created: true,
    })

    renderView()
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    // 切换数据源为西本
    const sourceSelect = container.querySelector('.ant-select')
    expect(sourceSelect).not.toBeNull()
    await act(async () => {
      sourceSelect?.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const steelxOption = Array.from(
      document.querySelectorAll<HTMLElement>('.ant-select-item-option'),
    ).find((el) => el.textContent?.includes('西本'))
    expect(steelxOption).toBeTruthy()
    await act(async () => {
      steelxOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // 再次查询日历时带 source=STEELX
    await act(async () => {
      await Promise.resolve()
    })
    const lastCall = api.fetchSteelQuoteCalendars.mock.calls.at(-1)
    expect(lastCall?.[3]).toBe('STEELX')

    // 今日同步口径跟随数据源: 西本每天只有一个价, 分母与圆点都应是「上午」而不是 3 个时段
    const todayMetric = Array.from(
      container.querySelectorAll<HTMLElement>('.market-sync-metric'),
    ).at(-1)
    expect(todayMetric?.textContent).toContain('/ 1')
    const todayItems =
      todayMetric?.querySelectorAll('.market-sync-today-item') ?? []
    expect(todayItems).toHaveLength(1)
    const todayLabels = Array.from(todayItems).map((item) =>
      item
        .querySelector('span[aria-hidden="true"]:not(.market-sync-today-dot)')
        ?.textContent?.trim(),
    )
    expect(todayLabels).toEqual(['上午'])
  })

  it('西本地区下拉使用后端 runtime-config 动态下发的地区', async () => {
    api.fetchSteelQuoteCalendars.mockResolvedValue([])
    api.fetchSteelQuotes.mockResolvedValue({ rows: [], total: 0 })
    api.fetchBackfillStatus.mockResolvedValue(idleBackfillStatus)

    renderView()
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const sourceSelect = container.querySelector('.ant-select')
    await act(async () => {
      sourceSelect?.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const steelxOption = Array.from(
      document.querySelectorAll<HTMLElement>('.ant-select-item-option'),
    ).find((el) => el.textContent?.includes('西本'))
    await act(async () => {
      steelxOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // 西本下第二个 select 即地区下拉
    const regionSelect = container.querySelectorAll('.ant-select')[1]
    expect(regionSelect).toBeTruthy()
    await act(async () => {
      regionSelect?.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const optionTexts = [
      ...document.querySelectorAll<HTMLElement>('.ant-select-item-option'),
    ].map((node) => node.textContent?.trim())
    expect(optionTexts).toContain('南京')
    expect(optionTexts).not.toContain('绍兴')
  })

  it('覆盖矩阵按「时段 × 日期」转置：时段是行头，日期是列头', async () => {
    api.fetchSteelQuoteCalendars.mockResolvedValue([
      {
        quoteDate: recentWeekday(),
        periods: ['上午', '下午'],
        periodRows: { 上午: 5, 下午: 4 },
      },
    ])
    api.fetchSteelQuotes.mockResolvedValue({ rows: [], total: 0 })
    api.fetchBackfillStatus.mockResolvedValue(idleBackfillStatus)

    renderView()
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const table = container.querySelector('.market-sync-grid')
    expect(table).toBeTruthy()
    // 行头 = 时段(3 行), 而不是 30 行日期
    const rowHeaders = Array.from(
      table?.querySelectorAll('tbody th[scope="row"]') ?? [],
    ).map((el) => el.textContent?.trim())
    expect(rowHeaders).toEqual(['上午', '中午', '下午'])
    // 列头 = 时段列 + 30 天
    const colHeaders = table?.querySelectorAll('thead th[scope="col"]') ?? []
    expect(colHeaders.length).toBe(31)
    // 首行仍是「时段」列名
    expect(colHeaders[0].textContent?.trim()).toBe('时段')
  })

  it('每个可交互单元格都有唯一可访问名(含日期与时段)', async () => {
    api.fetchSteelQuoteCalendars.mockResolvedValue([
      {
        quoteDate: recentWeekday(),
        periods: ['上午'],
        periodRows: { 上午: 5 },
      },
    ])
    api.fetchSteelQuotes.mockResolvedValue({ rows: [], total: 0 })
    api.fetchBackfillStatus.mockResolvedValue(idleBackfillStatus)

    renderView()
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const cells = Array.from(
      container.querySelectorAll<HTMLElement>('button.market-sync-cell'),
    )
    expect(cells.length).toBeGreaterThan(0)
    const labels = cells.map((el) => el.getAttribute('aria-label') ?? '')
    // 全部非空
    expect(labels.every((label) => label.length > 0)).toBe(true)
    // 全部唯一: 这是重做前的缺陷(30 个单元格都叫「缺」)
    expect(new Set(labels).size).toBe(labels.length)
    // 至少一个带行数(已同步格)
    expect(labels.some((label) => label.includes('5 行'))).toBe(true)
  })

  it('点击缺失格触发同步，且不打开明细抽屉', async () => {
    // 只有窗口内某个工作日有数据, 其余工作日均为缺失
    api.fetchSteelQuoteCalendars.mockResolvedValue([
      {
        quoteDate: recentWeekday(),
        periods: ['上午'],
        periodRows: { 上午: 5 },
      },
    ])
    api.fetchSteelQuotes.mockResolvedValue({ rows: [], total: 0 })
    api.fetchBackfillStatus.mockResolvedValue(idleBackfillStatus)
    api.syncSteelQuotes.mockResolvedValue({
      articleDate: '2026-09-10',
      period: '上午',
      periods: ['上午'],
      rowCount: 12,
      created: true,
    })

    renderView()
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    // 按状态取第一个缺失格: 不硬编码日期, 避免用例随系统时钟失效
    const missing = container.querySelector<HTMLElement>(
      'button.market-sync-cell.is-missing',
    )
    expect(missing).toBeTruthy()
    expect(missing?.getAttribute('aria-label')).toContain('缺失')
    await act(async () => {
      missing?.click()
      await Promise.resolve()
    })

    expect(api.syncSteelQuotes).toHaveBeenCalled()
    // 缺失格是「同步」而不是「看明细」: 不应弹出抽屉
    expect(document.body.textContent).not.toContain('共 0 条')
  })

  it('调休上班的周六有行情时按交易日展示与统计, 不再显示成休市', async () => {
    // 回归: 矩阵曾先按周末判「休市」, 2026-10-10(周六, 调休上班日) 明明已同步 870 行,
    // 却被显示成不可点的「休」, 覆盖统计也把它当作休息日排除。
    const window30 = Array.from({ length: 30 }, (_, index) =>
      dayjs().subtract(index, 'day'),
    )
    const saturdayWithData = window30.find((day) => day.day() === 6)
    const sundayWithoutData = window30.find((day) => day.day() === 0)
    expect(saturdayWithData).toBeTruthy()
    expect(sundayWithoutData).toBeTruthy()
    const withData = saturdayWithData?.format('YYYY-MM-DD') as string
    const withoutData = sundayWithoutData?.format('YYYY-MM-DD') as string
    // 交易日分母 = 窗口内工作日 + 这个有行情的周六
    const weekdayCount = window30.filter(
      (day) => day.day() !== 0 && day.day() !== 6,
    ).length

    api.fetchSteelQuoteCalendars.mockResolvedValue([
      {
        quoteDate: withData,
        periods: ['上午'],
        periodRows: { 上午: 870 },
      },
    ])
    api.fetchSteelQuotes.mockResolvedValue({ rows: [], total: 0 })
    api.fetchBackfillStatus.mockResolvedValue(idleBackfillStatus)

    renderView()
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    // 有行情的周六: 已同步 + 可点击进明细, 不再是「休」文本
    const synced = matrixCell(container, withData, '上午')
    expect(synced.classList.contains('is-synced')).toBe(true)
    expect(synced.tagName).toBe('BUTTON')
    const label = synced.getAttribute('aria-label') ?? ''
    expect(label).toContain('已同步')
    expect(label).toContain('870 行')

    // 无行情的周日仍是休市文本(周末兜底判据保留)。
    // 休市格对读屏只提供 sr-only 文案, 没有 aria-label 按钮语义, 因此按 title 定位。
    const off = Array.from(
      container.querySelectorAll<HTMLElement>('.market-sync-cell.is-off'),
    ).find((el) => (el.getAttribute('title') ?? '').includes(withoutData))
    expect(off).toBeTruthy()
    expect(off?.tagName).toBe('SPAN')
    expect(off?.textContent).toContain('休')

    // 覆盖统计口径与矩阵一致: 分母含这个周六
    const coverage = container.querySelector('.market-sync-metric')?.textContent
    expect(coverage).toMatch(new RegExp(`1\\s*/\\s*${weekdayCount + 1}`))
  })

  it('休市格是非交互文本，不可点击(WCAG 2.1.1 不依赖颜色或悬停)', async () => {
    api.fetchSteelQuoteCalendars.mockResolvedValue([])
    api.fetchSteelQuotes.mockResolvedValue({ rows: [], total: 0 })
    api.fetchBackfillStatus.mockResolvedValue(idleBackfillStatus)

    renderView()
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    // 不写死日期: 矩阵内周末必然存在(近 30 天至少 8 个休息日)
    const offCells = Array.from(
      container.querySelectorAll<HTMLElement>('.market-sync-cell.is-off'),
    )
    expect(offCells.length).toBeGreaterThan(0)
    // 休市用纯文本 span, 不是 button: 不产生「看似可点却不可点」的控件
    for (const cell of offCells) {
      expect(cell.tagName).toBe('SPAN')
      expect(cell.closest('button')).toBeNull()
    }
    // 可访问描述由 .aries-sr-only 承载(无 role 的 span 不能挂 aria-label)
    expect(offCells[0].querySelector('.aries-sr-only')?.textContent).toContain(
      '休市',
    )
  })
})
