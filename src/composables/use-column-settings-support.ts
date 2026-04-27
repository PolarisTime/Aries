import { ref, type Ref } from 'vue'
import { message } from 'ant-design-vue'
import type {
  ListColumnSettings,
  ModuleFormFieldDefinition,
  ModulePageConfig,
} from '@/types/module-page'
import {
  clearListColumnSettings,
  getListColumnSettings,
  setListColumnSettings,
} from '@/utils/storage'

interface SettingItem {
  key: string
  title: string
  visible: boolean
}

interface UseColumnSettingsSupportOptions {
  moduleKey: Ref<string>
  config: Ref<ModulePageConfig>
  formFields: Ref<ModuleFormFieldDefinition[]>
}

type DragPosition = 'before' | 'after'

interface SettingGroup {
  items: Ref<SettingItem[]>
  draggedKey: Ref<string | undefined>
  dragOverKey: Ref<string | undefined>
  dragOverPosition: Ref<DragPosition>
}

function buildDefaultItemsFromColumns(columns: { dataIndex: string; title: string }[]) {
  return columns.map((column) => ({
    key: column.dataIndex,
    title: column.title,
    visible: column.dataIndex !== 'piecesPerBundle',
  }))
}

function buildDefaultItemsFromFormFields(fields: ModuleFormFieldDefinition[]) {
  return fields.map((field) => ({
    key: field.key,
    title: field.label,
    visible: true,
  }))
}

function applySavedSettings(defaults: SettingItem[], saved: ListColumnSettings | null) {
  if (!saved) {
    return defaults
  }

  const defaultMap = Object.fromEntries(defaults.map((item) => [item.key, item]))
  const orderedKeys = [
    ...saved.orderedKeys.filter((key) => defaultMap[key]),
    ...defaults.map((item) => item.key).filter((key) => !saved.orderedKeys.includes(key)),
  ]
  const hiddenSet = new Set(saved.hiddenKeys.filter((key) => defaultMap[key]))

  return orderedKeys.map((key) => ({
    ...defaultMap[key],
    visible: !hiddenSet.has(key),
  }))
}

function persistSettings(storageKey: string, items: SettingItem[]) {
  setListColumnSettings(storageKey, {
    orderedKeys: items.map((item) => item.key),
    hiddenKeys: items.filter((item) => !item.visible).map((item) => item.key),
  })
}

function handleVisibleChange(items: SettingItem[], key: string, checked: boolean) {
  const visibleCount = items.filter((item) => item.visible).length
  const target = items.find((item) => item.key === key)
  if (!target) {
    return items
  }

  if (!checked && target.visible && visibleCount === 1) {
    message.warning('至少保留一列显示')
    return items
  }

  return items.map((item) => (item.key === key ? { ...item, visible: checked } : item))
}

function reorderItems(items: SettingItem[], sourceKey: string, targetKey: string, position: DragPosition) {
  if (sourceKey === targetKey) {
    return items
  }

  const sourceItem = items.find((item) => item.key === sourceKey)
  if (!sourceItem) {
    return items
  }

  const nextItems = items.filter((item) => item.key !== sourceKey)
  const targetIndex = nextItems.findIndex((item) => item.key === targetKey)
  if (targetIndex < 0) {
    return items
  }

  const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
  nextItems.splice(insertIndex, 0, sourceItem)
  return nextItems
}

function getItemClass(
  key: string,
  draggedKey: string | undefined,
  dragOverKey: string | undefined,
  dragOverPosition: DragPosition,
) {
  if (!draggedKey || dragOverKey !== key || draggedKey === key) {
    return ''
  }
  return dragOverPosition === 'before'
    ? 'column-setting-item-target-before'
    : 'column-setting-item-target-after'
}

function createSettingGroup(): SettingGroup {
  return {
    items: ref<SettingItem[]>([]),
    draggedKey: ref<string>(),
    dragOverKey: ref<string>(),
    dragOverPosition: ref<DragPosition>('after'),
  }
}

function handleGroupDragStart(group: SettingGroup, key: string, event: DragEvent) {
  group.draggedKey.value = key
  group.dragOverKey.value = key
  group.dragOverPosition.value = 'after'
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', key)
  }
}

