import Radio from 'antd/es/radio'
import Space from 'antd/es/space'
import type { PrintTemplateRecord } from '@/types/print-template'

interface Props {
  templates: PrintTemplateRecord[]
  defaultId: string
  onSelect: (id: string) => void
}

export function PrintTemplateSelector({
  templates,
  defaultId,
  onSelect,
}: Props) {
  return (
    <Radio.Group
      defaultValue={defaultId}
      onChange={(e) => onSelect(e.target.value)}
    >
      <Space direction="vertical" className="w-full">
        {templates.map((item) => (
          <Radio key={item.id} value={item.id}>
            {item.templateName}
          </Radio>
        ))}
      </Space>
    </Radio.Group>
  )
}
