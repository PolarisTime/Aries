import { Popover, Checkbox, Button } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import type { ColumnDef } from '@tanstack/react-table'
import type { ModuleRecord } from '@/types/module-page'

interface Props {
  columns: ColumnDef<ModuleRecord>[]
  visibleKeys: string[]
  onToggle: (key: string) => void
}

export function ColumnSettingsPopover({ columns, visibleKeys, onToggle }: Props) {
  const configurableColumns = columns.filter((c) => c.id !== 'selection' && c.id !== 'actions' && c.id !== 'expand')

  const content = (
    <div className="column-setting-panel" style={{ width: 280 }}>
      <div className="column-setting-header">
        <span>列显示设置</span>
      </div>
      <div className="column-setting-list">
        {configurableColumns.map((col) => {
          const key = col.id as string
          const headerText = typeof col.header === 'string' ? col.header : key
          return (
            <div key={key} className="column-setting-item">
              <Checkbox
                checked={visibleKeys.includes(key)}
                onChange={() => onToggle(key)}
              >
                {headerText}
              </Checkbox>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <Popover content={content} title="列设置" trigger="click" placement="bottomRight">
      <Button icon={<SettingOutlined />} size="small">列设置</Button>
    </Popover>
  )
}
