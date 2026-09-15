import { CloseOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import {
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
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { modal } from '@/utils/antd-app'
import { CATEGORIES } from './core'
import type { Brand, ProjectConfig, Variety } from './types'

const { Text } = Typography
const DEFAULT_FREIGHT = 30

const varietyKey = (item: Variety) =>
  `${item.category}|${item.material}|${item.spec}|${item.length}`

const varietyLabel = (item: Variety) =>
  [item.material, item.spec, item.length === '-' ? '' : item.length]
    .filter(Boolean)
    .join(' ')

const varietyShort = (item: Variety) =>
  [item.spec, item.length === '-' ? '' : item.length].filter(Boolean).join(' ')

const matchesVarietyKeyword = (item: Variety, query: string) =>
  !query || varietyLabel(item).includes(query)

export type ProjectConfigDraft = {
  brands: string[]
  freightMap: Record<string, number>
  categoryMap: Record<string, string[]>
  premium: number
  hrb400eFallback: boolean
  products: string[]
  designatedBrands: string[]
}

export function createDraft(
  config: ProjectConfig,
  brandOptions: string[],
  varieties: Variety[],
): ProjectConfigDraft {
  const names = config.brands.map((brand) => brand.name)
  const brandByName = new Map<string, Brand>()
  for (const brand of config.brands) {
    if (!brandByName.has(brand.name)) brandByName.set(brand.name, brand)
  }
  const freightMap: Record<string, number> = {}
  const categoryMap: Record<string, string[]> = {}
  for (const name of brandOptions) {
    const brand = brandByName.get(name)
    freightMap[name] = brand?.freight ?? DEFAULT_FREIGHT
    categoryMap[name] = brand?.categories ?? CATEGORIES
  }
  return {
    brands: names.length ? names : brandOptions,
    freightMap,
    categoryMap,
    premium: config.lengthPremium,
    hrb400eFallback: config.hrb400eFallback,
    products: config.products?.length
      ? config.products
      : varieties.map(varietyKey),
    designatedBrands: config.designatedBrands ?? [],
  }
}

export function draftToConfig(
  draft: ProjectConfigDraft,
  varieties: Variety[],
): ProjectConfig {
  const brands: Brand[] = draft.brands.map((name) => {
    const categories = draft.categoryMap[name] ?? CATEGORIES
    const enabled =
      categories.length === 0 || categories.length === CATEGORIES.length
        ? undefined
        : categories
    return {
      name,
      freight: draft.freightMap[name] ?? DEFAULT_FREIGHT,
      categories: enabled,
    }
  })
  return {
    brands,
    lengthPremium: draft.premium,
    hrb400eFallback: draft.hrb400eFallback,
    products:
      draft.products.length === varieties.length ? undefined : draft.products,
    designatedBrands: draft.designatedBrands.length
      ? draft.designatedBrands
      : undefined,
  }
}

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
          <Text type="secondary" style={{ fontSize: 12 }}>
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
        <Text>{t('priceCompare.config.premiumLabel')}</Text>
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
  onChange,
}: {
  draft: ProjectConfigDraft
  brandOptions: string[]
  onChange: (patch: Partial<ProjectConfigDraft>) => void
}) {
  const [keyword, setKeyword] = useState('')
  const { t } = useTranslation()
  const selectedBrandSet = useMemo(() => new Set(draft.brands), [draft.brands])
  const designatedSet = useMemo(
    () => new Set(draft.designatedBrands),
    [draft.designatedBrands],
  )
  const selectedBrands = useMemo(
    () => brandOptions.filter((name) => selectedBrandSet.has(name)),
    [brandOptions, selectedBrandSet],
  )
  const unselected = useMemo(() => {
    const query = keyword.trim().toLowerCase()
    return brandOptions.filter(
      (name) =>
        !selectedBrandSet.has(name) &&
        (!query || name.toLowerCase().includes(query)),
    )
  }, [brandOptions, selectedBrandSet, keyword])

  const add = (names: string[]) =>
    onChange({ brands: [...new Set([...draft.brands, ...names])] })
  const remove = (name: string) =>
    onChange({
      brands: draft.brands.filter((item) => item !== name),
      designatedBrands: draft.designatedBrands.filter((item) => item !== name),
    })
  const toggleCategory = (name: string, category: string, checked: boolean) => {
    const current = draft.categoryMap[name] ?? CATEGORIES
    const next = checked
      ? [...new Set([...current, category])]
      : current.filter((item) => item !== category)
    onChange({ categoryMap: { ...draft.categoryMap, [name]: next } })
  }

  return (
    <Flex vertical gap={20}>
      <Flex vertical gap={12}>
        <SectionHeader
          title={t('priceCompare.config.brandsTitle')}
          description={t('priceCompare.config.brandsHint')}
          extra={
            <Space size={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('priceCompare.config.selectedCount', {
                  selected: draft.brands.length,
                  total: brandOptions.length,
                })}
              </Text>
              <Button
                size="small"
                type="link"
                onClick={() => onChange({ brands: brandOptions })}
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
          <Text type="secondary" style={{ fontSize: 12 }}>
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
                        <Text type="secondary" style={{ fontSize: 12 }}>
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
                      <Space size={4} align="center">
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t('priceCompare.config.category')}
                        </Text>
                        {CATEGORIES.map((category) => (
                          <Tag.CheckableTag
                            key={category}
                            checked={(
                              draft.categoryMap[name] ?? CATEGORIES
                            ).includes(category)}
                            onChange={(checked) =>
                              toggleCategory(name, category, checked)
                            }
                          >
                            {category}
                          </Tag.CheckableTag>
                        ))}
                      </Space>
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
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('priceCompare.config.designatedBrandsHint')}
        </Text>
      </Flex>

      <Flex vertical gap={8}>
        <SectionHeader
          title={t('priceCompare.config.unselectedBrands')}
          extra={
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder={t('priceCompare.config.searchBrand')}
              style={{ width: 180 }}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          }
        />
        <div className="pc-brand-pool">
          {unselected.length === 0 ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('priceCompare.config.none')}
            </Text>
          ) : (
            unselected.map((name) => (
              <Tag
                key={name}
                icon={<PlusOutlined />}
                className="pc-brand-pool-tag"
                onClick={() => add([name])}
              >
                {name}
              </Tag>
            ))
          )}
        </div>
      </Flex>
    </Flex>
  )
}

