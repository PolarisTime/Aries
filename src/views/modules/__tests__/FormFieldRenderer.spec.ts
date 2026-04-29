import dayjs from 'dayjs'
import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import FormFieldRenderer from '@/views/modules/components/FormFieldRenderer.vue'
import type { ModuleFormFieldDefinition } from '@/types/module-page'

const baseField: ModuleFormFieldDefinition = {
  key: 'customerName',
  label: '客户',
  type: 'input',
}

function mountRenderer(field: ModuleFormFieldDefinition = baseField) {
  return mount(FormFieldRenderer, {
    props: {
      field,
      fieldId: `editor-field-${field.key}`,
      form: {
        customerName: '客户甲',
        status: '草稿',
        roleNames: ['采购主管'],
        orderDate: '2026-04-28',
      },
      disabled: false,
      dateValue: dayjs('2026-04-28'),
      roleTreeField: false,
      checkedRoleNames: ['采购主管'],
      roleTreeData: [
        {
          title: '业务角色',
          key: 'role-type:业务角色',
          children: [{ title: '采购主管', key: '采购主管' }],
        },
      ],
      selectedRolePermissionLabels: ['采购主管'],
    },
    global: {
      plugins: [Antd],
    },
  })
}

describe('FormFieldRenderer', () => {
  it('emits field value updates for standard editor controls', async () => {
    const wrapper = mountRenderer()

    wrapper.findComponent({ name: 'AInput' }).vm.$emit('update:value', '客户乙')
    expect(wrapper.emitted('update-value')?.[0]).toEqual(['customerName', '客户乙'])

    await wrapper.setProps({
      field: {
        key: 'status',
        label: '状态',
        type: 'select',
        options: [{ label: '已审核', value: '已审核' }],
      },
      fieldId: 'editor-field-status',
    })
    wrapper.findComponent({ name: 'ASelect' }).vm.$emit('update:value', '已审核')
    expect(wrapper.emitted('update-value')?.[1]).toEqual(['status', '已审核'])

    await wrapper.setProps({
      field: {
        key: 'orderDate',
        label: '日期',
        type: 'date',
      },
      fieldId: 'editor-field-orderDate',
    })
    const nextDate = dayjs('2026-05-01')
    wrapper.findComponent({ name: 'ADatePicker' }).vm.$emit('change', nextDate)
    expect(wrapper.emitted('date-change')?.[0]).toEqual(['orderDate', nextDate])
  })

  it('renders role tree fields through the RBAC-specific branch', async () => {
    const wrapper = mountRenderer({
      key: 'roleNames',
      label: '角色',
      type: 'multiSelect',
    })
    await wrapper.setProps({
      roleTreeField: true,
      fieldId: 'editor-field-roleNames',
    })

    expect(wrapper.text()).toContain('已选 1 项')
    expect(wrapper.text()).toContain('自动汇总权限：采购主管')

    wrapper.findComponent({ name: 'ATree' }).vm.$emit('check', ['采购主管'])
    expect(wrapper.emitted('role-tree-check')?.[0]).toEqual([['采购主管']])
  })

  it('passes the current form to dynamic option resolvers', () => {
    const optionResolver = vi.fn((form) => [
      { label: `项目-${form.customerName}`, value: '项目A' },
    ])
    mountRenderer({
      key: 'projectName',
      label: '项目',
      type: 'select',
      options: optionResolver,
    })

    expect(optionResolver).toHaveBeenCalledWith(expect.objectContaining({ customerName: '客户甲' }))
  })
})
