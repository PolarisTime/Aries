import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Popover from 'antd/es/popover'
import Table from 'antd/es/table'
import Typography from 'antd/es/typography'
import { getBusinessModuleDetail } from '@/api/business'
import type { ModuleRecord } from '@/types/module-page'
import { formatWeight } from '@/utils/formatters'

interface Props {
  value: unknown
  record: ModuleRecord
  moduleKey: string
}

export function WeightCellPopover({ value, record, moduleKey }: Props) {
  const { t } = useTranslation()
  const [items, setItems] = useState<ModuleRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const handleOpen = useCallback(async () => {
    setOpen(true)
    if (items.length === 0) {
      setLoading(true)
      setError('')
      try {
        const result = await getBusinessModuleDetail(moduleKey, String(record.id))
        const rawItems = result?.data?.items
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          setItems(rawItems)
        } else {
          setError(t('modules.weightCell.noLineItems'))
        }
        setLoading(false)
      } catch {
        setError(t('modules.weightCell.loadDetailFailed'))
        setLoading(false)
      }
    }
  }, [items.length, moduleKey, record.id, t])

  const emptyText = error || t('common.noData')

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) void handleOpen()
      }}
      trigger="click"
      title={t('modules.weightCell.popoverTitle')}
      destroyTooltipOnHide
      content={
        <div className="w-[694px]">
          <Table
            rowKey="id"
            size="small"
            loading={loading}
            pagination={false}
            dataSource={items}
            columns={[
              { title: t('modules.weightCell.materialCode'), dataIndex: 'materialCode', width: 180, ellipsis: true },
              { title: t('modules.weightCell.brand'), dataIndex: 'brand', width: 64, ellipsis: true },
              { title: t('modules.weightCell.material'), dataIndex: 'material', width: 72, ellipsis: true },
              { title: t('modules.weightCell.spec'), dataIndex: 'spec', width: 72, ellipsis: true },
              { title: t('modules.weightCell.length'), dataIndex: 'length', width: 58, ellipsis: true },
              { title: t('modules.weightCell.pieceWeightTon'), dataIndex: 'pieceWeightTon', width: 88, align: 'center' as const,
                render: (v: unknown) => (v != null ? Number(v).toFixed(3) : '-') },
              { title: t('modules.weightCell.quantity'), dataIndex: 'quantity', width: 64, align: 'center' as const },
              { title: t('modules.weightCell.weightTon'), dataIndex: 'weightTon', width: 96, align: 'center' as const,
                render: (v: unknown) => (v != null ? Number(v).toFixed(3) : '-') },
            ]}
            locale={{ emptyText }}
          />
        </div>
      }
    >
      <Typography.Link>
        {value != null ? formatWeight(Number(value)) : '-'}
      </Typography.Link>
    </Popover>
  )
}
