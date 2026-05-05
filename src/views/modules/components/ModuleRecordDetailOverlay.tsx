import { Drawer, Descriptions, Spin, Empty } from 'antd'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

interface Props {
  open: boolean
  config: ModulePageConfig
  record: ModuleRecord | null
  loading: boolean
  onClose: () => void
}

export function ModuleRecordDetailOverlay({ open, config, record, loading, onClose }: Props) {
  const { formatCellValue } = useModuleDisplaySupport()

  return (
    <Drawer title="记录详情" open={open} onClose={onClose} width={640} destroyOnClose>
      {loading ? (
        <div className="flex items-center justify-center py-16"><Spin /></div>
      ) : !record ? (
        <Empty description="暂无数据" />
      ) : (
        <Descriptions bordered size="small" column={config.detailColumnCount || 2}>
          {config.detailFields.map((field) => {
            const value = record[field.key]
            const colDef = config.columns.find((c) => c.dataIndex === field.key)
            return (
              <Descriptions.Item key={field.key} label={field.label}>
                {formatCellValue(value, colDef?.type || field.type)}
              </Descriptions.Item>
            )
          })}
        </Descriptions>
      )}
    </Drawer>
  )
}
