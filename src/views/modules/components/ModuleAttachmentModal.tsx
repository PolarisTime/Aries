import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  PaperClipOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Empty from 'antd/es/empty'
import Flex from 'antd/es/flex'
import Image from 'antd/es/image'
import Modal from 'antd/es/modal'
import Space from 'antd/es/space'
import Spin from 'antd/es/spin'
import Typography from 'antd/es/typography'
import Upload from 'antd/es/upload'
import { type RefObject, useEffect, useReducer, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type AttachmentRecord,
  getAttachmentBindings,
  updateAttachmentBindings,
  uploadAttachment,
} from '@/api/business'
import { usePermissionStore } from '@/stores/permissionStore'
import { message } from '@/utils/antd-app'
import { formatDateTime } from '@/utils/formatters'
import { asString } from '@/utils/type-narrowing'

interface Props {
  open: boolean
  moduleKey: string
  resourceKey?: string
  recordId: string
  onClose: () => void
}

async function fetchAttachmentList(moduleKey: string, recordId: string) {
  const res = await getAttachmentBindings(moduleKey, recordId)
  return res.data?.attachments || []
}

interface AttachmentModalState {
  attachments: AttachmentRecord[]
  loading: boolean
  uploading: boolean
  previewOpen: boolean
  previewSource: string
  pdfPreviewUrl: string
  pdfPreviewOpen: boolean
}

const attachmentModalInitialState: AttachmentModalState = {
  attachments: [],
  loading: false,
  uploading: false,
  previewOpen: false,
  previewSource: '',
  pdfPreviewUrl: '',
  pdfPreviewOpen: false,
}

interface AttachmentUploadZoneProps {
  canCreateAttachment: boolean
  uploading: boolean
  pasteZoneRef: RefObject<HTMLDivElement | null>
  onUpload: (file: File) => Promise<boolean>
  t: (key: string) => string
}

function AttachmentUploadZone({
  canCreateAttachment,
  uploading,
  pasteZoneRef,
  onUpload,
  t,
}: AttachmentUploadZoneProps) {
  return (
    <div ref={pasteZoneRef} className="module-attachment-upload-shell">
      {canCreateAttachment ? (
        <Upload
          beforeUpload={(f) => {
            void onUpload(f)
            return false
          }}
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />} loading={uploading}>
            {t('modules.attachment.upload')}
          </Button>
        </Upload>
      ) : null}
      <Typography.Text
        type="secondary"
        className="module-attachment-upload-hint"
      >
        {canCreateAttachment
          ? t('modules.attachment.uploadHint')
          : t('modules.attachment.noPermissionHint')}
      </Typography.Text>
    </div>
  )
}

interface AttachmentListProps {
  attachments: AttachmentRecord[]
  canDeleteAttachment: boolean
  isImageAttachment: (attachment: AttachmentRecord) => boolean
  isPdfAttachment: (attachment: AttachmentRecord) => boolean
  onDelete: (id: string) => void
  onDownload: (attachment: AttachmentRecord) => void
  onOpenImagePreview: (attachment: AttachmentRecord) => void
  onOpenPdfPreview: (attachment: AttachmentRecord) => void
  t: (key: string) => string
}

function AttachmentList({
  attachments,
  canDeleteAttachment,
  isImageAttachment,
  isPdfAttachment,
  onDelete,
  onDownload,
  onOpenImagePreview,
  onOpenPdfPreview,
  t,
}: AttachmentListProps) {
  if (!attachments.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t('modules.attachment.noAttachments')}
      />
    )
  }

  return (
    <Flex vertical gap={12}>
      {attachments.map((item) => (
        <Card key={item.id} size="small">
          <Flex align="center" justify="space-between" gap={16}>
            <Space align="start" size={12} className="flex-1 min-w-0">
              {isImageAttachment(item) ? (
                <button
                  type="button"
                  className="module-attachment-preview-thumb"
                  onClick={() => onOpenImagePreview(item)}
                >
                  <Image
                    preview={false}
                    src={item.previewUrl || item.downloadUrl}
                    alt={item.originalFileName || item.fileName || item.name}
                    width={56}
                    height={56}
                  />
                </button>
              ) : isPdfAttachment(item) ? (
                <button
                  type="button"
                  className="module-attachment-preview-thumb"
                  onClick={() => onOpenPdfPreview(item)}
                >
                  <span className="module-attachment-pdf-icon">PDF</span>
                </button>
              ) : (
                <span className="module-attachment-file-icon">
                  <PaperClipOutlined />
                </span>
              )}
              <Space orientation="vertical" size={0} className="min-w-0">
                <Typography.Text strong ellipsis>
                  {item.originalFileName || item.fileName || item.name}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {((item.fileSize || 0) / 1024).toFixed(1)} KB ·{' '}
                  {formatDateTime(item.uploadTime, '--')}
                </Typography.Text>
              </Space>
            </Space>
            <Space size={0}>
              {isImageAttachment(item) || isPdfAttachment(item) ? (
                <Button
                  key="preview"
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => {
                    if (isPdfAttachment(item)) onOpenPdfPreview(item)
                    else onOpenImagePreview(item)
                  }}
                />
              ) : null}
              <Button
                key="download"
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => onDownload(item)}
              />
              {canDeleteAttachment ? (
                <Button
                  key="delete"
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    onDelete(item.id)
                  }}
                />
              ) : null}
            </Space>
          </Flex>
        </Card>
      ))}
    </Flex>
  )
}

