import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Empty,
  Flex,
  InputNumber,
  Radio,
  Spin,
  Table,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type BasePriceRef,
  type BasePriceRuleItem,
  basePriceRulesQueryKey,
  fetchSupplierBasePriceRules,
  type SupplierBasePriceRules,
  saveSupplierBasePriceRules,
} from '@/api/market/supplier-base-price-rules'
import type { EntityId } from '@/types/entity-id'
import { message } from '@/utils/antd-app'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'
import { ruleKeyOfRef, type SpecRow } from './supplier-quote-grid'

type EditorRow = {
  key: string
  ref: BasePriceRef
}

type Props = {
  open: boolean
  supplierId: EntityId | undefined
  brandName: string
  rows: readonly SpecRow[]
  onClose: () => void
  /** 保存成功后回传最新规则，调用方可在网格里立即用于自动带价。 */
  onSaved: (rules: SupplierBasePriceRules) => void
}

/**
 * 基价加价规则配置（按 供应商 + 品牌）——**加载器**：取回规则后再挂载表单。
 *
 * <p>表单用 `key` 按版本重挂载，表单内部用 `useState` 初始化即可；避免用 effect 把 props
 * 回填进 state（那会带来一次额外渲染，也容易和用户输入打架）。</p>
 */
export function SupplierBasePriceRuleModal({
  open,
  supplierId,
  brandName,
  rows,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation()
  const rulesQuery = useQuery({
    queryKey: basePriceRulesQueryKey(supplierId, brandName),
    queryFn: ({ signal }) =>
      fetchSupplierBasePriceRules(supplierId ?? '', brandName, signal),
    enabled: open && Boolean(supplierId),
    staleTime: 0,
  })

  return (
    <WorkspaceOverlay
      className="workspace-overlay-panel--form-dialog"
      onClose={onClose}
      open={open}
      title={`${t('priceCompare.supplierPrice.basePriceRuleTitle')} · ${brandName}`}
      width={760}
    >
      {rulesQuery.isError ? (
        <Typography.Text type="danger">
          {t('priceCompare.supplierPrice.rulesLoadFailed')}
        </Typography.Text>
      ) : rulesQuery.data ? (
        <RuleEditor
          key={`${brandName}:${rulesQuery.data.version}`}
          brandName={brandName}
          initialRules={rulesQuery.data}
          onClose={onClose}
          onSaved={onSaved}
          rows={rows}
          supplierId={supplierId}
        />
      ) : (
        <Spin />
      )}
    </WorkspaceOverlay>
  )
}

/** 规则表单：基价单选 + 各规格加价（基价行加价固定 0）。 */
function RuleEditor({
  supplierId,
  brandName,
  rows,
  initialRules,
  onClose,
  onSaved,
}: {
  supplierId: EntityId | undefined
  brandName: string
  rows: readonly SpecRow[]
  initialRules: SupplierBasePriceRules
  onClose: () => void
  onSaved: (rules: SupplierBasePriceRules) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [baseKey, setBaseKey] = useState<string | undefined>(() =>
    initialRules.base ? ruleKeyOfRef(initialRules.base) : undefined,
  )
  const [deltas, setDeltas] = useState<Record<string, number | null>>(() => {
    const next: Record<string, number | null> = {}
    for (const item of initialRules.items) {
      if (item.delta !== 0) next[ruleKeyOfRef(item)] = item.delta
    }
    return next
  })

  /** 编辑行 = 每个规格 × 每个定尺（9米/12米 各一条）。 */
  const editorRows = useMemo<EditorRow[]>(
    () =>
      rows.flatMap((row) =>
        row.lengths.map((length) => {
          const ref: BasePriceRef = {
            material: row.material,
            spec: row.spec,
            length,
          }
          return { key: ruleKeyOfRef(ref), ref }
        }),
      ),
    [rows],
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!supplierId) throw new Error('missing supplier')
      const base = baseKey
        ? (editorRows.find((row) => row.key === baseKey)?.ref ?? null)
        : null
      if (baseKey && !base) throw new Error('base not found')
      const items: BasePriceRuleItem[] = []
      if (base) items.push({ ...base, delta: 0 })
      for (const row of editorRows) {
        if (row.key === baseKey) continue
        const delta = deltas[row.key]
        if (delta === undefined || delta === null || delta === 0) continue
        items.push({ ...row.ref, delta })
      }
      return saveSupplierBasePriceRules(
        { supplierId, brandName, base, items },
        initialRules.version,
      )
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({
        queryKey: basePriceRulesQueryKey(supplierId, brandName),
      })
      onSaved(saved)
      message.success(
        saved.base
          ? t('priceCompare.supplierPrice.rulesSaved')
          : t('priceCompare.supplierPrice.rulesCleared'),
      )
      onClose()
    },
    onError: () => {
      message.error(t('priceCompare.supplierPrice.rulesConflict'))
      // 412 表示版本已变：刷新后弹层会按新版本重挂载，用户可直接改完再存
      void queryClient.invalidateQueries({
        queryKey: basePriceRulesQueryKey(supplierId, brandName),
      })
    },
  })

  const columns: ColumnsType<EditorRow> = [
    {
      title: t('priceCompare.supplierPrice.material'),
      key: 'material',
      width: 120,
      render: (_value, row) => row.ref.material,
    },
    {
      title: t('priceCompare.supplierPrice.specNo'),
      key: 'spec',
      width: 90,
      align: 'center',
      render: (_value, row) => `Φ${row.ref.spec}`,
    },
    {
      title: t('priceCompare.supplierPrice.length'),
      key: 'length',
      width: 90,
      align: 'center',
      render: (_value, row) => row.ref.length || '—',
    },
    {
      title: t('priceCompare.supplierPrice.basePriceColumn'),
      key: 'base',
      width: 90,
      align: 'center',
      render: (_value, row) => (
        <Radio
          aria-label={t('priceCompare.supplierPrice.basePriceA11y', {
            material: row.ref.material,
            spec: row.ref.spec,
            length: row.ref.length || '—',
          })}
          checked={baseKey === row.key}
          onChange={() => setBaseKey(row.key)}
        />
      ),
    },
    {
      title: t('priceCompare.supplierPrice.deltaColumn'),
      key: 'delta',
      width: 170,
      align: 'right',
      render: (_value, row) => (
        <InputNumber
          aria-label={t('priceCompare.supplierPrice.deltaA11y', {
            material: row.ref.material,
            spec: row.ref.spec,
            length: row.ref.length || '—',
          })}
          disabled={baseKey === row.key}
          precision={2}
          size="small"
          style={{ width: '100%' }}
          value={baseKey === row.key ? 0 : (deltas[row.key] ?? null)}
          onChange={(value) =>
            setDeltas((current) => ({
              ...current,
              [row.key]: typeof value === 'number' ? value : null,
            }))
          }
        />
      ),
    },
  ]

  return (
    <Flex vertical gap={8}>
      <Typography.Text type="secondary">
        {t('priceCompare.supplierPrice.basePriceRuleHint')}
      </Typography.Text>
      {editorRows.length === 0 ? (
        <Empty description={t('priceCompare.supplierPrice.empty')} />
      ) : (
        <Table<EditorRow>
          columns={columns}
          dataSource={editorRows}
          pagination={false}
          rowKey="key"
          scroll={{ y: 420 }}
          size="small"
        />
      )}
      <Flex align="center" gap={8} justify="flex-end">
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          danger
          disabled={
            saveMutation.isPending ||
            (initialRules.base === null && initialRules.items.length === 0)
          }
          onClick={() => {
            setBaseKey(undefined)
            setDeltas({})
            saveMutation.mutate()
          }}
        >
          {t('priceCompare.supplierPrice.clearRules')}
        </Button>
        <Button
          disabled={!supplierId}
          loading={saveMutation.isPending}
          type="primary"
          onClick={() => saveMutation.mutate()}
        >
          {t('priceCompare.supplierPrice.basePriceRuleSave')}
        </Button>
      </Flex>
    </Flex>
  )
}
