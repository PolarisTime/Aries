import dayjs from 'dayjs'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { latestQuotedSlot } from './market-sync-metrics'
import {
  type CalendarMap,
  isTradingDay,
  isWeekend,
  matrixCellState,
  today,
} from './market-sync-model'

/** 仅测试使用: 访问 Node 的 TZ 环境变量(应用 tsconfig 未包含 node 类型)。 */
const nodeEnv = (
  globalThis as unknown as {
    process: { env: Record<string, string | undefined> }
  }
).process.env

describe('market-sync-model today', () => {
  const originalTz = nodeEnv.TZ

  beforeAll(() => {
    nodeEnv.TZ = 'Asia/Shanghai'
  })

  afterAll(() => {
    if (originalTz === undefined) delete nodeEnv.TZ
    else nodeEnv.TZ = originalTz
    vi.useRealTimers()
  })

  it('按本地时区生成 YYYY-MM-DD, 不使用 UTC 日期', () => {
    vi.useFakeTimers()
    // 23:30 UTC = 次日 07:30 (+08:00), UTC 日期与本地日期不同
    vi.setSystemTime(new Date('2026-09-16T23:30:00Z'))

    expect(today()).toBe('2026-09-17')
    expect(today()).toBe(dayjs().format('YYYY-MM-DD'))
  })
})

describe('market-sync-model 交易日判定', () => {
  it('周末判定只看星期: 2026-10-10(周六)/10-04(周日) 为周末', () => {
    expect(isWeekend('2026-10-10')).toBe(true)
    expect(isWeekend('2026-10-04')).toBe(true)
    expect(isWeekend('2026-10-09')).toBe(false)
  })

  it('有行情即交易日: 调休上班的周六有行情时不能判为休市', () => {
    // 2026-10-10 是周六, 但站点照常发布行情(西本当天有 870 行) —— 数据优先于星期
    expect(isTradingDay('2026-10-10', { periods: ['上午'] })).toBe(true)
  })

  it('周末且无行情才是休市', () => {
    expect(isTradingDay('2026-10-10', { periods: [] })).toBe(false)
    expect(isTradingDay('2026-10-10', undefined)).toBe(false)
  })

  it('后端标记的休市日(节假日)不是交易日, 即使那天是工作日', () => {
    // 国庆 10-01(周四): 站点确实没发布行情, 由后端落库后经日历接口返回 closed
    expect(isTradingDay('2026-10-01', { periods: [], closed: true })).toBe(
      false,
    )
  })

  it('真实数据优先于休市标记', () => {
    // 后端抓到行情时会撤销标记; 万一标记残留, 也不该把已有行情压成休市、从覆盖统计里抹掉
    expect(
      isTradingDay('2026-10-01', { periods: ['上午'], closed: true }),
    ).toBe(true)
  })

  it('工作日即使暂无行情也按待同步的交易日处理', () => {
    // 后端还没记录"站点未发布"之前, 工作日按待同步展示(与补数口径一致)
    expect(isTradingDay('2026-10-09', { periods: [] })).toBe(true)
    expect(isTradingDay('2026-10-01', undefined)).toBe(true)
  })
})

/**
 * 单元格状态是**全页唯一口径**：覆盖矩阵的格子、行尾缺口汇总、右侧「待补缺口」清单
 * 都调用 `matrixCellState`。这里锁定三条容易写反的顺序。
 */
describe('market-sync-model 单元格状态矩阵口径', () => {
  const calendars = {
    // 周五已同步两个时段
    '2026-10-09': { periods: ['上午', '中午'], rows: {}, closed: false },
    // 调休上班的周六: 有行情 → 已同步, 不能因周末判成休市
    '2026-10-10': { periods: ['上午'], rows: {}, closed: false },
    // 后端标记的节假日: 工作日也不该显示成"缺失(可同步)"
    '2026-10-01': { periods: [], rows: {}, closed: true },
  } satisfies CalendarMap

  it('有行情的时段是已同步(哪怕当天是周末)', () => {
    expect(matrixCellState('2026-10-10', '上午', calendars)).toBe('synced')
  })

  it('同一交易日里没同步的时段是缺失(可点同步)', () => {
    expect(matrixCellState('2026-10-09', '下午', calendars)).toBe('missing')
    // 周六有行情, 其余时段仍算缺失而不是休市
    expect(matrixCellState('2026-10-10', '下午', calendars)).toBe('missing')
  })

  it('后端标记的休市日显示休市, 不显示成可同步的缺失', () => {
    expect(matrixCellState('2026-10-01', '上午', calendars)).toBe('off')
  })

  it('周末无行情是休市(兜底判据保留)', () => {
    expect(matrixCellState('2026-10-11', '上午', calendars)).toBe('off')
  })
})

/** 概览条「最新行情」: 取最近一个真正有行情的日期 + 时段，不猜、不取未来日期。 */
describe('latestQuotedSlot 最新行情', () => {
  it('取日期最新且有行情的时段; 同一天取最后一个时段', () => {
    expect(
      latestQuotedSlot({
        '2026-10-09': { periods: ['上午'], rows: {}, closed: false },
        '2026-10-10': { periods: ['上午', '下午'], rows: {}, closed: false },
        // 更晚的日期没有行情, 不能占位
        '2026-10-11': { periods: [], rows: {}, closed: false },
      }),
    ).toEqual({ date: '2026-10-10', period: '下午' })
  })

  it('没有任何行情时返回 null', () => {
    expect(latestQuotedSlot({})).toBeNull()
    expect(
      latestQuotedSlot({
        '2026-10-09': { periods: [], rows: {}, closed: true },
      }),
    ).toBeNull()
  })
})
