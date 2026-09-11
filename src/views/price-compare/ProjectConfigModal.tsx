import { CloseOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Button,
  Checkbox,
  Empty,
  Flex,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
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

export type ProjectConfigDraft = {
  brands: string[]
  freightMap: Record<string, number>
  categoryMap: Record<string, string[]>
  premium: number
  hrb400eFallback: boolean
  products: string[]
}

function createDraft(
  config: ProjectConfig,
  brandOptions: string[],
): ProjectConfigDraft {
  const names = config.brands.map((brand) => brand.name)
  const freightMap: Record<string, number> = {}
  const categoryMap: Record<string, string[]> = {}
  for (const name of brandOptions) {
    const brand = config.brands.find((item) => item.name === name)
    freightMap[name] = brand?.freight ?? DEFAULT_FREIGHT
    categoryMap[name] = brand?.categories ?? CATEGORIES
  }
  return {
    brands: names.length ? names : brandOptions,
    freightMap,
    categoryMap,
    premium: config.lengthPremium,
    hrb400eFallback: config.hrb400eFallback,
    products: config.products ?? [],
  }
}

function draftToConfig(draft: ProjectConfigDraft): ProjectConfig {
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
    products: draft.products.length ? draft.products : undefined,
  }
}

/* ------------------------------------------------------------------ 基础 */

