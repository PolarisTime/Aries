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
        settingCode: 'UI_DEFAULT_LIST_PAGE_SIZE',
        settingName: '列表分页默认条数',
        billName: '业务列表',
        prefix: 'UI',
        dateRule: 'yyyy',
        serialLength: 1,
        resetRule: 'YEARLY',
        sampleNo: '50',
        status: '正常',
        remark: '用于业务列表与远程候选弹窗的默认分页条数，范围 1 到 200。',
        ruleType: 'NO_RULE',
      },
      {
        id: '5',
        settingCode: 'UI_WEIGHT_ONLY_SALES_OUTBOUNDS',
        settingName: '销售出库重量视图开关',
        billName: '销售出库视图',
        status: '禁用',
        remark: '关闭后显示金额和单价',
        ruleType: 'NO_RULE',
      },
      {
        id: '6',
        settingCode: 'SYS_CUSTOMER_STATEMENT_RECEIPT_ZERO_FROM_SALES_ORDER',
        settingName: '销售订单默认未收款',
        billName: '销售订单收款情况',
        status: '正常',
        remark: '启用后，由销售订单生成客户对账单时默认按未收款处理；关闭后默认按已收款处理。',
        ruleType: 'NO_RULE',
      },
      {
        id: '7',
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
      {
        id: '8',
        settingCode: 'SYS_ADMIN_VIEW_DELETED_RECORDS',
        settingName: '管理员可查看已删除单据',
        billName: '业务列表',
        status: '正常',
        remark: '启用后，管理员在业务单据列表与详情中可查看已删除记录，仅用于排查与审计；关闭后已删除单据对所有人隐藏。',
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
    expect(text).toContain('列表分页默认条数')
    expect(text).toContain('系统开关')
    expect(text).toContain('销售出库重量视图开关')
    expect(text).toContain('销售订单默认未收款')
    expect(text).toContain('页面操作详细日志')
    expect(text).toContain('管理员可查看已删除单据')
    expect(text).not.toContain('销售订单单号规则')
    expect(text).not.toContain('{yyyyMMddHHmmss}_{random8}')
  })

  it('saves selected detailed operation actions back to sampleNo', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const actionLinks = wrapper.findAll('.table-action-btn')
    const targetButton = actionLinks.find((el) =>
      el.text().includes('编辑') && el.element.closest('tr')?.textContent?.includes('页面操作详细日志'),
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
      id: '7',
      settingCode: 'SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS',
      sampleNo: 'QUERY,DETAIL,PRINT',
      status: '正常',
    }))
  })

  it('saves default list page size as a bounded integer sampleNo', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const actionLinks = wrapper.findAll('.table-action-btn')
    const targetButton = actionLinks.find((el) =>
      el.text().includes('编辑') && el.element.closest('tr')?.textContent?.includes('列表分页默认条数'),
    )
    expect(targetButton).toBeDefined()

    await targetButton!.trigger('click')
    await flushPromises()

    const inputNumber = wrapper.findComponent({ name: 'AInputNumber' })
    expect(inputNumber).toBeDefined()
    inputNumber.vm.$emit('update:value', 80)
    await flushPromises()

    const modal = wrapper.findAllComponents({ name: 'AModal' }).at(0)
    const onOk = modal!.props('onOk') as (() => void | Promise<void>) | undefined
    await onOk?.()
    await flushPromises()

    expect(businessMocks.saveBusinessModule).toHaveBeenCalledWith('general-settings', expect.objectContaining({
      id: '4',
      settingCode: 'UI_DEFAULT_LIST_PAGE_SIZE',
      sampleNo: '80',
      status: '正常',
    }))
  })
})
