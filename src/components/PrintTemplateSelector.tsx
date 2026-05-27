import Radio from 'antd/es/radio'
import Space from 'antd/es/space'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  return (
    <Radio.Group
      defaultValue={defaultId}
      onChange={(e) => onSelect(e.target.value)}
    >
      <Space direction="vertical" className="w-full">
        {templates.map((item) => (
          <Radio key={item.id} value={item.id}>
            {item.templateName}
            {item.isDefault === '1' ? (
              <span className="text-xs text-tertiary ml-8">
                {t('system.printTemplate.defaultTag')}
              </span>
            ) : null}
          </Radio>
        ))}
      </Space>
    </Radio.Group>
  )
}
