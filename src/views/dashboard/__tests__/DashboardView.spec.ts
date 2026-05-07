import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import { i18n } from '@/i18n'
import { queryClientPlugin } from '@/plugins/query'
import DashboardView from '@/views/dashboard/DashboardView.vue'

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
}))

const dashboardApiMocks = vi.hoisted(() => ({
  getDashboardSummary: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerMocks.push,
  }),
}))

vi.mock('@/api/dashboard', () => ({
  getDashboardSummary: dashboardApiMocks.getDashboardSummary,
}))

function flushPromises() {
  return Promise.resolve()
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
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

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders realtime dashboard summary', async () => {
    const wrapper = mount(DashboardView, {
      global: {
        plugins: [Antd, i18n, queryClientPlugin],
      },
    })
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(wrapper.text()).toContain('演示公司')
    expect(wrapper.text()).toContain('系统管理员')
    expect(wrapper.text()).toContain('Leo')
    expect(wrapper.text()).toContain('服务器时间')
    expect(wrapper.text()).toContain('2026-04-26 10:00:00')
    expect(wrapper.text()).toContain('业务流程总览')
    expect(wrapper.text()).toContain('采购订单')
    expect(wrapper.text()).toContain('销售出库')
    expect(wrapper.text()).not.toContain('Leo ERP')

    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()

    expect(wrapper.text()).toContain('2026-04-26 10:00:01')
  })
})
