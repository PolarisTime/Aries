import { CloseOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Empty,
  Flex,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { modal } from '@/utils/antd-app'
import { canonicalCategory, categoriesOf } from './core'
import {
  createDraft,
  DEFAULT_FREIGHT,
  draftToConfig,
  type ProjectConfigDraft,
  varietyKey,
} from './project-config-draft'
import type { ProjectConfig, Variety } from './types'

const { Text } = Typography

const varietyLabel = (item: Variety) =>
  [item.material, item.spec, item.length === '-' ? '' : item.length]
    .filter(Boolean)
    .join(' ')

/* ------------------------------------------------------------------ 通用 */

function SectionHeader({
  title,
  description,
  extra,
}: {
  title: string
  description?: string
  extra?: React.ReactNode
}) {
  return (
    <Flex justify="space-between" align="flex-start" gap={12} wrap>
      <Flex vertical gap={2}>
        <Text strong>{title}</Text>
        {description ? (
          <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
            {description}
          </Text>
        ) : null}
      </Flex>
      {extra ? <Flex align="center">{extra}</Flex> : null}
    </Flex>
  )
}

/* ------------------------------------------------------------------ 基础 */

function BasicSection({
  draft,
  onChange,
}: {
  draft: ProjectConfigDraft
  onChange: (patch: Partial<ProjectConfigDraft>) => void
}) {
  const { t } = useTranslation()
  return (
    <Flex vertical className="pc-config-card">
      <Flex align="center" justify="space-between" gap={16}>
        <Flex vertical gap={2}>
          <Text>{t('priceCompare.config.premiumLabel')}</Text>
          {/*
           * 长说明**常显**而不是 hover-only tooltip：键盘与读屏用户同样需要知道
           * 「这里的数值只在定尺主数据为空时兜底」，悬停提示对他们不可达。
           */}
          <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
            {t('priceCompare.config.premiumHint')}
          </Text>
        </Flex>
        <InputNumber
          min={0}
          max={999}
          style={{ width: 160 }}
          value={draft.premium}
          onChange={(value) => onChange({ premium: value ?? 0 })}
        />
      </Flex>
      <Divider style={{ margin: '12px 0' }} />
      <Flex align="center" justify="space-between" gap={16}>
        <Text>{t('priceCompare.config.fallbackLabel')}</Text>
        <Switch
          checked={draft.hrb400eFallback}
          onChange={(value) => onChange({ hrb400eFallback: value })}
        />
      </Flex>
    </Flex>
  )
}

/* ------------------------------------------------------------------ 品牌 */

function BrandSection({
  draft,
  brandOptions,
  projectAllowedBrands,
  categories,
  onChange,
}: {
  draft: ProjectConfigDraft
  /** 商品品牌全集（来自商品资料）。 */
  brandOptions: string[]
  /** 项目资料里配置的允许品牌；空数组表示项目不限制。 */
  projectAllowedBrands: string[]
  /** 数据里出现过的类别（唯一派生出口见 core.categoriesOf）。 */
  categories: string[]
  onChange: (patch: Partial<ProjectConfigDraft>) => void
}) {
  const { t } = useTranslation()

  /**
   * 参与比价的可选品牌：以「项目资料 → 允许的品牌」为上限。
   *
   * <p>空数组表示项目不限制（`md_project.allowed_brands` 的商业语义就是「空=不限」），
   * 此时退回商品品牌全集，保持与合并前一致的行为。项目一旦配置了允许品牌，
   * 比价页就只能在其中挑选参与比价的子集 —— 品牌范围的唯一配置入口收敛到项目资料。</p>
   */
  const candidateBrands = useMemo(() => {
    if (projectAllowedBrands.length === 0) return brandOptions
    const allowed = new Set(projectAllowedBrands)
    return brandOptions.filter((name) => allowed.has(name))
  }, [brandOptions, projectAllowedBrands])
  const restricted = projectAllowedBrands.length > 0
  const selectedBrandSet = useMemo(() => new Set(draft.brands), [draft.brands])
  const designatedSet = useMemo(
    () => new Set(draft.designatedBrands),
    [draft.designatedBrands],
  )
  const selectedBrands = useMemo(
    () => candidateBrands.filter((name) => selectedBrandSet.has(name)),
    [candidateBrands, selectedBrandSet],
  )
  /** 每个品牌的启用类别集合: 供渲染时 O(1) 判断, 避免循环内 includes。 */
  const categorySetByName = useMemo(() => {
    const result: Record<string, Set<string>> = {}
    for (const name of candidateBrands) {
      result[name] = new Set(draft.categoryMap[name] ?? categories)
    }
    return result
  }, [candidateBrands, draft.categoryMap, categories])

  const remove = (name: string) =>
    onChange({
      brands: draft.brands.filter((item) => item !== name),
      designatedBrands: draft.designatedBrands.filter((item) => item !== name),
    })

  return (
    <Flex vertical gap={20}>
      <Flex vertical gap={12}>
        {restricted ? (
          <Alert
            type="info"
            showIcon
            banner
            title={t('priceCompare.config.brandsFromProject', {
              count: projectAllowedBrands.length,
            })}
          />
        ) : null}
        <SectionHeader
          title={t('priceCompare.config.brandsTitle')}
          description={t('priceCompare.config.brandsHint')}
          extra={
            <Space size={4}>
              <Text
                type="secondary"
                style={{ fontSize: 'var(--font-size-xs)' }}
              >
                {t('priceCompare.config.selectedCount', {
                  selected: draft.brands.length,
                  total: candidateBrands.length,
                })}
              </Text>
              <Button
                size="small"
                type="link"
                onClick={() => onChange({ brands: candidateBrands })}
              >
                {t('priceCompare.config.selectAll')}
              </Button>
              <Button
                size="small"
                type="link"
                onClick={() => onChange({ brands: [], designatedBrands: [] })}
              >
                {t('priceCompare.config.clear')}
              </Button>
            </Space>
          }
        />

        <Flex vertical gap={8}>
          <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
            {t('priceCompare.config.selectedBrands', {
              selected: selectedBrands.length,
            })}
          </Text>
          {selectedBrands.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('priceCompare.config.noBrandSelected')}
            />
          ) : (
            <Flex vertical gap={8}>
              {selectedBrands.map((name) => (
                <div key={name} className="pc-brand-row">
                  <Flex align="center" justify="space-between" gap={12} wrap>
                    <Space size={6} align="center">
                      <Text strong style={{ minWidth: 56 }}>
                        {name}
                      </Text>
                      {designatedSet.has(name) ? (
                        <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                          {t('priceCompare.config.designatedBadge')}
                        </Tag>
                      ) : null}
                    </Space>
                    <Flex align="center" gap={16} wrap>
                      <Space size={6} align="center">
                        <Text
                          type="secondary"
                          style={{ fontSize: 'var(--font-size-xs)' }}
                        >
                          {t('priceCompare.config.freight')}
                        </Text>
                        <InputNumber
                          size="small"
                          min={0}
                          max={9999}
                          style={{ width: 84 }}
                          aria-label={`${name} ${t('priceCompare.config.freight')}`}
                          value={draft.freightMap[name] ?? DEFAULT_FREIGHT}
                          onChange={(value) =>
                            onChange({
                              freightMap: {
                                ...draft.freightMap,
                                [name]: Number(value) || 0,
                              },
                            })
                          }
                        />
                      </Space>
                      {/* 品种多选: 一行只留「品牌 + 运费 + 品种」三件信息, 不再铺一排可点标签 */}
                      <Select
                        mode="multiple"
                        allowClear
                        size="small"
                        style={{ minWidth: 200 }}
                        placeholder={t('priceCompare.config.category')}
                        aria-label={`${name} ${t('priceCompare.config.category')}`}
                        value={[...(categorySetByName[name] ?? [])]}
                        options={categories.map((category) => ({
                          value: category,
                          label: category,
                        }))}
                        onChange={(values) =>
                          onChange({
                            categoryMap: {
                              ...draft.categoryMap,
                              [name]: values,
                            },
                          })
                        }
                      />
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<CloseOutlined />}
                        aria-label={`${t('common.delete')} ${name}`}
                        onClick={() => remove(name)}
                      />
                    </Flex>
                  </Flex>
                </div>
              ))}
            </Flex>
          )}
        </Flex>
      </Flex>

      <Flex vertical gap={6} className="pc-field">
        <Text strong>{t('priceCompare.config.designatedBrands')}</Text>
        <Select
          mode="multiple"
          allowClear
          showSearch
          style={{ width: '100%' }}
          placeholder={t('priceCompare.config.designatedBrands')}
          aria-label={t('priceCompare.config.designatedBrands')}
          value={draft.designatedBrands}
          options={brandOptions.map((name) => ({ value: name, label: name }))}
          onChange={(values) => onChange({ designatedBrands: values })}
        />
        <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
          {t('priceCompare.config.designatedBrandsHint')}
        </Text>
      </Flex>
    </Flex>
  )
}

