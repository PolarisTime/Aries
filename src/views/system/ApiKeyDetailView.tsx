import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import {
  Card,
  Descriptions,
  Empty,
  Button,
  Flex,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import {
  getApiKeyDetail,
  listApiKeyActionOptions,
  listApiKeyResourceOptions,
  type ApiKeyActionOption,
  type ApiKeyRecord,
  type ApiKeyResourceOption,
} from '@/api/api-keys'

function getStatusColor(status: string) {
  if (status === '有效' || status === 'active') return 'green'
  if (status === '已过期' || status === 'expired') return 'orange'
  if (status === '已禁用' || status === 'revoked' || status === 'inactive') return 'red'
  return 'default'
}

export function ApiKeyDetailView() {
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [record, setRecord] = useState<ApiKeyRecord | null>(null)
  const [resourceOptions, setResourceOptions] = useState<ApiKeyResourceOption[]>([])
  const [actionOptions, setActionOptions] = useState<ApiKeyActionOption[]>([])

  const id = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean)
    return segments[segments.length - 1] || ''
  }, [location.pathname])

  useEffect(() => {
    if (!id) {
      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [detail, resources, actions] = await Promise.all([
          getApiKeyDetail(id),
          listApiKeyResourceOptions().catch(() => []),
          listApiKeyActionOptions().catch(() => []),
        ])
        if (cancelled) {
          return
        }
        setRecord(detail)
        setResourceOptions(resources)
        setActionOptions(actions)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [id])

  const allowedResourceText = useMemo(() => {
    if (!record?.allowedResources?.length) {
      return '未限制'
    }
    const titleMap = new Map(resourceOptions.map((item) => [item.code, item.title]))
    return record.allowedResources.map((item) => titleMap.get(item) || item).join('、')
  }, [record?.allowedResources, resourceOptions])

  const allowedActionText = useMemo(() => {
    if (!record?.allowedActions?.length) {
      return '未设置'
    }
    const titleMap = new Map(actionOptions.map((item) => [item.code, item.title]))
    return record.allowedActions.map((item) => titleMap.get(item) || item).join('、')
  }, [actionOptions, record?.allowedActions])

  return (
    <div className="page-stack">
      <Card>
        <Flex align="center" gap={12}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate({ to: '/api-key-management' as '/' })}
          >
            返回
          </Button>
          <Typography.Title level={5} style={{ margin: 0 }}>
            API Key 详情
          </Typography.Title>
        </Flex>
      </Card>

      <Spin spinning={loading}>
        {record ? (
          <Card>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="密钥名称">{record.keyName}</Descriptions.Item>
              <Descriptions.Item label="使用范围">{record.usageScope}</Descriptions.Item>
              <Descriptions.Item label="允许资源">{allowedResourceText}</Descriptions.Item>
              <Descriptions.Item label="允许动作">{allowedActionText}</Descriptions.Item>
              <Descriptions.Item label="所属用户">
                {record.userName || record.loginName}（{record.loginName}）
              </Descriptions.Item>
              <Descriptions.Item label="用户 ID">{record.userId}</Descriptions.Item>
              <Descriptions.Item label="密钥前缀">
                <Typography.Paragraph copyable code style={{ marginBottom: 0 }}>
                  {record.keyPrefix}
                </Typography.Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatusColor(record.status)}>{record.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">{record.createdAt}</Descriptions.Item>
              <Descriptions.Item label="过期时间">{record.expiresAt || '永不过期'}</Descriptions.Item>
              <Descriptions.Item label="最后使用">{record.lastUsedAt || '--'}</Descriptions.Item>
            </Descriptions>
          </Card>
        ) : (
          <Empty description="未找到该 API Key" />
        )}
      </Spin>
    </div>
  )
}
