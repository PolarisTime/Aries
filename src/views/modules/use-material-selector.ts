import { computed, ref, type Ref } from 'vue'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'

interface UseMaterialSelectorOptions {
  editorItems: Ref<ModuleLineItem[]>
  materialSelectorKeyword?: Ref<string>
  handleEditorItemMaterialSelect: (item: ModuleLineItem, materialCode: string) => void
}

export function useMaterialSelector(options: UseMaterialSelectorOptions) {
  const { editorItems, materialSelectorKeyword: existingKeyword, handleEditorItemMaterialSelect } = options

  const materialSelectorVisible = ref(false)
  const materialSelectorKeyword = existingKeyword || ref('')
  const materialSelectorItemId = ref('')
  const materialSelectorSelectedCode = ref('')

  const activeMaterialSelectorItem = computed(() =>
    editorItems.value.find((item) => String(item.id || '') === materialSelectorItemId.value) || null,
  )

  const materialSelectorRowSelection = computed(() => ({
    type: 'radio' as const,
    selectedRowKeys: materialSelectorSelectedCode.value ? [materialSelectorSelectedCode.value] : [],
    onChange: (keys: Array<string | number>) => {
      materialSelectorSelectedCode.value = keys[0] ? String(keys[0]) : ''
    },
  }))

  function openMaterialSelector(item: ModuleLineItem) {
    materialSelectorItemId.value = String(item.id || '')
    materialSelectorSelectedCode.value = String(item.materialCode || '')
    materialSelectorKeyword.value = ''
    materialSelectorVisible.value = true
  }

  function closeMaterialSelector() {
    materialSelectorVisible.value = false
    materialSelectorKeyword.value = ''
    materialSelectorItemId.value = ''
    materialSelectorSelectedCode.value = ''
  }

  function applyMaterialSelectorChoice(materialCode: string) {
    const item = activeMaterialSelectorItem.value
    if (!item || !materialCode) {
      return
    }
    handleEditorItemMaterialSelect(item, materialCode)
    closeMaterialSelector()
  }

  function confirmMaterialSelector() {
    applyMaterialSelectorChoice(materialSelectorSelectedCode.value)
  }

  function getMaterialSelectorRowProps(record: ModuleRecord) {
    const materialCode = String(record.materialCode || '')
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
    getMaterialSelectorRowProps,
  }
}
