import type { FormInstance } from 'antd'
import Col from 'antd/es/col'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Row from 'antd/es/row'
import Select from 'antd/es/select'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'
import { FormModal } from '@/components/FormModal'
import { printTemplateTargetOptions } from '@/config/print-template-targets'
import { buildLabeledFormItemProps } from '@/utils/form-control-a11y'
import { buildFormControlId } from '@/utils/form-control-id'

interface Props {
  open: boolean
  editing: boolean
  form: FormInstance
  templateHtml: string
  saving: boolean
  onTemplateHtmlChange: (value: string) => void
  onSave: () => void
  onClose: () => void
}


export function PrintTemplateEditorModal({
  open,
  editing,
  form,
  templateHtml,
  saving,
  onTemplateHtmlChange,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const templateHtmlId = buildFormControlId(
    'print-template-editor',
    'template-html',
  )

  return (
    <FormModal
      title={editing ? t('system.printTemplateEditor.editTitle') : t('system.printTemplateEditor.createTitle')}
      open={open}
      onClose={onClose}
      onSave={onSave}
      confirmLoading={saving}
      width={900}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="billType" label={t('system.printTemplateEditor.billType')} required>
              <Select options={printTemplateTargetOptions} />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item name="templateName" label={t('system.printTemplateEditor.templateName')} required>
              <Input placeholder={t('system.printTemplateEditor.templateNamePlaceholder')} maxLength={64} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          {...buildLabeledFormItemProps({
            label: t('system.printTemplateEditor.templateContent'),
            htmlFor: templateHtmlId,
          })}
          required
        >
          <Input.TextArea
            id={templateHtmlId}
            name="template-html"
            value={templateHtml}
            onChange={(event) => onTemplateHtmlChange(event.target.value)}
            rows={16}
            placeholder={t('system.printTemplateEditor.templateContentPlaceholder')}
            className="text-xs font-mono"
          />
        </Form.Item>
        <Typography.Text type="secondary">
          {t('system.printTemplateEditor.htmlHint')}
        </Typography.Text>
      </Form>
    </FormModal>
  )
}
