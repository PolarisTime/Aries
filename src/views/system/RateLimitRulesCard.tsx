import { ReloadOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Table from 'antd/es/table'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import { useCallback, useEffect, useState } from 'react'
import { assertApiSuccess, http } from '@/api/client'
import { usePermissionStore } from '@/stores/permissionStore'

interface RateLimitRule {
  id: number
  ruleKey: string
  ruleType: string
  rate: number
  capacity: number
  tokensPerRequest: number
  priority: number
  enabled: boolean
}

export function RateLimitRulesCard() {
  const can = usePermissionStore((s) => s.can)
  const [rules, setRules] = useState<RateLimitRule[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const r = await http.get<{
        code: number
        data: RateLimitRule[]
        message?: string
      }>('/admin/rate-limit/rules')
      assertApiSuccess(r, '加载限流规则失败')
      setRules(r.data || [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetch()
  }, [fetch])

  if (!can('general-setting', 'read')) return null

  const typeColor = (t: string) =>
    t === 'GLOBAL' ? 'blue' : t === 'METHOD' ? 'green' : 'gold'

  return (
    <Card
      title="限流规则"
      extra={
        <Button
          size="small"
          loading={loading}
          icon={<ReloadOutlined />}
          onClick={() => void fetch()}
        >
          刷新
        </Button>
      }
      className="mb-16"
    >
      {rules.length > 0 ? (
        <Table
          rowKey="id"
          dataSource={rules}
          columns={[
            {
              dataIndex: 'ruleKey',
              title: '规则键',
              width: 200,
              ellipsis: true,
            },
            {
              dataIndex: 'ruleType',
              title: '类型',
              width: 75,
              render: (v: string) => <Tag color={typeColor(v)}>{v}</Tag>,
            },
            {
              dataIndex: 'rate',
              title: '令牌/s',
              width: 75,
              align: 'right',
              render: (v: number) => v.toFixed(2),
            },
            {
              dataIndex: 'capacity',
              title: '突发',
              width: 55,
              align: 'right',
            },
            {
              dataIndex: 'priority',
              title: '优先级',
              width: 55,
              align: 'right',
            },
            {
              dataIndex: 'enabled',
              title: '',
              width: 50,
              render: (v: boolean) => (
                <Tag color={v ? 'success' : 'default'}>{v ? '开' : '关'}</Tag>
              ),
            },
          ]}
          size="small"
          pagination={false}
        />
      ) : (
        <Typography.Text type="secondary">
          暂无限流规则，使用默认值
        </Typography.Text>
      )}
    </Card>
  )
}
