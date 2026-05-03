import { ref } from 'vue'

export function useModuleEditorItemSelection(removeEditorItem: (id: string) => void) {
  const selectedEditorItemIds = ref<string[]>([])

  function removeSelectedEditorItems() {
    if (!selectedEditorItemIds.value.length) {
      return
    }
    selectedEditorItemIds.value.forEach((id) => removeEditorItem(id))
    selectedEditorItemIds.value = []
  }

  return {
    removeSelectedEditorItems,
    selectedEditorItemIds,
  }
}
