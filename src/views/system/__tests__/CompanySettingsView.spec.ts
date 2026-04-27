import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import { createPinia, setActivePinia } from 'pinia'
import { usePermissionStore } from '@/stores/permission'
import CompanySettingsView from '@/views/system/CompanySettingsView.vue'

const companyApiMocks = vi.hoisted(() => ({
  getCompanySettingProfile: vi.fn(),
  saveCompanySettingProfile: vi.fn(),
}))

vi.mock('@/api/company-settings', () => ({
  getCompanySettingProfile: companyApiMocks.getCompanySettingProfile,
  saveCompanySettingProfile: companyApiMocks.saveCompanySettingProfile,
}))

vi.mock('@/api/client', () => ({
  isHandledRequestError: () => false,
}))

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function getNormalizedText(value: string) {
  return value.replace(/\s+/g, '')
}

function mountWithPermissions(actions: string[]) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const permissionStore = usePermissionStore()
  permissionStore.setPermissions([{ resource: 'company-setting', actions }])

  return mount(CompanySettingsView, {
    global: {
      plugins: [Antd, pinia],
    },
  })
}

describe('CompanySettingsView', () => {
  beforeEach(() => {
    companyApiMocks.getCompanySettingProfile.mockReset()
    companyApiMocks.saveCompanySettingProfile.mockReset()
    companyApiMocks.getCompanySettingProfile.mockResolvedValue({
      id: '1',
      companyName: '测试公司',
      taxNo: '91370000123456789A',
      settlementAccounts: [
        {
          id: '11',
          accountName: '基本户',
          bankName: '中国银行',
          bankAccount: '6222000000000000',
          usageType: '通用',
          status: '正常',
          remark: '',
        },
      ],
      status: '正常',
      remark: '备注',
    })
  })

  it('does not show save button when user only has create permission', async () => {
    const wrapper = mountWithPermissions(['read', 'create'])
    await flushPromises()

    const text = getNormalizedText(wrapper.text())
    const buttonTexts = wrapper.findAll('button').map((button) => getNormalizedText(button.text()))

    expect(text).toContain('公司信息')
    expect(buttonTexts).not.toContain('保存')
  })

  it('shows save button when user has edit permission', async () => {
    const wrapper = mountWithPermissions(['read', 'update'])
    await flushPromises()

    const buttonTexts = wrapper.findAll('button').map((button) => getNormalizedText(button.text()))

    expect(buttonTexts).toContain('保存')
  })
})
