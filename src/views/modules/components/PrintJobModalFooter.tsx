import {
  EyeOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  PrinterOutlined,
} from '@ant-design/icons'
import { Button, Flex } from 'antd'
import { useTranslation } from 'react-i18next'
import type { PrintTemplateRecord } from '@/shared/schemas'
import { isPdfTemplate } from '@/views/modules/components/print-job-modal-format'
import type { PendingOutputAction } from '@/views/modules/components/print-job-modal-state'

interface Props {
  canExportPrintXlsx: boolean
  hasSelectedPrintItems: boolean
  pendingOutputAction?: PendingOutputAction
  selectedTemplate?: PrintTemplateRecord
  onExportPrintXlsx: () => void
  onRequestClose: () => void
  onPrint: (mode: 'preview' | 'print' | 'download') => void
}

/** 打印作业弹窗底部操作区：xlsx 导出、PDF 下载、预览与直接打印。 */
export function PrintJobModalFooter({
  canExportPrintXlsx,
  hasSelectedPrintItems,
  pendingOutputAction,
  selectedTemplate,
  onExportPrintXlsx,
  onRequestClose,
  onPrint,
}: Props) {
  const { t } = useTranslation()
  const disabled = !hasSelectedPrintItems || Boolean(pendingOutputAction)

  return (
    <Flex justify="space-between" align="center" gap="small" wrap="wrap">
      {canExportPrintXlsx ? (
        <Button
          disabled={disabled}
          icon={<FileExcelOutlined />}
          loading={pendingOutputAction === 'xlsx'}
          onClick={onExportPrintXlsx}
          type="text"
        >
          {t('modules.print.exportXlsx')}
        </Button>
      ) : (
        <span />
      )}
      <Flex gap="small" wrap="wrap">
        <Button
          disabled={Boolean(pendingOutputAction)}
          onClick={onRequestClose}
        >
          {t('common.cancel')}
        </Button>
        {isPdfTemplate(selectedTemplate) ? (
          <Button
            disabled={disabled}
            icon={<FilePdfOutlined />}
            loading={pendingOutputAction === 'download'}
            onClick={() => onPrint('download')}
          >
            {t('modules.print.downloadPdf')}
          </Button>
        ) : null}
        <Button
          disabled={disabled}
          icon={<EyeOutlined />}
          loading={pendingOutputAction === 'preview'}
          onClick={() => onPrint('preview')}
        >
          {t('modules.print.preview')}
        </Button>
        <Button
          disabled={disabled}
          icon={<PrinterOutlined />}
          loading={pendingOutputAction === 'print'}
          onClick={() => onPrint('print')}
          type="primary"
        >
          {t('modules.print.directPrint')}
        </Button>
      </Flex>
    </Flex>
  )
}
