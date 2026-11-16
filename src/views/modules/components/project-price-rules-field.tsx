import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Flex,
  Input,
  InputNumber,
  Select,
  Table,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchProjectPriceRules,
  type ProjectPriceRule,
  type ProjectPriceRuleMode,
  type ProjectPriceRulePayload,
  saveProjectPriceRules,
} from '@/api/master/project-price-rules'
import type { EntityId } from '@/types/entity-id'
import { message } from '@/utils/antd-app'
import { netPriceCheckQueryKeys } from '@/views/modules/net-price-check-cache'

/** 表格里的一行草稿：金额允许暂时为空（用户正在输入），提交前再校验。 */
interface DraftRule {
  /** 本地行键：新增行还没有后端 id，不能拿 id 当 key。 */
  key: string
  id?: EntityId
  name: string
  mode: ProjectPriceRuleMode
  amount: number | null
  remark: string
}

function toDraft(rule: ProjectPriceRule, index: number): DraftRule {
  return {
    key: rule.id || `saved-${index}`,
    id: rule.id,
    name: rule.name,
    mode: rule.mode,
    amount: Number.isFinite(rule.amount) ? rule.amount : 0,
    remark: rule.remark ?? '',
  }
}

/**
 * 草稿 → 提交载荷（**唯一**转换口）。
 *
 * <p>后端 `PUT /projects/{id}/price-rules` 是**整体替换**：载荷里没有的旧规则视为软删，
 * 因此这里必须把 `id` 带上（更新既有规则而不是删了再建）；`remark` 传空值时后端会清空该列，
 * 所以空字符串一律不传（保持"没填备注"的语义）。</p>
 */
function toPayloadRules(
  rules: readonly DraftRule[],
): ProjectPriceRulePayload[] {
  return rules.map((rule) => ({
    ...(rule.id ? { id: rule.id } : {}),
    name: rule.name.trim(),
    mode: rule.mode,
    amount: Number.isFinite(rule.amount ?? Number.NaN)
      ? Number(rule.amount)
      : 0,
    ...(rule.remark.trim() ? { remark: rule.remark.trim() } : {}),
  }))
}

type ValidationResult =
  | { ok: true; payload: ProjectPriceRulePayload[] }
  | { ok: false; error: string }

/**
 * 校验草稿：名称必填且不重名、金额必须是非负数。
 *
 * <p>金额为 `null`（用户清空了输入框）按 0 处理还是报错？**报错**：价格规定的金额是
 * "加/减多少元每吨"，空值最可能的含义是还没填，静默按 0 存下去等于把规则改成无效规则。</p>
 */
function validateRules(
  rules: readonly DraftRule[],
  messages: {
    nameRequired: string
    nameDuplicate: string
    amountRequired: string
  },
): ValidationResult {
  const seen = new Set<string>()
  for (const rule of rules) {
    const name = rule.name.trim()
    if (!name) return { ok: false, error: messages.nameRequired }
    if (seen.has(name)) return { ok: false, error: messages.nameDuplicate }
    seen.add(name)
    if (rule.amount === null || !Number.isFinite(rule.amount)) {
      return { ok: false, error: messages.amountRequired }
    }
    if (rule.amount < 0) return { ok: false, error: messages.amountRequired }
  }
  return { ok: true, payload: toPayloadRules(rules) }
}

interface Props {
  /** 项目 ID：来自表单值 `id`（编辑态有值，新建态没有 → 只能先保存项目）。 */
  projectId?: unknown
  disabled?: boolean
  /** 字段名（`Form.Item` 的 label），用作分组可访问名。 */
  label: string
}

/**
 * 项目资料 → 「价格规定」清单编辑（增删多条：名称 / 加价·减价 / 金额 / 备注）。
 *
 * <p>为什么在字段里自己保存：价格规定走独立端点 `PUT /projects/{id}/price-rules`（整体替换），
 * 而项目资料的保存是通用模块保存（只提交 `saveFields.scalar` 白名单里的标量），两者端点不同、
 * 语义也不同（整体替换 vs 增量字段）。所以这里做**字段级保存**：改完点「保存价格规定」立即落库，
 * 保存成功后让网价核查的 `price-rules` 查询失效，交付核定侧下一次取数就能看到新规则。</p>
 *
 * <p>新建项目时没有 id：此时只给一条提示，不渲染表格（避免填了半天却无处提交）。</p>
 */
