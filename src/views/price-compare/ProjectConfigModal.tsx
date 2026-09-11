import { SearchOutlined } from '@ant-design/icons'
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
  Typography,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES } from './core'
import type { Brand, ProjectConfig } from './types'

const { Text } = Typography
const DEFAULT_FREIGHT = 30

type Props = {
  open: boolean
  /** 可选品牌(来自系统商品资料) */
  brandOptions: string[]
  config: ProjectConfig
  onClose: () => void
  onSave: (config: ProjectConfig) => void
}

/**
 * 项目配置: 品牌/运费/启用品种 + 12米加价。
 * 未勾选的品牌不生成列; 品牌下未启用的品种不显示价格。
 */
export function ProjectConfigModal({
  open,
  brandOptions,
  config,
  onClose,
  onSave,
}: Props) {
  const [selected, setSelected] = useState<string[]>([])
  const [freightMap, setFreightMap] = useState<Record<string, number>>({})
  const [categoryMap, setCategoryMap] = useState<Record<string, string[]>>({})
  const [premium, setPremium] = useState<number>(config.lengthPremium)
  const [hrb400eFallback, setHrb400eFallback] = useState<boolean>(
    config.hrb400eFallback,
  )
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    if (!open) return
    const names = config.brands.map((brand) => brand.name)
    setSelected(names.length ? names : brandOptions)
    const nextFreight: Record<string, number> = {}
    const nextCategory: Record<string, string[]> = {}
    for (const name of brandOptions) {
      const brand = config.brands.find((item) => item.name === name)
      nextFreight[name] = brand?.freight ?? DEFAULT_FREIGHT
      nextCategory[name] = brand?.categories ?? CATEGORIES
    }
    setFreightMap(nextFreight)
    setCategoryMap(nextCategory)
    setPremium(config.lengthPremium)
    setHrb400eFallback(config.hrb400eFallback)
    setKeyword('')
  }, [open, brandOptions, config])

  const filtered = useMemo(() => {
    const query = keyword.trim().toLowerCase()
    if (!query) return brandOptions
    return brandOptions.filter((name) => name.toLowerCase().includes(query))
  }, [brandOptions, keyword])

  const toggleBrand = (name: string, checked: boolean) =>
    setSelected((prev) =>
      checked ? [...prev, name] : prev.filter((item) => item !== name),
    )

  const save = () => {
    const brands: Brand[] = selected.map((name) => {
      const categories = categoryMap[name] ?? CATEGORIES
      const enabled =
        categories.length === 0 || categories.length === CATEGORIES.length
          ? undefined
          : categories
      return {
        name,
        freight: freightMap[name] ?? DEFAULT_FREIGHT,
        categories: enabled,
      }
    })
    onSave({ brands, lengthPremium: premium, hrb400eFallback })
    onClose()
  }

  return (
    <Modal
      title="项目配置"
      open={open}
      width={620}
      destroyOnHidden
      okText="保存"
      cancelText="取消"
      onOk={save}
      onCancel={onClose}
      styles={{
        body: { maxHeight: '62vh', overflowY: 'auto', paddingRight: 8 },
      }}
    >
      <Flex vertical gap={16}>
        <Flex align="center" gap={8} className="price-compare-config-premium">
          <Text type="secondary" style={{ fontSize: 12 }}>
            12米加价（元/吨，仅螺纹钢生效）
          </Text>
          <InputNumber
            size="small"
            min={0}
            max={999}
            style={{ width: 120 }}
            value={premium}
            onChange={(value) => setPremium(value ?? 0)}
          />
        </Flex>

        <Flex align="center" justify="space-between" gap={8}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            HRB400 无网价时改用 HRB400E 价格（网价前显示 E）
          </Text>
          <Switch
            size="small"
            checked={hrb400eFallback}
            onChange={setHrb400eFallback}
          />
        </Flex>

        <div>
          <Flex justify="space-between" align="center" gap={8} wrap="wrap">
            <Text type="secondary" style={{ fontSize: 12 }}>
              品牌与品种（未启用的品种该品牌不显示价格）
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
                已选 {selected.length}/{brandOptions.length}
              </Text>
              <Button
                size="small"
                type="text"
                onClick={() => setSelected(brandOptions)}
              >
                全选
              </Button>
              <Button size="small" type="text" onClick={() => setSelected([])}>
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
                const active = selected.includes(name)
                return (
                  <div
                    key={name}
                    className={`price-compare-config-brand${active ? ' is-active' : ''}`}
                  >
                    <Flex justify="space-between" align="center" gap={8}>
                      <Checkbox
                        checked={active}
                        onChange={(event) =>
                          toggleBrand(name, event.target.checked)
                        }
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
                            value={freightMap[name] ?? DEFAULT_FREIGHT}
                            onChange={(value) =>
                              setFreightMap((prev) => ({
                                ...prev,
                                [name]: Number(value) || 0,
                              }))
                            }
                          />
                        </Space>
                      ) : null}
                    </Flex>
                    {active ? (
                      <Checkbox.Group
                        className="price-compare-config-categories"
                        value={categoryMap[name] ?? CATEGORIES}
                        options={CATEGORIES.map((category) => ({
                          label: category,
                          value: category,
                        }))}
                        onChange={(values) =>
                          setCategoryMap((prev) => ({
                            ...prev,
                            [name]: values,
                          }))
                        }
                      />
                    ) : null}
                  </div>
                )
              })
            )}
          </Flex>
        </div>

        <Text type="secondary" style={{ fontSize: 12 }}>
          差价 = 网价 − 现货 − 运费；12米加价仅对螺纹钢生效。
        </Text>
      </Flex>
    </Modal>
  )
}
