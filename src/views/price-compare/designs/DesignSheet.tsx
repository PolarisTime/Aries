import { Form } from 'antd'
import { useRef, useState } from 'react'
import { BrandSettingsDrawer } from '../BrandSettingsDrawer'
import { SheetPanel } from '../SheetPanel'
import type { Brand } from '../types'
import type { DesignState } from './useDesignState'

type Props = {
  state: DesignState
  density?: 'small' | 'middle' | 'large'
  chrome?: boolean
}

/** 设计草案共用: 单据表格 + 品牌设置抽屉。 */
export function DesignSheet({
  state,
  density = 'small',
  chrome = true,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [form] = Form.useForm<{ brands: Brand[] }>()
  const brandSelectRef = useRef<HTMLSpanElement>(null)
  const spotRef = useRef<HTMLSpanElement>(null)
  const captureBtnRef = useRef<HTMLSpanElement>(null)
  const {
    active,
    data,
    varieties,
    catalog,
    brands,
    rows,
    patchSheet,
    setRows,
    setBrands,
    copyActiveSheet,
  } = state

  if (!active) return null

  return (
    <>
      <SheetPanel
        sheet={active}
        data={data}
        varieties={varieties}
        catalog={catalog}
        brands={brands}
        rows={rows}
        density={density}
        chrome={chrome}
        patchSheet={patchSheet}
        setRows={setRows}
        setBrands={setBrands}
        onOpenSettings={() => setSettingsOpen(true)}
        onCopySheet={copyActiveSheet}
        brandSelectRef={brandSelectRef}
        spotRef={spotRef}
        captureBtnRef={captureBtnRef}
      />
      <BrandSettingsDrawer
        open={settingsOpen}
        catalog={catalog}
        form={form}
        onClose={() => setSettingsOpen(false)}
        onSave={() => {
          void form.validateFields().then((values) => {
            const next = (values.brands ?? []).reduce<Brand[]>(
              (list, brand) => {
                if (brand.name)
                  list.push({
                    name: brand.name,
                    freight: Number(brand.freight) || 0,
                  })
                return list
              },
              [],
            )
            setBrands(next)
            setSettingsOpen(false)
          })
        }}
      />
    </>
  )
}
