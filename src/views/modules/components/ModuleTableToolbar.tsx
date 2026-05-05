import { Button } from 'antd'
import { PlusOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons'

interface Props {
  canCreate: boolean
  canExport: boolean
  total: number
  loading: boolean
  exporting: boolean
  onCreate: () => void
  onExport: () => void
  onRefresh: () => void
}

export function ModuleTableToolbar({
  canCreate, canExport, total, loading,
  exporting, onCreate, onExport, onRefresh,
}: Props) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
      <div className="flex items-center gap-2 flex-wrap">
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>新建</Button>
        )}
        {canExport && (
          <Button icon={<DownloadOutlined />} onClick={onExport} loading={exporting}>导出</Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[#8c8c8c] text-[var(--app-font-size)]">共 {total} 条</span>
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading} size="small" />
      </div>
    </div>
  )
}
