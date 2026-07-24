import { CodeOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import { Card, Form, Input, Space, Typography } from 'antd'
import type { PrintTemplateEditorFormValues } from '@/views/system/print-template-editor-utils'

interface PrintTemplateContentCardProps {
  form: FormInstance<PrintTemplateEditorFormValues>
  templateHtmlId: string
  t: (key: string) => string
}

export function PrintTemplateContentCard({
  form,
  templateHtmlId,
  t,
}: PrintTemplateContentCardProps) {
  const templateType = Form.useWatch('templateType', form)
  const templateContentRequired = templateType !== 'PDF_FORM'

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
        name="templateHtml"
        dependencies={['templateType']}
        label={t('system.printTemplateEditor.templateContent')}
        htmlFor={templateHtmlId}
        required={templateContentRequired}
        rules={[
          {
            validator: (_, value: unknown) => {
              if (
                !templateContentRequired ||
                (typeof value === 'string' && value.trim())
              ) {
                return Promise.resolve()
              }
              return Promise.reject(
                new Error(t('system.printTemplate.inputTemplateContent')),
              )
            },
          },
        ]}
        className="mb-8"
      >
        <Input.TextArea
          id={templateHtmlId}
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
