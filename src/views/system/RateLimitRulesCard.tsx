import { EditOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Form from 'antd/es/form'
import InputNumber from 'antd/es/input-number'
import Modal from 'antd/es/modal'
import Switch from 'antd/es/switch'
import Table from 'antd/es/table'
import Typography from 'antd/es/typography'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { assertApiSuccess, http } from '@/api/client'
import { StatusTag } from '@/components/StatusTag'
import { TableActions } from '@/components/TableActions'
import { QUERY_KEYS } from '@/constants/query-keys'
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

const TYPE_COLOR: Record<string, string> = {
  GLOBAL: 'blue',
  METHOD: 'green',
  API_KEY: 'gold',
}

export function RateLimitRulesCard() {
  const { t } = useTranslation()
  const TYPE_LABEL: Record<string, string> = {
    GLOBAL: t('system.rateLimit.typeGlobal'),
    METHOD: t('system.rateLimit.typeMethod'),
    API_KEY: t('system.rateLimit.typeApiKey'),
  }
  const can = usePermissionStore((s) => s.can)
  const queryClient = useQueryClient()
  const [editingRule, setEditingRule] = useState<RateLimitRule | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const {
    data: rules = [],
    isFetching,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.rateLimitRules,
    queryFn: async () => {
      const r = await http.get<{
        code: number
        data: RawRateLimitRule[]
        message?: string
      }>('/admin/rate-limit/rules')
      assertApiSuccess(r, t('system.rateLimit.loadFailed'))
      return (r.data || []).map(
        (item): RateLimitRule => ({
          id: item.id,
          ruleKey: item.rule_key,
          ruleType: item.rule_type,
          rate: item.rate,
          capacity: item.capacity,
          tokensPerRequest: item.tokens_per_request,
          priority: item.priority,
          enabled: item.enabled,
        }),
      )
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
      setSaving(false)
    } catch (error) {
      setSaving(false)
      throw error
    }
  }

  return (
    <Card
      title={t('system.rateLimit.title')}
      extra={
        <Button
          size="small"
          loading={isFetching}
          icon={<ReloadOutlined />}
          onClick={() => void refetch()}
        >
          {t('system.rateLimit.refresh')}
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
              title: t('system.rateLimit.colRuleKey'),
              width: 200,
              ellipsis: true,
            },
            {
              dataIndex: 'ruleType',
              title: t('system.rateLimit.colType'),
              width: 80,
              render: (v: string) => (
                <StatusTag
                  status={v}
                  statusMap={{
                    [v]: {
                      color: TYPE_COLOR[v] || 'default',
                      label: TYPE_LABEL[v] || v,
                    },
                  }}
                />
              ),
            },
            {
              dataIndex: 'rate',
              title: t('system.rateLimit.colRate'),
              width: 80,
              align: 'right',
              render: (v: number) => v.toFixed(2),
            },
            {
              dataIndex: 'capacity',
              title: t('system.rateLimit.colBurst'),
              width: 55,
              align: 'right',
            },
            {
              dataIndex: 'tokensPerRequest',
              title: t('system.rateLimit.colCost'),
              width: 55,
              align: 'right',
            },
            {
              dataIndex: 'priority',
              title: t('system.rateLimit.colPriority'),
              width: 55,
              align: 'right',
            },
            {
              dataIndex: 'enabled',
              title: t('system.rateLimit.colStatus'),
              width: 50,
              render: (v: boolean) => (
                <StatusTag
                  status={v ? 'enabled' : 'disabled'}
                  statusMap={{
                    enabled: {
                      color: 'success',
                      label: t('system.rateLimit.statusOn'),
                    },
                    disabled: {
                      color: 'default',
                      label: t('system.rateLimit.statusOff'),
                    },
                  }}
                />
              ),
            },
            {
              title: t('system.rateLimit.colOperation'),
              width: 50,
              align: 'center',
              render: (_: unknown, record: RateLimitRule) => (
                <TableActions
                  items={[
                    {
                      key: 'edit',
                      label: t('common.edit'),
                      icon: <EditOutlined />,
                      onClick: () => handleEdit(record),
                    },
                  ]}
                />
              ),
            },
          ]}
          size="small"
          pagination={false}
        />
      ) : (
        <Typography.Text type="secondary">
          {t('system.rateLimit.noRules')}
        </Typography.Text>
      )}

      <Modal
        title={`${t('system.rateLimit.editTitle')} — ${editingRule?.ruleKey || ''}`}
        open={!!editingRule}
        onOk={() => void handleSave()}
        onCancel={() => setEditingRule(null)}
        confirmLoading={saving}
        okText={t('system.rateLimit.save')}
        cancelText={t('system.rateLimit.cancel')}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-16">
          <Form.Item name="rate" label={t('system.rateLimit.rateLabel')}>
            <InputNumber min={0.01} step={0.1} className="w-full" />
          </Form.Item>
          <Form.Item
            name="capacity"
            label={t('system.rateLimit.burstCapacity')}
          >
            <InputNumber min={1} step={1} className="w-full" />
          </Form.Item>
          <Form.Item
            name="tokensPerRequest"
            label={t('system.rateLimit.tokensPerRequest')}
          >
            <InputNumber min={1} step={1} className="w-full" />
          </Form.Item>
          <Form.Item
            name="enabled"
            label={t('system.rateLimit.enabled')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
