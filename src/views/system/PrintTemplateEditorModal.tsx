import type { FormInstance } from 'antd'
import Alert from 'antd/es/alert'
import Col from 'antd/es/col'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Row from 'antd/es/row'
import Select from 'antd/es/select'
import Tag from 'antd/es/tag'
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

const commonFields = [
  'billNo',
  'orderNo',
  'outboundNo',
  'statementNo',
  'customerName',
  'supplierName',
  'carrierName',
  'projectName',
  'projectAddress',
  'vehiclePlate',
  'deliveryDate',
  'outboundDate',
  'orderDate',
  'inboundDate',
  'billTime',
  'startDate',
  'endDate',
  'totalQuantity',
  'totalWeight',
  'totalAmount',
  'totalFreight',
  'remark',
]

const detailFields = [
  'index',
  'sourceNo',
  'billTime',
  'category',
  'brand',
  'materialName',
  'material',
  'spec',
  'length',
  'quantity',
  'pieceWeightTon',
  'weightTon',
  'unitPrice',
  'amount',
  'warehouseName',
  'batchNo',
  'remark',
]

const layoutFields = [
  'printDate',
  'printTime',
  'dateYear',
  'dateMonth',
  'dateDay',
  'rowTop',
  'sumTop',
  'sumTop2',
  'emptyRowTop',
  'hasEmptyRows',
  'isSeparator',
  'groupName',
  'needsNewPage',
  'needsSeparator',
  'footerTop',
  'footerLineTop',
  'footerDateTop',
]

function FieldTags({ title, fields }: { title: string; fields: string[] }) {
  return (
    <div>
      <Typography.Text strong>{title}</Typography.Text>
      <div className="mt-2">
        {fields.map((field) => (
          <Tag key={field} className="mb-1 font-mono">
            {field}
          </Tag>
        ))}
      </div>
    </div>
  )
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
      title={
        editing
          ? t('system.printTemplateEditor.editTitle')
          : t('system.printTemplateEditor.createTitle')
      }
      open={open}
      onClose={onClose}
      onSave={onSave}
      confirmLoading={saving}
      width={900}
    >
      <Form form={form} layout="vertical">
        <Row gutter={[16, 0]}>
          <Col xs={24} md={8}>
            <Form.Item
              name="billType"
              label={t('system.printTemplateEditor.billType')}
              required
            >
              <Select options={printTemplateTargetOptions} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="templateName"
              label={t('system.printTemplateEditor.templateName')}
              required
            >
              <Input
                placeholder={t(
                  'system.printTemplateEditor.templateNamePlaceholder',
                )}
                maxLength={64}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="templateType"
              label={t('system.printTemplateEditor.templateType')}
              required
            >
              <Select
                options={[
                  {
                    value: 'HTML',
                    label: t('system.printTemplateEditor.templateTypeHtml'),
                  },
                  {
                    value: 'COORD',
                    label: t('system.printTemplateEditor.templateTypeCoord'),
                  },
                  {
                    value: 'PDF_FORM',
                    label: t('system.printTemplateEditor.templateTypePdfForm'),
                  },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>
        <Alert
          className="mb-4"
          type="info"
          showIcon
          message={t('system.printTemplateEditor.helpTitle')}
          description={
            <div className="space-y-3">
              <Typography.Paragraph className="mb-0">
                {t('system.printTemplateEditor.unifiedPrintApi')}
              </Typography.Paragraph>
              <Typography.Paragraph className="mb-0">
                {t('system.printTemplateEditor.syntaxHint')}
              </Typography.Paragraph>
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
            </div>
          }
        />
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
            placeholder={t(
              'system.printTemplateEditor.templateContentPlaceholder',
            )}
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
