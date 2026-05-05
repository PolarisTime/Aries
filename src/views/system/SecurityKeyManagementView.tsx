import { useState } from 'react'
import { Card, Button, Descriptions, message, Space } from 'antd'
import { RedoOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { TwoFactorConfirmModal } from '@/components/TwoFactorConfirmModal'
import type { ApiResponse } from '@/types/api'

interface SecurityKeys {
  jwtLastRotatedAt: string
  totpLastRotatedAt: string
}

export function SecurityKeyManagementView() {
  const queryClient = useQueryClient()
  const [totpOpen, setTotpOpen] = useState(false)
  const [rotateType, setRotateType] = useState<'jwt' | 'totp'>('jwt')

  const { data: keys, isLoading } = useQuery({
    queryKey: ['security-keys'],
    queryFn: async () => {
      const res = await http.get<ApiResponse<SecurityKeys>>(`${ENDPOINTS.SECURITY_KEYS}/overview`)
      return res.data
    },
  })

  const handleRotate = (type: 'jwt' | 'totp') => {
    setRotateType(type)
    setTotpOpen(true)
  }

  const handleRotateConfirm = async (code: string) => {
    try {
      await http.post(`${ENDPOINTS.SECURITY_KEYS}/${rotateType}/rotate`, { totpCode: code })
      message.success(`${rotateType.toUpperCase()} 密钥已轮换`)
      queryClient.invalidateQueries({ queryKey: ['security-keys'] })
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
            {keys?.jwtLastRotatedAt || '--'}
          </Descriptions.Item>
          <Descriptions.Item label="TOTP 密钥最后轮换">
            {keys?.totpLastRotatedAt || '--'}
          </Descriptions.Item>
        </Descriptions>
        <Space className="mt-4">
          <Button icon={<RedoOutlined />} onClick={() => handleRotate('jwt')}>轮换 JWT 密钥</Button>
          <Button icon={<RedoOutlined />} onClick={() => handleRotate('totp')}>轮换 TOTP 密钥</Button>
        </Space>
      </Card>
      <TwoFactorConfirmModal
        open={totpOpen}
        onConfirm={handleRotateConfirm}
        onCancel={() => setTotpOpen(false)}
        title={`确认轮换 ${rotateType.toUpperCase()} 密钥`}
      />
    </div>
  )
}
