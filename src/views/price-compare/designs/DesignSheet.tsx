import { useRef, useState } from 'react'
import { moveItem } from '../core'
import { ReportSettingsModal } from '../ReportSettingsModal'
import { SheetPanel } from '../SheetPanel'
import { useMaterialBrands } from '../useMaterialBrands'
import type { DesignState } from './useDesignState'

type Props = {
  state: DesignState
  density?: 'small' | 'middle' | 'large'
  chrome?: boolean
}

/** 设计草案共用: 单据表格 + 报价总设置抽屉。 */
export function DesignSheet({
  state,
  density = 'small',
  chrome = true,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const materialBrands = useMaterialBrands()
  const spotRef = useRef<HTMLSpanElement>(null)
  const captureBtnRef = useRef<HTMLSpanElement>(null)
  const {
    active,
    data,
    varieties,
    catalog,
    brands,
    rows,
    settings,
    patchSheet,
    setRows,
    setBrands,
    setSettings,
    copyActiveSheet,
  } = state
  const brandOptions = materialBrands.length
    ? materialBrands
    : catalog.map((item) => item.name)

  if (!active) return null

  return (
    <>
      <SheetPanel
        sheet={active}
        data={data}
        varieties={varieties}
        brands={brands}
        rows={rows}
        density={density}
        chrome={chrome}
        patchSheet={patchSheet}
        setRows={setRows}
        lengthPremium={settings.lengthPremium}
        onReorderBrands={(from, to) =>
          setBrands((current) => moveItem(current, from, to))
        }
        onOpenSettings={() => setSettingsOpen(true)}
        onCopySheet={copyActiveSheet}
        spotRef={spotRef}
        captureBtnRef={captureBtnRef}
      />
      <ReportSettingsModal
        open={settingsOpen}
        brandOptions={brandOptions}
        brands={brands}
        lengthPremium={settings.lengthPremium}
        onClose={() => setSettingsOpen(false)}
        onSave={({ brands: nextBrands, lengthPremium }) => {
          setBrands(nextBrands)
          setSettings({ lengthPremium })
        }}
      />
    </>
  )
}
