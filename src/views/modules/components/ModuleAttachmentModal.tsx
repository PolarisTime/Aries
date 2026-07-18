import { Modal, Spin } from 'antd'
import { AttachmentList } from './AttachmentList'
import { AttachmentPreviewLayers } from './AttachmentPreviewLayers'
import { AttachmentUploadZone } from './AttachmentUploadZone'
import { useModuleAttachmentModal } from './useModuleAttachmentModal'

interface Props {
  open: boolean
  moduleKey: string
  recordId: string
  onClose: () => void
}

export function ModuleAttachmentModal({
  open,
  moduleKey,
  recordId,
  onClose,
}: Props) {
  const modal = useModuleAttachmentModal({
    open,
    moduleKey,
    recordId,
  })

  return (
    <Modal
      title={modal.t('modules.attachment.title')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      afterOpenChange={modal.handleModalOpenChange}
    >
      <AttachmentUploadZone
        uploading={modal.uploading}
        uploadFileName={modal.uploadFileName}
        uploadProgress={modal.uploadProgress}
        pasteZoneRef={modal.pasteZoneRef}
        onUpload={modal.uploadAndBindAttachment}
        t={modal.t}
      />
      <Spin spinning={modal.loading}>
        <AttachmentList
          attachments={modal.attachments}
          onDelete={(id) => {
            void modal.handleDelete(id)
          }}
          onDownload={modal.handleDownload}
          onOpenImagePreview={modal.openImagePreview}
          onOpenPdfPreview={modal.openPdfPreview}
          t={modal.t}
        />
      </Spin>
      <AttachmentPreviewLayers
        imageAttachments={modal.imageAttachments}
        pdfPreviewOpen={modal.pdfPreviewOpen}
        pdfPreviewUrl={modal.pdfPreviewUrl}
        previewOpen={modal.previewOpen}
        previewSource={modal.previewSource}
        previewUrlByAttachmentId={modal.previewUrlByAttachmentId}
        onPdfPreviewClose={modal.handlePdfPreviewClose}
        onImagePreviewChange={modal.handleImagePreviewChange}
        t={modal.t}
      />
    </Modal>
  )
}
