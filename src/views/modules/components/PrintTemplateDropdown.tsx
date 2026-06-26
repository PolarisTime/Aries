import { PrinterOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import Button from 'antd/es/button'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listPrintTemplates } from '@/api/print-template'
import { printTemplateTargetMap } from '@/config/print-template-targets'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { PrintOptions } from '@/hooks/useBusinessGridPrintActions'
import type { ModuleRecord } from '@/types/module-page'
import type {
  PrintActionMode,
  PrintTemplateRecord,
} from '@/types/print-template'
import { PrintJobModal } from '@/views/modules/components/PrintJobModal'

interface Props {
  moduleKey: string
  moduleTitle?: string
  selectedCount: number
  selectedRowKeys: string[]
  selectedRows: ModuleRecord[]
  disabled: boolean
  loading: boolean
  onPrint: (
    mode: PrintActionMode,
    template?: PrintTemplateRecord,
    printOptions?: PrintOptions,
  ) => void
}

export function PrintTemplateDropdown({
  moduleKey,
  moduleTitle,
  selectedCount,
  selectedRowKeys,
  selectedRows,
  disabled,
  loading,
  onPrint,
}: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const supportsPrintTemplate = moduleKey in printTemplateTargetMap
  const { data: templates = [] } = useQuery<PrintTemplateRecord[]>({
    queryKey: QUERY_KEYS.printableTemplates(moduleKey),
    queryFn: async () => {
      const response = await listPrintTemplates(moduleKey)
      const data = (response as { data?: PrintTemplateRecord[] })?.data
      return Array.isArray(data) ? data : []
    },
    staleTime: 5 * 60 * 1000,
    enabled: supportsPrintTemplate,
  })
  const activeTemplates = templates.filter(
    (tpl) => tpl.status == null || tpl.status === 'ACTIVE',
  )
  const printableTemplates = activeTemplates.filter(
    (tpl) => tpl.templateType === 'COORD' || tpl.templateType === 'PDF_FORM',
  )

  const handlePrint = (
    mode: PrintActionMode,
    template: PrintTemplateRecord,
    printOptions?: PrintOptions,
  ) => {
    onPrint(mode, template, printOptions)
  }

  return (
    <>
      <Button
        disabled={disabled}
        icon={<PrinterOutlined />}
        loading={loading}
        onClick={() => setOpen(true)}
      >
        {t('modules.print.print')}
      </Button>
      <PrintJobModal
        moduleKey={moduleKey}
        moduleTitle={moduleTitle || printTemplateTargetMap[moduleKey]}
        onClose={() => setOpen(false)}
        onPrint={handlePrint}
        open={open}
        selectedCount={selectedCount}
        selectedRowKeys={selectedRowKeys}
        selectedRows={selectedRows}
        templates={printableTemplates}
      />
    </>
  )
}
