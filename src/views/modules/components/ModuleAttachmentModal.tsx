import { useCallback, useState } from 'react'
import { Modal, Upload, Button, Card, Empty, Flex, Space, Spin, Typography } from 'antd'
import { UploadOutlined, DownloadOutlined, DeleteOutlined, PaperClipOutlined } from '@ant-design/icons'
import {
  getAttachmentBindings,
  updateAttachmentBindings,
  uploadAttachment,
  type AttachmentRecord,
} from '@/api/business'
import { message } from '@/utils/antd-app'

interface Props {
  open: boolean
  moduleKey: string
  recordId: string
  onClose: () => void
}

export function ModuleAttachmentModal({ open, moduleKey, recordId, onClose }: Props) {
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fetchAttachments = useCallback(async () => {
    if (!recordId) return
    setLoading(true)
    try {
      const res = await getAttachmentBindings(moduleKey, recordId)
      setAttachments(res.data?.attachments || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [moduleKey, recordId])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const uploadRes = await uploadAttachment(file, moduleKey)
      const attachmentId = String(uploadRes.data?.id || '').trim()
      if (!attachmentId) {
        throw new Error('上传成功但未返回附件标识')
      }
      await updateAttachmentBindings(moduleKey, recordId, [
        ...attachments.map((item) => item.id),
        attachmentId,
      ])
      message.success('上传并绑定成功')
      await fetchAttachments()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '上传失败')
    } finally { setUploading(false) }
    return false
  }

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
        attachments.filter((item) => String(item.id) !== id).map((item) => item.id),
      )
      message.success('解除绑定成功')
      await fetchAttachments()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  return (
    <Modal
      title="附件管理"
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      afterOpenChange={(visible) => { if (visible) void fetchAttachments() }}
    >
      <div className="mb-3">
        <Upload beforeUpload={(f) => { void handleUpload(f); return false }} showUploadList={false}>
          <Button icon={<UploadOutlined />} loading={uploading}>上传附件</Button>
        </Upload>
      </div>
      <Spin spinning={loading}>
        {attachments.length > 0 ? (
          <Flex vertical gap={12}>
            {attachments.map((item) => (
              <Card key={item.id} size="small">
                <Flex align="center" justify="space-between" gap={16}>
                  <Space align="start" size={12} style={{ minWidth: 0, flex: 1 }}>
                    <PaperClipOutlined />
                    <Space orientation="vertical" size={0} style={{ minWidth: 0 }}>
                      <Typography.Text strong ellipsis>
                        {item.originalFileName || item.fileName || item.name}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        {((item.fileSize || 0) / 1024).toFixed(1)} KB · {String(item.uploadTime || '')}
                      </Typography.Text>
                    </Space>
                  </Space>
                  <Space size={0}>
                    <Button key="download" type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(item)} />
                    <Button key="delete" type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(item.id)} />
                  </Space>
                </Flex>
              </Card>
            ))}
          </Flex>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无附件" />
        )}
      </Spin>
    </Modal>
  )
}
