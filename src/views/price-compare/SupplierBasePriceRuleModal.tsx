import { SearchOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Empty,
  Flex,
  Input,
  InputNumber,
  Popconfirm,
  Radio,
  Segmented,
  Spin,
  Table,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { TFunction } from 'i18next'
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
import { message, modal } from '@/utils/antd-app'
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

const ALL_MATERIAL_FILTER = '__ALL__'

function initialDeltasOf(
  initialRules: SupplierBasePriceRules,
): Record<string, number | null> {
  const next: Record<string, number | null> = {}
  for (const item of initialRules.items) {
    if (item.delta !== 0) next[ruleKeyOfRef(item)] = item.delta
  }
  return next
}

function hasRuleChanges(
  initialRules: SupplierBasePriceRules,
  baseKey: string | undefined,
  deltas: Record<string, number | null>,
): boolean {
  const initialBaseKey = initialRules.base
    ? ruleKeyOfRef(initialRules.base)
    : undefined
  if (baseKey !== initialBaseKey) return true
  const initialDeltas = initialDeltasOf(initialRules)
  const keys = new Set([...Object.keys(initialDeltas), ...Object.keys(deltas)])
  for (const key of keys) {
    if (key === baseKey) continue
    const before = initialDeltas[key] ?? null
    const rawAfter = deltas[key] ?? null
    const after = rawAfter === 0 ? null : rawAfter
    if (before !== after) return true
  }
  return false
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
  const title = `${t('priceCompare.supplierPrice.basePriceRuleTitle')} · ${brandName}`

  if (rulesQuery.data) {
    return (
      <RuleEditorOverlay
        key={`${brandName}:${rulesQuery.data.version}`}
        brandName={brandName}
        initialRules={rulesQuery.data}
        onClose={onClose}
        onSaved={onSaved}
        open={open}
        rows={rows}
        supplierId={supplierId}
        title={title}
      />
    )
  }

  return (
    <WorkspaceOverlay
      className="workspace-overlay-panel--form-dialog"
      onClose={onClose}
      open={open}
      title={title}
      width={760}
    >
      {rulesQuery.isError ? (
        <Typography.Text type="danger">
          {t('priceCompare.supplierPrice.rulesLoadFailed')}
        </Typography.Text>
      ) : (
        <Spin />
      )}
    </WorkspaceOverlay>
  )
}

function buildRuleEditorColumns({
  baseKey,
  deltas,
  onSelectBase,
  onChangeDelta,
  t,
}: {
  baseKey: string | undefined
  deltas: Record<string, number | null>
  onSelectBase: (key: string) => void
  onChangeDelta: (key: string, value: number | null) => void
  t: TFunction
}): ColumnsType<EditorRow> {
  return [
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
          onChange={() => onSelectBase(row.key)}
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
            onChangeDelta(row.key, typeof value === 'number' ? value : null)
          }
        />
      ),
    },
  ]
}

function RuleFilterBar({
  materials,
  materialFilter,
  keyword,
  onMaterialChange,
  onKeywordChange,
}: {
  materials: readonly string[]
  materialFilter: string
  keyword: string
  onMaterialChange: (value: string) => void
  onKeywordChange: (value: string) => void
}) {
  const { t } = useTranslation()
  return (
    <Flex
      align="center"
      className="supplier-price-rules-filter"
      gap={8}
      justify="space-between"
      wrap="wrap"
    >
      {materials.length > 1 ? (
        <Segmented
          options={[
            {
              label: t('priceCompare.supplierPrice.rulesFilterAll'),
              value: ALL_MATERIAL_FILTER,
            },
            ...materials.map((material) => ({
              label: material,
              value: material,
            })),
          ]}
          size="small"
          value={materialFilter}
          onChange={(value) => onMaterialChange(String(value))}
        />
      ) : (
        <span />
      )}
      <Input
        allowClear
        aria-label={t('priceCompare.supplierPrice.rulesSearchPlaceholder')}
        placeholder={t('priceCompare.supplierPrice.rulesSearchPlaceholder')}
        prefix={<SearchOutlined />}
        size="small"
        style={{ width: 200 }}
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
      />
    </Flex>
  )
}

