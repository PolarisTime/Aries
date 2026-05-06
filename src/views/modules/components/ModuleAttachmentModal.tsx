import { useState } from 'react'
import { Modal, Upload, Button, Card, Empty, Flex, Space, Spin, Typography } from 'antd'
import { UploadOutlined, DownloadOutlined, DeleteOutlined, PaperClipOutlined } from '@ant-design/icons'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import { message } from '@/utils/antd-app'

interface AttachmentItem {
  id: string
  fileName: string
  fileSize: number
  createdAt: string
}

interface Props {
  open: boolean
  moduleKey: string
  recordId: string
  onClose: () => void
}

export function ModuleAttachmentModal({ open, moduleKey, recordId, onClose }: Props) {
  const [attachments, setAttachments] = useState<AttachmentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fetchAttachments = async () => {
    if (!recordId) return
    setLoading(true)
    try {
      const res = await http.get<ApiResponse<AttachmentItem[]>>(
        `${ENDPOINTS.ATTACHMENTS_BINDINGS}?moduleKey=${encodeURIComponent(moduleKey)}&recordId=${encodeURIComponent(recordId)}`,
      )
      setAttachments(res.data || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('moduleKey', moduleKey)
      formData.append('recordId', recordId)
      await http.post(ENDPOINTS.ATTACHMENTS_UPLOAD, formData)
      message.success('上传成功')
      await fetchAttachments()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '上传失败')
    } finally { setUploading(false) }
    return false
  }

  const handleDownload = (id: string) => {
    window.open(`/api/attachments/${id}/download`, '_blank')
  }

  const handleDelete = async (id: string) => {
    try {
      await http.delete(`/attachments/bindings/${id}`)
      message.success('删除成功')
      setAttachments((prev) => prev.filter((a) => a.id !== id))
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
      afterOpenChange={(visible) => { if (visible) fetchAttachments() }}
    >
      <div className="mb-3">
        <Upload beforeUpload={(f) => { handleUpload(f); return false }} showUploadList={false}>
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
                        {item.fileName}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        {(item.fileSize / 1024).toFixed(1)} KB · {item.createdAt}
                      </Typography.Text>
                    </Space>
                  </Space>
                  <Space size={0}>
                    <Button key="download" type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(item.id)} />
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
