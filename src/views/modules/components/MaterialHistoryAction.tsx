import { HistoryOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LegacyModuleRecord } from '@/types/module-record'
import { asString } from '@/utils/type-narrowing'
import { MaterialHistoryDrawer } from './MaterialHistoryDrawer'

interface Props {
  selectedRecord?: LegacyModuleRecord
  onRolledBack?: () => Promise<void> | void
}

/** 商品版本历史入口：仅选中单条商品时可用。 */
export function MaterialHistoryAction({ selectedRecord, onRolledBack }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const materialId = selectedRecord ? String(selectedRecord.id) : ''
  const canOpen = Boolean(materialId)
  const materialLabel = selectedRecord
    ? asString(selectedRecord.materialCode) || asString(selectedRecord.material)
    : ''

  return (
    <>
      <Tooltip
        title={
          canOpen
            ? undefined
            : t('modules.pages.material.versionHistorySelectSingle')
        }
      >
        <Button
          aria-disabled={!canOpen}
          icon={<HistoryOutlined />}
          onClick={() => {
            if (canOpen) {
              setOpen(true)
            }
          }}
          style={canOpen ? undefined : { opacity: 0.5, cursor: 'not-allowed' }}
        >
          {t('modules.pages.material.versionHistoryAction')}
        </Button>
      </Tooltip>
      <MaterialHistoryDrawer
        key={materialId}
        open={open}
        materialId={materialId}
        materialLabel={materialLabel}
        onClose={() => setOpen(false)}
        onRolledBack={onRolledBack}
      />
    </>
  )
}
