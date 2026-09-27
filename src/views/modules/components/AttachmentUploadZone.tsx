import { InboxOutlined } from '@ant-design/icons'
import { Progress, Typography, Upload } from 'antd'
import type { RefObject } from 'react'

interface AttachmentUploadZoneProps {
  uploading: boolean
  uploadFileName: string
  uploadProgress: number
  pasteZoneRef: RefObject<HTMLDivElement | null>
  /**
   * 单文件上传回调：多选时 rc-upload 会为每个文件各调用一次（逐个上报）。
   * 调用方负责串行排队，避免共享的上传进度互相覆盖；返回值被忽略
   * （调用方内部完成进度与失败提示，返回类型声明为 void 以允许 async 实现）。
   */
  onUpload: (file: File) => void
  t: (key: string, options?: Record<string, unknown>) => string
}

/**
 * 附件上传区：拖拽（Upload.Dragger）+ 多选（multiple）+ 点击选择，三通道共用
 * <code>beforeUpload</code> 逐文件上报；返回 false 让 antd 只维护自身选择队列、
 * 不自行发起请求，实际上传、进度与失败重试由调用方串行队列负责。
 *
 * <p>外层容器仍挂 <code>pasteZoneRef</code>，Ctrl+V 粘贴上传（见
 * useModuleAttachmentModal 的 window paste 监听）依赖该引用判断焦点区域。</p>
 */
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
      <Upload.Dragger
        multiple
        showUploadList={false}
        className="module-attachment-upload-dragger"
        beforeUpload={(file) => {
          onUpload(file)
          return false
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
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
      </Upload.Dragger>
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
