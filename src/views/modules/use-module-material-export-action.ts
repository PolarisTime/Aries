import { type Ref } from 'vue'

interface UseModuleMaterialExportActionOptions {
  exportLoading: Ref<boolean>
  submittedFilters: Ref<Record<string, unknown>>
  moduleTitle: Ref<string>
  exportMaterialRows: (filters: Record<string, unknown>, title: string) => Promise<void>
}

export function useModuleMaterialExportAction(options: UseModuleMaterialExportActionOptions) {
  async function handleExportMaterialRows() {
    options.exportLoading.value = true
    try {
      await options.exportMaterialRows(options.submittedFilters.value, options.moduleTitle.value)
    } finally {
      options.exportLoading.value = false
    }
  }

  return {
    handleExportMaterialRows,
  }
}