export function ProjectPriceRulesField({ projectId, disabled, label }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const normalizedProjectId =
    typeof projectId === 'string' || typeof projectId === 'number'
      ? String(projectId).trim()
      : ''
  const [rules, setRules] = useState<DraftRule[]>([])
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const newRowSeed = useRef(0)

  useEffect(() => {
    if (!normalizedProjectId) {
      setRules([])
      setSavedSnapshot('')
      setError(null)
      return
    }
    let active = true
    setLoading(true)
    setError(null)
    fetchProjectPriceRules(normalizedProjectId)
      .then((list) => {
        if (!active) return
        const drafts = list.map(toDraft)
        setRules(drafts)
        setSavedSnapshot(JSON.stringify(toPayloadRules(drafts)))
      })
      .catch(() => {
        if (active) setError(t('priceRule.loadFailed'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [normalizedProjectId, t])

  const payload = useMemo(() => toPayloadRules(rules), [rules])
  const dirty = useMemo(
    () => JSON.stringify(payload) !== savedSnapshot,
    [payload, savedSnapshot],
  )

  const patchRule = useCallback(
    (key: string, patch: Partial<Omit<DraftRule, 'key'>>) => {
      setRules((current) =>
        current.map((rule) =>
          rule.key === key ? { ...rule, ...patch } : rule,
        ),
      )
    },
    [],
  )

  const addRule = useCallback(() => {
    newRowSeed.current += 1
    setRules((current) => [
      ...current,
      {
        key: `new-${newRowSeed.current}`,
        name: '',
        mode: 'ADD',
        amount: 0,
        remark: '',
      },
    ])
  }, [])

  const removeRule = useCallback((key: string) => {
    setRules((current) => current.filter((rule) => rule.key !== key))
  }, [])

  const handleSave = useCallback(async () => {
    if (!normalizedProjectId || saving) return
    const validation = validateRules(rules, {
      nameRequired: t('priceRule.nameRequired'),
      nameDuplicate: t('priceRule.nameDuplicate'),
      amountRequired: t('priceRule.amountRequired'),
    })
    if (!validation.ok) {
      setError(validation.error)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const saved = await saveProjectPriceRules(
        normalizedProjectId,
        validation.payload,
      )
      const drafts = saved.map(toDraft)
      setRules(drafts)
      setSavedSnapshot(JSON.stringify(toPayloadRules(drafts)))
      // 交付核定 / 网价核查读的是同一个 query key，保存后必须失效，否则仍按旧规则取价。
      await queryClient.invalidateQueries({
        queryKey: netPriceCheckQueryKeys.priceRules(normalizedProjectId),
      })
      message.success(t('priceRule.saved'))
    } catch {
      setError(t('priceRule.saveFailed'))
    } finally {
      setSaving(false)
    }
  }, [normalizedProjectId, queryClient, rules, saving, t])

  if (!normalizedProjectId) {
    return (
      <Alert
        type="info"
        showIcon
        title={t('priceRule.saveFirstHint')}
        data-testid="project-price-rules-new-hint"
      />
    )
  }

  const columns: ColumnsType<DraftRule> = [
    {
      title: t('priceRule.name'),
      dataIndex: 'name',
      width: 200,
      render: (_value, rule) => (
        <Input
          aria-label={`${t('priceRule.name')} ${rule.name || rule.key}`}
          disabled={disabled}
          maxLength={50}
          onChange={(event) =>
            patchRule(rule.key, { name: event.target.value })
          }
          placeholder={t('priceRule.namePlaceholder')}
          value={rule.name}
        />
      ),
    },
    {
      title: t('priceRule.adjust'),
      dataIndex: 'mode',
      width: 120,
      render: (_value, rule) => (
        <Select<ProjectPriceRuleMode>
          aria-label={`${t('priceRule.adjust')} ${rule.name || rule.key}`}
          disabled={disabled}
          onChange={(mode) => patchRule(rule.key, { mode })}
          options={[
            { label: t('priceRule.add'), value: 'ADD' },
            { label: t('priceRule.subtract'), value: 'SUBTRACT' },
          ]}
          value={rule.mode}
        />
      ),
    },
    {
      title: t('priceRule.amount'),
      dataIndex: 'amount',
      width: 150,
      render: (_value, rule) => (
        <InputNumber
          aria-label={`${t('priceRule.amount')} ${rule.name || rule.key}`}
          disabled={disabled}
          min={0}
          onChange={(value) =>
            patchRule(rule.key, {
              amount: typeof value === 'number' ? value : null,
            })
          }
          precision={2}
          style={{ width: '100%' }}
          value={rule.amount}
        />
      ),
    },
    {
      title: t('priceRule.remark'),
      dataIndex: 'remark',
      render: (_value, rule) => (
        <Input
          aria-label={`${t('priceRule.remark')} ${rule.name || rule.key}`}
          disabled={disabled}
          maxLength={100}
          onChange={(event) =>
            patchRule(rule.key, { remark: event.target.value })
          }
          placeholder={t('priceRule.remarkPlaceholder')}
          value={rule.remark}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 64,
      align: 'center',
      render: (_value, rule) => (
        <Button
          aria-label={`${t('priceRule.remove')} ${rule.name || rule.key}`}
          danger
          disabled={disabled}
          icon={<DeleteOutlined />}
          onClick={() => removeRule(rule.key)}
          type="text"
        />
      ),
    },
  ]

  return (
    <Flex
      role="group"
      aria-label={label}
      data-testid="project-price-rules"
      gap={8}
      vertical
    >
      <Table<DraftRule>
        columns={columns}
        dataSource={rules}
        loading={loading}
        pagination={false}
        rowKey="key"
        size="small"
        locale={{
          emptyText: (
            <Typography.Text type="secondary">
              {t('priceRule.empty')}
            </Typography.Text>
          ),
        }}
      />
      {error ? <Alert type="error" showIcon title={error} /> : null}
      <Flex gap={8} wrap>
        <Button
          disabled={disabled || loading}
          icon={<PlusOutlined />}
          onClick={addRule}
          type="dashed"
        >
          {t('priceRule.addRow')}
        </Button>
        <Button
          disabled={disabled || !dirty}
          loading={saving}
          onClick={() => void handleSave()}
          type="primary"
        >
          {t('priceRule.save')}
        </Button>
      </Flex>
    </Flex>
  )
}