interface AttachmentPreviewLayersProps {
  imageAttachments: AttachmentRecord[]
  pdfPreviewOpen: boolean
  pdfPreviewUrl: string
  previewOpen: boolean
  previewSource: string
  onPdfPreviewOpenChange: (visible: boolean) => void
  onImagePreviewChange: (visible: boolean) => void
  t: (key: string) => string
}

function AttachmentPreviewLayers({
  imageAttachments,
  pdfPreviewOpen,
  pdfPreviewUrl,
  previewOpen,
  previewSource,
  onPdfPreviewOpenChange,
  onImagePreviewChange,
  t,
}: AttachmentPreviewLayersProps) {
  return (
    <>
      {imageAttachments.length ? (
        <Image.PreviewGroup
          preview={{
            visible: previewOpen,
            current: Math.max(
              imageAttachments.findIndex(
                (item) =>
                  (item.previewUrl || item.downloadUrl || '') === previewSource,
              ),
              0,
            ),
            onVisibleChange: onImagePreviewChange,
          }}
        >
          <div className="hidden">
            {imageAttachments.map((item) => (
              <Image
                key={item.id}
                src={item.previewUrl || item.downloadUrl}
                alt={item.originalFileName || item.fileName || item.name}
              />
            ))}
          </div>
        </Image.PreviewGroup>
      ) : null}
      <Modal
        title={t('modules.attachment.pdfPreview')}
        open={pdfPreviewOpen}
        onCancel={() => onPdfPreviewOpenChange(false)}
        footer={null}
        width="90%"
        className="modal-top-20"
        destroyOnClose
      >
        {pdfPreviewUrl ? (
          <iframe
            src={pdfPreviewUrl}
            className="w-full border-none pdf-preview-iframe"
            title="PDF Preview"
            sandbox="allow-same-origin"
          />
        ) : null}
      </Modal>
    </>
  )
}

