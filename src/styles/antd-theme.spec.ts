import { describe, expect, it } from 'vitest'
import { buildAntdTheme } from './antd-theme'

/**
 * 主题动效契约。
 *
 * <p>展开类动效(下拉 / 气泡 / 浮层)走 antd 的 fast 与 mid 两档, antd 默认分别是 0.1s 与
 * 0.2s —— 0.2s 叠上 zoom 起手, 频繁开关时主观上是「慢半拍」。这里把两档收快并锁住,
 * 避免以后被无声改回默认。</p>
 *
 * <p>慢档(Modal / Drawer 用的 slow)刻意**不覆盖**: 大面板展开幅度大, 收太快反而发飘。</p>
 */
describe('antd 主题动效', () => {
  it('展开类动效收快, 且不覆盖大面板的慢档', () => {
    const theme = buildAntdTheme({ borderRadius: 6, fontSize: 14 })

    expect(theme.token?.motionDurationFast).toBe('0.08s')
    expect(theme.token?.motionDurationMid).toBe('0.12s')
    expect(theme.token?.motionDurationSlow).toBeUndefined()
  })
})
