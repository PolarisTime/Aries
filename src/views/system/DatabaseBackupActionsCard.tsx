import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Typography from 'antd/es/typography'

interface Props {
  canExport: boolean
  canImport: boolean
  onExport: () => void
  onImport: () => void
}

export function DatabaseBackupActionsCard({ canExport, canImport, onExport, onImport }: Props) {
  return (
    <Card title="备份操作" className="mb-16">
      <Typography.Paragraph type="secondary" className="mb-12">
        导出数据库完整备份（需验证 2FA），或从备份文件恢复数据。
      </Typography.Paragraph>
      <div className="flex gap-8">
        <Button icon={<DownloadOutlined />} disabled={!canExport} onClick={onExport}>
          导出备份
        </Button>
        <Button icon={<UploadOutlined />} disabled={!canImport} onClick={onImport}>
          导入备份
        </Button>
      </div>
    </Card>
  )
}
