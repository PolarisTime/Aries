import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from '@tanstack/react-router'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Descriptions from 'antd/es/descriptions'
import Empty from 'antd/es/empty'
import Flex from 'antd/es/flex'
import Spin from 'antd/es/spin'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type ApiKeyActionOption,
  type ApiKeyRecord,
  type ApiKeyResourceOption,
  getApiKeyDetail,
  listApiKeyActionOptions,
  listApiKeyResourceOptions,
} from '@/api/api-keys'

function getStatusColor(status: string) {
  if (status === '有效' || status === 'active') return 'green'
  if (status === '已过期' || status === 'expired') return 'orange'
  if (status === '已禁用' || status === 'revoked' || status === 'inactive')
    return 'red'
  return 'default'
}

function formatAllowedCodes(
  codes: string[] | undefined,
  options: Array<{ code: string; title: string }>,
  fallback: string,
): string {
  if (!codes?.length) {
    return fallback
  }
  const titleMap = new Map(options.map((item) => [item.code, item.title]))
  return codes.map((item) => titleMap.get(item) || item).join('、')
}

export function ApiKeyDetailView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [record, setRecord] = useState<ApiKeyRecord | null>(null)
  const [resourceOptions, setResourceOptions] = useState<
    ApiKeyResourceOption[]
  >([])
  const [actionOptions, setActionOptions] = useState<ApiKeyActionOption[]>([])

  const params = useParams({ strict: false }) as { id?: string }
  const id = params.id ?? ''

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
        if (!cancelled) {
          setLoading(false)
        }
      } catch (error) {
        if (!cancelled) {
          setLoading(false)
        }
        throw error
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [id])

  const allowedResourceText = formatAllowedCodes(
    record?.allowedResources,
    resourceOptions,
    t('system.apiKeyDetail.fallbackUnlimited'),
  )
  const allowedActionText = formatAllowedCodes(
    record?.allowedActions,
    actionOptions,
    t('system.apiKeyDetail.fallbackUnset'),
  )

  return (
    <div className="page-stack">
      <Card>
        <Flex align="center" gap={12}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => {
              void navigate({ to: '/api-key' as '/' })
            }}
          >
            {t('system.apiKeyDetail.back')}
          </Button>
          <Typography.Title level={5} className="m-0">
            {t('system.apiKeyDetail.title')}
          </Typography.Title>
        </Flex>
      </Card>

      <Spin spinning={loading}>
        {record ? (
          <Card>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label={t('system.apiKeyDetail.keyName')}>
                {record.keyName}
              </Descriptions.Item>
              <Descriptions.Item label={t('system.apiKeyDetail.usageScope')}>
                {record.usageScope}
              </Descriptions.Item>
              <Descriptions.Item label={t('system.apiKeyDetail.allowedResources')}>
                {allowedResourceText}
              </Descriptions.Item>
              <Descriptions.Item label={t('system.apiKeyDetail.allowedActions')}>
                {allowedActionText}
              </Descriptions.Item>
              <Descriptions.Item label={t('system.apiKeyDetail.ownerUser')}>
                {record.userName || record.loginName}（{record.loginName}）
              </Descriptions.Item>
              <Descriptions.Item label={t('system.apiKeyDetail.userId')}>
                {record.userId}
              </Descriptions.Item>
              <Descriptions.Item label={t('system.apiKeyDetail.keyPrefix')}>
                <Typography.Paragraph copyable code className="mb-0">
                  {record.keyPrefix}
                </Typography.Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label={t('system.apiKeyDetail.status')}>
                <Tag color={getStatusColor(record.status)}>{record.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('system.apiKeyDetail.createdAt')}>
                {record.createdAt}
              </Descriptions.Item>
              <Descriptions.Item label={t('system.apiKeyDetail.expiresAt')}>
                {record.expiresAt || t('system.apiKeyDetail.neverExpires')}
              </Descriptions.Item>
              <Descriptions.Item label={t('system.apiKeyDetail.lastUsed')}>
                {record.lastUsedAt || '--'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        ) : (
          <Empty description={t('system.apiKeyDetail.notFound')} />
        )}
      </Spin>
    </div>
  )
}
