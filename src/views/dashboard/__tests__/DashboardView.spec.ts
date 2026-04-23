import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import { queryClientPlugin } from '@/plugins/query'
import DashboardView from '@/views/dashboard/DashboardView.vue'

describe('DashboardView', () => {
  it('renders current progress', () => {
    const wrapper = mount(DashboardView, {
      global: {
        plugins: [Antd, queryClientPlugin],
      },
    })
    expect(wrapper.text()).toContain('系统首页')
    expect(wrapper.text()).toContain('统一按 Jeecg 风格重写')
  })
})
