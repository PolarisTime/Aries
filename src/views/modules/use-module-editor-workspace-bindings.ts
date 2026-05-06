import { computed, type Ref } from 'vue'
import type { Dayjs } from 'dayjs'
import type { StatusMeta } from '@/composables/use-module-display-support'
import type {
  ModuleColumnDefinition,
  ModuleFormFieldDefinition,
  ModuleLineItem,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'

type SettingItem = { key: string; title: string; visible: boolean }
type TableColumn = Record<string, unknown>
type TableScroll = Record<string, unknown>
type RoleTreeNode = {
  title: string
  key: string
  children?: RoleTreeNode[]
}
type RoleTreeCheckedKeys =
  | Array<string | number>
  | { checked: Array<string | number>; halfChecked?: Array<string | number> }
type FilterOption = { label?: unknown }

interface UseModuleEditorWorkspaceBindingsOptions {
  visible: Ref<boolean>
  title: Ref<string>
  moduleKey: Ref<string>
  editorForm: Record<string, unknown>
  canEditFormFields: Ref<boolean>
  itemColumns: Ref<ModuleColumnDefinition[] | undefined>
  visibleFormFields: Ref<ModuleFormFieldDefinition[]>
  systemHelperVisible: Ref<boolean>
  systemHelperTitle: Ref<string>
  checkedRoleNames: Ref<string[]>
  selectedRolePermissionLabels: Ref<string[]>
  roleTreeData: Ref<RoleTreeNode[]>
  canSaveCurrentEditor: Ref<boolean>
  canSaveAndAuditCurrentEditor: Ref<boolean>
  editorSaving: Ref<boolean>
  formFieldSettingItems: Ref<SettingItem[]>
  getFormFieldSettingItemClass: (key: string) => string
  handleFormFieldSettingDragStart: (key: string, event: DragEvent) => void
  handleFormFieldSettingDragOver: (key: string, event: DragEvent) => void
  handleFormFieldSettingDrop: (key: string) => void
  resetFormFieldSettingDragState: () => void
  handleFormFieldVisibleChange: (key: string, checked: boolean) => void
  resetFormFieldSettings: () => void
  isEditorFieldDisabled: (field: ModuleFormFieldDefinition) => boolean
  getEditorDateValue: (key: string) => Dayjs | undefined
  isRoleTreeField: (field: ModuleFormFieldDefinition) => boolean
  parentImportConfig: Ref<ModuleParentImportDefinition | undefined>
  canManageEditorItems: Ref<boolean>
  canAddManualEditorItems: Ref<boolean>
  canEditItemColumns: Ref<boolean>
  editorColumnSettingItems: Ref<SettingItem[]>
  getEditorColumnSettingItemClass: (key: string) => string
  handleEditorColumnSettingDragStart: (key: string, event: DragEvent) => void
  handleEditorColumnSettingDragOver: (key: string, event: DragEvent) => void
  handleEditorColumnSettingDrop: (key: string) => void
  resetEditorColumnSettingDragState: () => void
  handleEditorColumnVisibleChange: (key: string, checked: boolean) => void
  resetEditorColumnSettings: () => void
  editorItems: Ref<ModuleLineItem[]>
  editorItemWeightTotal: Ref<number>
  editorItemAmountTotal: Ref<number>
  shouldShowItemWeightSummary: Ref<boolean>
  shouldShowItemAmountSummary: Ref<boolean>
  lockedLineItemsNotice: Ref<string>
  editorDetailTableColumns: Ref<TableColumn[]>
  editorDetailTableScroll: Ref<TableScroll>
  getEditorItemRowProps: (record: ModuleLineItem) => Record<string, unknown>
  getEditorItemRowClassName: (record: ModuleLineItem) => string
  isEditorItemColumnEditable: (columnKey: string, record?: ModuleLineItem) => boolean
  isNumberEditorColumn: (columnKey: string) => boolean
  getEditorItemMin: (columnKey: string) => number | undefined
  getEditorItemPrecision: (columnKey: string) => number
  materialRows: Ref<ModuleRecord[]>
  warehouseRows: Ref<ModuleRecord[]>
  filterMaterialOption: (input: string, option: FilterOption | undefined) => boolean
  formatWeight: (value: unknown) => string
  formatAmount: (value: unknown) => string
  formatCellValue: (column: ModuleColumnDefinition | undefined, value: unknown) => string
  getStatusMeta: (value: unknown) => StatusMeta
  closeEditor: () => void
  handleSaveEditor: (audit: boolean) => void | Promise<void>
  setEditorFormValue: (key: string, value: unknown) => void
  handleEditorDateValueChange: (key: string, value: unknown) => void
  handleRoleTreeCheckChange: (checkedKeys: RoleTreeCheckedKeys) => void
  addEditorItem: () => void
  openParentSelector: () => void
  handleEditorItemDragStart: (itemId: string, event: DragEvent) => void
  handleEditorItemDragEnd: () => void
  removeEditorItem: (itemId: string) => void
  removeSelectedEditorItems: () => void
  handleEditorItemMaterialSelect: (item: ModuleLineItem, value: unknown) => void
  openMaterialSelector: (item: ModuleLineItem) => void
  handleEditorItemValueChange: (item: ModuleLineItem, key: string, value: unknown) => void
  handleEditorItemNumberChange: (item: ModuleLineItem, key: string, value: unknown) => void
  handleEditorItemInputChange: (item: ModuleLineItem, key: string, event: Event) => void
}

export function useModuleEditorWorkspaceBindings(options: UseModuleEditorWorkspaceBindingsOptions) {
  const editorWorkspaceProps = computed(() => ({
    visible: options.visible.value,
    title: options.title.value,
    moduleKey: options.moduleKey.value,
    editorForm: options.editorForm,
    canEditFormFields: options.canEditFormFields.value,
    itemColumns: options.itemColumns.value,
    visibleFormFields: options.visibleFormFields.value,
    systemHelperVisible: options.systemHelperVisible.value,
    systemHelperTitle: options.systemHelperTitle.value,
    checkedRoleNames: options.checkedRoleNames.value,
    selectedRolePermissionLabels: options.selectedRolePermissionLabels.value,
    roleTreeData: options.roleTreeData.value,
    canSaveCurrentEditor: options.canSaveCurrentEditor.value,
    canSaveAndAuditCurrentEditor: options.canSaveAndAuditCurrentEditor.value,
    editorSaving: options.editorSaving.value,
    formFieldSettingItems: options.formFieldSettingItems.value,
    getFormFieldSettingItemClass: options.getFormFieldSettingItemClass,
    handleFormFieldSettingDragStart: options.handleFormFieldSettingDragStart,
    handleFormFieldSettingDragOver: options.handleFormFieldSettingDragOver,
    handleFormFieldSettingDrop: options.handleFormFieldSettingDrop,
    resetFormFieldSettingDragState: options.resetFormFieldSettingDragState,
    handleFormFieldVisibleChange: options.handleFormFieldVisibleChange,
    resetFormFieldSettings: options.resetFormFieldSettings,
    isEditorFieldDisabled: options.isEditorFieldDisabled,
    getEditorDateValue: options.getEditorDateValue,
    isRoleTreeField: options.isRoleTreeField,
    parentImportConfig: options.parentImportConfig.value,
    canManageEditorItems: options.canManageEditorItems.value,
    canAddManualEditorItems: options.canAddManualEditorItems.value,
    canEditItemColumns: options.canEditItemColumns.value,
    editorColumnSettingItems: options.editorColumnSettingItems.value,
    getEditorColumnSettingItemClass: options.getEditorColumnSettingItemClass,
    handleEditorColumnSettingDragStart: options.handleEditorColumnSettingDragStart,
    handleEditorColumnSettingDragOver: options.handleEditorColumnSettingDragOver,
    handleEditorColumnSettingDrop: options.handleEditorColumnSettingDrop,
    resetEditorColumnSettingDragState: options.resetEditorColumnSettingDragState,
    handleEditorColumnVisibleChange: options.handleEditorColumnVisibleChange,
    resetEditorColumnSettings: options.resetEditorColumnSettings,
    editorItems: options.editorItems.value,
    editorItemWeightTotal: options.editorItemWeightTotal.value,
    editorItemAmountTotal: options.editorItemAmountTotal.value,
    shouldShowItemWeightSummary: options.shouldShowItemWeightSummary.value,
    shouldShowItemAmountSummary: options.shouldShowItemAmountSummary.value,
    lockedLineItemsNotice: options.lockedLineItemsNotice.value,
    editorDetailTableColumns: options.editorDetailTableColumns.value,
    editorDetailTableScroll: options.editorDetailTableScroll.value,
    getEditorItemRowProps: options.getEditorItemRowProps,
    getEditorItemRowClassName: options.getEditorItemRowClassName,
    isEditorItemColumnEditable: options.isEditorItemColumnEditable,
    isNumberEditorColumn: options.isNumberEditorColumn,
    getEditorItemMin: options.getEditorItemMin,
    getEditorItemPrecision: options.getEditorItemPrecision,
    materialRows: options.materialRows.value,
    warehouseRows: options.warehouseRows.value,
    filterMaterialOption: options.filterMaterialOption,
    formatWeight: options.formatWeight,
    formatAmount: options.formatAmount,
    formatCellValue: options.formatCellValue,
    getStatusMeta: options.getStatusMeta,
  }))

  const editorWorkspaceEvents = {
    cancel: options.closeEditor,
    save: options.handleSaveEditor,
    'update-form-value': options.setEditorFormValue,
    'date-change': options.handleEditorDateValueChange,
    'role-tree-check': options.handleRoleTreeCheckChange,
    'add-editor-item': options.addEditorItem,
    'open-parent-selector': options.openParentSelector,
    'editor-item-drag-start': options.handleEditorItemDragStart,
    'editor-item-drag-end': options.handleEditorItemDragEnd,
    'remove-editor-item': options.removeEditorItem,
    'remove-selected-items': options.removeSelectedEditorItems,
    'editor-item-material-select': options.handleEditorItemMaterialSelect,
    'open-material-selector': options.openMaterialSelector,
    'editor-item-value-change': options.handleEditorItemValueChange,
    'editor-item-number-change': options.handleEditorItemNumberChange,
    'editor-item-input-change': options.handleEditorItemInputChange,
  }

  return {
    editorWorkspaceEvents,
    editorWorkspaceProps,
  }
}
