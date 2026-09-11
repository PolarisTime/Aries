import { Checkbox, Flex, InputNumber, Modal, Space, Typography } from 'antd'
import { useEffect, useState } from 'react'
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

/** 报价总设置弹窗: 12米加价 / 参与比价的品牌 / 各品牌运费。 */
export function ReportSettingsModal({
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

  useEffect(() => {
    if (!open) return
    setSelected(
      brands.length ? brands.map((brand) => brand.name) : brandOptions,
    )
    const map: Record<string, number> = {}
    for (const name of brandOptions)
      map[name] =
        brands.find((brand) => brand.name === name)?.freight ?? DEFAULT_FREIGHT
    for (const brand of brands)
      map[brand.name] = map[brand.name] ?? brand.freight
    setFreightMap(map)
    setPremium(lengthPremium)
  }, [open, brands, brandOptions, lengthPremium])

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
    <Modal
      title="报价总设置"
      open={open}
      width={520}
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
            参与比价的品牌（来自商品资料，勾选后显示为表格列）
          </Text>
          <Flex vertical gap={6} style={{ width: '100%', marginTop: 8 }}>
            {brandOptions.map((name) => (
              <Flex key={name} justify="space-between" align="center">
                <Checkbox
                  checked={selected.includes(name)}
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
        </div>

        <Text type="secondary" style={{ fontSize: 12 }}>
          差价 = 网价 − 现货 − 运费；12米加价仅对螺纹钢生效。
        </Text>
      </Flex>
    </Modal>
  )
}
