import Modal from 'antd/es/modal'
import Typography from 'antd/es/typography'
import type { PrintTemplateRecord } from '@/types/print-template'
import { getPrintTemplateBillTypeLabel } from '@/views/system/print-template-view-utils'

interface Props {
  open: boolean
  template: PrintTemplateRecord | null
  onClose: () => void
}

export function PrintTemplatePreviewModal({ open, template, onClose }: Props) {
  return (
    <Modal
      title="模板预览"
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      {template && (
        <div>
          <Typography.Title level={5}>{template.templateName}</Typography.Title>
          <Typography.Paragraph type="secondary">
            单据类型：{getPrintTemplateBillTypeLabel(template.billType)}
          </Typography.Paragraph>
          <div
            className="p-16 rounded overflow-auto bg-gray-100 border border-gray-300 max-h-400"
          >
            <pre
              className="m-0 text-xs whitespace-pre-wrap break-all"
            >
              {template.templateHtml || '（空模板）'}
            </pre>
          </div>
        </div>
      )}
    </Modal>
  )
}
