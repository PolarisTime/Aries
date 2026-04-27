import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import { createPinia, setActivePinia } from 'pinia'
import { usePermissionStore } from '@/stores/permission'
import PrintTemplateView from '@/views/system/PrintTemplateView.vue'

const printTemplateApiMocks = vi.hoisted(() => ({
  listPrintTemplates: vi.fn(),
  savePrintTemplate: vi.fn(),
  deletePrintTemplate: vi.fn(),
}))

vi.mock('@/api/print-template', () => ({
  listPrintTemplates: printTemplateApiMocks.listPrintTemplates,
  savePrintTemplate: printTemplateApiMocks.savePrintTemplate,
  deletePrintTemplate: printTemplateApiMocks.deletePrintTemplate,
}))

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function getNormalizedText(value: string) {
  return value.replace(/\s+/g, '')
}

function getButtonTexts(wrapper: ReturnType<typeof mount>) {
  return wrapper
    .findAll('button')
    .map((button) => getNormalizedText(button.text()))
    .filter(Boolean)
}

const mountedWrappers = new Set<ReturnType<typeof mount>>()

function mountWithPermissions(actions: string[]) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const permissionStore = usePermissionStore()
  permissionStore.setPermissions([{ resource: 'print-template', actions }])

  const wrapper = mount(PrintTemplateView, {
    global: {
      plugins: [Antd, pinia],
    },
  })
  mountedWrappers.add(wrapper)
  return wrapper
}

describe('PrintTemplateView', () => {
  beforeEach(() => {
    printTemplateApiMocks.listPrintTemplates.mockReset()
    printTemplateApiMocks.savePrintTemplate.mockReset()
    printTemplateApiMocks.deletePrintTemplate.mockReset()
    printTemplateApiMocks.listPrintTemplates.mockResolvedValue({
      code: 0,
      data: [
        {
          id: 'template-1',
          billType: 'purchase-orders',
          templateName: '采购模板',
          templateHtml: '<div />',
          isDefault: '1',
          updateTime: '2026-04-25 10:00:00',
        },
      ],
    })
  })

  afterEach(() => {
    mountedWrappers.forEach((wrapper) => wrapper.unmount())
    mountedWrappers.clear()
  })

  it('hides mutating actions when the user only has view permission', async () => {
    const wrapper = mountWithPermissions(['read'])
    await flushPromises()

    const buttonTexts = getButtonTexts(wrapper)

    expect(buttonTexts).not.toContain('新增模板')
    expect(buttonTexts).not.toContain('上传模板')
    expect(buttonTexts).not.toContain('保存模板')
    expect(buttonTexts).not.toContain('编辑')
    expect(buttonTexts).not.toContain('删除')
    expect(buttonTexts).toContain('刷新')
    expect(wrapper.text()).toContain('实时预览')
    expect(wrapper.text()).toContain('变量与语法')
  })

  it('shows mutating actions when the user has full template permissions', async () => {
    const wrapper = mountWithPermissions(['read', 'create', 'update', 'delete'])
    await flushPromises()

    const buttonTexts = getButtonTexts(wrapper)

    expect(buttonTexts).toContain('新增模板')
    expect(buttonTexts).toContain('上传模板')
    expect(buttonTexts).toContain('保存模板')
    expect(buttonTexts).toContain('编辑')
    expect(buttonTexts).toContain('删除')
    expect(buttonTexts).toContain('使用骨架')
    expect(buttonTexts).toContain('复制当前')
  })

  it('renders preview data and syntax snippets for the selected bill type', async () => {
    printTemplateApiMocks.listPrintTemplates.mockResolvedValueOnce({
      code: 0,
      data: [],
    })
    const wrapper = mountWithPermissions(['read', 'create', 'update', 'delete'])
    await flushPromises()

    const editor = wrapper.find('textarea')

    expect((editor.element as HTMLTextAreaElement).value).toContain(
      '采购订单打印单',
    )
    expect(wrapper.text()).toContain('模板片段')
    expect(wrapper.text()).toContain('条件块')
    expect(wrapper.text()).toContain('{{orderNo}}')
  })

  it('renders preview iframe in sandbox mode', async () => {
    const wrapper = mountWithPermissions(['read', 'create', 'update', 'delete'])
    await flushPromises()

    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('sandbox')).toBe('')
    expect(iframe.attributes('referrerpolicy')).toBe('no-referrer')
  })
})
