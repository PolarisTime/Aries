/** @file-dynamic-ref:route — 数据库操作卡片，由 DatabaseBackupView 内部引用 */
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Row from 'antd/es/row'
import Typography from 'antd/es/typography'

interface Props {
  canExport: boolean
  canImport: boolean
  exportLoading: boolean
  importLoading: boolean
  totpDisabled: boolean
  onExport: () => void
  onImport: () => void
}

interface ActionCardProps {
  icon: React.ReactNode
  title: string
  description: string
  canShowAction: boolean
  buttonText: string
  buttonDanger?: boolean
  loading: boolean
  disabled: boolean
  onClick: () => void
}

function ActionCard({
  icon,
  title,
  description,
  canShowAction,
  buttonText,
  buttonDanger,
  loading,
  disabled,
  onClick,
}: ActionCardProps) {
  return (
    <Card hoverable>
      <div className="text-center mb-16">{icon}</div>
      <Typography.Title level={5} className="text-center">
        {title}
      </Typography.Title>
      <Typography.Paragraph type="secondary" className="text-center">
        {description}
      </Typography.Paragraph>
      {canShowAction && (
        <Button
          type="primary"
          danger={buttonDanger}
          loading={loading}
          disabled={disabled}
          size="large"
          block
          onClick={onClick}
        >
          {buttonText}
        </Button>
      )}
    </Card>
  )
}

export function DatabaseBackupActionsCard({
  canExport,
  canImport,
  exportLoading,
  importLoading,
  totpDisabled,
  onExport,
  onImport,
}: Props) {
  return (
    <Card className="mb-4">
      {totpDisabled && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          title="当前账号未启用 2FA，数据库导出和导入已禁止。请先完成 2FA 绑定。"
        />
      )}
      <Alert
        type="info"
        showIcon
        className="mb-6"
        title="数据库备份管理"
        description="导出已改为后台任务，完成后提供 7 天有效下载链接；导入恢复需填写数据库用户名和密码，导入前会自动创建一份当前数据库的备份。"
      />
      <Row gutter={20}>
        <Col span={12}>
          <ActionCard
            icon={<DownloadOutlined className="text-4xl text-primary" />}
            title="后台导出"
            description="将当前数据库导出为 SQL 备份文件，完成后提供下载链接"
            canShowAction={canExport}
            buttonText="提交导出"
            loading={exportLoading}
            disabled={totpDisabled}
            onClick={onExport}
          />
        </Col>
        <Col span={12}>
          <ActionCard
            icon={<UploadOutlined className="text-4xl text-error" />}
            title="导入恢复"
            description="从 SQL 备份文件恢复数据库（自动备份前置）"
            canShowAction={canImport}
            buttonText="导入备份"
            buttonDanger
            loading={importLoading}
            disabled={totpDisabled}
            onClick={onImport}
          />
        </Col>
      </Row>
    </Card>
  )
}
