import {
  KeyOutlined,
  RedoOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Descriptions from 'antd/es/descriptions'
import Row from 'antd/es/row'
import Statistic from 'antd/es/statistic'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getSecurityKeyOverview,
  rotateJwtSecurityKey,
  rotateTotpSecurityKey,
  type SecurityKeyOverview,
} from '@/api/security-keys'
import { TwoFactorConfirmModal } from '@/components/TwoFactorConfirmModal'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { message } from '@/utils/antd-app'
import { formatDateTime } from '@/utils/formatters'

const SECURITY_KEY_QUERY_KEY = ['security-key'] as const

type RotateType = 'jwt' | 'totp'
type SecurityKeyItem = SecurityKeyOverview[keyof SecurityKeyOverview]

interface SecurityKeyCardProps {
  item?: SecurityKeyItem
  loading: boolean
  type: RotateType
  onRotate: (type: RotateType) => void
}

function formatCount(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? String(value)
    : '--'
}

function securityKeySourceColor(source: string | undefined): string {
  if (!source) return 'default'
  const normalized = source.toUpperCase()
  if (normalized.includes('DB') || normalized.includes('DATABASE'))
    return 'green'
  if (normalized.includes('CONFIG') || normalized.includes('ENV')) return 'blue'
  return 'default'
}

function SecurityKeyCard({
  item,
  loading,
  type,
  onRotate,
}: SecurityKeyCardProps): React.JSX.Element {
  const { t } = useTranslation()
  const isJwt = type === 'jwt'
  const Icon = isJwt ? SafetyCertificateOutlined : KeyOutlined

  return (
    <Card
      className="security-key-card"
      loading={loading}
      title={
        <div className="security-key-card-title">
          <span className="security-key-card-icon">
            <Icon />
          </span>
          <span className="security-key-card-title-text">
            <span className="security-key-card-name">
              {isJwt
                ? t('system.securityKey.jwtName')
                : t('system.securityKey.totpName')}
            </span>
            <span className="security-key-card-subtitle">
              {item?.keyName || '--'}
            </span>
          </span>
        </div>
      }
      extra={
        <Tag color={securityKeySourceColor(item?.source)}>
          {item?.source || t('system.securityKey.unknown')}
        </Tag>
      }
    >
      <Descriptions
        className="security-key-descriptions"
        column={1}
        size="small"
      >
        <Descriptions.Item label={t('system.securityKey.keyCode')}>
          {item?.keyCode || '--'}
        </Descriptions.Item>
        <Descriptions.Item label={t('system.securityKey.activeVersion')}>
          {formatCount(item?.activeVersion)}
        </Descriptions.Item>
        <Descriptions.Item label={t('system.securityKey.activeFingerprint')}>
          <Typography.Text
            code
            copyable={
              item?.activeFingerprint ? { text: item.activeFingerprint } : false
            }
            className="security-key-fingerprint"
          >
            {item?.activeFingerprint || '--'}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label={t('system.securityKey.activatedAt')}>
          {formatDateTime(item?.activatedAt, '--')}
        </Descriptions.Item>
        <Descriptions.Item label={t('system.securityKey.retiredVersionCount')}>
          {formatCount(item?.retiredVersionCount)}
        </Descriptions.Item>
        <Descriptions.Item label={t('system.securityKey.protectedRecordCount')}>
          {formatCount(item?.protectedRecordCount)}
        </Descriptions.Item>
        <Descriptions.Item label={t('system.securityKey.remark')}>
          {item?.remark || '--'}
        </Descriptions.Item>
      </Descriptions>

      <div className="security-key-card-footer">
        <Button
          danger
          icon={<RedoOutlined />}
          disabled={!item}
          onClick={() => onRotate(type)}
        >
          {isJwt
            ? t('system.securityKey.rotateJwt')
            : t('system.securityKey.rotateTotp')}
        </Button>
      </div>
    </Card>
  )
}

export function SecurityKeyManagementView(): React.JSX.Element {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [totpOpen, setTotpOpen] = useState(false)
  const [rotateType, setRotateType] = useState<RotateType>('jwt')
  const isPageVisible = usePageVisibility()

  const {
    data: keys,
    isFetching,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: SECURITY_KEY_QUERY_KEY,
    queryFn: getSecurityKeyOverview,
    enabled: isPageVisible,
  })
  const overview = keys?.data
  const keyItems = [overview?.jwt, overview?.totp].filter(
    Boolean,
  ) as SecurityKeyItem[]
  const protectedRecordCount = keyItems.reduce(
    (sum, item) => sum + (item.protectedRecordCount || 0),
    0,
  )
  const retiredVersionCount = keyItems.reduce(
    (sum, item) => sum + (item.retiredVersionCount || 0),
    0,
  )

  const handleRotate = (type: RotateType): void => {
    setRotateType(type)
    setTotpOpen(true)
  }

  const handleRotateConfirm = async (code: string): Promise<void> => {
    try {
      if (rotateType === 'jwt') {
        await rotateJwtSecurityKey(code)
      } else {
        await rotateTotpSecurityKey(code)
      }
      message.success(
        t('system.securityKey.rotateSuccess', {
          type: rotateType.toUpperCase(),
        }),
      )
      setTotpOpen(false)
      void queryClient.invalidateQueries({ queryKey: SECURITY_KEY_QUERY_KEY })
    } catch (err) {
      message.error(
        err instanceof Error
          ? err.message
          : t('system.securityKey.rotateFailed'),
      )
      throw err
    }
  }

  return (
    <div className="page-stack security-key-page">
      <div className="security-key-header">
        <div>
          <Typography.Title level={4} className="security-key-title">
            {t('system.securityKey.title')}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t('system.securityKey.description')}
          </Typography.Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          loading={isFetching}
          onClick={() => {
            void refetch()
          }}
        >
          {t('system.securityKey.refresh')}
        </Button>
      </div>

      <Alert
        showIcon
        type="warning"
        className="security-key-alert"
        message={t('system.securityKey.riskTitle')}
        description={t('system.securityKey.riskDescription')}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="security-key-summary-card" loading={isLoading}>
            <Statistic
              title={t('system.securityKey.configuredKeys')}
              value={keyItems.length}
              suffix="/ 2"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="security-key-summary-card" loading={isLoading}>
            <Statistic
              title={t('system.securityKey.protectedRecords')}
              value={protectedRecordCount}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="security-key-summary-card" loading={isLoading}>
            <Statistic
              title={t('system.securityKey.retiredVersions')}
              value={retiredVersionCount}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <SecurityKeyCard
            type="jwt"
            item={overview?.jwt}
            loading={isLoading}
            onRotate={handleRotate}
          />
        </Col>
        <Col xs={24} lg={12}>
          <SecurityKeyCard
            type="totp"
            item={overview?.totp}
            loading={isLoading}
            onRotate={handleRotate}
          />
        </Col>
      </Row>

      {totpOpen ? (
        <TwoFactorConfirmModal
          open={totpOpen}
          onConfirm={handleRotateConfirm}
          onCancel={() => setTotpOpen(false)}
          title={t('system.securityKey.confirmRotation', {
            type: rotateType.toUpperCase(),
          })}
        />
      ) : null}
    </div>
  )
}
