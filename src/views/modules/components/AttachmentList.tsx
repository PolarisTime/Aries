import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  PaperClipOutlined,
} from '@ant-design/icons'
import { Button, Card, Empty, Flex, Space, Tag, Typography } from 'antd'
import type { AttachmentRecord } from '@/api/business'
import { formatDateTime } from '@/utils/formatters'
import {
  getAttachmentDisplayName,
  getStorageLabel,
  getStorageTagColor,
  isImageAttachment,
  isPdfAttachment,
} from './module-attachment-utils'

interface AttachmentListProps {
  attachments: AttachmentRecord[]
  canDeleteAttachment: boolean
  onDelete: (id: string) => void
  onDownload: (attachment: AttachmentRecord) => Promise<void>
  onOpenImagePreview: (attachment: AttachmentRecord) => Promise<void>
  onOpenPdfPreview: (attachment: AttachmentRecord) => Promise<void>
  t: (key: string) => string
}

export function AttachmentList({
  attachments,
  canDeleteAttachment,
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
