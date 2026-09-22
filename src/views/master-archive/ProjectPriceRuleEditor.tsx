import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import {
  Button,
  Flex,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ProjectPriceRuleMode,
  ProjectPriceRulePayload,
} from '@/api/master/project-price-rules'
import {
  fetchProjectPriceRules,
  saveProjectPriceRules,
} from '@/api/master/project-price-rules'
import type { EntityId } from '@/types/entity-id'
import { message } from '@/utils/antd-app'

const { Text } = Typography

/** 编辑态价格规定行（含前端临时行 id 以稳定 key）。 */
type RuleRow = ProjectPriceRulePayload & { rowKey: string }

let rowSeq = 0
function nextRowKey(): string {
  rowSeq += 1
  return `rule-${rowSeq}`
}

function toRows(rules: ProjectPriceRulePayload[]): RuleRow[] {
  return rules.map((rule) => ({ ...rule, rowKey: nextRowKey() }))
}

/**
 * 项目价格规定编辑器：多行配置 名称 / 加价或减价 / 金额 / 备注。
 * 规则单选互斥（交付核定只应用其中一条）；独立加载与保存。
 */
export function ProjectPriceRuleEditor({ projectId }: { projectId: EntityId }) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<RuleRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchProjectPriceRules(projectId)
      .then((rules) => {
        if (active) setRows(toRows(rules))
      })
      .catch(() => {
        if (active) setRows([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId])

  const patchRow = (rowKey: string, patch: Partial<RuleRow>) =>
    setRows((current) =>
      current.map((row) =>
        row.rowKey === rowKey ? { ...row, ...patch } : row,
      ),
    )

  const addRow = () =>
    setRows((current) => [
      ...current,
      { rowKey: nextRowKey(), name: '', mode: 'ADD', amount: 0 },
    ])

  const removeRow = (rowKey: string) =>
    setRows((current) => current.filter((row) => row.rowKey !== rowKey))

  const save = async () => {
    const payload: ProjectPriceRulePayload[] = rows.map((row) => ({
      ...(row.id ? { id: row.id } : {}),
      name: row.name.trim(),
      mode: row.mode,
      amount: Number(row.amount) || 0,
      ...(row.remark?.trim() ? { remark: row.remark.trim() } : {}),
    }))
    if (payload.some((row) => !row.name)) {
      message.warning(t('priceRule.nameRequired'))
      return
    }
    if (new Set(payload.map((row) => row.name)).size !== payload.length) {
      message.warning(t('priceRule.nameDuplicate'))
      return
    }
    setSaving(true)
    try {
      const saved = await saveProjectPriceRules(projectId, payload)
      setRows(
        toRows(
          saved.map((rule) => ({
            id: rule.id,
            name: rule.name,
            mode: rule.mode,
            amount: rule.amount,
            ...(rule.remark ? { remark: rule.remark } : {}),
          })),
        ),
      )
      message.success(t('priceRule.saved'))
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t('api.saveFailed'),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      <Space align="center" size={8}>
        <Text strong>{t('priceRule.title')}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('priceRule.hint')}
        </Text>
      </Space>
      <Spin spinning={loading}>
        {rows.map((row) => (
          <Flex
            key={row.rowKey}
            gap={8}
            align="center"
            style={{ marginBottom: 8 }}
          >
            <Input
              style={{ width: 180 }}
              value={row.name}
              placeholder={t('priceRule.namePlaceholder')}
              maxLength={64}
              onChange={(event) =>
                patchRow(row.rowKey, { name: event.target.value })
              }
            />
            <Select
              style={{ width: 120 }}
              value={row.mode}
              options={[
                { label: t('priceRule.add'), value: 'ADD' },
                { label: t('priceRule.subtract'), value: 'SUBTRACT' },
              ]}
              onChange={(value: ProjectPriceRuleMode) =>
                patchRow(row.rowKey, { mode: value })
              }
            />
            <InputNumber
              style={{ width: 140 }}
              min={0}
              precision={2}
              value={row.amount}
              placeholder={t('priceRule.amountPlaceholder')}
              onChange={(value) =>
                patchRow(row.rowKey, { amount: Number(value) || 0 })
              }
            />
            <Input
              style={{ flex: 1 }}
              value={row.remark ?? ''}
              placeholder={t('priceRule.remarkPlaceholder')}
              maxLength={255}
              onChange={(event) =>
                patchRow(row.rowKey, { remark: event.target.value })
              }
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label={t('priceRule.remove')}
              onClick={() => removeRow(row.rowKey)}
            />
          </Flex>
        ))}
        <Space>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            disabled={saving}
            onClick={addRow}
          >
            {t('priceRule.addRow')}
          </Button>
          <Button type="primary" loading={saving} onClick={() => void save()}>
            {t('priceRule.save')}
          </Button>
        </Space>
      </Spin>
    </Space>
  )
}
