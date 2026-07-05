import { Alert, Card, Space, Tag, Typography } from 'antd'
import {
  commonFields,
  detailFields,
  layoutFields,
} from '@/views/system/print-template-editor-utils'

function FieldTags({ title, fields }: { title: string; fields: string[] }) {
  return (
    <div>
      <Typography.Text strong>{title}</Typography.Text>
      <div className="mt-8">
        {fields.map((field) => (
          <Tag key={field} className="mb-4 font-mono">
            {field}
          </Tag>
        ))}
      </div>
    </div>
  )
}

export function PrintTemplateHelpPanel({ t }: { t: (key: string) => string }) {
  return (
    <>
      <Alert
        type="info"
        showIcon
        title={t('system.printTemplateEditor.helpTitle')}
        description={
          <div className="space-y-3">
            <Typography.Paragraph className="mb-0">
              {t('system.printTemplateEditor.unifiedPrintApi')}
            </Typography.Paragraph>
            <Typography.Paragraph className="mb-0">
              {t('system.printTemplateEditor.syntaxHint')}
            </Typography.Paragraph>
          </div>
        }
      />
      <Card
        size="small"
        className="mt-16"
        title={t('system.printTemplateEditor.availableFields')}
      >
        <Space orientation="vertical" size={16} className="w-full">
          <FieldTags
            title={t('system.printTemplateEditor.commonFields')}
            fields={commonFields}
          />
          <FieldTags
            title={t('system.printTemplateEditor.detailFields')}
            fields={detailFields}
          />
          <FieldTags
            title={t('system.printTemplateEditor.layoutFields')}
            fields={layoutFields}
          />
        </Space>
      </Card>
    </>
  )
}
