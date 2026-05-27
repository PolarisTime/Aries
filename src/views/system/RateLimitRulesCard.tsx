import { EditOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Form from 'antd/es/form'
import InputNumber from 'antd/es/input-number'
import Modal from 'antd/es/modal'
import Switch from 'antd/es/switch'
import Table from 'antd/es/table'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import { useState } from 'react'
import { assertApiSuccess, http } from '@/api/client'
import { usePermissionStore } from '@/stores/permissionStore'

interface RawRateLimitRule {
  id: string
  rule_key: string
  rule_type: string
  rate: number
  capacity: number
  tokens_per_request: number
  priority: number
  enabled: boolean
  created_at: string
}

interface RateLimitRule {
  id: string
  ruleKey: string
  ruleType: string
  rate: number
  capacity: number
  tokensPerRequest: number
  priority: number
  enabled: boolean
}

const TYPE_LABEL: Record<string, string> = {
  GLOBAL: '全局',
  METHOD: '方法',
  API_KEY: 'API密钥',
}

const TYPE_COLOR: Record<string, string> = {
  GLOBAL: 'blue',
  METHOD: 'green',
  API_KEY: 'gold',
}

export function RateLimitRulesCard() {
  const can = usePermissionStore((s) => s.can)
  const queryClient = useQueryClient()
  const [editingRule, setEditingRule] = useState<RateLimitRule | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const { data: rules = [], isFetching, refetch } = useQuery({
    queryKey: ['rate-limit-rules'],
    queryFn: async () => {
      const r = await http.get<{
        code: number
        data: RawRateLimitRule[]
        message?: string
      }>('/admin/rate-limit/rules')
      assertApiSuccess(r, '加载限流规则失败')
      return (r.data || []).map((item): RateLimitRule => ({
        id: item.id,
        ruleKey: item.rule_key,
        ruleType: item.rule_type,
        rate: item.rate,
        capacity: item.capacity,
        tokensPerRequest: item.tokens_per_request,
        priority: item.priority,
        enabled: item.enabled,
      }))
    },
  })

  if (!can('general-setting', 'read')) return null

  const handleEdit = (rule: RateLimitRule) => {
    form.setFieldsValue(rule)
    setEditingRule(rule)
  }

  const handleSave = async () => {
    if (!editingRule) return
    const values = await form.validateFields()
    setSaving(true)
    try {
      await http.put(`/admin/rate-limit/rules/${editingRule.id}`, {
        rate: values.rate,
        capacity: values.capacity,
        tokens_per_request: values.tokensPerRequest,
        enabled: values.enabled,
      })
      await queryClient.invalidateQueries({ queryKey: ['rate-limit-rules'] })
      setEditingRule(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      title="限流规则"
      extra={
        <Button
          size="small"
          loading={isFetching}
          icon={<ReloadOutlined />}
          onClick={() => void refetch()}
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
          scroll={{ x: 750 }}
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
              width: 80,
              render: (v: string) => (
                <Tag color={TYPE_COLOR[v] || 'default'}>{TYPE_LABEL[v] || v}</Tag>
              ),
            },
            {
              dataIndex: 'rate',
              title: '令牌/s',
              width: 80,
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
              dataIndex: 'tokensPerRequest',
              title: '消耗',
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
              title: '状态',
              width: 50,
              render: (v: boolean) => (
                <Tag color={v ? 'success' : 'default'}>{v ? '开' : '关'}</Tag>
              ),
            },
            {
              title: '操作',
              width: 50,
              align: 'center',
              render: (_: unknown, record: RateLimitRule) => (
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                />
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

      <Modal
        title={`编辑规则 — ${editingRule?.ruleKey || ''}`}
        open={!!editingRule}
        onOk={() => void handleSave()}
        onCancel={() => setEditingRule(null)}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-16">
          <Form.Item name="rate" label="令牌/s">
            <InputNumber min={0.01} step={0.1} className="w-full" />
          </Form.Item>
          <Form.Item name="capacity" label="突发容量">
            <InputNumber min={1} step={1} className="w-full" />
          </Form.Item>
          <Form.Item name="tokensPerRequest" label="每次消耗令牌数">
            <InputNumber min={1} step={1} className="w-full" />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
