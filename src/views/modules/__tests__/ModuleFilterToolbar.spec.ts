import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import ModuleFilterToolbar from '@/views/modules/components/ModuleFilterToolbar.vue'
import type { ModuleFilterDefinition, ModuleQuickFilterDefinition } from '@/types/module-page'

const visibleFilters: ModuleFilterDefinition[] = [
  {
    key: 'keyword',
    label: '关键词',
    type: 'input',
    placeholder: '输入单号',
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    options: [
      { label: '正常', value: 'active' },
      { label: '停用', value: 'disabled' },
    ],
  },
  {
    key: 'createdAt',
    label: '创建日期',
    type: 'dateRange',
  },
  {
    key: 'customerName',
    label: '客户',
    type: 'select',
    row: 2,
  },
  {
    key: 'projectName',
    label: '项目名称',
    type: 'input',
    row: 2,
  },
]

const quickFilters: ModuleQuickFilterDefinition[] = [
  {
    key: 'pending',
    label: '待审核',
    values: { status: 'pending' },
  },
]

function mountToolbar() {
  return mount(ModuleFilterToolbar, {
    props: {
      moduleKey: 'sales-orders',
      filters: {
        keyword: '',
        status: '',
        createdAt: undefined,
        customerName: '',
        projectName: '',
      },
      visibleFilters,
      quickFilters,
      activeQuickFilterKey: 'pending',
      hasAdvancedFilters: true,
      expanded: false,
    },
    global: {
      plugins: [Antd],
    },
  })
}

describe('ModuleFilterToolbar', () => {
  it('emits filter and toolbar actions through a narrow contract', async () => {
    const wrapper = mountToolbar()

    expect(wrapper.text()).toContain('关键词')
    expect(wrapper.text()).toContain('状态')
    expect(wrapper.findComponent({ name: 'ARangePicker' }).exists()).toBe(true)
    expect(wrapper.find('.module-filter-item-input').exists()).toBe(true)
    expect(wrapper.find('.module-filter-item-select').exists()).toBe(true)
    expect(wrapper.find('.module-filter-item-date-range').exists()).toBe(true)
    const filterRows = wrapper.findAll('.filter-inline-group')
    expect(filterRows).toHaveLength(2)
    expect(filterRows[0].text()).toContain('创建日期')
    expect(filterRows[0].findAll('button')).toHaveLength(2)
    expect(filterRows[1].text()).toContain('客户')
    expect(filterRows[1].text()).toContain('项目名称')
    expect(filterRows[1].findAll('button')).toHaveLength(0)

    const quickFilterButton = wrapper.findAll('button').find((button) => button.text() === '待审核')
    expect(quickFilterButton).toBeDefined()
    await quickFilterButton!.trigger('click')
    expect(wrapper.emitted('apply-quick-filter')?.[0]).toEqual([quickFilters[0]])

    wrapper.findComponent({ name: 'AInput' }).vm.$emit('update:value', 'SO-001')
    expect(wrapper.emitted('update-filter')?.[0]).toEqual(['keyword', 'SO-001'])

    wrapper.findComponent({ name: 'AInput' }).vm.$emit('pressEnter')
    expect(wrapper.emitted('search')).toHaveLength(1)

    const select = wrapper.findComponent({ name: 'ASelect' })
    select.vm.$emit('change', 'active')
    expect(wrapper.emitted('update-filter')?.[1]).toEqual(['status', 'active'])
    expect(wrapper.emitted('filter-change')).toHaveLength(1)

    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(3)
    await buttons[2].trigger('click')
    expect(wrapper.emitted('reset')).toHaveLength(1)

    const expandLink = wrapper.findAll('a').find((link) => link.text() === '展开')
    expect(expandLink).toBeDefined()
    await expandLink!.trigger('click')
    expect(wrapper.emitted('update:expanded')?.[0]).toEqual([true])
  })
})
