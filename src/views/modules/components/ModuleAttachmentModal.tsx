import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  PaperClipOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Empty,
  Flex,
  Image,
  Modal,
  Progress,
  Space,
  Spin,
  Tag,
  Typography,
  Upload,
} from 'antd'
import {
  type RefObject,
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  type AttachmentRecord,
  getAttachmentBindings,
  getAttachmentBlob,
  getPresignedAttachmentBlob,
  resolveAttachmentAccessUrl,
  updateAttachmentBindings,
  uploadAttachment,
} from '@/api/business'
import { usePermissionStore } from '@/stores/permissionStore'
import { message } from '@/utils/antd-app'
import { downloadBlob } from '@/utils/download'
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

function getAttachmentFileName(attachment: AttachmentRecord) {
  return String(
    attachment.originalFileName || attachment.fileName || attachment.name || '',
  ).toLowerCase()
}

function isImageAttachment(attachment: AttachmentRecord) {
  if (attachment.previewType === 'image') return true
  if (attachment.contentType?.startsWith('image/')) return true
  return /\.(png|jpe?g|gif|bmp|webp|svg)$/.test(
    getAttachmentFileName(attachment),
  )
}

function isPdfAttachment(attachment: AttachmentRecord) {
  if (attachment.previewType === 'pdf') return true
  if (attachment.contentType === 'application/pdf') return true
  return getAttachmentFileName(attachment).endsWith('.pdf')
}

function getStorageLabel(attachment: AttachmentRecord) {
  if (attachment.storageLabel?.trim()) {
    return attachment.storageLabel.trim()
  }
  return attachment.storageType === 's3' ? 'S3存储' : '本机存储'
}

function getStorageTagColor(attachment: AttachmentRecord) {
  return attachment.storageType === 's3' ? 'blue' : 'default'
}

function getAttachmentDisplayName(attachment: AttachmentRecord) {
  return attachment.originalFileName || attachment.fileName || attachment.name
}

function getPreviewCandidateUrl(attachment: AttachmentRecord) {
  return attachment.previewUrl || attachment.downloadUrl || ''
}

interface AttachmentModalState {
  attachments: AttachmentRecord[]
  loading: boolean
  uploading: boolean
  uploadFileName: string
  uploadProgress: number
  previewOpen: boolean
  previewSource: string
  previewUrlByAttachmentId: Record<string, string>
  pdfPreviewUrl: string
  pdfPreviewOpen: boolean
}

const attachmentModalInitialState: AttachmentModalState = {
  attachments: [],
  loading: false,
  uploading: false,
  uploadFileName: '',
  uploadProgress: 0,
  previewOpen: false,
  previewSource: '',
  previewUrlByAttachmentId: {},
  pdfPreviewUrl: '',
  pdfPreviewOpen: false,
}

type AttachmentModalPatch =
  | Partial<AttachmentModalState>
  | ((prev: AttachmentModalState) => Partial<AttachmentModalState>)

interface AttachmentUploadZoneProps {
  canCreateAttachment: boolean
  uploading: boolean
  uploadFileName: string
  uploadProgress: number
  pasteZoneRef: RefObject<HTMLDivElement | null>
  onUpload: (file: File) => Promise<boolean>
  t: (key: string, options?: Record<string, unknown>) => string
}

function AttachmentUploadZone({
  canCreateAttachment,
  uploading,
  uploadFileName,
  uploadProgress,
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
        {uploading
          ? t('modules.attachment.uploadingProgress', {
              fileName: uploadFileName,
              percent: uploadProgress,
            })
          : canCreateAttachment
            ? t('modules.attachment.uploadHint')
            : t('modules.attachment.noPermissionHint')}
      </Typography.Text>
      {uploading ? (
        <Progress
          percent={uploadProgress}
          size="small"
          status={uploadProgress >= 100 ? 'success' : 'active'}
        />
      ) : null}
    </div>
  )
}

