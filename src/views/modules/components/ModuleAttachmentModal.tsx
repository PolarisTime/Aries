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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type AttachmentRecord,
  getAttachmentBindings,
  updateAttachmentBindings,
  uploadAttachment,
} from '@/api/business'
import { usePermissionStore } from '@/stores/permissionStore'
import { message } from '@/utils/antd-app'

interface Props {
  open: boolean
  moduleKey: string
  resourceKey?: string
  recordId: string
  onClose: () => void
}

export function ModuleAttachmentModal({
  open,
  moduleKey,
  resourceKey,
  recordId,
  onClose,
}: Props) {
  const can = usePermissionStore((state) => state.can)
  const resolvedResource = resourceKey || moduleKey
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSource, setPreviewSource] = useState('')
  const pasteZoneRef = useRef<HTMLDivElement | null>(null)
  const canCreateAttachment = can(resolvedResource, 'update')
  const canDeleteAttachment = can(resolvedResource, 'delete')

  const fetchAttachments = useCallback(async () => {
    if (!recordId) return
    setLoading(true)
    try {
      const res = await getAttachmentBindings(moduleKey, recordId)
      setAttachments(res.data?.attachments || [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
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

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const uploadRes = await uploadAttachment(file, moduleKey)
      const attachmentId = String(uploadRes.data?.id || '').trim()
      if (!attachmentId) {
        throw new Error('上传成功但未返回附件标识')
      }
      await bindAttachment(attachmentId)
      message.success('上传并绑定成功')
      await fetchAttachments()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
    }
    return false
  }, [bindAttachment, fetchAttachments, moduleKey])

  const isImageAttachment = useCallback((attachment: AttachmentRecord) => {
    if (attachment.previewType === 'image') {
      return true
    }
    if (attachment.contentType?.startsWith('image/')) {
      return true
    }
    const fileName = String(
      attachment.originalFileName || attachment.fileName || attachment.name || '',
    ).toLowerCase()
    return /\.(png|jpe?g|gif|bmp|webp|svg)$/.test(fileName)
  }, [])

  const openPreview = useCallback((attachment: AttachmentRecord) => {
    const src = attachment.previewUrl || attachment.downloadUrl || ''
    if (!src) {
      message.warning('当前附件暂无预览地址')
      return
    }
    setPreviewSource(src)
    setPreviewOpen(true)
  }, [])

  const imageAttachments = useMemo(
    () => attachments.filter(isImageAttachment),
    [attachments, isImageAttachment],
  )

  const handleDownload = (attachment: AttachmentRecord) => {
    if (!attachment.downloadUrl) {
      message.warning('当前附件暂无下载地址')
      return
    }
    window.open(attachment.downloadUrl, '_blank', 'noopener,noreferrer')
  }

  const handleDelete = async (id: string) => {
    try {
      await updateAttachmentBindings(
        moduleKey,
        recordId,
        attachments
          .filter((item) => String(item.id) !== id)
          .map((item) => item.id),
      )
      message.success('解除绑定成功')
      await fetchAttachments()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '删除失败')
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
        for (const file of files) {
          await handleUpload(file)
        }
      })()
    }

    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }, [canCreateAttachment, handleUpload, open])

  return (
    <Modal
      title="附件管理"
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      afterOpenChange={(visible) => {
        if (visible) void fetchAttachments()
      }}
    >
      <div
        ref={pasteZoneRef}
        className="module-attachment-upload-shell"
        tabIndex={0}
      >
        {canCreateAttachment ? (
          <Upload
            beforeUpload={(f) => {
              void handleUpload(f)
              return false
            }}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />} loading={uploading}>
              上传附件
            </Button>
          </Upload>
        ) : null}
        <Typography.Text
          type="secondary"
          className="module-attachment-upload-hint"
        >
          {canCreateAttachment
            ? '支持点击上传，也支持在此区域内直接粘贴图片或文件'
            : '当前账号无附件新增权限，可查看和下载已有附件'}
        </Typography.Text>
      </div>
      <Spin spinning={loading}>
        {attachments.length > 0 ? (
          <Flex vertical gap={12}>
            {attachments.map((item) => (
              <Card key={item.id} size="small">
                <Flex align="center" justify="space-between" gap={16}>
                  <Space
                    align="start"
                    size={12}
                    style={{ minWidth: 0, flex: 1 }}
                  >
                    {isImageAttachment(item) ? (
                      <button
                        type="button"
                        className="module-attachment-preview-thumb"
                        onClick={() => openPreview(item)}
                      >
                        <Image
                          preview={false}
                          src={item.previewUrl || item.downloadUrl}
                          alt={
                            item.originalFileName || item.fileName || item.name
                          }
                          width={56}
                          height={56}
                        />
                      </button>
                    ) : (
                      <span className="module-attachment-file-icon">
                        <PaperClipOutlined />
                      </span>
                    )}
                    <Space
                      orientation="vertical"
                      size={0}
                      style={{ minWidth: 0 }}
                    >
                      <Typography.Text strong ellipsis>
                        {item.originalFileName || item.fileName || item.name}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        {((item.fileSize || 0) / 1024).toFixed(1)} KB ·{' '}
                        {String(item.uploadTime || '')}
                      </Typography.Text>
                    </Space>
                  </Space>
                  <Space size={0}>
                    {isImageAttachment(item) ? (
                      <Button
                        key="preview"
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => openPreview(item)}
                      />
                    ) : null}
                    <Button
                      key="download"
                      type="link"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(item)}
                    />
                    {canDeleteAttachment ? (
                      <Button
                        key="delete"
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        oonClick={() => { void () => handleDelete(item.id) }}
                      />
                    ) : null}
                  </Space>
                </Flex>
              </Card>
            ))}
          </Flex>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无附件" />
        )}
      </Spin>
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
            onVisibleChange: (visible) => {
              setPreviewOpen(visible)
              if (!visible) {
                setPreviewSource('')
              }
            },
          }}
        >
          <div style={{ display: 'none' }}>
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
    </Modal>
  )
}