/* --------------------------------------------------------------- 可选商品 */

function ProductSection({
  draft,
  varieties,
  onChange,
}: {
  draft: ProjectConfigDraft
  varieties: Variety[]
  onChange: (patch: Partial<ProjectConfigDraft>) => void
}) {
  const [material, setMaterial] = useState<string>('')
  const [keyword, setKeyword] = useState('')
  const { t } = useTranslation()

  const allKeys = useMemo(() => varieties.map(varietyKey), [varieties])
  const selectedSet = useMemo(() => new Set(draft.products), [draft.products])

  const materials = useMemo(
    () => [...new Set(varieties.map((item) => item.material))],
    [varieties],
  )

  const visible = useMemo(() => {
    const query = keyword.trim()
    return varieties.filter(
      (item) =>
        (!material || item.material === material) &&
        matchesVarietyKeyword(item, query),
    )
  }, [varieties, material, keyword])

  const groups = useMemo(
    () =>
      CATEGORIES.flatMap((category) => {
        const items = visible.filter((item) => item.category === category)
        return items.length > 0 ? [{ category, items }] : []
      }),
    [visible],
  )

  const toggleKey = (key: string, checked: boolean) =>
    onChange({
      products: checked
        ? [...new Set([...draft.products, key])]
        : draft.products.filter((item) => item !== key),
    })

  const toggleGroup = (keys: string[], checked: boolean) => {
    const keySet = new Set(keys)
    onChange({
      products: checked
        ? [...new Set([...draft.products, ...keys])]
        : draft.products.filter((item) => !keySet.has(item)),
    })
  }

  return (
    <Flex vertical gap={12}>
      <SectionHeader
        title={t('priceCompare.config.productsTitle')}
        description={t('priceCompare.config.productsHint')}
        extra={
          <Space size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
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

      <Flex gap={8} align="center" wrap>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('priceCompare.config.material')}
        </Text>
        <Tag.CheckableTag
          checked={material === ''}
          onChange={() => setMaterial('')}
        >
          {t('priceCompare.config.all')}
        </Tag.CheckableTag>
        {materials.map((item) => (
          <Tag.CheckableTag
            key={item}
            checked={material === item}
            onChange={() => setMaterial(item)}
          >
            {item}
          </Tag.CheckableTag>
        ))}
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t('priceCompare.config.searchSpec')}
          style={{ width: 180, marginLeft: 'auto' }}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </Flex>

      <div className="price-compare-product-panel">
        {groups.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('priceCompare.config.noMatchedProduct')}
          />
        ) : (
          groups.map((group) => {
            const keys = group.items.map(varietyKey)
            const selectedCount = keys.filter((key) =>
              selectedSet.has(key),
            ).length
            const allChecked = selectedCount === keys.length
            return (
              <div key={group.category} className="price-compare-product-group">
                <Flex justify="space-between" align="center">
                  <Checkbox
                    checked={allChecked}
                    indeterminate={selectedCount > 0 && !allChecked}
                    onChange={(event) =>
                      toggleGroup(keys, event.target.checked)
                    }
                  >
                    {group.category}
                  </Checkbox>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {selectedCount}/{keys.length}
                  </Text>
                </Flex>
                <Flex wrap gap={8} className="price-compare-product-items">
                  {group.items.map((item) => {
                    const key = varietyKey(item)
                    return (
                      <Checkbox
                        key={key}
                        checked={selectedSet.has(key)}
                        onChange={(event) =>
                          toggleKey(key, event.target.checked)
                        }
                      >
                        {material ? varietyShort(item) : varietyLabel(item)}
                      </Checkbox>
                    )
                  })}
                </Flex>
              </div>
            )
          })
        )}
      </div>
    </Flex>
  )
}

/* ------------------------------------------------------------------- 主体 */

type Props = {
  open: boolean
  brandOptions: string[]
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
  varieties,
  config,
  onClose,
  onSave,
}: Props) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<ProjectConfigDraft>(() =>
    createDraft(config, brandOptions, varieties),
  )

  useEffect(() => {
    if (!open) return
    setDraft(createDraft(config, brandOptions, varieties))
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
        body: { maxHeight: '64vh', overflowY: 'auto', paddingRight: 8 },
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
