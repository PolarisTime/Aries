import Modal from 'antd/es/modal'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'
import type { PrintTemplateRecord } from '@/types/print-template'
import { getPrintTemplateBillTypeLabel } from '@/views/system/print-template-view-utils'

interface Props {
  open: boolean
  template: PrintTemplateRecord | null
  onClose: () => void
}

export function PrintTemplatePreviewModal({ open, template, onClose }: Props) {
  const { t } = useTranslation()
  return (
    <Modal
      title={t('system.printTemplatePreview.title')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      {template && (
        <div>
          <Typography.Title level={5}>{template.templateName}</Typography.Title>
          <Typography.Paragraph type="secondary">
            {t('system.printTemplatePreview.billType')}
            {getPrintTemplateBillTypeLabel(template.billType)}
          </Typography.Paragraph>
          <div className="p-16 rounded overflow-auto bg-gray-100 border border-gray-300 max-h-400">
            <pre className="m-0 text-xs whitespace-pre-wrap break-all">
              {template.templateHtml ||
                t('system.printTemplatePreview.emptyTemplate')}
            </pre>
          </div>
        </div>
      )}
    </Modal>
  )
}
