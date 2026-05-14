import { RedoOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Descriptions from 'antd/es/descriptions'
import Space from 'antd/es/space'
import { useState } from 'react'
import {
  getSecurityKeyOverview,
  rotateJwtSecurityKey,
  rotateTotpSecurityKey,
} from '@/api/security-keys'
import { TwoFactorConfirmModal } from '@/components/TwoFactorConfirmModal'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { message } from '@/utils/antd-app'

const SECURITY_KEY_QUERY_KEY = ['security-key'] as const

type RotateType = 'jwt' | 'totp'

export function SecurityKeyManagementView(): React.JSX.Element {
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
      message.success(`${rotateType.toUpperCase()} 密钥已轮换`)
      setTotpOpen(false)
      void queryClient.invalidateQueries({ queryKey: SECURITY_KEY_QUERY_KEY })
    } catch (err) {
      message.error(err instanceof Error ? err.message : '轮换失败')
      throw err
    }
  }

  return (
    <div className="page-stack">
      <Card title="安全密钥管理" loading={isLoading}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="JWT 密钥最后轮换">
            {keys?.data.jwt.activatedAt || '--'}
          </Descriptions.Item>
          <Descriptions.Item label="TOTP 密钥最后轮换">
            {keys?.data.totp.activatedAt || '--'}
          </Descriptions.Item>
        </Descriptions>
        <Space className="mt-4">
          <Button icon={<RedoOutlined />} onClick={() => handleRotate('jwt')}>
            轮换 JWT 密钥
          </Button>
          <Button icon={<RedoOutlined />} onClick={() => handleRotate('totp')}>
            轮换 TOTP 密钥
          </Button>
        </Space>
      </Card>
      {totpOpen ? (
        <TwoFactorConfirmModal
          open={totpOpen}
          onConfirm={handleRotateConfirm}
          onCancel={() => setTotpOpen(false)}
          title={`确认轮换 ${rotateType.toUpperCase()} 密钥`}
        />
      ) : null}
    </div>
  )
}
