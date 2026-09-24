import { PlusOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Button, Dropdown } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORIES } from './core'
import type { Variety } from './types'

interface Props {
  /** 可选商品(已按项目配置过滤)。 */
  varieties: Variety[]
  disabled: boolean
  /** 选中商品: 追加一行并预填该商品。 */
  onPick: (variety: Variety) => void
}

const varietyKeyOf = (item: Variety) =>
  `${item.category}|${item.material}|${item.spec}|${item.length}`

const varietyDisplay = (item: Variety) =>
  [item.material, item.spec, item.length === '-' ? '' : item.length]
    .filter(Boolean)
    .join(' ')

/**
 * 「添加一行」下拉按钮: 点击展开按类别分组的商品明细, 选中即新增该商品行。
 * 未选商品时不再产生空行, 避免逐行二次选择。
 */
export function AddProductRowButton({ varieties, disabled, onPick }: Props) {
  const { t } = useTranslation()

  const items = useMemo<NonNullable<MenuProps['items']>>(() => {
    const byCategory = new Map<string, Variety[]>()
    for (const variety of varieties) {
      const list = byCategory.get(variety.category) ?? []
      list.push(variety)
      byCategory.set(variety.category, list)
    }
    const ordered = [...CATEGORIES, ...byCategory.keys()].filter(
      (category, index, all) =>
        byCategory.has(category) && all.indexOf(category) === index,
    )
    return ordered.map((category) => ({
      key: category,
      type: 'group' as const,
      label: category,
      children: (byCategory.get(category) ?? []).map((variety) => ({
        key: varietyKeyOf(variety),
        label: varietyDisplay(variety),
      })),
    }))
  }, [varieties])

  const hasOptions = items.length > 0

  return (
    <Dropdown
      menu={{
        items,
        onClick: ({ key }) => {
          const target = varieties.find(
            (variety) => varietyKeyOf(variety) === key,
          )
          if (target) onPick(target)
        },
      }}
      disabled={disabled || !hasOptions}
      trigger={['click']}
    >
      <Button
        block
        className="price-compare-add-row"
        disabled={disabled || !hasOptions}
        icon={<PlusOutlined />}
        size="small"
        type="text"
      >
        {t('priceCompare.sheet.addRow')}
      </Button>
    </Dropdown>
  )
}
