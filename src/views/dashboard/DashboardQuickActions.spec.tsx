import { describe, expect, it } from 'vitest'
import {
  buildQuickActionTarget,
  QUICK_ACTIONS,
} from '@/views/dashboard/DashboardQuickActions'

describe('DashboardQuickActions', () => {
  it('为快捷新建入口生成直接打开新建弹窗的 Tab 目标', () => {
    expect(QUICK_ACTIONS).toHaveLength(4)
    for (const action of QUICK_ACTIONS) {
      expect(buildQuickActionTarget(action)).toEqual({
        pathname: action.pathname,
        search: 'create=1',
        forceSearch: true,
      })
    }
  })
})
