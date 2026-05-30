import { RedoOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Descriptions from 'antd/es/descriptions'
import Space from 'antd/es/space'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getSecurityKeyOverview,
  rotateJwtSecurityKey,
  rotateTotpSecurityKey,
} from '@/api/security-keys'
import { TwoFactorConfirmModal } from '@/components/TwoFactorConfirmModal'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { message } from '@/utils/antd-app'
import { formatDateTime } from '@/utils/formatters'

const SECURITY_KEY_QUERY_KEY = ['security-key'] as const

type RotateType = 'jwt' | 'totp'

export function SecurityKeyManagementView(): React.JSX.Element {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [totpOpen, setTotpOpen] = useState(false)
  const [rotateType, setRotateType] = useState<RotateType>('jwt')
  const isPageVisible = usePageVisibility()

  const { data: keys, isLoading } = useQuery({
    queryKey: SECURITY_KEY_QUERY_KEY,
    queryFn: getSecurityKeyOverview,
    enabled: isPageVisible,
  })

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
      message.success(t('system.securityKey.rotateSuccess', { type: rotateType.toUpperCase() }))
      setTotpOpen(false)
      void queryClient.invalidateQueries({ queryKey: SECURITY_KEY_QUERY_KEY })
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('system.securityKey.rotateFailed'))
      throw err
    }
  }

  return (
    <div className="page-stack">
      <Card title={t('system.securityKey.title')} loading={isLoading}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={t('system.securityKey.jwtLastRotation')}>
            {formatDateTime(keys?.data.jwt.activatedAt, '--')}
          </Descriptions.Item>
          <Descriptions.Item label={t('system.securityKey.totpLastRotation')}>
            {formatDateTime(keys?.data.totp.activatedAt, '--')}
          </Descriptions.Item>
        </Descriptions>
        <Space className="mt-4">
          <Button icon={<RedoOutlined />} onClick={() => handleRotate('jwt')}>
            {t('system.securityKey.rotateJwt')}
          </Button>
          <Button icon={<RedoOutlined />} onClick={() => handleRotate('totp')}>
            {t('system.securityKey.rotateTotp')}
          </Button>
        </Space>
      </Card>
      {totpOpen ? (
        <TwoFactorConfirmModal
          open={totpOpen}
          onConfirm={handleRotateConfirm}
          onCancel={() => setTotpOpen(false)}
          title={t('system.securityKey.confirmRotation', { type: rotateType.toUpperCase() })}
        />
      ) : null}
    </div>
  )
}
