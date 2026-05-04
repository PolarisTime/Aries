import { ref } from 'vue'
import { useModuleEditorEntry } from '@/views/modules/use-module-editor-entry'

const carrierOptionMocks = vi.hoisted(() => ({
  getCarrierVehiclePlateOptions: vi.fn(),
}))

vi.mock('@/api/carrier-options', () => ({
  getCarrierVehiclePlateOptions: carrierOptionMocks.getCarrierVehiclePlateOptions,
}))

vi.mock('@/api/customer-options', () => ({
  findCustomerOption: vi.fn(),
  resolveSingleCustomerProjectName: vi.fn(),
}))

vi.mock('ant-design-vue', () => ({
  message: {
    warning: vi.fn(),
  },
}))

function createEditorEntry(editorForm: Record<string, unknown>) {
  return useModuleEditorEntry({
    moduleKey: ref('freight-bills'),
    editorForm,
    editorMode: ref('create'),
    editorVisible: ref(false),
    editorSourceRecordId: ref(''),
    formFields: ref([]),
    canEditRecords: ref(true),
    canSaveCurrentEditor: ref(true),
    canEditLineItems: ref(true),
    lineItemsLocked: ref(false),
    isReadOnly: ref(false),
    handleView: vi.fn(),
    resolveRecordForDetail: vi.fn(),
    resetParentImportState: vi.fn(),
    buildEditorDraft: vi.fn(() => ({})),
    syncSystemEditorState: vi.fn(),
  })
}

describe('useModuleEditorEntry', () => {
  beforeEach(() => {
    carrierOptionMocks.getCarrierVehiclePlateOptions.mockReset()
  })

  it('auto fills freight bill vehicle plate when carrier has one plate and current value is blank', () => {
    const editorForm = { carrierName: '', vehiclePlate: '' }
    const { setEditorFormValue } = createEditorEntry(editorForm)

    carrierOptionMocks.getCarrierVehiclePlateOptions.mockReturnValue([
      { label: '苏A12345', value: '苏A12345' },
    ])

    setEditorFormValue('carrierName', '物流甲')

    expect(editorForm).toMatchObject({
      carrierName: '物流甲',
      vehiclePlate: '苏A12345',
    })
  })

  it('keeps a manual freight bill vehicle plate when carrier changes', () => {
    const editorForm = { carrierName: '', vehiclePlate: '苏A00000' }
    const { setEditorFormValue } = createEditorEntry(editorForm)

    carrierOptionMocks.getCarrierVehiclePlateOptions.mockReturnValue([
      { label: '苏A12345', value: '苏A12345' },
    ])

    setEditorFormValue('carrierName', '物流甲')

    expect(editorForm.vehiclePlate).toBe('苏A00000')
  })

  it('keeps an existing freight bill vehicle plate when it still belongs to the carrier', () => {
    const editorForm = { carrierName: '', vehiclePlate: '苏A12345' }
    const { setEditorFormValue } = createEditorEntry(editorForm)

    carrierOptionMocks.getCarrierVehiclePlateOptions.mockReturnValue([
      { label: '苏A12345', value: '苏A12345' },
      { label: '苏A67890', value: '苏A67890' },
    ])

    setEditorFormValue('carrierName', '物流甲')

    expect(editorForm.vehiclePlate).toBe('苏A12345')
  })
})
