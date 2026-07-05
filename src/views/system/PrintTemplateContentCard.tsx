import { CodeOutlined } from '@ant-design/icons'
import { Card, Form, Input, Space, Typography } from 'antd'
import { buildLabeledFormItemProps } from '@/utils/form-control-a11y'

interface PrintTemplateContentCardProps {
  templateHtml: string
  templateHtmlId: string
  onTemplateHtmlChange: (value: string) => void
  t: (key: string) => string
}

export function PrintTemplateContentCard({
  templateHtml,
  templateHtmlId,
  onTemplateHtmlChange,
  t,
}: PrintTemplateContentCardProps) {
  return (
    <Card
      size="small"
      className="mt-16"
      title={
        <Space>
          <CodeOutlined />
          <span>{t('system.printTemplateEditor.templateContent')}</span>
        </Space>
      }
    >
      <Form.Item
        {...buildLabeledFormItemProps({
          label: t('system.printTemplateEditor.templateContent'),
          htmlFor: templateHtmlId,
        })}
        required
        className="mb-8"
      >
        <Input.TextArea
          id={templateHtmlId}
          name="template-html"
          value={templateHtml}
          onChange={(event) => onTemplateHtmlChange(event.target.value)}
          rows={22}
          placeholder={t(
            'system.printTemplateEditor.templateContentPlaceholder',
          )}
          className="text-xs font-mono"
        />
      </Form.Item>
      <Typography.Text type="secondary">
        {t('system.printTemplateEditor.templateHint')}
      </Typography.Text>
    </Card>
  )
}
