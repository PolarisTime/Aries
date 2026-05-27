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
        {templates.map((t) => (
          <Radio key={t.id} value={t.id}>
            {t.templateName}
            {t.isDefault === '1' ? (
              <span className="text-xs text-tertiary ml-8">（默认）</span>
            ) : null}
          </Radio>
        ))}
      </Space>
    </Radio.Group>
  )
}
