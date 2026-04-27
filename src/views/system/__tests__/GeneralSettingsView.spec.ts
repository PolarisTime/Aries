import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import { createPinia, setActivePinia } from 'pinia'
import GeneralSettingsView from '@/views/system/GeneralSettingsView.vue'
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

  const wrapper = mount(GeneralSettingsView, {
    attachTo: document.body,
    global: {
      plugins: [Antd, pinia],
    },
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

const mountedWrappers: VueWrapper[] = []

describe('GeneralSettingsView', () => {
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
        remark: '适用于销售订单页面上传',
        ruleType: 'UPLOAD_RULE',
        moduleKey: 'sales-orders',
      },
      {
        id: '3',
        settingCode: 'SYS_DEFAULT_TAX_RATE',
        settingName: '默认税率',
        billName: '发票税率',
        prefix: 'SYS',
        dateRule: 'yyyy',
        serialLength: 1,
        resetRule: 'YEARLY',
        sampleNo: '0.1300',
        status: '正常',
        remark: '用于发票默认税率与税额自动计算',
        ruleType: 'NO_RULE',
      },
      {
        id: '4',
        settingCode: 'UI_WEIGHT_ONLY_SALES_OUTBOUNDS',
        settingName: '销售出库重量视图开关',
        billName: '销售出库视图',
        status: '禁用',
        remark: '关闭后显示金额和单价',
        ruleType: 'NO_RULE',
      },
      {
        id: '5',
        settingCode: 'SYS_CUSTOMER_STATEMENT_RECEIPT_ZERO_FROM_SALES_ORDER',
        settingName: '客户对账单默认按销售订单金额收款为0',
        billName: '客户对账单生成',
        status: '正常',
        remark: '启用后默认收款金额为0，期末余额等于销售订单总金额',
        ruleType: 'NO_RULE',
      },
      {
        id: '6',
        settingCode: 'SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS',
        settingName: '页面操作详细日志',
        billName: '操作日志',
        prefix: 'SYS',
        dateRule: 'yyyy',
        serialLength: 1,
        resetRule: 'YEARLY',
        sampleNo: 'QUERY,DETAIL,EXPORT',
        status: '禁用',
        remark: '按勾选项记录页面操作',
        ruleType: 'NO_RULE',
      },
    ])
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
  })

  it('renders only system switches after rules were moved out', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const text = wrapper.text()

    expect(text).toContain('基础参数')
    expect(text).toContain('默认税率')
    expect(text).toContain('系统开关')
    expect(text).toContain('销售出库重量视图开关')
    expect(text).toContain('客户对账单默认按销售订单金额收款为0')
    expect(text).toContain('页面操作详细日志')
    expect(text).not.toContain('销售订单单号规则')
    expect(text).not.toContain('{yyyyMMddHHmmss}_{random8}')
  })

  it('saves selected detailed operation actions back to sampleNo', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const actionLinks = wrapper.findAll('button')
    const targetButton = actionLinks.find((button) =>
      button.text().includes('编辑') && button.element.closest('tr')?.textContent?.includes('页面操作详细日志'),
    )
    expect(targetButton).toBeDefined()

    await targetButton!.trigger('click')
    await flushPromises()

    const pageText = document.body.textContent || ''
    expect(pageText).toContain('记录动作')

    const checkboxGroup = wrapper.findAllComponents({ name: 'ACheckboxGroup' }).at(0)
    expect(checkboxGroup).toBeDefined()
    checkboxGroup!.vm.$emit('update:value', ['QUERY', 'DETAIL', 'PRINT'])
    await flushPromises()

    const switchComponent = wrapper.findComponent({ name: 'ASwitch' })
    switchComponent.vm.$emit('update:checked', true)
    await flushPromises()

    const modal = wrapper.findAllComponents({ name: 'AModal' }).at(0)
    expect(modal).toBeDefined()
    const onOk = modal!.props('onOk') as (() => void | Promise<void>) | undefined
    expect(onOk).toBeDefined()
    await onOk?.()
    await flushPromises()

    expect(businessMocks.saveBusinessModule).toHaveBeenCalledWith('general-settings', expect.objectContaining({
      id: '6',
      settingCode: 'SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS',
      sampleNo: 'QUERY,DETAIL,PRINT',
      status: '正常',
    }))
  })
})
