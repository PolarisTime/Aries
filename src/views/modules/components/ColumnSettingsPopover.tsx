import { Popover, Checkbox, Button, Divider, Space, Typography } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import type { ModuleColumnDefinition } from '@/types/module-page'

interface Props {
  columns: ModuleColumnDefinition[]
  visibleKeys: string[]
  onToggle: (key: string) => void
}

export function ColumnSettingsPopover({ columns, visibleKeys, onToggle }: Props) {
  const content = (
    <Space orientation="vertical" size="small" style={{ minWidth: 240 }}>
      <Typography.Text strong>列显示设置</Typography.Text>
      <Divider style={{ margin: '4px 0 8px' }} />
      {columns.map((column) => (
        <Checkbox
          key={column.dataIndex}
          checked={visibleKeys.includes(column.dataIndex)}
          onChange={() => onToggle(column.dataIndex)}
        >
          {column.title}
        </Checkbox>
      ))}
    </Space>
  )

  return (
    <Popover content={content} trigger="click" placement="bottomRight">
      <Button icon={<SettingOutlined />} size="small">列设置</Button>
    </Popover>
  )
}
