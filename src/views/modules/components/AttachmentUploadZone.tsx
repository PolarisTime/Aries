import { UploadOutlined } from '@ant-design/icons'
import { Button, Progress, Typography, Upload } from 'antd'
import type { RefObject } from 'react'

interface AttachmentUploadZoneProps {
  uploading: boolean
  uploadFileName: string
  uploadProgress: number
  pasteZoneRef: RefObject<HTMLDivElement | null>
  onUpload: (file: File) => Promise<boolean>
  t: (key: string, options?: Record<string, unknown>) => string
}

export function AttachmentUploadZone({
  uploading,
  uploadFileName,
  uploadProgress,
  pasteZoneRef,
  onUpload,
  t,
}: AttachmentUploadZoneProps) {
  return (
    <div ref={pasteZoneRef} className="module-attachment-upload-shell">
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
      <Typography.Text
        type="secondary"
        className="module-attachment-upload-hint"
      >
        {uploading
          ? t('modules.attachment.uploadingProgress', {
              fileName: uploadFileName,
              percent: uploadProgress,
            })
          : t('modules.attachment.uploadHint')}
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
