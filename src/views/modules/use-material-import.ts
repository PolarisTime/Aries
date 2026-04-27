import { ref, type Ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { importMaterialsCsv } from '@/api/materials'
import { listAllBusinessModuleRows } from '@/api/business'
import type { MaterialImportResult } from '@/types/material'
import { downloadMaterialImportTemplate, exportMaterialsToCsv } from '@/utils/material-csv'

interface UseMaterialImportOptions {
  moduleKey: Ref<string>
  isMaterialModule: Ref<boolean>
  canImportMaterials: Ref<boolean>
  canExportRecords: Ref<boolean>
  isSuccessCode: (code: unknown) => boolean
  refreshModuleQueries: () => Promise<void>
}

export function useMaterialImport(options: UseMaterialImportOptions) {
  const {
    moduleKey,
    canImportMaterials,
    canExportRecords,
    isSuccessCode,
    refreshModuleQueries,
  } = options

  const materialImportVisible = ref(false)
  const materialImportLoading = ref(false)
  const materialImportFile = ref<File | null>(null)
  const materialImportResultVisible = ref(false)
  const materialImportResult = ref<MaterialImportResult | null>(null)

  function closeMaterialImportModal() {
    materialImportVisible.value = false
    materialImportLoading.value = false
    materialImportFile.value = null
  }

  function closeMaterialImportResultModal() {
    materialImportResultVisible.value = false
  }

  function handleMaterialImportClick() {
    if (!canImportMaterials.value) {
      message.warning('暂无商品导入权限')
      return
    }
    materialImportVisible.value = true
  }

  function handleMaterialTemplateDownload() {
    if (!canExportRecords.value) {
      message.warning('暂无导出权限')
      return
    }
    downloadMaterialImportTemplate()
    message.success('导入模板已开始下载')
  }

  function handleMaterialImportBeforeUpload(file: File) {
    materialImportFile.value = file
    return false
  }

  async function handleMaterialImportSubmit() {
    if (!canImportMaterials.value) {
      message.warning('暂无商品导入权限')
      return
    }
    if (!materialImportFile.value) {
      message.warning('请选择要导入的 CSV 文件')
      return
    }

    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: '导入商品资料',
        content: `即将导入文件 "${materialImportFile.value?.name || ''}"，确认继续？`,
        okText: '确认导入',
        cancelText: '取消',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      })
    })
    if (!confirmed) {
      return
    }

    materialImportLoading.value = true
    try {
      const response = await importMaterialsCsv(materialImportFile.value)
      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || '导入失败')
      }
      await refreshModuleQueries()
      const result = response.data
      materialImportResult.value = result
      materialImportResultVisible.value = true
      closeMaterialImportModal()
      if (result.failedCount > 0) {
        message.warning(`导入完成，共 ${result.totalRows} 行，成功 ${result.successCount} 条，失败 ${result.failedCount} 条`)
      } else {
        message.success(`导入成功，共 ${result.totalRows} 行，新增 ${result.createdCount} 条，更新 ${result.updatedCount} 条`)
      }
    } finally {
      materialImportLoading.value = false
    }
  }

  async function exportMaterialRows(submittedFilters: Record<string, unknown>, moduleTitle: string) {
    const rows = await listAllBusinessModuleRows(moduleKey.value, submittedFilters)
    if (!rows.length) {
      message.warning('没有可导出的数据')
      return
    }
    exportMaterialsToCsv(rows, moduleTitle)
    message.success('CSV 导出已开始')
  }

  return {
    materialImportVisible,
    materialImportLoading,
    materialImportFile,
    materialImportResultVisible,
    materialImportResult,
    closeMaterialImportModal,
    closeMaterialImportResultModal,
    handleMaterialImportClick,
    handleMaterialTemplateDownload,
    handleMaterialImportBeforeUpload,
    handleMaterialImportSubmit,
    exportMaterialRows,
  }
}
