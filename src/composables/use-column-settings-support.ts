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

export function useColumnSettingsSupport(options: UseColumnSettingsSupportOptions) {
  const columnSettingItems = ref<SettingItem[]>([])
  const formFieldSettingItems = ref<SettingItem[]>([])
  const editorColumnSettingItems = ref<SettingItem[]>([])

  const draggedColumnSettingKey = ref<string>()
  const dragOverColumnSettingKey = ref<string>()
  const dragOverColumnSettingPosition = ref<DragPosition>('after')
  const draggedFormFieldSettingKey = ref<string>()
  const dragOverFormFieldSettingKey = ref<string>()
  const dragOverFormFieldSettingPosition = ref<DragPosition>('after')
  const draggedEditorColumnSettingKey = ref<string>()
  const dragOverEditorColumnSettingKey = ref<string>()
  const dragOverEditorColumnSettingPosition = ref<DragPosition>('after')

  function buildDefaultColumnSettingItems() {
    return options.config.value.columns.map((column) => ({
      key: column.dataIndex,
      title: column.title,
      visible: column.dataIndex !== 'piecesPerBundle',
    }))
  }

  function buildDefaultFormFieldSettingItems() {
    return options.formFields.value.map((field) => ({
      key: field.key,
      title: field.label,
      visible: true,
    }))
  }

  function buildDefaultEditorColumnSettingItems() {
    return (options.config.value.itemColumns || []).map((column) => ({
      key: column.dataIndex,
      title: column.title,
      visible: column.dataIndex !== 'piecesPerBundle',
    }))
  }

  function applySavedColumnSettings(defaults: SettingItem[], saved: ListColumnSettings | null) {
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

  function persistSettingItems(storageKey: string, items: SettingItem[]) {
    setListColumnSettings(storageKey, {
      orderedKeys: items.map((item) => item.key),
      hiddenKeys: items
        .filter((item) => !item.visible)
        .map((item) => item.key),
    })
  }

  function handleSettingVisibleChange(
    items: SettingItem[],
    key: string,
    checked: boolean,
  ) {
    const visibleCount = items.filter((item) => item.visible).length
    const target = items.find((item) => item.key === key)
    if (!target) {
      return items
    }

    if (!checked && target.visible && visibleCount === 1) {
      message.warning('至少保留一列显示')
      return items
    }

    return items.map((item) =>
      item.key === key ? { ...item, visible: checked } : item,
    )
  }

  function reorderSettingItems(
    items: SettingItem[],
    sourceKey: string,
    targetKey: string,
    position: DragPosition,
  ) {
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

  function handleSettingDragStart(
    key: string,
    event: DragEvent,
    draggedKey: Ref<string | undefined>,
    dragOverKey: Ref<string | undefined>,
    dragOverPosition: Ref<DragPosition>,
  ) {
    draggedKey.value = key
    dragOverKey.value = key
    dragOverPosition.value = 'after'

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', key)
    }
  }

  function handleSettingDragOver(
    key: string,
    event: DragEvent,
    draggedKey: Ref<string | undefined>,
    dragOverKey: Ref<string | undefined>,
    dragOverPosition: Ref<DragPosition>,
  ) {
    if (!draggedKey.value) {
      return
    }

    event.preventDefault()
    const currentTarget = event.currentTarget as HTMLElement | null
    if (currentTarget) {
      const rect = currentTarget.getBoundingClientRect()
      dragOverPosition.value = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
    }
    dragOverKey.value = key
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  function getSettingItemClass(
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

  function initColumnSettings() {
    const defaults = buildDefaultColumnSettingItems()
    const saved = getListColumnSettings(options.moduleKey.value)
    columnSettingItems.value = applySavedColumnSettings(defaults, saved)
  }

  function initFormFieldSettings() {
    const defaults = buildDefaultFormFieldSettingItems()
    if (!defaults.length) {
      formFieldSettingItems.value = []
      return
    }

    const saved = getListColumnSettings(`${options.moduleKey.value}:editor-form-fields`)
    formFieldSettingItems.value = applySavedColumnSettings(defaults, saved)
  }

  function initEditorColumnSettings() {
    const defaults = buildDefaultEditorColumnSettingItems()
    if (!defaults.length) {
      editorColumnSettingItems.value = []
      return
    }

    const saved = getListColumnSettings(`${options.moduleKey.value}:editor-items`)
    editorColumnSettingItems.value = applySavedColumnSettings(defaults, saved)
  }

  function handleColumnVisibleChange(key: string, checked: boolean) {
    columnSettingItems.value = handleSettingVisibleChange(columnSettingItems.value, key, checked)
    persistSettingItems(options.moduleKey.value, columnSettingItems.value)
  }

  function handleFormFieldVisibleChange(key: string, checked: boolean) {
    formFieldSettingItems.value = handleSettingVisibleChange(formFieldSettingItems.value, key, checked)
    persistSettingItems(`${options.moduleKey.value}:editor-form-fields`, formFieldSettingItems.value)
  }

  function handleEditorColumnVisibleChange(key: string, checked: boolean) {
    editorColumnSettingItems.value = handleSettingVisibleChange(editorColumnSettingItems.value, key, checked)
    persistSettingItems(`${options.moduleKey.value}:editor-items`, editorColumnSettingItems.value)
  }

  function resetColumnSettings() {
    clearListColumnSettings(options.moduleKey.value)
    columnSettingItems.value = buildDefaultColumnSettingItems()
  }

  function resetFormFieldSettings() {
    clearListColumnSettings(`${options.moduleKey.value}:editor-form-fields`)
    formFieldSettingItems.value = buildDefaultFormFieldSettingItems()
  }

  function resetEditorColumnSettings() {
    clearListColumnSettings(`${options.moduleKey.value}:editor-items`)
    editorColumnSettingItems.value = buildDefaultEditorColumnSettingItems()
  }

  function resetListColumnSettingDragState() {
    draggedColumnSettingKey.value = undefined
    dragOverColumnSettingKey.value = undefined
    dragOverColumnSettingPosition.value = 'after'
  }

  function resetFormFieldSettingDragState() {
    draggedFormFieldSettingKey.value = undefined
    dragOverFormFieldSettingKey.value = undefined
    dragOverFormFieldSettingPosition.value = 'after'
  }

  function resetEditorColumnSettingDragState() {
    draggedEditorColumnSettingKey.value = undefined
    dragOverEditorColumnSettingKey.value = undefined
    dragOverEditorColumnSettingPosition.value = 'after'
  }

  function handleColumnSettingDragStart(key: string, event: DragEvent) {
    handleSettingDragStart(
      key,
      event,
      draggedColumnSettingKey,
      dragOverColumnSettingKey,
      dragOverColumnSettingPosition,
    )
  }

  function handleColumnSettingDragOver(key: string, event: DragEvent) {
    handleSettingDragOver(
      key,
      event,
      draggedColumnSettingKey,
      dragOverColumnSettingKey,
      dragOverColumnSettingPosition,
    )
  }

  function handleColumnSettingDrop(key: string) {
    if (!draggedColumnSettingKey.value) {
      return
    }

    columnSettingItems.value = reorderSettingItems(
      columnSettingItems.value,
      draggedColumnSettingKey.value,
      key,
      dragOverColumnSettingPosition.value,
    )
    persistSettingItems(options.moduleKey.value, columnSettingItems.value)
    resetListColumnSettingDragState()
  }

  function getColumnSettingItemClass(key: string) {
    return getSettingItemClass(
      key,
      draggedColumnSettingKey.value,
      dragOverColumnSettingKey.value,
      dragOverColumnSettingPosition.value,
    )
  }

  function handleFormFieldSettingDragStart(key: string, event: DragEvent) {
    handleSettingDragStart(
      key,
      event,
      draggedFormFieldSettingKey,
      dragOverFormFieldSettingKey,
      dragOverFormFieldSettingPosition,
    )
  }

  function handleFormFieldSettingDragOver(key: string, event: DragEvent) {
    handleSettingDragOver(
      key,
      event,
      draggedFormFieldSettingKey,
      dragOverFormFieldSettingKey,
      dragOverFormFieldSettingPosition,
    )
  }

  function handleFormFieldSettingDrop(key: string) {
    if (!draggedFormFieldSettingKey.value) {
      return
    }

    formFieldSettingItems.value = reorderSettingItems(
      formFieldSettingItems.value,
      draggedFormFieldSettingKey.value,
      key,
      dragOverFormFieldSettingPosition.value,
    )
    persistSettingItems(`${options.moduleKey.value}:editor-form-fields`, formFieldSettingItems.value)
    resetFormFieldSettingDragState()
  }

  function getFormFieldSettingItemClass(key: string) {
    return getSettingItemClass(
      key,
      draggedFormFieldSettingKey.value,
      dragOverFormFieldSettingKey.value,
      dragOverFormFieldSettingPosition.value,
    )
  }

  function handleEditorColumnSettingDragStart(key: string, event: DragEvent) {
    handleSettingDragStart(
      key,
      event,
      draggedEditorColumnSettingKey,
      dragOverEditorColumnSettingKey,
      dragOverEditorColumnSettingPosition,
    )
  }

  function handleEditorColumnSettingDragOver(key: string, event: DragEvent) {
    handleSettingDragOver(
      key,
      event,
      draggedEditorColumnSettingKey,
      dragOverEditorColumnSettingKey,
      dragOverEditorColumnSettingPosition,
    )
  }

  function handleEditorColumnSettingDrop(key: string) {
    if (!draggedEditorColumnSettingKey.value) {
      return
    }

    editorColumnSettingItems.value = reorderSettingItems(
      editorColumnSettingItems.value,
      draggedEditorColumnSettingKey.value,
      key,
      dragOverEditorColumnSettingPosition.value,
    )
    persistSettingItems(`${options.moduleKey.value}:editor-items`, editorColumnSettingItems.value)
    resetEditorColumnSettingDragState()
  }

  function getEditorColumnSettingItemClass(key: string) {
    return getSettingItemClass(
      key,
      draggedEditorColumnSettingKey.value,
      dragOverEditorColumnSettingKey.value,
      dragOverEditorColumnSettingPosition.value,
    )
  }

  return {
    columnSettingItems,
    editorColumnSettingItems,
    formFieldSettingItems,
    getColumnSettingItemClass,
    getEditorColumnSettingItemClass,
    getFormFieldSettingItemClass,
    handleColumnSettingDragOver,
    handleColumnSettingDragStart,
    handleColumnSettingDrop,
    handleColumnVisibleChange,
    handleEditorColumnSettingDragOver,
    handleEditorColumnSettingDragStart,
    handleEditorColumnSettingDrop,
    handleEditorColumnVisibleChange,
    handleFormFieldSettingDragOver,
    handleFormFieldSettingDragStart,
    handleFormFieldSettingDrop,
    handleFormFieldVisibleChange,
    initColumnSettings,
    initEditorColumnSettings,
    initFormFieldSettings,
    resetColumnSettings,
    resetEditorColumnSettings,
    resetEditorColumnSettingDragState,
    resetFormFieldSettingDragState,
    resetFormFieldSettings,
    resetListColumnSettingDragState,
  }
}
