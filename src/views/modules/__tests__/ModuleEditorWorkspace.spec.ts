import dayjs from 'dayjs'
import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import ModuleEditorWorkspace from '@/views/modules/components/ModuleEditorWorkspace.vue'
import EditorFooterActions from '@/views/modules/components/EditorFooterActions.vue'
import FormFieldRenderer from '@/views/modules/components/FormFieldRenderer.vue'
import type {
  ModuleColumnDefinition,
  ModuleFormFieldDefinition,
  ModuleLineItem,
  ModuleRecord,
} from '@/types/module-page'

const formFields: ModuleFormFieldDefinition[] = [
  {
    key: 'customerName',
    label: '客户',
    type: 'input',
  },
]

const itemColumns: ModuleColumnDefinition[] = [
  {
    title: '商品编码',
    dataIndex: 'materialCode',
  },
]

const editorItems: ModuleLineItem[] = [
  {
    id: 'item-1',
    materialCode: 'M-001',
  },
]

function noop() {}

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    visible: true,
    title: '销售订单编辑',
    moduleKey: 'sales-orders',
    editorForm: {
      customerName: '客户甲',
    },
    canEditFormFields: true,
    itemColumns: undefined,
    visibleFormFields: formFields,
    systemHelperVisible: false,
    systemHelperTitle: '',
    checkedRoleNames: [],
    selectedRolePermissionLabels: [],
    roleTreeData: [],
    canSaveCurrentEditor: true,
    canSaveAndAuditCurrentEditor: true,
    editorSaving: false,
    formFieldSettingItems: [{ key: 'customerName', title: '客户', visible: true }],
    getFormFieldSettingItemClass: () => '',
    handleFormFieldSettingDragStart: noop,
    handleFormFieldSettingDragOver: noop,
    handleFormFieldSettingDrop: noop,
    resetFormFieldSettingDragState: noop,
    handleFormFieldVisibleChange: noop,
    resetFormFieldSettings: noop,
    isEditorFieldDisabled: () => false,
    getEditorDateValue: () => dayjs('2026-04-28'),
    isRoleTreeField: () => false,
    parentImportConfig: undefined,
    canManageEditorItems: true,
    canAddManualEditorItems: true,
    canEditItemColumns: true,
    editorColumnSettingItems: [{ key: 'materialCode', title: '商品编码', visible: true }],
    getEditorColumnSettingItemClass: () => '',
    handleEditorColumnSettingDragStart: noop,
    handleEditorColumnSettingDragOver: noop,
    handleEditorColumnSettingDrop: noop,
    resetEditorColumnSettingDragState: noop,
    handleEditorColumnVisibleChange: noop,
    resetEditorColumnSettings: noop,
    editorItems,
    editorItemWeightTotal: 1.25,
    editorItemAmountTotal: 128,
    shouldShowItemWeightSummary: true,
    shouldShowItemAmountSummary: false,
    lockedLineItemsNotice: '',
    editorDetailTableColumns: [
      { title: '操作', dataIndex: 'editorAction', key: 'editorAction', align: 'center' as const },
      { title: '商品编码', dataIndex: 'materialCode', key: 'materialCode' },
    ],
    editorDetailTableScroll: { x: 240 },
    getEditorItemRowProps: () => ({}),
    getEditorItemRowClassName: () => '',
    isEditorItemColumnEditable: () => false,
    isNumberEditorColumn: () => false,
    getEditorItemMin: () => undefined,
    getEditorItemPrecision: () => 0,
    materialRows: [] as ModuleRecord[],
    warehouseRows: [] as ModuleRecord[],
    filterMaterialOption: () => true,
    formatWeight: (value: unknown) => String(value),
    formatAmount: (value: unknown) => String(value),
    formatCellValue: (_column: ModuleColumnDefinition | undefined, value: unknown) => String(value || '--'),
    getStatusMeta: (value: unknown) => ({ text: String(value || '--'), color: 'default' as const }),
    ...overrides,
  }
}

function mountWorkspace(overrides: Record<string, unknown> = {}) {
  return mount(ModuleEditorWorkspace, {
    props: baseProps(overrides),
    global: {
      plugins: [Antd],
    },
  })
}

describe('ModuleEditorWorkspace', () => {
  it('renders the form workspace and forwards form/footer events', async () => {
    const wrapper = mountWorkspace()

    expect(wrapper.text()).toContain('销售订单编辑')
    expect(wrapper.text()).toContain('单据信息')

    wrapper.findComponent(FormFieldRenderer).vm.$emit('update-value', 'customerName', '客户乙')
    expect(wrapper.emitted('update-form-value')?.[0]).toEqual(['customerName', '客户乙'])

    wrapper.findComponent(FormFieldRenderer).vm.$emit('date-change', 'orderDate', null)
    expect(wrapper.emitted('date-change')?.[0]).toEqual(['orderDate', null])

    wrapper.findComponent(EditorFooterActions).vm.$emit('save', true)
    expect(wrapper.emitted('save')?.[0]).toEqual([true])

    wrapper.findComponent(EditorFooterActions).vm.$emit('cancel')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('groups form fields by row and expands full-row fields', () => {
    const wrapper = mountWorkspace({
      visibleFormFields: [
        { key: 'customerName', label: '客户', type: 'input', row: 1 },
        { key: 'orderNo', label: '订单编号', type: 'input', row: 1 },
        { key: 'remark', label: '备注', type: 'input', row: 2, fullRow: true },
      ],
    })

    const formRows = wrapper.findAll('.editor-form-row')
    const cols = wrapper.findAll('.editor-form-row > .ant-col')

    expect(formRows).toHaveLength(2)
    expect(cols).toHaveLength(3)
    expect(cols.map((col) => col.classes().find((name) => name.startsWith('ant-col-lg-')))).toEqual([
      'ant-col-lg-6',
      'ant-col-lg-6',
      'ant-col-lg-24',
    ])
  })

  it('renders item actions when line items are enabled', async () => {
    const wrapper = mountWorkspace({
      itemColumns,
      parentImportConfig: {
        parentModuleKey: 'purchase-orders',
        label: '采购订单',
        parentFieldKey: 'purchaseOrderNo',
        parentDisplayFieldKey: 'orderNo',
        buttonText: '选择采购订单',
      },
    })

    expect(wrapper.text()).toContain('明细列表')
    expect(wrapper.text()).toContain('选择采购订单')

    const addButton = wrapper.findAll('button').find((button) => button.text() === '新增明细')
    expect(addButton).toBeDefined()
    await addButton!.trigger('click')
    expect(wrapper.emitted('add-editor-item')).toHaveLength(1)

    const importButton = wrapper.findAll('button').find((button) => button.text() === '选择采购订单')
    expect(importButton).toBeDefined()
    await importButton!.trigger('click')
    expect(wrapper.emitted('open-parent-selector')).toHaveLength(1)
  })
})