function RuleEditorFooter({
  clearDisabled,
  saveDisabled,
  saving,
  onCancel,
  onClear,
  onSave,
}: {
  clearDisabled: boolean
  saveDisabled: boolean
  saving: boolean
  onCancel: () => void
  onClear: () => void
  onSave: () => void
}) {
  const { t } = useTranslation()
  return (
    <Flex align="center" gap={8} justify="flex-end">
      <Button onClick={onCancel}>{t('common.cancel')}</Button>
      <Popconfirm
        cancelText={t('common.cancel')}
        description={t('priceCompare.supplierPrice.clearRulesConfirmDesc')}
        disabled={clearDisabled}
        okButtonProps={{ danger: true }}
        okText={t('priceCompare.supplierPrice.clearRules')}
        title={t('priceCompare.supplierPrice.clearRulesConfirmTitle')}
        onConfirm={onClear}
      >
        <Button danger disabled={clearDisabled}>
          {t('priceCompare.supplierPrice.clearRules')}
        </Button>
      </Popconfirm>
      <Button
        disabled={saveDisabled}
        loading={saving}
        type="primary"
        onClick={onSave}
      >
        {t('priceCompare.supplierPrice.basePriceRuleSave')}
      </Button>
    </Flex>
  )
}

/** 规则表单浮层：操作栏落到 WorkspaceOverlay footer 槽位，支持材质/规格筛选与未保存离开保护。 */
function RuleEditorOverlay({
  open,
  title,
  supplierId,
  brandName,
  rows,
  initialRules,
  onClose,
  onSaved,
}: {
  open: boolean
  title: string
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
  const [deltas, setDeltas] = useState<Record<string, number | null>>(() =>
    initialDeltasOf(initialRules),
  )
  const [materialFilter, setMaterialFilter] =
    useState<string>(ALL_MATERIAL_FILTER)
  const [keyword, setKeyword] = useState('')

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

  const materials = useMemo(
    () => [...new Set(editorRows.map((row) => row.ref.material))],
    [editorRows],
  )

  const filteredRows = useMemo(() => {
    const query = keyword.trim().toLowerCase()
    return editorRows.filter((row) => {
      if (
        materialFilter !== ALL_MATERIAL_FILTER &&
        row.ref.material !== materialFilter
      ) {
        return false
      }
      if (!query) return true
      const haystack =
        `${row.ref.material} Φ${row.ref.spec} ${row.ref.spec} ${row.ref.length}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [editorRows, keyword, materialFilter])

  const dirty = hasRuleChanges(initialRules, baseKey, deltas)

  const saveMutation = useMutation({
    mutationFn: async (mode: 'save' | 'clear') => {
      if (!supplierId) throw new Error('missing supplier')
      if (mode === 'clear') {
        return saveSupplierBasePriceRules(
          { supplierId, brandName, base: null, items: [] },
          initialRules.version,
        )
      }
      const base = baseKey
        ? (editorRows.find((row) => row.key === baseKey)?.ref ?? null)
        : null
      if (baseKey && !base) throw new Error('base not found')
      const items: BasePriceRuleItem[] = []
      if (base) items.push({ ...base, delta: 0 })
      // 提交全量 editorRows 而非筛选视图，避免筛选状态下保存误清空其它材质规则
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

  const handleRequestClose = () => {
    if (saveMutation.isPending) return
    if (!dirty) {
      onClose()
      return
    }
    modal.confirm({
      title: t('priceCompare.supplierPrice.rulesDiscardTitle'),
      content: t('priceCompare.supplierPrice.rulesDiscardContent'),
      okText: t('priceCompare.supplierPrice.rulesDiscardOk'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: onClose,
    })
  }

  const columns = buildRuleEditorColumns({
    baseKey,
    deltas,
    onSelectBase: setBaseKey,
    onChangeDelta: (key, value) =>
      setDeltas((current) => ({ ...current, [key]: value })),
    t,
  })

  const clearDisabled =
    saveMutation.isPending ||
    (initialRules.base === null && initialRules.items.length === 0)

  return (
    <WorkspaceOverlay
      className="workspace-overlay-panel--form-dialog"
      footer={
        <RuleEditorFooter
          clearDisabled={clearDisabled}
          saveDisabled={!supplierId}
          saving={saveMutation.isPending}
          onCancel={handleRequestClose}
          onClear={() => {
            setBaseKey(undefined)
            setDeltas({})
            saveMutation.mutate('clear')
          }}
          onSave={() => saveMutation.mutate('save')}
        />
      }
      onClose={handleRequestClose}
      open={open}
      title={title}
      width={760}
    >
      <Flex vertical gap={8}>
        <Typography.Text type="secondary">
          {t('priceCompare.supplierPrice.basePriceRuleHint')}
        </Typography.Text>
        {editorRows.length > 0 ? (
          <RuleFilterBar
            keyword={keyword}
            materialFilter={materialFilter}
            materials={materials}
            onKeywordChange={setKeyword}
            onMaterialChange={setMaterialFilter}
          />
        ) : null}
        {editorRows.length === 0 ? (
          <Empty description={t('priceCompare.supplierPrice.empty')} />
        ) : (
          <Table<EditorRow>
            columns={columns}
            dataSource={filteredRows}
            pagination={false}
            rowKey="key"
            scroll={{ y: 420 }}
            size="small"
          />
        )}
      </Flex>
    </WorkspaceOverlay>
  )
}
