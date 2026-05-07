import { computed, ref, type Ref } from 'vue'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'

interface UseMaterialSelectorOptions {
  editorItems: Ref<ModuleLineItem[]>
  materialSelectorKeyword?: Ref<string>
  materialSelectorCurrentPage?: Ref<number>
  handleEditorItemMaterialSelect: (item: ModuleLineItem, materialCode: string) => void
}

export function useMaterialSelector(options: UseMaterialSelectorOptions) {
  const {
    editorItems,
    materialSelectorKeyword: existingKeyword,
    materialSelectorCurrentPage,
    handleEditorItemMaterialSelect,
  } = options

  const materialSelectorVisible = ref(false)
  const materialSelectorKeyword = existingKeyword || ref('')
  const materialSelectorItemId = ref('')
  const materialSelectorSelectedCode = ref('')

  const activeMaterialSelectorItem = computed(() =>
    editorItems.value.find((item) => String(item.id || '') === materialSelectorItemId.value) || null,
  )

  function normalizeMaterialCode(value: unknown) {
    return String(value ?? '').trim()
  }

  const materialSelectorRowSelection = computed(() => ({
    type: 'radio' as const,
    selectedRowKeys: materialSelectorSelectedCode.value ? [materialSelectorSelectedCode.value] : [],
    onChange: (keys: Array<string | number>) => {
      materialSelectorSelectedCode.value = normalizeMaterialCode(keys[0])
    },
  }))

  function openMaterialSelector(item: ModuleLineItem) {
    materialSelectorItemId.value = String(item.id || '')
    materialSelectorSelectedCode.value = normalizeMaterialCode(item.materialCode)
    materialSelectorKeyword.value = ''
    if (materialSelectorCurrentPage) {
      materialSelectorCurrentPage.value = 1
    }
    materialSelectorVisible.value = true
  }

  function closeMaterialSelector() {
    materialSelectorVisible.value = false
    materialSelectorKeyword.value = ''
    if (materialSelectorCurrentPage) {
      materialSelectorCurrentPage.value = 1
    }
    materialSelectorItemId.value = ''
    materialSelectorSelectedCode.value = ''
  }

  function applyMaterialSelectorChoice(materialCode: string) {
    const item = activeMaterialSelectorItem.value
    const normalizedMaterialCode = normalizeMaterialCode(materialCode)
    if (!item || !normalizedMaterialCode) {
      return
    }
    handleEditorItemMaterialSelect(item, normalizedMaterialCode)
    closeMaterialSelector()
  }

  function confirmMaterialSelector() {
    applyMaterialSelectorChoice(materialSelectorSelectedCode.value)
  }

  function updateMaterialSelectorKeyword(value: string) {
    materialSelectorKeyword.value = value
    if (materialSelectorCurrentPage) {
      materialSelectorCurrentPage.value = 1
    }
  }

  function getMaterialSelectorRowProps(record: ModuleRecord) {
    const materialCode = normalizeMaterialCode(record.materialCode)
    return {
      onClick: () => {
        materialSelectorSelectedCode.value = materialCode
      },
      onDblclick: () => {
        materialSelectorSelectedCode.value = materialCode
        applyMaterialSelectorChoice(materialCode)
      },
    }
  }

  return {
    materialSelectorVisible,
    materialSelectorKeyword,
    materialSelectorItemId,
    materialSelectorSelectedCode,
    activeMaterialSelectorItem,
    materialSelectorRowSelection,
    openMaterialSelector,
    closeMaterialSelector,
    confirmMaterialSelector,
    updateMaterialSelectorKeyword,
    getMaterialSelectorRowProps,
  }
}
