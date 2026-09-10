import {
  Button,
  Checkbox,
  Divider,
  Drawer,
  Flex,
  InputNumber,
  Space,
  Typography,
} from 'antd'
import { useState } from 'react'
import type { Brand } from './types'

const { Text } = Typography
const DEFAULT_FREIGHT = 30

type Props = {
  open: boolean
  /** 可选品牌(来自系统商品资料) */
  brandOptions: string[]
  brands: Brand[]
  lengthPremium: number
  onClose: () => void
  onSave: (payload: { brands: Brand[]; lengthPremium: number }) => void
}

/** 报价总设置: 12米加价 / 参与比价的品牌 / 各品牌运费。 */
export function BrandSettingsDrawer({
  open,
  brandOptions,
  brands,
  lengthPremium,
  onClose,
  onSave,
}: Props) {
  const [selected, setSelected] = useState<string[]>(() =>
    brands.map((brand) => brand.name),
  )
  const [freightMap, setFreightMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const name of brandOptions)
      map[name] =
        brands.find((brand) => brand.name === name)?.freight ?? DEFAULT_FREIGHT
    for (const brand of brands)
      map[brand.name] = map[brand.name] ?? brand.freight
    return map
  })
  const [premium, setPremium] = useState<number>(() => lengthPremium)

  const save = () => {
    onSave({
      lengthPremium: premium,
      brands: selected.map((name) => ({
        name,
        freight: freightMap[name] ?? DEFAULT_FREIGHT,
      })),
    })
    onClose()
  }

  return (
    <Drawer
      title="报价总设置"
      size={460}
      open={open}
      destroyOnHidden
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={save}>
            保存
          </Button>
        </Space>
      }
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

        <Divider style={{ margin: 0 }} />

        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            参与比价的品牌（来自商品资料，勾选后作为表格列）
          </Text>
          <Checkbox.Group
            style={{ width: '100%', marginTop: 8 }}
            value={selected}
            onChange={(values) => setSelected(values)}
          >
            <Flex vertical gap={6} style={{ width: '100%' }}>
              {brandOptions.map((name) => (
                <Flex key={name} justify="space-between" align="center">
                  <Checkbox value={name}>{name}</Checkbox>
                  <Space size={4}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      运费
                    </Text>
                    <InputNumber
                      size="small"
                      min={0}
                      max={9999}
                      style={{ width: 80 }}
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
              ))}
            </Flex>
          </Checkbox.Group>
        </div>

        <Text type="secondary" style={{ fontSize: 12 }}>
          差价 = 网价 − 现货 − 运费；12米加价仅对螺纹钢生效。
        </Text>
      </Flex>
    </Drawer>
  )
}
