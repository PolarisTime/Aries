import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ModuleSelectionOverlay from '@/views/modules/components/ModuleSelectionOverlay.vue'

function mountOverlay(scroll?: Record<string, unknown>) {
  return mount(ModuleSelectionOverlay, {
    props: {
      visible: true,
      title: '选择商品',
      panelTitle: '商品列表',
      rows: [
        { id: '1', materialCode: 'M-001' },
        { id: '2', materialCode: 'M-002' },
      ],
      columns: [
        { id: 'materialCode', accessorKey: 'materialCode', header: () => '商品编码' },
      ],
      rowSelection: {
        selectedRowKeys: [],
        onChange: () => {},
      },
      scroll,
      emptyDescription: '暂无可选商品',
      rowKey: 'materialCode',
    },
    global: {
      plugins: [Antd],
      stubs: {
        DataTable: {
          name: 'DataTable',
          props: ['table', 'size', 'loading', 'scrollX', 'scrollY', 'emptyText', 'rowProps'],
          template: '<div class="data-table-stub" />',
        },
      },
    },
  })
}

describe('ModuleSelectionOverlay', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('passes horizontal and default vertical scroll to the data table', () => {
    const wrapper = mountOverlay({ x: 900 })
    const table = wrapper.findComponent({ name: 'DataTable' })

    expect(table.props('scrollX')).toBe(900)
    expect(table.props('scrollY')).toBe('var(--app-selection-scroll-y)')
  })

  it('respects an explicit vertical scroll value', () => {
    const wrapper = mountOverlay({ x: 900, y: 360 })
    const table = wrapper.findComponent({ name: 'DataTable' })

    expect(table.props('scrollY')).toBe(360)
  })

  it('updates selection from row clicks and keeps custom double-click handlers', async () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    const onClick = vi.fn()
    const onDblclick = vi.fn()
    const rows = [
      { id: '1', materialCode: 'M-001' },
      { id: '2', materialCode: 'M-002' },
    ]
    const wrapper = mount(ModuleSelectionOverlay, {
      props: {
        visible: true,
        title: '选择商品',
        panelTitle: '商品列表',
        rows,
        columns: [
          { id: 'materialCode', accessorKey: 'materialCode', header: () => '商品编码' },
        ],
        rowSelection: {
          type: 'radio',
          selectedRowKeys: [],
          onChange,
        },
        customRow: (record: { materialCode: string }) => ({
          onClick: () => onClick(record.materialCode),
          onDblclick: () => onDblclick(record.materialCode),
        }),
        emptyDescription: '暂无可选商品',
        rowKey: 'materialCode',
      },
      global: {
        plugins: [Antd],
      },
    })

    const tableRows = wrapper.findAll('tbody tr.leo-data-table-row')
    await tableRows[1].trigger('click')
    await vi.advanceTimersByTimeAsync(220)
    expect(onChange).toHaveBeenCalledWith(['M-002'], [rows[1]])
    expect(onClick).toHaveBeenCalledWith('M-002')

    await tableRows[1].trigger('dblclick')
    expect(onDblclick).toHaveBeenCalledWith('M-002')
  })

  it('emits remote pagination updates when pagination is enabled', async () => {
    const wrapper = mount(ModuleSelectionOverlay, {
      props: {
        visible: true,
        title: '选择单据',
        panelTitle: '单据列表',
        rows: [{ id: '1', materialCode: 'M-001' }],
        columns: [
          { id: 'materialCode', accessorKey: 'materialCode', header: () => '商品编码' },
        ],
        emptyDescription: '暂无数据',
        paginationState: {
          current: 2,
          pageSize: 20,
          total: 35,
          showSizeChanger: true,
        },
      },
      global: {
        plugins: [Antd],
        stubs: {
          DataTable: {
            name: 'DataTable',
            props: ['table', 'size', 'loading', 'scrollX', 'scrollY', 'emptyText', 'rowProps'],
            template: '<div class="data-table-stub" />',
          },
        },
      },
    })

    const pagination = wrapper.findComponent({ name: 'APagination' })
    pagination.vm.$emit('change', 3, 20)
    pagination.vm.$emit('showSizeChange', 1, 50)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:paginationCurrent')).toEqual([[3], [1]])
    expect(wrapper.emitted('update:paginationPageSize')).toEqual([[50]])
  })
})
