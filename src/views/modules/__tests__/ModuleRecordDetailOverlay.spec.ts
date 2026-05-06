import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import ModuleRecordDetailOverlay from '@/views/modules/components/ModuleRecordDetailOverlay.vue'
import type { ModuleDetailField } from '@/types/module-page'

function mountOverlay(detailColumnCount?: number, detailFields?: ModuleDetailField[]) {
  return mount(ModuleRecordDetailOverlay, {
    props: {
      visible: true,
      title: '客户资料详情',
      detailFields: detailFields || [
        { label: '客户编码', key: 'customerCode' },
        { label: '客户名称', key: 'customerName' },
      ],
      detailColumnCount,
      activeRecord: {
        id: '1',
        customerCode: 'C001',
        customerName: '客户甲',
      },
      canPrintRecords: false,
      detailPrintLoading: false,
      shouldShowItemWeightSummary: true,
      shouldShowItemAmountSummary: false,
      itemWeightSummaryKey: 'weightTon',
      itemAmountSummaryKey: 'amount',
      detailTableColumns: [],
      detailTableScroll: {},
      canEditItemColumns: false,
      editorColumnSettingItems: [],
      getEditorColumnSettingItemClass: () => '',
      handleEditorColumnSettingDragStart: vi.fn(),
      handleEditorColumnSettingDragOver: vi.fn(),
      handleEditorColumnSettingDrop: vi.fn(),
      resetEditorColumnSettingDragState: vi.fn(),
      handleEditorColumnVisibleChange: vi.fn(),
      resetEditorColumnSettings: vi.fn(),
      statusMap: {},
    },
    global: {
      plugins: [Antd],
    },
  })
}

describe('ModuleRecordDetailOverlay', () => {
  it('renders four columns when configured', () => {
    const wrapper = mountOverlay(4)

    expect(wrapper.findComponent({ name: 'ACol' }).props('lg')).toBe(6)
  })

  it('keeps the default detail layout at three columns', () => {
    const wrapper = mountOverlay()

    expect(wrapper.findComponent({ name: 'ACol' }).props('lg')).toBe(8)
  })

  it('groups detail fields by row and expands full-row fields', () => {
    const wrapper = mountOverlay(4, [
      { label: '客户编码', key: 'customerCode', row: 1 },
      { label: '客户名称', key: 'customerName', row: 1 },
      { label: '备注', key: 'remark', row: 2, fullRow: true },
    ])

    const rows = wrapper.findAll('.bill-detail-row')
    const cols = wrapper.findAll('.bill-detail-row > .ant-col')

    expect(rows).toHaveLength(2)
    expect(cols).toHaveLength(3)
    expect(cols.map((col) => col.classes().find((name) => name.startsWith('ant-col-lg-')))).toEqual([
      'ant-col-lg-6',
      'ant-col-lg-6',
      'ant-col-lg-24',
    ])
  })
})