/* --------------------------------------------------------------- 可选商品 */

/** 矩阵行键: 规格 + 定尺(定尺为空或「-」时只用规格)。行列都从数据派生, 不引入硬编码清单。 */
function specRowOf(item: Variety): { key: string; label: string } {
  const length = item.length && item.length !== '-' ? item.length : ''
  return {
    key: `${item.spec}|${length}`,
    label: length ? `${item.spec} ${length}` : `${item.spec}`,
  }
}

function ProductSection({
  draft,
  varieties,
  onChange,
}: {
  draft: ProjectConfigDraft
  varieties: Variety[]
  onChange: (patch: Partial<ProjectConfigDraft>) => void
}) {
  const [keyword, setKeyword] = useState('')
  const [onlySelected, setOnlySelected] = useState(false)
  const { t } = useTranslation()

  const allKeys = useMemo(() => varieties.map(varietyKey), [varieties])
  const selectedSet = useMemo(() => new Set(draft.products), [draft.products])

  /** 搜索匹配规格或材质任一(顺带覆盖定尺/类别); 空关键词不过滤。 */
  const matched = useMemo(() => {
    const query = keyword.trim().toLowerCase()
    if (!query) return varieties
    return varieties.filter((item) =>
      [item.category, item.spec, item.length, item.material]
        .filter((part) => part !== null && part !== undefined && part !== '')
        .some((part) => String(part).toLowerCase().includes(query)),
    )
  }, [varieties, keyword])

  /**
   * 每个类别一张「规格 × 材质」矩阵。
   *
   * <p>按类别分表而不是全混一张: 同一规格(如 12 9米)在螺纹钢与圆钢下都存在，混表会让
   * 同一个行列交叉点对应两个不同商品，勾选语义就说不清了。行=规格(含定尺)、列=材质，
   * 两者都从数据派生。</p>
   */
  const matrices = useMemo(
    () =>
      categoriesOf(matched).map((category) => {
        const rows = new Map<string, string>()
        const columns: string[] = []
        const cellByKey = new Map<string, Variety>()
        for (const item of matched) {
          if (canonicalCategory(item.category) !== category) continue
          const row = specRowOf(item)
          if (!rows.has(row.key)) rows.set(row.key, row.label)
          if (!columns.includes(item.material)) columns.push(item.material)
          cellByKey.set(`${row.key}|${item.material}`, item)
        }
        return { category, rows: [...rows.entries()], columns, cellByKey }
      }),
    [matched],
  )

  /** 「只看已选」: 只保留至少有一个已选格的规格行与材质列。 */
  const shownMatrices = useMemo(() => {
    if (!onlySelected) return matrices
    return matrices
      .map((matrix) => {
        const isSelected = (rowKey: string, material: string) => {
          const item = matrix.cellByKey.get(`${rowKey}|${material}`)
          return item ? selectedSet.has(varietyKey(item)) : false
        }
        const rows = matrix.rows.filter(([rowKey]) =>
          matrix.columns.some((material) => isSelected(rowKey, material)),
        )
        const columns = matrix.columns.filter((material) =>
          rows.some(([rowKey]) => isSelected(rowKey, material)),
        )
        return { ...matrix, rows, columns }
      })
      .filter((matrix) => matrix.rows.length > 0 && matrix.columns.length > 0)
  }, [matrices, onlySelected, selectedSet])

  const toggleKeys = (keys: string[], checked: boolean) =>
    onChange({
      products: checked
        ? [...new Set([...draft.products, ...keys])]
        : draft.products.filter((item) => !keys.includes(item)),
    })

  /** 一组格子的勾选态: 全选 / 半选 / 未选, 供行头与列头复用同一口径。 */
  const groupState = (keys: string[]) => {
    const selected = keys.filter((key) => selectedSet.has(key)).length
    return {
      count: keys.length,
      selected,
      checked: keys.length > 0 && selected === keys.length,
      indeterminate: selected > 0 && selected < keys.length,
    }
  }

  return (
    <Flex vertical gap={12}>
      <SectionHeader
        title={t('priceCompare.config.productsTitle')}
        description={t('priceCompare.config.productsHint')}
        extra={
          <Space size={4}>
            <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
              {t('priceCompare.config.selectedCount', {
                selected: draft.products.length,
                total: allKeys.length,
              })}
            </Text>
            <Button
              size="small"
              type="link"
              onClick={() => onChange({ products: allKeys })}
            >
              {t('priceCompare.config.selectAll')}
            </Button>
            <Button
              size="small"
              type="link"
              onClick={() => onChange({ products: [] })}
            >
              {t('priceCompare.config.clear')}
            </Button>
          </Space>
        }
      />

      <Flex gap={16} align="center" wrap>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t('priceCompare.config.searchSpecOrMaterial')}
          aria-label={t('priceCompare.config.searchSpecOrMaterial')}
          style={{ width: 220 }}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <Space size={6} align="center">
          <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
            {t('priceCompare.config.onlySelected')}
          </Text>
          <Switch
            size="small"
            checked={onlySelected}
            onChange={setOnlySelected}
            aria-label={t('priceCompare.config.onlySelected')}
          />
        </Space>
      </Flex>

      {shownMatrices.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('priceCompare.config.noMatchedProduct')}
        />
      ) : (
        /* 整个矩阵区一个滚动容器(而不是每张表各滚各的): 弹层主体不滚,
           顶部「已选 N/M」「只看已选」在复核 88 个格子时始终可见可点。 */
        <div className="price-compare-matrix-scroll">
          {shownMatrices.map((matrix) => {
            const rowKeysOf = (rowKey: string) =>
              matrix.columns
                .map((material) =>
                  matrix.cellByKey.get(`${rowKey}|${material}`),
                )
                .filter((item): item is Variety => Boolean(item))
                .map(varietyKey)
            const columnKeysOf = (material: string) =>
              matrix.rows
                .map(([rowKey]) =>
                  matrix.cellByKey.get(`${rowKey}|${material}`),
                )
                .filter((item): item is Variety => Boolean(item))
                .map(varietyKey)
            const categoryKeys = [...matrix.cellByKey.values()].map(varietyKey)
            const categoryState = groupState(categoryKeys)
            // 类别名已由首行的 Checkbox 文案给出, 容器不再重复标注(避免 role/aria 冗余)
            return (
              <div
                key={matrix.category}
                className="price-compare-product-group"
              >
                <Flex justify="space-between" align="center">
                  <Checkbox
                    checked={categoryState.checked}
                    indeterminate={categoryState.indeterminate}
                    onChange={(event) =>
                      toggleKeys(categoryKeys, event.target.checked)
                    }
                  >
                    {matrix.category}
                  </Checkbox>
                  <Text
                    type="secondary"
                    style={{ fontSize: 'var(--font-size-xs)' }}
                  >
                    {categoryState.selected}/{categoryState.count}
                  </Text>
                </Flex>

                <table className="price-compare-matrix">
                  <thead>
                    <tr>
                      <th scope="col" className="price-compare-matrix-corner">
                        {t('priceCompare.config.matrixSpec')}
                      </th>
                      {matrix.columns.map((material) => {
                        const keys = columnKeysOf(material)
                        const state = groupState(keys)
                        return (
                          <th key={material} scope="col">
                            <Checkbox
                              checked={state.checked}
                              indeterminate={state.indeterminate}
                              aria-label={`${t('priceCompare.config.selectColumn')} ${material}`}
                              onChange={(event) =>
                                toggleKeys(keys, event.target.checked)
                              }
                            >
                              {material}
                            </Checkbox>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.rows.map(([rowKey, rowLabel]) => {
                      const keys = rowKeysOf(rowKey)
                      const state = groupState(keys)
                      return (
                        <tr key={rowKey}>
                          <th scope="row">
                            <Checkbox
                              checked={state.checked}
                              indeterminate={state.indeterminate}
                              aria-label={`${t('priceCompare.config.selectRow')} ${rowLabel}`}
                              onChange={(event) =>
                                toggleKeys(keys, event.target.checked)
                              }
                            >
                              {rowLabel}
                            </Checkbox>
                          </th>
                          {matrix.columns.map((material) => {
                            const item = matrix.cellByKey.get(
                              `${rowKey}|${material}`,
                            )
                            if (!item) {
                              return (
                                <td key={material}>
                                  <span
                                    className="price-compare-matrix-empty"
                                    aria-hidden="true"
                                    title={t('priceCompare.config.emptyCell')}
                                  >
                                    —
                                  </span>
                                </td>
                              )
                            }
                            const key = varietyKey(item)
                            return (
                              <td key={material}>
                                <Checkbox
                                  checked={selectedSet.has(key)}
                                  aria-label={`${matrix.category} ${varietyLabel(item)}`}
                                  onChange={(event) =>
                                    toggleKeys([key], event.target.checked)
                                  }
                                />
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </Flex>
  )
}

/* ------------------------------------------------------------------- 主体 */

type Props = {
  open: boolean
  brandOptions: string[]
  /** 项目资料里配置的允许品牌；空数组表示项目不限制。 */
  projectAllowedBrands: string[]
  varieties: Variety[]
  config: ProjectConfig
  onClose: () => void
  onSave: (config: ProjectConfig) => void
}

/**
 * 项目配置: 基础(12米加价/兜底) · 品牌与品种 · 可选商品。
 */
export function ProjectConfigModal({
  open,
  brandOptions,
  projectAllowedBrands,
  varieties,
  config,
  onClose,
  onSave,
}: Props) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<ProjectConfigDraft>(() =>
    createDraft(config, brandOptions, varieties),
  )
  const wasOpenRef = useRef(false)

  // 仅在 open 由 false -> true 时初始化草稿; 打开期间 config/brandOptions 变化
  // (保存回填版本、后台刷新)不会重置用户正在编辑的内容, 也避免依赖不稳定的
  // brandOptions 数组造成的重复 setDraft。
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setDraft(createDraft(config, brandOptions, varieties))
    }
    wasOpenRef.current = open
  }, [open, brandOptions, config, varieties])

  const patch = (partial: Partial<ProjectConfigDraft>) =>
    setDraft((current) => ({ ...current, ...partial }))

  const handleCancel = () => {
    const dirty =
      JSON.stringify(draft) !==
      JSON.stringify(createDraft(config, brandOptions, varieties))
    if (!dirty) {
      onClose()
      return
    }
    modal.confirm({
      title: t('priceCompare.config.discardTitle'),
      okText: t('priceCompare.config.abandon'),
      cancelText: t('priceCompare.config.continueEditing'),
      onOk: onClose,
    })
  }

  return (
    <Modal
      title={t('priceCompare.config.title')}
      open={open}
      width={720}
      destroyOnHidden
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      onOk={() => {
        onSave(draftToConfig(draft, varieties))
        onClose()
      }}
      onCancel={handleCancel}
      styles={{
        body: {
          maxHeight: '64vh',
          overflowY: 'auto',
          paddingRight: 'var(--space-xs)',
        },
      }}
    >
      <Tabs
        items={[
          {
            key: 'basic',
            label: t('priceCompare.config.tabs.basic'),
            children: <BasicSection draft={draft} onChange={patch} />,
          },
          {
            key: 'brands',
            label: t('priceCompare.config.tabs.brands'),
            children: (
              <BrandSection
                draft={draft}
                brandOptions={brandOptions}
                projectAllowedBrands={projectAllowedBrands}
                categories={categoriesOf(varieties)}
                onChange={patch}
              />
            ),
          },
          {
            key: 'products',
            label: t('priceCompare.config.tabs.products'),
            children: (
              <ProductSection
                draft={draft}
                varieties={varieties}
                onChange={patch}
              />
            ),
          },
        ]}
      />
    </Modal>
  )
}
