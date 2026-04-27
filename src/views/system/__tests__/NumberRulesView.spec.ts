import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import { createPinia, setActivePinia } from 'pinia'
import NumberRulesView from '@/views/system/NumberRulesView.vue'
import { usePermissionStore } from '@/stores/permission'

const businessMocks = vi.hoisted(() => ({
  listAllBusinessModuleRows: vi.fn(),
  getPageUploadRule: vi.fn(),
  saveBusinessModule: vi.fn(),
  updatePageUploadRule: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  isHandledRequestError: () => false,
}))

vi.mock('@/api/business', () => ({
  listAllBusinessModuleRows: businessMocks.listAllBusinessModuleRows,
  getPageUploadRule: businessMocks.getPageUploadRule,
  saveBusinessModule: businessMocks.saveBusinessModule,
  updatePageUploadRule: businessMocks.updatePageUploadRule,
}))

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function mountPage() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const permissionStore = usePermissionStore()
  permissionStore.setPermissions([{ resource: 'general-setting', actions: ['read', 'update'] }])

  return mount(NumberRulesView, {
    global: {
      plugins: [Antd, pinia],
    },
  })
}

describe('NumberRulesView', () => {
  beforeEach(() => {
    businessMocks.getPageUploadRule.mockReset()
    businessMocks.saveBusinessModule.mockReset()
    businessMocks.updatePageUploadRule.mockReset()
    businessMocks.listAllBusinessModuleRows.mockReset()
    businessMocks.listAllBusinessModuleRows.mockResolvedValue([
      {
        id: '1',
        settingCode: 'RULE_SO',
        settingName: '销售订单单号规则',
        billName: '销售订单',
        prefix: 'SO',
        dateRule: 'yyyy',
        serialLength: 6,
        resetRule: 'YEARLY',
        sampleNo: '2026SO000001',
        status: '正常',
        remark: '每年重置',
        ruleType: 'NO_RULE',
      },
      {
        id: '2',
        settingCode: 'PAGE_UPLOAD_SALES_ORDERS',
        settingName: '销售订单上传命名规则',
        billName: '销售订单',
        prefix: '{yyyyMMddHHmmss}_{random8}',
        sampleNo: 'upload_sales_order.pdf',
        status: '正常',
        remark: '启用后显示附件标志',
        ruleType: 'UPLOAD_RULE',
        moduleKey: 'sales-orders',
      },
    ])
  })

  it('renders number rules and upload rules after the page is split out', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const text = wrapper.text()

    expect(text).toContain('单号规则')
    expect(text).toContain('销售订单单号规则')
    expect(text).toContain('上传规则')
    expect(text).toContain('sales-orders')
    expect(text).toContain('upload_sales_order.pdf')
  })
})
