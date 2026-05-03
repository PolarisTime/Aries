import { computed, ref, type Ref } from 'vue'
import { message } from 'ant-design-vue'
import type { MenuProps } from 'ant-design-vue'
import { listAllBusinessModuleRows } from '@/api/business'
import type { ModuleColumnDefinition, ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { exportRecordsToExcel } from '@/utils/export-excel'

type ExportMode = 'selected' | 'page' | 'filtered'

interface UseModuleExportSupportOptions {
  moduleKey: Ref<string>
  config: Ref<ModulePageConfig>
  visibleConfigColumns: Ref<ModuleColumnDefinition[]>
  listRows: Ref<ModuleRecord[]>
  listTotal: Ref<number>
  selectedRowKeys: Ref<string[]>
  selectedRowMap: Ref<Record<string, ModuleRecord>>
  submittedFilters: Ref<Record<string, unknown>>
  canExportRecords: Ref<boolean>
  formatCellValue: (column: ModuleColumnDefinition, value: unknown) => string
  getStatusText: (value: unknown) => string
}

export function useModuleExportSupport(options: UseModuleExportSupportOptions) {
  const exportLoading = ref(false)

  const exportMenuItems = computed<NonNullable<MenuProps['items']>>(() => [
    {
      key: 'selected',
      label: `导出选中 (${options.selectedRowKeys.value.length})`,
      disabled: options.selectedRowKeys.value.length === 0,
    },
    {
      key: 'page',
      label: `导出当前页 (${options.listRows.value.length})`,
      disabled: options.listRows.value.length === 0,
    },
    {
      key: 'filtered',
      label: `导出当前筛选 (${options.listTotal.value})`,
      disabled: options.listTotal.value === 0,
    },
  ])

  function formatExportCellValue(column: ModuleColumnDefinition, value: unknown) {
    if (column.type === 'status') {
      return options.getStatusText(value)
    }

    const rendered = options.formatCellValue(column, value)
    return rendered === '--' ? '' : String(rendered)
  }

  async function exportRows(mode: ExportMode) {
    if (!options.canExportRecords.value) {
      message.warning('暂无导出权限')
      return
    }
    if (mode === 'filtered') {
      const filteredRows = await listAllBusinessModuleRows(options.moduleKey.value, options.submittedFilters.value)
      if (!filteredRows.length) {
        message.warning('没有可导出的数据')
        return
      }

      exportRecordsToExcel(
        options.config.value.title,
        options.visibleConfigColumns.value,
        filteredRows,
        formatExportCellValue,
      )
      message.success('Excel 导出已开始')
      return
    }

    const rows = mode === 'selected'
      ? options.selectedRowKeys.value
        .map((key) => options.selectedRowMap.value[key])
        .filter(Boolean)
      : options.listRows.value

    if (!rows.length) {
      message.warning('没有可导出的数据')
      return
    }

    exportRecordsToExcel(
      options.config.value.title,
      options.visibleConfigColumns.value,
      rows,
      formatExportCellValue,
    )
    message.success('Excel 导出已开始')
  }

  async function handleExportMenuClick(info: { key: string | number }) {
    exportLoading.value = true
    try {
      const key = String(info.key)
      if (key === 'selected' || key === 'page' || key === 'filtered') {
        await exportRows(key)
      }
    } finally {
      exportLoading.value = false
    }
  }

  return {
    exportLoading,
    exportMenuItems,
    exportRows,
    handleExportMenuClick,
  }
}
