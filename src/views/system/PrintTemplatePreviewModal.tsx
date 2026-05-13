import Modal from 'antd/es/modal'
import Typography from 'antd/es/typography'
import type { PrintTemplateRecord } from '@/types/print-template'
import { getPrintTemplateBillTypeLabel } from '@/views/system/print-template-view-utils'

type Props = {
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
            style={{
              background: '#f5f5f5',
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              padding: 16,
              maxHeight: 400,
              overflow: 'auto',
            }}
          >
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                margin: 0,
                fontSize: 12,
              }}
            >
              {template.templateHtml || '（空模板）'}
            </pre>
          </div>
        </div>
      )}
    </Modal>
  )
}
