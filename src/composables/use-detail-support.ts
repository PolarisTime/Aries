import { ref, type Ref } from 'vue'
import { message } from 'ant-design-vue'
import { getBusinessModuleDetail } from '@/api/business'
import { getDefaultPrintTemplate } from '@/api/print-template'
import type {
  ModuleDetailField,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { execPrintCode, isCLodopCode, loadCLodop, printHtml } from '@/utils/clodop'
import { buildModulePrintHtml } from '@/utils/module-print'
import { renderPrintTemplate } from '@/utils/print-template-engine'
import { cloneRecord, cloneLineItems } from '@/utils/clone-utils'
import { inferColumnAlign } from '@/utils/column-utils'
import { useModuleDisplaySupport } from '@/composables/use-module-display-support'
import type { StatusMeta } from '@/composables/use-module-display-support'

interface UseDetailSupportOptions {
  moduleKey: Ref<string>
  config: Ref<ModulePageConfig>
  statusMap: Ref<Record<string, StatusMeta>>
  canViewRecords: Ref<boolean>
  canPrintRecords: Ref<boolean>
  activeUploadRuleRowId: Ref<string>
  uploadRuleVisible: Ref<boolean>
  isUploadRuleListRow: (record: ModuleRecord) => boolean
  closeUploadRuleDialog: () => void
  openUploadRuleDialog: (record: ModuleRecord) => Promise<void> | void
  isSuccessCode: (code: unknown) => boolean
  showRequestError: (error: unknown, fallbackMessage: string) => void
  getPrimaryNo: (record: ModuleRecord) => string
}

export function useDetailSupport(options: UseDetailSupportOptions) {
  const display = useModuleDisplaySupport(options.statusMap)

  const detailVisible = ref(false)
  const detailPrintLoading = ref(false)
  const activeRecord = ref<ModuleRecord | null>(null)

  async function resolveRecordForDetail(record: ModuleRecord) {
    if (!options.config.value.itemColumns?.length) {
      return record
    }

    if (Array.isArray(record.items) && record.items.length) {
      return record
    }

    try {
      const response = await getBusinessModuleDetail(options.moduleKey.value, String(record.id))
      if (!options.isSuccessCode(response.code) || !response.data) {
        throw new Error(response.message || '获取详情失败')
      }
      return response.data
    } catch (error) {
      options.showRequestError(error, '获取详情失败')
      return record
    }
  }

  async function handleView(record: ModuleRecord) {
    if (options.isUploadRuleListRow(record)) {
      if (options.uploadRuleVisible.value && options.activeUploadRuleRowId.value === String(record.id || '')) {
        options.closeUploadRuleDialog()
        return
      }
      await options.openUploadRuleDialog(record)
      return
    }

    if (!options.canViewRecords.value) {
      message.warning('暂无查看权限')
      return
    }

    activeRecord.value = await resolveRecordForDetail(record)
    detailVisible.value = true
  }

  function handleCloseDetail() {
    detailVisible.value = false
  }

  function buildDetailPrintHtml(record: ModuleRecord) {
    const fields = options.config.value.detailFields.map((field: ModuleDetailField) => ({
      label: field.label,
      value: String(display.formatDetailValue(field, record)),
    }))
    const columns = (options.config.value.itemColumns || []).map((column) => ({
      title: column.title,
      align: inferColumnAlign(column),
    }))
    const rows = (record.items || []).map((item) =>
      (options.config.value.itemColumns || []).map((column) =>
        String(display.formatCellValue(column, item[column.dataIndex])),
      ),
    )

    return buildModulePrintHtml({
      title: `${options.config.value.title}打印单`,
      subtitle: options.getPrimaryNo(record),
      fields,
      columns,
      rows,
    })
  }

  function buildPrintContext(record: ModuleRecord) {
    const model = cloneRecord(record) as Record<string, unknown>
    const details = cloneLineItems(record.items) as Array<Record<string, unknown>>

    return {
      model,
      details,
    }
  }

  async function handlePrintDetail(preview: boolean) {
    if (!options.canPrintRecords.value) {
      message.warning('暂无打印权限')
      return
    }
    if (!activeRecord.value) {
      return
    }

    detailPrintLoading.value = true
    try {
      const loaded = await loadCLodop()
      if (!loaded) {
        message.warning('未检测到 CLodop，本机安装并启动 CLodop 后再试')
        return
      }

      const printTitle = `${options.config.value.title}-${options.getPrimaryNo(activeRecord.value)}`
      let templateContent = ''
      try {
        const templateResponse = await getDefaultPrintTemplate(options.moduleKey.value)
        templateContent = String(templateResponse.data?.templateHtml || '').trim()
      } catch {
        templateContent = ''
      }

      let success = false
      if (templateContent) {
        const { model, details } = buildPrintContext(activeRecord.value)
        const rendered = renderPrintTemplate(templateContent, model, details)
        success = isCLodopCode(templateContent)
          ? execPrintCode(rendered, { preview, title: printTitle })
          : printHtml(rendered, { preview, title: printTitle })
      } else {
        success = printHtml(buildDetailPrintHtml(activeRecord.value), {
          preview,
          title: printTitle,
        })
      }

      if (!success) {
        message.error('CLodop 打印调用失败，请检查本机打印服务状态')
      }
    } finally {
      detailPrintLoading.value = false
    }
  }

  return {
    activeRecord,
    detailPrintLoading,
    detailVisible,
    handleCloseDetail,
    handlePrintDetail,
    handleView,
    resolveRecordForDetail,
  }
}
