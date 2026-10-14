import { describe, expect, it } from 'vitest'
import {
  formatBuildMoment,
  formatBuildMomentForDisplay,
  isPlaceholderBuildMoment,
  isUsableBuildMoment,
  MIN_BUILD_DATE,
  PLACEHOLDER_BUILD_MOMENTS,
  resolveBuildMoment,
  resolveInjectedBuildMoment,
} from './buildInfo'

/** 固定"当前时刻"，避免用例随真实时间漂移。 */
const NOW = new Date('2026-10-14T12:00:00Z')
const TOMORROW = new Date(NOW.getTime() + 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10)

describe('buildInfo 注入口径', () => {
  /**
   * 线上故障的守卫: 编译时间必须是真实构建时刻 —— 可解析、晚于 2020-01-01、不在未来、
   * 且不等于任何占位常量。把注入改回"直接信任默认值/环境变量"时本条必须变红。
   */
  it('注入的编译时刻是真实值, 不是占位/哨兵', () => {
    const injected = __APP_BUILD_TIME__

    expect(isPlaceholderBuildMoment(injected)).toBe(false)
    expect(isUsableBuildMoment(injected)).toBe(true)
    expect(injected.slice(0, 10) >= MIN_BUILD_DATE).toBe(true)
    expect(injected.slice(0, 10) <= TOMORROW).toBe(true)
    expect(injected).not.toContain('1980')
  })

  it('占位/哨兵一律不采信, 回退到真实构建时刻', () => {
    for (const placeholder of PLACEHOLDER_BUILD_MOMENTS) {
      expect(isUsableBuildMoment(placeholder, NOW)).toBe(false)
      expect(resolveBuildMoment(placeholder, NOW)).toBe(formatBuildMoment(NOW))
    }

    // Maven 可复现构建的 ZIP 纪元哨兵: 正是线上显示 1980年02月01日 08:00:00 的那个值
    expect(resolveBuildMoment('1980-02-01T00:00:00Z', NOW)).toBe(
      formatBuildMoment(NOW),
    )
    expect(resolveBuildMoment('1980-02-01T00:00:00Z', NOW)).not.toContain(
      '1980',
    )
  })

  it('真实的环境变量覆盖值原样采信', () => {
    expect(resolveBuildMoment('2024-05-06 07:08:09', NOW)).toBe(
      '2024-05-06 07:08:09',
    )
    expect(resolveBuildMoment('2024-05-06T07:08:09Z', NOW)).toBe(
      '2024-05-06T07:08:09Z',
    )
  })

  it('空值/非法值/未来值都不采信', () => {
    expect(isUsableBuildMoment(undefined, NOW)).toBe(false)
    expect(isUsableBuildMoment(null, NOW)).toBe(false)
    expect(isUsableBuildMoment('', NOW)).toBe(false)
    expect(isUsableBuildMoment('not-a-time', NOW)).toBe(false)
    expect(isUsableBuildMoment('2099-01-01 00:00:00', NOW)).toBe(false)
    expect(isUsableBuildMoment('1970-01-01T00:00:00Z', NOW)).toBe(false)
  })

  it('运行时把坏注入值降级为 unknown, 底栏显示"未记录"而不是错误年份', () => {
    expect(resolveInjectedBuildMoment('1980-02-01T00:00:00Z', NOW)).toBe(
      'unknown',
    )
    expect(resolveInjectedBuildMoment('2026-10-14 20:00:00', NOW)).toBe(
      '2026-10-14 20:00:00',
    )
  })
})

describe('buildInfo 展示口径', () => {
  it('带偏移的 ISO 时刻换算到业务时区(Asia/Shanghai)', () => {
    // 渲染本身没错: 1980-02-01T00:00:00Z 在 UTC+8 就是 08:00:00 —— 错的是被注入的值。
    expect(formatBuildMomentForDisplay('1980-02-01T00:00:00Z', '未记录')).toBe(
      '1980年02月01日 08:00:00',
    )
    expect(
      formatBuildMomentForDisplay('2026-10-14T15:58:48.221Z', '未记录'),
    ).toBe('2026年10月14日 23:58:48')
  })

  it('本地墙钟串原样展示(不再二次换算)', () => {
    expect(formatBuildMomentForDisplay('2026-10-14 23:58:48', '未记录')).toBe(
      '2026年10月14日 23:58:48',
    )
  })

  it('空值/unknown 用兜底文案', () => {
    expect(formatBuildMomentForDisplay(null, '未记录')).toBe('未记录')
    expect(formatBuildMomentForDisplay(undefined, '未记录')).toBe('未记录')
    expect(formatBuildMomentForDisplay('unknown', '未记录')).toBe('未记录')
  })
})