interface AttachmentListProps {
  attachments: AttachmentRecord[]
  canDeleteAttachment: boolean
  isImageAttachment: (attachment: AttachmentRecord) => boolean
  isPdfAttachment: (attachment: AttachmentRecord) => boolean
  onDelete: (id: string) => void
  onDownload: (attachment: AttachmentRecord) => Promise<void>
  onOpenImagePreview: (attachment: AttachmentRecord) => Promise<void>
  onOpenPdfPreview: (attachment: AttachmentRecord) => Promise<void>
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
                  onClick={() => {
                    void onOpenImagePreview(item)
                  }}
                >
                  <span className="module-attachment-file-icon">
                    <PaperClipOutlined />
                  </span>
                </button>
              ) : isPdfAttachment(item) ? (
                <button
                  type="button"
                  className="module-attachment-preview-thumb"
                  onClick={() => {
                    void onOpenPdfPreview(item)
                  }}
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
                  {getAttachmentDisplayName(item)}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {((item.fileSize || 0) / 1024).toFixed(1)} KB ·{' '}
                  {formatDateTime(item.uploadTime, '--')}
                </Typography.Text>
                <Tag
                  color={getStorageTagColor(item)}
                  className="module-attachment-storage-tag"
                >
                  {getStorageLabel(item)}
                </Tag>
              </Space>
            </Space>
            <Space size={0}>
              {isImageAttachment(item) || isPdfAttachment(item) ? (
                <Button
                  key="preview"
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => {
                    if (isPdfAttachment(item)) void onOpenPdfPreview(item)
                    else void onOpenImagePreview(item)
                  }}
                />
              ) : null}
              <Button
                key="download"
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => {
                  void onDownload(item)
                }}
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
  previewUrlByAttachmentId: Record<string, string>
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
  previewUrlByAttachmentId,
  onPdfPreviewOpenChange,
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
        onCancel={() => onPdfPreviewOpenChange(false)}
        footer={null}
        width="90%"
        className="modal-top-20"
        destroyOnHidden
      >
        {pdfPreviewUrl ? (
          <iframe
            src={pdfPreviewUrl}
            className="w-full border-none pdf-preview-iframe"
            title="PDF Preview"
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
    (prev: AttachmentModalState, patch: AttachmentModalPatch) => ({
      ...prev,
      ...(typeof patch === 'function' ? patch(prev) : patch),
    }),
    attachmentModalInitialState,
  )
  const {
    attachments,
    loading,
    uploading,
    uploadFileName,
    uploadProgress,
    previewOpen,
    previewSource,
    previewUrlByAttachmentId,
    pdfPreviewUrl,
    pdfPreviewOpen,
  } = state
  const pasteZoneRef = useRef<HTMLDivElement | null>(null)
  const objectUrlRef = useRef<Set<string>>(new Set())
  const canCreateAttachment = can(resolvedResource, 'update')
  const canDeleteAttachment = can(resolvedResource, 'delete')

  const createTrackedObjectUrl = useCallback((blob: Blob) => {
    const objectUrl = URL.createObjectURL(blob)
    objectUrlRef.current.add(objectUrl)
    return objectUrl
  }, [])

  const revokeTrackedObjectUrls = useCallback(() => {
    for (const objectUrl of objectUrlRef.current) {
      URL.revokeObjectURL(objectUrl)
    }
    objectUrlRef.current.clear()
  }, [])

  const resolveAttachmentUrl = useCallback(
    async (attachment: AttachmentRecord, inline: boolean) => {
      const sourceUrl = inline
        ? getPreviewCandidateUrl(attachment)
        : attachment.downloadUrl || ''
      if (!sourceUrl) {
        return ''
      }

      const access = await resolveAttachmentAccessUrl(
        sourceUrl,
        moduleKey,
        inline,
      )
      if (access.url) {
        return access.url
      }

      const blob = await getAttachmentBlob(sourceUrl)
      return createTrackedObjectUrl(blob)
    },
    [createTrackedObjectUrl, moduleKey],
  )

  const cachePreviewUrl = useCallback((attachmentId: string, url: string) => {
    setState((prev) => ({
      previewUrlByAttachmentId: {
        ...prev.previewUrlByAttachmentId,
        [attachmentId]: url,
      },
    }))
  }, [])

  const ensurePreviewUrl = async (attachment: AttachmentRecord) => {
    const cachedUrl = previewUrlByAttachmentId[attachment.id]
    if (cachedUrl) {
      return cachedUrl
    }

    const url = await resolveAttachmentUrl(attachment, true)
    if (url) {
      cachePreviewUrl(attachment.id, url)
    }
    return url
  }

  const fetchAttachments = useCallback(async () => {
    if (!recordId) return
    setState({ loading: true })
    try {
      setState({
        attachments: await fetchAttachmentList(moduleKey, recordId),
        loading: false,
        previewUrlByAttachmentId: {},
      })
    } catch {
      /* ignore */
      setState({ loading: false })
    }
  }, [moduleKey, recordId])

  const bindAttachment = useCallback(
    async (attachmentId: string) => {
      const latestBindings = await getAttachmentBindings(moduleKey, recordId)
      const latestAttachmentIds = (latestBindings.data?.attachments || []).map(
        (item) => item.id,
      )
      await updateAttachmentBindings(moduleKey, recordId, [
        ...latestAttachmentIds,
        attachmentId,
      ])
    },
    [moduleKey, recordId],
  )

  const uploadAndBindAttachment = useCallback(
    async (file: File) => {
      setState({
        uploading: true,
        uploadFileName: file.name,
        uploadProgress: 0,
      })
      try {
        const uploadRes = await uploadAttachment(
          file,
          moduleKey,
          'PAGE_UPLOAD',
          {
            onProgress: (percent) => {
              setState({ uploadProgress: percent })
            },
          },
        )
        const attachmentId = asString(uploadRes.data?.id).trim()
        if (!attachmentId) {
          message.error(t('modules.attachment.uploadNoId'))
          setState({ uploading: false, uploadFileName: '', uploadProgress: 0 })
          return false
        }
        await bindAttachment(attachmentId)
        message.success(t('modules.attachment.uploadBindSuccess'))
        await fetchAttachments()
        setState({ uploading: false, uploadFileName: '', uploadProgress: 0 })
      } catch (err) {
        message.error(
          err instanceof Error
            ? err.message
            : t('modules.attachment.uploadFailed'),
        )
        setState({ uploading: false, uploadFileName: '', uploadProgress: 0 })
      }
      return false
    },
    [bindAttachment, fetchAttachments, moduleKey, t],
  )

  const handleUpload = useCallback(
    async (file: File) => {
      return uploadAndBindAttachment(file)
    },
    [uploadAndBindAttachment],
  )

  const openImagePreview = async (attachment: AttachmentRecord) => {
    const src = getPreviewCandidateUrl(attachment)
    if (!src) {
      message.warning(t('modules.attachment.noPreviewUrl'))
      return
    }
    try {
      const resolvedUrl = await ensurePreviewUrl(attachment)
      if (!resolvedUrl) {
        message.warning(t('modules.attachment.noPreviewUrl'))
        return
      }
      setState({ previewSource: resolvedUrl, previewOpen: true })
    } catch (err) {
      message.error(
        err instanceof Error
          ? err.message
          : t('modules.attachment.previewFailed'),
      )
    }
  }

  const openPdfPreview = async (attachment: AttachmentRecord) => {
    const src = getPreviewCandidateUrl(attachment)
    if (!src) {
      message.warning(t('modules.attachment.noPreviewUrl'))
      return
    }
    try {
      const blob = await getPresignedAttachmentBlob(src, moduleKey, true)
      setState({
        pdfPreviewUrl: createTrackedObjectUrl(blob),
        pdfPreviewOpen: true,
      })
    } catch (err) {
      message.error(
        err instanceof Error
          ? err.message
          : t('modules.attachment.previewFailed'),
      )
    }
  }

  const imageAttachments = attachments.filter(isImageAttachment)

  const handleDownload = async (attachment: AttachmentRecord) => {
    if (!attachment.downloadUrl) {
      message.warning(t('modules.attachment.noDownloadUrl'))
      return
    }
    try {
      const access = await resolveAttachmentAccessUrl(
        attachment.downloadUrl,
        moduleKey,
        false,
      )
      if (access.url) {
        window.open(access.url, '_blank', 'noopener,noreferrer')
        return
      }
      const blob = await getAttachmentBlob(attachment.downloadUrl)
      downloadBlob(blob, getAttachmentDisplayName(attachment) || 'attachment')
    } catch (err) {
      message.error(
        err instanceof Error
          ? err.message
          : t('modules.attachment.downloadFailed'),
      )
    }
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
      message.error(
        err instanceof Error
          ? err.message
          : t('modules.attachment.deleteFailed'),
      )
    }
  }

  useEffect(() => {
    if (!open) {
      return
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
        await Promise.allSettled(
          files.map((file) => uploadAndBindAttachment(file)),
        )
      })()
    }

    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }, [canCreateAttachment, open, uploadAndBindAttachment])

  useEffect(() => {
    if (!open) {
      if (previewSource || Object.keys(previewUrlByAttachmentId).length > 0) {
        setState({ previewUrlByAttachmentId: {}, previewSource: '' })
      }
      revokeTrackedObjectUrls()
      return
    }
  }, [open, previewSource, previewUrlByAttachmentId, revokeTrackedObjectUrls])

  useEffect(() => {
    return () => {
      revokeTrackedObjectUrls()
    }
  }, [revokeTrackedObjectUrls])

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
        uploadFileName={uploadFileName}
        uploadProgress={uploadProgress}
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
        previewUrlByAttachmentId={previewUrlByAttachmentId}
        onPdfPreviewOpenChange={(visible) =>
          setState({
            pdfPreviewOpen: visible,
            pdfPreviewUrl: visible ? pdfPreviewUrl : '',
          })
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
