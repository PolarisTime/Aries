import dayjs from 'dayjs'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { isTradingDay, isWeekend, today } from './market-sync-model'

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
    expect(isTradingDay('2026-10-10', ['上午'])).toBe(true)
  })

  it('周末且无行情才是休市', () => {
    expect(isTradingDay('2026-10-10', [])).toBe(false)
    expect(isTradingDay('2026-10-10', undefined)).toBe(false)
  })

  it('工作日即使暂无行情也按待同步的交易日处理', () => {
    // 法定节假日无法由星期推出, 后端记录"站点未发布"前仍按待同步展示(与补数口径一致)
    expect(isTradingDay('2026-10-09', [])).toBe(true)
    expect(isTradingDay('2026-10-01', undefined)).toBe(true)
  })
})
