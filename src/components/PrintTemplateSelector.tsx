import { Radio, Space } from 'antd'
import type { PrintTemplateRecord } from '@/shared/schemas'
import { pickDefaultPrintTemplate } from '@/utils/print-template'

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
  const initialTemplateId = defaultId || pickDefaultPrintTemplate(templates)?.id

  return (
    <Radio.Group
      defaultValue={initialTemplateId}
      onChange={(e) => onSelect(e.target.value)}
    >
      <Space orientation="vertical" className="w-full">
        {templates.map((item) => (
          <Radio key={item.id} value={item.id}>
            {item.templateName}
          </Radio>
        ))}
      </Space>
    </Radio.Group>
  )
}
