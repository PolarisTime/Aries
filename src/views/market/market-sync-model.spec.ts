import dayjs from 'dayjs'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { today } from './market-sync-model'

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