function handleGroupDragOver(group: SettingGroup, key: string, event: DragEvent) {
  if (!group.draggedKey.value) {
    return
  }
  event.preventDefault()
  const currentTarget = event.currentTarget as HTMLElement | null
  if (currentTarget) {
    const rect = currentTarget.getBoundingClientRect()
    group.dragOverPosition.value = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
  }
  group.dragOverKey.value = key
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleGroupDrop(group: SettingGroup, key: string, storageKey: string) {
  if (!group.draggedKey.value) {
    return
  }
  group.items.value = reorderItems(group.items.value, group.draggedKey.value, key, group.dragOverPosition.value)
  persistSettings(storageKey, group.items.value)
  resetGroupDragState(group)
}

function resetGroupDragState(group: SettingGroup) {
  group.draggedKey.value = undefined
  group.dragOverKey.value = undefined
  group.dragOverPosition.value = 'after'
}

function initGroupSettings(group: SettingGroup, defaults: SettingItem[], storageKey: string) {
  const saved = getListColumnSettings(storageKey)
  group.items.value = applySavedSettings(defaults, saved)
}

export function useColumnSettingsSupport(options: UseColumnSettingsSupportOptions) {
  const columns = createSettingGroup()
  const formFields = createSettingGroup()
  const editorColumns = createSettingGroup()

  const columnStorageKey = options.moduleKey.value
  const formFieldStorageKey = `${options.moduleKey.value}:editor-form-fields`
  const editorColumnStorageKey = `${options.moduleKey.value}:editor-items`

  function initColumnSettings() {
    const defaults = buildDefaultItemsFromColumns(options.config.value.columns)
    initGroupSettings(columns, defaults, columnStorageKey)
  }

  function initFormFieldSettings() {
    const defaults = buildDefaultItemsFromFormFields(options.formFields.value)
    if (!defaults.length) {
      formFields.items.value = []
      return
    }
    initGroupSettings(formFields, defaults, formFieldStorageKey)
  }

  function initEditorColumnSettings() {
    const defaults = buildDefaultItemsFromColumns(options.config.value.itemColumns || [])
    if (!defaults.length) {
      editorColumns.items.value = []
      return
    }
    initGroupSettings(editorColumns, defaults, editorColumnStorageKey)
  }

  function handleColumnVisibleChange(key: string, checked: boolean) {
    columns.items.value = handleVisibleChange(columns.items.value, key, checked)
    persistSettings(columnStorageKey, columns.items.value)
  }

  function handleFormFieldVisibleChange(key: string, checked: boolean) {
    formFields.items.value = handleVisibleChange(formFields.items.value, key, checked)
    persistSettings(formFieldStorageKey, formFields.items.value)
  }

  function handleEditorColumnVisibleChange(key: string, checked: boolean) {
    editorColumns.items.value = handleVisibleChange(editorColumns.items.value, key, checked)
    persistSettings(editorColumnStorageKey, editorColumns.items.value)
  }

  function resetColumnSettings() {
    clearListColumnSettings(columnStorageKey)
    columns.items.value = buildDefaultItemsFromColumns(options.config.value.columns)
  }

  function resetFormFieldSettings() {
    clearListColumnSettings(formFieldStorageKey)
    formFields.items.value = buildDefaultItemsFromFormFields(options.formFields.value)
  }

  function resetEditorColumnSettings() {
    clearListColumnSettings(editorColumnStorageKey)
    editorColumns.items.value = buildDefaultItemsFromColumns(options.config.value.itemColumns || [])
  }

  return {
    columnSettingItems: columns.items,
    editorColumnSettingItems: editorColumns.items,
    formFieldSettingItems: formFields.items,
    getColumnSettingItemClass: (key: string) =>
      getItemClass(key, columns.draggedKey.value, columns.dragOverKey.value, columns.dragOverPosition.value),
    getEditorColumnSettingItemClass: (key: string) =>
      getItemClass(key, editorColumns.draggedKey.value, editorColumns.dragOverKey.value, editorColumns.dragOverPosition.value),
    getFormFieldSettingItemClass: (key: string) =>
      getItemClass(key, formFields.draggedKey.value, formFields.dragOverKey.value, formFields.dragOverPosition.value),
    handleColumnSettingDragOver: (key: string, event: DragEvent) => handleGroupDragOver(columns, key, event),
    handleColumnSettingDragStart: (key: string, event: DragEvent) => handleGroupDragStart(columns, key, event),
    handleColumnSettingDrop: (key: string) => handleGroupDrop(columns, key, columnStorageKey),
    handleColumnVisibleChange,
    handleEditorColumnSettingDragOver: (key: string, event: DragEvent) => handleGroupDragOver(editorColumns, key, event),
    handleEditorColumnSettingDragStart: (key: string, event: DragEvent) => handleGroupDragStart(editorColumns, key, event),
    handleEditorColumnSettingDrop: (key: string) => handleGroupDrop(editorColumns, key, editorColumnStorageKey),
    handleEditorColumnVisibleChange,
    handleFormFieldSettingDragOver: (key: string, event: DragEvent) => handleGroupDragOver(formFields, key, event),
    handleFormFieldSettingDragStart: (key: string, event: DragEvent) => handleGroupDragStart(formFields, key, event),
    handleFormFieldSettingDrop: (key: string) => handleGroupDrop(formFields, key, formFieldStorageKey),
    handleFormFieldVisibleChange,
    initColumnSettings,
    initEditorColumnSettings,
    initFormFieldSettings,
    resetColumnSettings,
    resetEditorColumnSettings,
    resetEditorColumnSettingDragState: () => resetGroupDragState(editorColumns),
    resetFormFieldSettingDragState: () => resetGroupDragState(formFields),
    resetFormFieldSettings,
    resetListColumnSettingDragState: () => resetGroupDragState(columns),
  }
}