export function ModuleAttachmentModal({
  open,
  moduleKey,
  resourceKey,
  recordId,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const can = usePermissionStore((state) => state.can)
  const resolvedResource = resourceKey || moduleKey
  const [state, setState] = useReducer(
    (prev: AttachmentModalState, patch: Partial<AttachmentModalState>) => ({
      ...prev,
      ...patch,
    }),
    attachmentModalInitialState,
  )
  const {
    attachments,
    loading,
    uploading,
    previewOpen,
    previewSource,
    pdfPreviewUrl,
    pdfPreviewOpen,
  } = state
  const pasteZoneRef = useRef<HTMLDivElement | null>(null)
  const canCreateAttachment = can(resolvedResource, 'update')
  const canDeleteAttachment = can(resolvedResource, 'delete')

  const fetchAttachments = async () => {
    if (!recordId) return
    setState({ loading: true })
    try {
      setState({
        attachments: await fetchAttachmentList(moduleKey, recordId),
        loading: false,
      })
    } catch {
      /* ignore */
      setState({ loading: false })
    }
  }

  const bindAttachment = async (attachmentId: string) => {
    const latestBindings = await getAttachmentBindings(moduleKey, recordId)
    const latestAttachmentIds = (latestBindings.data?.attachments || []).map(
      (item) => item.id,
    )
    await updateAttachmentBindings(moduleKey, recordId, [
      ...latestAttachmentIds,
      attachmentId,
    ])
  }

  const handleUpload = async (file: File) => {
    setState({ uploading: true })
    try {
      const uploadRes = await uploadAttachment(file, moduleKey)
      const attachmentId = asString(uploadRes.data?.id).trim()
      if (!attachmentId) {
        message.error(t('modules.attachment.uploadNoId'))
        setState({ uploading: false })
        return false
      }
      await bindAttachment(attachmentId)
      message.success(t('modules.attachment.uploadBindSuccess'))
      await fetchAttachments()
      setState({ uploading: false })
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('modules.attachment.uploadFailed'))
      setState({ uploading: false })
    }
    return false
  }

  const isImageAttachment = (attachment: AttachmentRecord) => {
    if (attachment.previewType === 'image') return true
    if (attachment.contentType?.startsWith('image/')) return true
    const fileName = String(
      attachment.originalFileName ||
        attachment.fileName ||
        attachment.name ||
        '',
    ).toLowerCase()
    return /\.(png|jpe?g|gif|bmp|webp|svg)$/.test(fileName)
  }

  const isPdfAttachment = (attachment: AttachmentRecord) => {
    if (attachment.previewType === 'pdf') return true
    if (attachment.contentType === 'application/pdf') return true
    const fileName = String(
      attachment.originalFileName ||
        attachment.fileName ||
        attachment.name ||
        '',
    ).toLowerCase()
    return fileName.endsWith('.pdf')
  }

  const openImagePreview = (attachment: AttachmentRecord) => {
    const src = attachment.previewUrl || attachment.downloadUrl || ''
    if (!src) {
      message.warning(t('modules.attachment.noPreviewUrl'))
      return
    }
    setState({ previewSource: src, previewOpen: true })
  }

  const openPdfPreview = (attachment: AttachmentRecord) => {
    const src = attachment.previewUrl || attachment.downloadUrl || ''
    if (!src) {
      message.warning(t('modules.attachment.noPreviewUrl'))
      return
    }
    setState({ pdfPreviewUrl: src, pdfPreviewOpen: true })
  }

  const imageAttachments = attachments.filter(isImageAttachment)

  const handleDownload = (attachment: AttachmentRecord) => {
    if (!attachment.downloadUrl) {
      message.warning(t('modules.attachment.noDownloadUrl'))
      return
    }
    window.open(attachment.downloadUrl, '_blank', 'noopener,noreferrer')
  }

  const handleDelete = async (id: string) => {
    try {
      await updateAttachmentBindings(
        moduleKey,
        recordId,
        attachments.flatMap((item) =>
          String(item.id) !== id ? [item.id] : [],
        ),
      )
      message.success(t('modules.attachment.unbindSuccess'))
      await fetchAttachments()
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('modules.attachment.deleteFailed'))
    }
  }

  useEffect(() => {
    if (!open) {
      return
    }

    const uploadPastedFile = async (file: File) => {
      setState({ uploading: true })
      try {
        const uploadRes = await uploadAttachment(file, moduleKey)
        const attachmentId = asString(uploadRes.data?.id).trim()
        if (!attachmentId) {
          message.error(t('modules.attachment.uploadNoId'))
          setState({ uploading: false })
          return
        }
        const latestBindings = await getAttachmentBindings(moduleKey, recordId)
        const latestAttachmentIds = (
          latestBindings.data?.attachments || []
        ).map((item) => item.id)
        await updateAttachmentBindings(moduleKey, recordId, [
          ...latestAttachmentIds,
          attachmentId,
        ])
        message.success(t('modules.attachment.uploadBindSuccess'))
        setState({
          attachments: await fetchAttachmentList(moduleKey, recordId),
          uploading: false,
        })
      } catch (err) {
        message.error(err instanceof Error ? err.message : t('modules.attachment.uploadFailed'))
        setState({ uploading: false })
      }
    }

    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null
      if (!pasteZoneRef.current?.contains(target)) {
        return
      }

      const clipboardItems = Array.from(event.clipboardData?.items || [])
      const files = clipboardItems
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file))

      if (!canCreateAttachment || !files.length) {
        return
      }

      event.preventDefault()
      void (async () => {
        await Promise.allSettled(files.map((file) => uploadPastedFile(file)))
      })()
    }

    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }, [canCreateAttachment, moduleKey, open, recordId, t])

  return (
    <Modal
      title={t('modules.attachment.title')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      afterOpenChange={(visible) => {
        if (visible) void fetchAttachments()
      }}
    >
      <AttachmentUploadZone
        canCreateAttachment={canCreateAttachment}
        uploading={uploading}
        pasteZoneRef={pasteZoneRef}
        onUpload={handleUpload}
        t={t}
      />
      <Spin spinning={loading}>
        <AttachmentList
          attachments={attachments}
          canDeleteAttachment={canDeleteAttachment}
          isImageAttachment={isImageAttachment}
          isPdfAttachment={isPdfAttachment}
          onDelete={(id) => {
            void handleDelete(id)
          }}
          onDownload={handleDownload}
          onOpenImagePreview={openImagePreview}
          onOpenPdfPreview={openPdfPreview}
          t={t}
        />
      </Spin>
      <AttachmentPreviewLayers
        imageAttachments={imageAttachments}
        pdfPreviewOpen={pdfPreviewOpen}
        pdfPreviewUrl={pdfPreviewUrl}
        previewOpen={previewOpen}
        previewSource={previewSource}
        onPdfPreviewOpenChange={(visible) =>
          setState({ pdfPreviewOpen: visible })
        }
        onImagePreviewChange={(visible) => {
          setState({
            previewOpen: visible,
            previewSource: visible ? previewSource : '',
          })
        }}
        t={t}
      />
    </Modal>
  )
}
