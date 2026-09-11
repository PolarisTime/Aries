import { SearchOutlined } from '@ant-design/icons'
import type { TreeSelectProps } from 'antd'
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
  TreeSelect,
  Typography,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
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
  const filtered = useMemo(() => {
    const query = keyword.trim().toLowerCase()
    if (!query) return brandOptions
    return brandOptions.filter((name) => name.toLowerCase().includes(query))
  }, [brandOptions, keyword])

  const toggle = (name: string, checked: boolean) =>
    onChange({
      brands: checked
        ? [...draft.brands, name]
        : draft.brands.filter((item) => item !== name),
    })

  return (
    <>
      <Flex justify="space-between" align="center" gap={8} wrap="wrap">
        <Text type="secondary" style={{ fontSize: 12 }}>
          参与比价的品牌与品种（未启用的品种该品牌不显示价格）
        </Text>
        <Space size={4}>
          <Input
            size="small"
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索品牌"
            style={{ width: 140 }}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
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
      <Flex vertical gap={4} style={{ marginTop: 8 }}>
        {filtered.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="未匹配到品牌"
          />
        ) : (
          filtered.map((name) => {
            const active = draft.brands.includes(name)
            return (
              <div
                key={name}
                className={`price-compare-config-brand${active ? ' is-active' : ''}`}
              >
                <Flex justify="space-between" align="center" gap={8}>
                  <Checkbox
                    checked={active}
                    onChange={(event) => toggle(name, event.target.checked)}
                  >
                    {name}
                  </Checkbox>
                  {active ? (
                    <Space size={4}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        运费
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
                  ) : null}
                </Flex>
                {active ? (
                  <Checkbox.Group
                    className="price-compare-config-categories"
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
                ) : null}
              </div>
            )
          })
        )}
      </Flex>
    </>
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

  const materials = useMemo(
    () => [...new Set(varieties.map((item) => item.material))],
    [varieties],
  )
  const productKeys = useMemo(
    () => new Set(varieties.map(varietyKey)),
    [varieties],
  )

  const visible = useMemo(
    () =>
      material
        ? varieties.filter((item) => item.material === material)
        : varieties,
    [varieties, material],
  )

  const treeData: TreeSelectProps['treeData'] = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        title: category,
        value: `__category__:${category}`,
        selectable: false,
        children: visible
          .filter((item) => item.category === category)
          .map((item) => ({
            title: varietyLabel(item),
            value: varietyKey(item),
          })),
      })).filter((node) => node.children.length > 0),
    [visible],
  )

  const materialKeys = visible.map(varietyKey)

  return (
    <>
      <Flex justify="space-between" align="center" gap={8} wrap="wrap">
        <Text type="secondary" style={{ fontSize: 12 }}>
          可选商品（留空=全部可选；用于精简表格商品下拉）
        </Text>
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            已选 {draft.products.length ? draft.products.length : '全部'}
          </Text>
          <Button
            size="small"
            type="text"
            onClick={() => onChange({ products: varieties.map(varietyKey) })}
          >
            全选
          </Button>
          <Button
            size="small"
            type="text"
            onClick={() => onChange({ products: [] })}
          >
            清空
          </Button>
        </Space>
      </Flex>

      <Flex gap={6} align="center" wrap="wrap" style={{ marginTop: 8 }}>
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
        {material ? (
          <>
            <Button
              size="small"
              type="link"
              style={{ padding: 0 }}
              onClick={() =>
                onChange({
                  products: [...new Set([...draft.products, ...materialKeys])],
                })
              }
            >
              选中该材质全部
            </Button>
            <Button
              size="small"
              type="link"
              style={{ padding: 0 }}
              onClick={() =>
                onChange({
                  products: draft.products.filter(
                    (key) => !materialKeys.includes(key),
                  ),
                })
              }
            >
              取消该材质
            </Button>
          </>
        ) : null}
      </Flex>

      <TreeSelect
        treeCheckable
        showCheckedStrategy={TreeSelect.SHOW_CHILD}
        size="small"
        style={{ width: '100%', marginTop: 8 }}
        placeholder="搜索并勾选可报单的商品"
        allowClear
        showSearch
        treeNodeFilterProp="title"
        treeDefaultExpandAll
        maxTagCount="responsive"
        treeData={treeData}
        value={draft.products.filter((key) => materialKeys.includes(key))}
        onChange={(values: string[]) => {
          const kept = draft.products.filter(
            (key) => !productKeys.has(key) || !materialKeys.includes(key),
          )
          onChange({
            products: [
              ...new Set([
                ...kept,
                ...values.filter((value) => productKeys.has(value)),
              ]),
            ],
          })
        }}
      />
    </>
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
 * 未勾选的品牌不生成列; 未启用的品种不显示价格; 可选商品限制表格商品下拉。
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
      onCancel={onClose}
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
            label: `品牌与品种 (${draft.brands.length})`,
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
