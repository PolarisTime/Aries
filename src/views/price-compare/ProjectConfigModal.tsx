import {
  Checkbox,
  Flex,
  InputNumber,
  Modal,
  Space,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!open) return
    const names = config.brands.map((brand) => brand.name)
    setSelected(names.length ? names : brandOptions)
    const nextFreight: Record<string, number> = {}
    const nextCategory: Record<string, string[]> = {}
    for (const name of brandOptions) {
      const brand = config.brands.find((item) => item.name === name)
      nextFreight[name] = brand?.freight ?? DEFAULT_FREIGHT
      nextCategory[name] = brand?.categories ?? [...CATEGORIES]
    }
    setFreightMap(nextFreight)
    setCategoryMap(nextCategory)
    setPremium(config.lengthPremium)
  }, [open, brandOptions, config])

  const save = () => {
    const brands: Brand[] = selected.map((name) => {
      const categories = categoryMap[name] ?? [...CATEGORIES]
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
    onSave({ brands, lengthPremium: premium })
    onClose()
  }

  return (
    <Modal
      title="项目配置"
      open={open}
      width={560}
      destroyOnHidden
      okText="保存"
      cancelText="取消"
      onOk={save}
      onCancel={onClose}
    >
      <Flex vertical gap={16}>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            12米加价（元/吨，仅螺纹钢生效）
          </Text>
          <div style={{ marginTop: 4 }}>
            <InputNumber
              min={0}
              max={999}
              style={{ width: 160 }}
              value={premium}
              onChange={(value) => setPremium(value ?? 0)}
            />
          </div>
        </div>

        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            参与比价的品牌与品种（来自商品资料；未启用的品种该品牌不显示价格）
          </Text>
          <Flex vertical gap={10} style={{ width: '100%', marginTop: 8 }}>
            {brandOptions.map((name) => {
              const active = selected.includes(name)
              return (
                <Flex
                  key={name}
                  vertical
                  gap={6}
                  className="price-compare-config-brand"
                >
                  <Flex justify="space-between" align="center">
                    <Checkbox
                      checked={active}
                      onChange={(event) =>
                        setSelected((prev) =>
                          event.target.checked
                            ? [...prev, name]
                            : prev.filter((item) => item !== name),
                        )
                      }
                    >
                      {name}
                    </Checkbox>
                    <Space size={4}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        运费
                      </Text>
                      <InputNumber
                        size="small"
                        min={0}
                        max={9999}
                        style={{ width: 80 }}
                        disabled={!active}
                        value={freightMap[name] ?? DEFAULT_FREIGHT}
                        onChange={(value) =>
                          setFreightMap((prev) => ({
                            ...prev,
                            [name]: Number(value) || 0,
                          }))
                        }
                      />
                    </Space>
                  </Flex>
                  {active ? (
                    <Checkbox.Group
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
                  ) : (
                    <Tag style={{ width: 'fit-content' }}>未参与</Tag>
                  )}
                </Flex>
              )
            })}
          </Flex>
        </div>

        <Text type="secondary" style={{ fontSize: 12 }}>
          差价 = 网价 − 现货 − 运费；12米加价仅对螺纹钢生效。
        </Text>
      </Flex>
    </Modal>
  )
}
