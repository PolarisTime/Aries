import { Image, Modal } from 'antd'
import type { AttachmentRecord } from '@/api/business'
import { getAttachmentDisplayName } from './module-attachment-utils'

interface AttachmentPreviewLayersProps {
  imageAttachments: AttachmentRecord[]
  pdfPreviewOpen: boolean
  pdfPreviewUrl: string
  previewOpen: boolean
  previewSource: string
  previewUrlByAttachmentId: Record<string, string>
  onPdfPreviewClose: () => void
  onImagePreviewChange: (visible: boolean) => void
  t: (key: string) => string
}

export function AttachmentPreviewLayers({
  imageAttachments,
  pdfPreviewOpen,
  pdfPreviewUrl,
  previewOpen,
  previewSource,
  previewUrlByAttachmentId,
  onPdfPreviewClose,
  onImagePreviewChange,
  t,
}: AttachmentPreviewLayersProps) {
  const previewableImageAttachments = imageAttachments.filter((item) =>
    Boolean(previewUrlByAttachmentId[item.id]),
  )

  return (
    <>
      {previewOpen && previewSource && previewableImageAttachments.length ? (
        <Image.PreviewGroup
          preview={{
            visible: previewOpen,
            current: Math.max(
              previewableImageAttachments.findIndex(
                (item) => previewUrlByAttachmentId[item.id] === previewSource,
              ),
              0,
            ),
            onVisibleChange: onImagePreviewChange,
          }}
        >
          <div className="hidden">
            {previewableImageAttachments.map((item) => (
              <Image
                key={item.id}
                src={previewUrlByAttachmentId[item.id]}
                alt={getAttachmentDisplayName(item)}
              />
            ))}
          </div>
        </Image.PreviewGroup>
      ) : null}
      <Modal
        title={t('modules.attachment.pdfPreview')}
        open={pdfPreviewOpen}
        onCancel={onPdfPreviewClose}
        footer={null}
        width="90%"
        className="modal-top-20"
        destroyOnHidden
      >
        {pdfPreviewUrl ? (
          <iframe
            src={pdfPreviewUrl}
            sandbox=""
            className="w-full border-none pdf-preview-iframe"
            title="PDF Preview"
          />
        ) : null}
      </Modal>
    </>
  )
}
