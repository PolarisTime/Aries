import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import ModuleRecordDetailOverlay from '@/views/modules/components/ModuleRecordDetailOverlay.vue'

function mountOverlay(detailColumnCount?: number) {
  return mount(ModuleRecordDetailOverlay, {
    props: {
      visible: true,
      title: '客户资料详情',
      detailFields: [
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
      shouldShowItemAmountSummary: false,
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
})
