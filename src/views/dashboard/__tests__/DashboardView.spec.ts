import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import { i18n } from '@/i18n'
import { queryClientPlugin } from '@/plugins/query'
import DashboardView from '@/views/dashboard/DashboardView.vue'

const dashboardApiMocks = vi.hoisted(() => ({
  getDashboardSummary: vi.fn(),
}))

vi.mock('@/api/dashboard', () => ({
  getDashboardSummary: dashboardApiMocks.getDashboardSummary,
}))

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('DashboardView', () => {
  beforeEach(() => {
    ;(i18n.global.locale as unknown as { value: string }).value = 'zh-CN'
    dashboardApiMocks.getDashboardSummary.mockReset()
    dashboardApiMocks.getDashboardSummary.mockResolvedValue({
      appName: 'leo',
      companyName: '演示公司',
      userName: 'Leo',
      loginName: 'leo',
      roleName: '系统管理员',
      visibleMenuCount: 12,
      moduleCount: 8,
      actionCount: 36,
      activeSessionCount: 2,
      totpEnabled: true,
      lastLoginAt: '2026-04-26T09:30:00',
      serverTime: '2026-04-26T10:00:00',
    })
  })

  it('renders realtime dashboard summary', async () => {
    const wrapper = mount(DashboardView, {
      global: {
        plugins: [Antd, i18n, queryClientPlugin],
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('系统首页')
    expect(wrapper.text()).toContain('演示公司')
    expect(wrapper.text()).toContain('系统管理员')
    expect(wrapper.text()).toContain('Leo')
  })
})