function BasicSection({
  draft,
  onChange,
}: {
  draft: ProjectConfigDraft
  onChange: (patch: Partial<ProjectConfigDraft>) => void
}) {
  return (
    <Flex vertical gap={12}>
      <Flex align="center" gap={8} className="price-compare-config-premium">
        <Text type="secondary" style={{ fontSize: 12 }}>
          12米加价（元/吨，仅螺纹钢生效）
        </Text>
        <InputNumber
          size="small"
          min={0}
          max={999}
          style={{ width: 120 }}
          value={draft.premium}
          onChange={(value) => onChange({ premium: value ?? 0 })}
        />
      </Flex>
      <Flex align="center" justify="space-between" gap={8}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          HRB400 无网价时改用 HRB400E 价格（网价前显示 E）
        </Text>
        <Switch
          size="small"
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
  const selectedBrands = useMemo(
    () => brandOptions.filter((name) => draft.brands.includes(name)),
    [brandOptions, draft.brands],
  )
  const unselected = useMemo(() => {
    const query = keyword.trim().toLowerCase()
    return brandOptions.filter(
      (name) =>
        !draft.brands.includes(name) &&
        (!query || name.toLowerCase().includes(query)),
    )
  }, [brandOptions, draft.brands, keyword])

  const add = (names: string[]) =>
    onChange({ brands: [...new Set([...draft.brands, ...names])] })
  const remove = (name: string) =>
    onChange({ brands: draft.brands.filter((item) => item !== name) })

  return (
    <Flex vertical gap={12}>
      <Flex justify="space-between" align="center" gap={8} wrap="wrap">
        <Text type="secondary" style={{ fontSize: 12 }}>
          参与比价的品牌与品种（未启用的品种该品牌不显示价格）
        </Text>
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            已选 {draft.brands.length}/{brandOptions.length}
          </Text>
          <Button
            size="small"
            type="text"
            onClick={() => onChange({ brands: brandOptions })}
          >
            全选
          </Button>
          <Button
            size="small"
            type="text"
            onClick={() => onChange({ brands: [] })}
          >
            清空
          </Button>
        </Space>
      </Flex>

      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          已参与品牌（{selectedBrands.length}）
        </Text>
        <Flex vertical gap={6} style={{ marginTop: 6 }}>
          {selectedBrands.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="尚未选择品牌"
            />
          ) : (
            selectedBrands.map((name) => (
              <div key={name} className="price-compare-config-brand is-active">
                <Flex align="center" gap={12} wrap="wrap">
                  <Text strong style={{ minWidth: 72 }}>
                    {name}
                  </Text>
                  <Space size={4}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      运费(元/吨)
                    </Text>
                    <InputNumber
                      size="small"
                      min={0}
                      max={9999}
                      style={{ width: 72 }}
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
                  <Space size={4}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      品种
                    </Text>
                    <Checkbox.Group
                      value={draft.categoryMap[name] ?? CATEGORIES}
                      options={CATEGORIES.map((category) => ({
                        label: category,
                        value: category,
                      }))}
                      onChange={(values) =>
                        onChange({
                          categoryMap: { ...draft.categoryMap, [name]: values },
                        })
                      }
                    />
                  </Space>
                  <Button
                    size="small"
                    type="text"
                    icon={<CloseOutlined />}
                    style={{ marginLeft: 'auto' }}
                    onClick={() => remove(name)}
                  />
                </Flex>
              </div>
            ))
          )}
        </Flex>
      </div>

      <div>
        <Flex justify="space-between" align="center" gap={8} wrap="wrap">
          <Text type="secondary" style={{ fontSize: 12 }}>
            未参与品牌（点击加入）
          </Text>
          <Input
            size="small"
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索品牌"
            style={{ width: 150 }}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </Flex>
        <div className="price-compare-brand-pool">
          {unselected.length === 0 ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              无
            </Text>
          ) : (
            <Checkbox.Group
              value={[]}
              options={unselected.map((name) => ({ label: name, value: name }))}
              onChange={(values) => add(values)}
            />
          )}
        </div>
      </div>
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

  const allKeys = useMemo(() => varieties.map(varietyKey), [varieties])
  const restricted = draft.products.length > 0
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
        (!query || varietyLabel(item).includes(query)),
    )
  }, [varieties, material, keyword])

  const groups = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category,
        items: visible.filter((item) => item.category === category),
      })).filter((group) => group.items.length > 0),
    [visible],
  )

  const toggleKey = (key: string, checked: boolean) =>
    onChange({
      products: checked
        ? [...new Set([...draft.products, key])]
        : draft.products.filter((item) => item !== key),
    })

  const toggleGroup = (keys: string[], checked: boolean) =>
    onChange({
      products: checked
        ? [...new Set([...draft.products, ...keys])]
        : draft.products.filter((item) => !keys.includes(item)),
    })

  return (
    <Flex vertical gap={10}>
      <Flex justify="space-between" align="center" gap={8} wrap="wrap">
        <Flex align="center" gap={8}>
          <Switch
            size="small"
            checked={restricted}
            onChange={(checked) =>
              onChange({ products: checked ? allKeys : [] })
            }
          />
          <Text style={{ fontSize: 12 }}>
            {restricted ? '仅允许勾选以下商品' : '全部商品可选（默认）'}
          </Text>
        </Flex>
        {restricted ? (
          <Space size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              已选 {draft.products.length}/{allKeys.length}
            </Text>
            <Button
              size="small"
              onClick={() => onChange({ products: allKeys })}
            >
              全选
            </Button>
            <Button size="small" onClick={() => onChange({ products: [] })}>
              清空
            </Button>
          </Space>
        ) : null}
      </Flex>

      {restricted ? (
        <>
          <Flex gap={6} align="center" wrap="wrap">
            <Text type="secondary" style={{ fontSize: 12 }}>
              材质
            </Text>
            <Tag.CheckableTag
              checked={material === ''}
              onChange={() => setMaterial('')}
            >
              全部
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
              size="small"
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索规格"
              style={{ width: 150, marginLeft: 'auto' }}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </Flex>

          <div className="price-compare-product-panel">
            {groups.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="无匹配商品"
              />
            ) : (
              groups.map((group) => {
                const keys = group.items.map(varietyKey)
                const selectedCount = keys.filter((key) =>
                  selectedSet.has(key),
                ).length
                const allChecked = selectedCount === keys.length
                return (
                  <div
                    key={group.category}
                    className="price-compare-product-group"
                  >
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
        </>
      ) : null}
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
  const [draft, setDraft] = useState<ProjectConfigDraft>(() =>
    createDraft(config, brandOptions),
  )

  useEffect(() => {
    if (!open) return
    setDraft(createDraft(config, brandOptions))
  }, [open, brandOptions, config])

  const patch = (partial: Partial<ProjectConfigDraft>) =>
    setDraft((current) => ({ ...current, ...partial }))

  const handleCancel = () => {
    const dirty =
      JSON.stringify(draft) !==
      JSON.stringify(createDraft(config, brandOptions))
    if (!dirty) {
      onClose()
      return
    }
    modal.confirm({
      title: '放弃未保存的修改？',
      okText: '放弃',
      cancelText: '继续编辑',
      onOk: onClose,
    })
  }

  return (
    <Modal
      title="项目配置"
      open={open}
      width={680}
      destroyOnHidden
      okText="保存"
      cancelText="取消"
      onOk={() => {
        onSave(draftToConfig(draft))
        onClose()
      }}
      onCancel={handleCancel}
      styles={{
        body: { maxHeight: '64vh', overflowY: 'auto', paddingRight: 8 },
      }}
    >
      <Tabs
        size="small"
        items={[
          {
            key: 'basic',
            label: '基础',
            children: <BasicSection draft={draft} onChange={patch} />,
          },
          {
            key: 'brands',
            label: '品牌与品种',
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
            label: '可选商品',
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
