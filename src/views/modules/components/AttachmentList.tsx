import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  PaperClipOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Empty,
  Flex,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
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
  loadError: string
  loading: boolean
  onDelete: (id: string) => Promise<void> | void
  onDownload: (attachment: AttachmentRecord) => Promise<void>
  onOpenImagePreview: (attachment: AttachmentRecord) => Promise<void>
  onOpenPdfPreview: (attachment: AttachmentRecord) => Promise<void>
  onRetry: () => void
  t: (key: string) => string
}

function toVoidCallback(callback: () => unknown): () => void {
  return callback
}

export function AttachmentList({
  attachments,
  loadError,
  loading,
  onDelete,
  onDownload,
  onOpenImagePreview,
  onOpenPdfPreview,
  onRetry,
  t,
}: AttachmentListProps) {
  if (loadError) {
    return (
      <Alert
        type="error"
        showIcon
        title={t('modules.attachment.loadFailed')}
        description={loadError}
        action={
          <Button
            type="primary"
            size="small"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={onRetry}
          >
            {t('error.retry')}
          </Button>
        }
      />
    )
  }

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
      {attachments.map((item) => {
        const displayName = getAttachmentDisplayName(item)
        const previewLabel = `${t('modules.attachment.preview')} ${displayName}`
        return (
          <Card key={item.id} size="small">
            <Flex align="center" justify="space-between" gap={16}>
              <Space align="start" size={12} className="flex-1 min-w-0">
                {isImageAttachment(item) ? (
                  <Tooltip title={t('modules.attachment.preview')}>
                    <button
                      type="button"
                      className="module-attachment-preview-thumb"
                      aria-label={previewLabel}
                      onClick={() => {
                        void onOpenImagePreview(item)
                      }}
                    >
                      <span className="module-attachment-file-icon">
                        <PaperClipOutlined />
                      </span>
                    </button>
                  </Tooltip>
                ) : isPdfAttachment(item) ? (
                  <Tooltip title={t('modules.attachment.preview')}>
                    <button
                      type="button"
                      className="module-attachment-preview-thumb"
                      aria-label={previewLabel}
                      onClick={() => {
                        void onOpenPdfPreview(item)
                      }}
                    >
                      <span className="module-attachment-pdf-icon">PDF</span>
                    </button>
                  </Tooltip>
                ) : (
                  <span className="module-attachment-file-icon">
                    <PaperClipOutlined />
                  </span>
                )}
                <Space orientation="vertical" size={0} className="min-w-0">
                  <Typography.Text strong ellipsis>
                    {displayName}
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
                  <Tooltip title={t('modules.attachment.preview')}>
                    <Button
                      key="preview"
                      type="link"
                      icon={<EyeOutlined />}
                      aria-label={previewLabel}
                      onClick={() => {
                        if (isPdfAttachment(item)) void onOpenPdfPreview(item)
                        else void onOpenImagePreview(item)
                      }}
                    />
                  </Tooltip>
                ) : null}
                <Tooltip title={t('modules.attachment.download')}>
                  <Button
                    key="download"
                    type="link"
                    icon={<DownloadOutlined />}
                    aria-label={`${t('modules.attachment.download')} ${displayName}`}
                    onClick={() => {
                      void onDownload(item)
                    }}
                  />
                </Tooltip>
                <Tooltip title={t('modules.attachment.unbind')}>
                  <span>
                    <Popconfirm
                      title={t('modules.attachment.unbind')}
                      description={t('modules.attachment.unbindConfirm')}
                      okText={t('common.confirm')}
                      cancelText={t('common.cancel')}
                      okButtonProps={{ danger: true }}
                      onConfirm={toVoidCallback(() => onDelete(item.id))}
                    >
                      <Button
                        key="delete"
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={`${t('modules.attachment.unbind')} ${displayName}`}
                      />
                    </Popconfirm>
                  </span>
                </Tooltip>
              </Space>
            </Flex>
          </Card>
        )
      })}
    </Flex>
  )
}
